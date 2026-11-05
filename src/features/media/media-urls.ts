import type { ResolvedMedia } from '../../domain/media';
const urls = new Map<string, Map<string, Set<string>>>();
export function createMediaUrl(profileId: string, mediaId: string, blob: Blob): ResolvedMedia {
  const url = URL.createObjectURL(blob);
  let profile = urls.get(profileId);
  if (!profile) {
    profile = new Map();
    urls.set(profileId, profile);
  }
  let asset = profile.get(mediaId);
  if (!asset) {
    asset = new Set();
    profile.set(mediaId, asset);
  }
  asset.add(url);
  let released = false;
  return {
    url,
    release() {
      if (released) return;
      released = true;
      if (asset!.delete(url)) URL.revokeObjectURL(url);
      if (!asset!.size) profile!.delete(mediaId);
      if (!profile!.size) urls.delete(profileId);
    },
  };
}
export function revokeMediaUrls(profileId: string, mediaId?: string) {
  const profile = urls.get(profileId);
  if (!profile) return;
  for (const [id, asset] of profile) {
    if (mediaId && mediaId !== id) continue;
    for (const url of asset) URL.revokeObjectURL(url);
    asset.clear();
    profile.delete(id);
  }
  if (!profile.size) urls.delete(profileId);
}
