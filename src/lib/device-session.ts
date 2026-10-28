import {openBrowserDB,type DeviceSession} from './browser-db';
import { failure, type Result } from '../domain/result';
import { forgetDraft } from './draft-memory';
import {revokeMediaUrls} from '../features/media/media-urls';
export type {DeviceSession} from './browser-db';
const db = openBrowserDB;
export async function readDeviceSession(): Promise<DeviceSession | null> {
  const database = await db();
  try { return await database.get('meta', 'session') ?? null; } finally { database.close(); }
}
export async function setDeviceSession(profileId: string): Promise<void> {
  const previous = await readDeviceSession();
  if (previous && previous.profileId !== profileId) {
    const clean = await purgeProfileData(previous.profileId);
    if (!clean.ok) throw new Error(clean.error.message);
  }
  const database = await db();
  try { await database.put('meta', { profileId, signedOut: false }, 'session'); } finally { database.close(); }
}
export async function purgeProfileData(profileId: string): Promise<Result<void>> {
  try {
    const database = await db();
    try {
      const tx = database.transaction(['meta','mediaFiles'], 'readwrite');
      const session: DeviceSession | undefined = await tx.objectStore('meta').get('session');
      if (session?.profileId === profileId) await tx.objectStore('meta').delete('session');
      let cursor=await tx.objectStore('mediaFiles').index('by-profile').openCursor(profileId);
      while(cursor){await cursor.delete();cursor=await cursor.continue();}
      await tx.done;
    } finally { database.close(); }
    forgetDraft(profileId);
    revokeMediaUrls(profileId);
    return { ok: true, value: undefined };
  } catch { return failure('STORAGE_UNAVAILABLE', 'Local data could not be removed. Try again before changing accounts.'); }
}
