import { readDeviceSession } from '../../lib/device-session';
import type { Result } from '../../domain/result';
import type { ServiceSnapshot } from '../../domain/service';
import type { MediaResolver } from '../../domain/media';
import { failure } from '../../domain/result';
import { createMediaUrl } from '../media/media-urls';
import { readPreparedAsset } from './prepared-store';
export function preparedSnapshotResolver(
  profileId: string,
  snapshot: ServiceSnapshot,
): MediaResolver {
  const allowed = new Map(snapshot.media.map((asset) => [asset.id, asset])),
    pending = new Map<string, Promise<Result<Blob>>>();
  return async (id) => {
    const asset = allowed.get(id);
    if (!asset) return failure('FORBIDDEN', 'This file is outside the prepared service.');
    let job = pending.get(id);
    if (!job) {
      job = readPreparedAsset(profileId, asset);
      pending.set(id, job);
      void job.finally(() => {
        if (pending.get(id) === job) pending.delete(id);
      });
    }
    const bytes = await job;
    if (!bytes.ok) return bytes;
    const marker = await readDeviceSession();
    if (marker?.profileId !== profileId || marker.signedOut)
      return failure('FORBIDDEN', 'This device profile changed or signed out.');
    return { ok: true, value: createMediaUrl(profileId, id, bytes.value) };
  };
}
