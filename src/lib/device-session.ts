import {openBrowserDB,type DeviceSession} from './browser-db';
import { failure, type Result } from '../domain/result';
import { forgetDraft } from './draft-memory';
import {revokeMediaUrls} from '../features/media/media-urls';
export type {DeviceSession} from './browser-db';
const db = openBrowserDB;
const accessBlockKey='gather-device-access-blocked',signOutKey='gather-sign-out-pending';
export const deviceSignOutPending=()=>localStorage.getItem(signOutKey)!==null;
export const beginDeviceSignOut=()=>localStorage.setItem(signOutKey,'1');
export const completeDeviceSignOut=()=>localStorage.removeItem(signOutKey);
export async function readDeviceSession(): Promise<DeviceSession | null> {
  const database = await db();
  try { const marker=await database.get('meta', 'session');return marker ? {...marker,signedOut:marker.signedOut || deviceSignOutPending() || localStorage.getItem(accessBlockKey)===marker.profileId} : null; } finally { database.close(); }
}
export async function setDeviceSession(profileId: string): Promise<void> {
  const previous = await readDeviceSession();
  if (previous && (previous.profileId !== profileId || previous.signedOut)) {
    const clean = await purgeProfileData(previous.profileId);
    if (!clean.ok) throw new Error(clean.error.message);
  }
  const database = await db();
  try { await database.put('meta', { profileId, signedOut: false }, 'session'); } finally { database.close(); }
}
export async function purgeProfileData(profileId: string): Promise<Result<void>> {
  try {
    // Keep access blocked even if IndexedDB refuses its first sign-out write.
    localStorage.setItem(accessBlockKey,profileId);
    const database = await db();
    try {
      const lock=database.transaction('meta','readwrite'),previous=await lock.store.get('session');
      if(previous?.profileId===profileId)await lock.store.put({...previous,signedOut:true},'session');await lock.done;
      const tx = database.transaction(['meta','mediaFiles','preparedServices','preparedAssets'], 'readwrite');
      try{
      const session: DeviceSession | undefined = await tx.objectStore('meta').get('session');
      if (session?.profileId === profileId) await tx.objectStore('meta').delete('session');
      let cursor=await tx.objectStore('mediaFiles').index('by-profile').openCursor(profileId);
      while(cursor){await cursor.delete();cursor=await cursor.continue();}
      for(const storeName of ['preparedServices','preparedAssets'] as const){let prepared=await tx.objectStore(storeName).index('by-profile').openCursor(profileId);while(prepared){await prepared.delete();prepared=await prepared.continue();}}
      await tx.done;
      }catch(error){try{tx.abort();}catch{/* Already aborted. */}await tx.done.catch(()=>{});throw error;}
    } finally { database.close(); }
    localStorage.removeItem('gather-content-stamp:'+profileId);
    forgetDraft(profileId);
    revokeMediaUrls(profileId);
    if(localStorage.getItem(accessBlockKey)===profileId)localStorage.removeItem(accessBlockKey);
    return { ok: true, value: undefined };
  } catch { return failure('STORAGE_UNAVAILABLE', 'Local data could not be removed. Try again before changing accounts.'); }
}
