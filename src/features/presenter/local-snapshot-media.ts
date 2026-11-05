import type { ServiceSnapshot } from '../../domain/service';
import type { MediaResolver } from '../../domain/media';
import { failure } from '../../domain/result';
import { readLocalMedia } from '../media/local-media-store';
import { createMediaUrl } from '../media/media-urls';
import { readDeviceSession } from '../../lib/device-session';
/** Audience resolves only already verified local bytes; this module has no cloud client. */
export function localSnapshotResolver(profileId: string, snapshot: ServiceSnapshot): MediaResolver {
  const allowed = new Map(snapshot.media.map((asset) => [asset.id, asset]));
  return async (id) => {
    const expected = allowed.get(id);
    if (!expected) return failure('FORBIDDEN', 'This media is outside the sent service.');
    const stored = await readLocalMedia(profileId, id);
    if (!stored.ok) return stored;
    for (const key of [
      'id',
      'workspaceId',
      'sha256',
      'bytes',
      'mime',
      'kind',
      'location',
      'revision',
    ] as const)
      if (stored.value.descriptor[key] !== expected[key])
        return failure('VALIDATION', 'The local file differs from the sent service.');
    const marker = await readDeviceSession();
    if (marker?.profileId !== profileId || marker.signedOut)
      return failure('FORBIDDEN', 'This profile has changed or signed out.');
    return { ok: true, value: createMediaUrl(profileId, id, stored.value.blob) };
  };
}
