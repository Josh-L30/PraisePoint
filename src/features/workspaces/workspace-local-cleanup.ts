import { openBrowserDB } from '../../lib/browser-db';
import { readDeviceSession } from '../../lib/device-session';
import { forgetWorkspaceDrafts } from '../../lib/draft-memory';
import { failure, type Result } from '../../domain/result';
import { listPrepared, deletePrepared } from '../offline/prepared-store';
import { removeLocalMedia } from '../media/local-media-store';

/** Caller holds the exclusive runtime lease; disconnected devices keep their own copies. */
export async function purgeWorkspaceLocalData(
  profileId: string,
  workspaceId: string,
): Promise<Result<void>> {
  try {
    const marker = await readDeviceSession();
    if (marker?.profileId !== profileId || marker.signedOut)
      return failure(
        'FORBIDDEN',
        'The device profile changed. Sign in again before deleting this workspace.',
      );
    const prepared = await listPrepared(profileId);
    if (!prepared.ok) return prepared;
    for (const record of prepared.value)
      if (record.manifest.workspaceId === workspaceId) {
        const removed = await deletePrepared(profileId, record.packageId);
        if (!removed.ok) return removed;
      }
    const database = await openBrowserDB();
    let files;
    try {
      files = await database.getAllFromIndex('mediaFiles', 'by-workspace', [
        profileId,
        workspaceId,
      ]);
    } finally {
      database.close();
    }
    for (const file of files) {
      const removed = await removeLocalMedia(profileId, file.descriptor.id);
      if (!removed.ok) return removed;
    }
    forgetWorkspaceDrafts(profileId, workspaceId);
    return { ok: true, value: undefined };
  } catch {
    return failure(
      'STORAGE_UNAVAILABLE',
      'This browser could not remove its workspace copies. Close other PraisePoint windows and retry before deleting online content.',
    );
  }
}
