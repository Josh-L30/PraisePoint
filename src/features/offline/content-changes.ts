import { readDeviceSession } from '../../lib/device-session';
export const contentStampKey = (profileId: string) => 'gather-content-stamp:' + profileId;
export function currentContentStamp(profileId: string): string {
  return localStorage.getItem(contentStampKey(profileId)) ?? '';
}
/** Conservatively recheck prepared copies after any local deck/service write. */
export async function noteLocalContentChange() {
  const marker = await readDeviceSession();
  if (marker && !marker.signedOut)
    localStorage.setItem(contentStampKey(marker.profileId), crypto.randomUUID());
}
