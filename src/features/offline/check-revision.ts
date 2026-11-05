import type { ServiceSnapshot } from '../../domain/service';
import { failure, type Result } from '../../domain/result';
import { openBrowserDB } from '../../lib/browser-db';
import { validateServiceSnapshot } from '../services/snapshot-validation';
import { currentContentStamp } from './content-changes';
import { getPreparedRecord } from './prepared-store';
export async function checkPreparedRevision(
  profileId: string,
  packageId: string,
  fetchSnapshot: (id: string) => Promise<Result<ServiceSnapshot>>,
): Promise<Result<{ changed: boolean; checkedAt: string }>> {
  try {
    const saved = await getPreparedRecord(profileId, packageId);
    if (!saved.ok) return saved;
    const stamp = currentContentStamp(profileId),
      source = await fetchSnapshot(saved.value.serviceId);
    if (!source.ok) return source;
    const parsed = validateServiceSnapshot(source.value, saved.value.serviceId);
    if (!parsed.ok || parsed.value.workspaceId !== saved.value.manifest.workspaceId)
      return failure('VALIDATION', 'The online service response did not match this prepared copy.');
    if (stamp !== currentContentStamp(profileId))
      return failure(
        'CONFLICT',
        'Content changed during the online check. Retry before treating this copy as current.',
      );
    const db = await openBrowserDB();
    try {
      const tx = db.transaction(['meta', 'preparedServices'], 'readwrite');
      try {
        const marker = await tx.objectStore('meta').get('session'),
          record = await tx.objectStore('preparedServices').get([profileId, packageId]);
        if (
          marker?.profileId !== profileId ||
          marker.signedOut ||
          !record ||
          record.manifestHash !== saved.value.manifestHash ||
          stamp !== currentContentStamp(profileId)
        )
          throw new Error('Prepared copy changed.');
        const changed = parsed.value.sourceRevision !== record.manifest.sourceRevision,
          checkedAt = new Date().toISOString();
        await tx.objectStore('preparedServices').put({
          ...record,
          cloudStale: changed,
          checkedAt,
          contentStamp: changed ? record.contentStamp : stamp,
        });
        await tx.done;
        return { ok: true, value: { changed, checkedAt } };
      } catch {
        try {
          tx.abort();
        } catch {
          /* Already aborted. */
        }
        await tx.done.catch(() => {});
        return failure('CONFLICT', 'The profile or prepared copy changed. Retry the check.');
      }
    } finally {
      db.close();
    }
  } catch {
    return failure(
      'STORAGE_UNAVAILABLE',
      'The online check could not be recorded. The saved copy remains available.',
    );
  }
}
