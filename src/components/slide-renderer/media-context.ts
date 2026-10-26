import { useEffect, useState } from 'react';
import type { MediaResolver, ResolvedMedia } from '../../domain/media';
import { failure } from '../../domain/result';
export const unavailableMedia: MediaResolver = async () => failure('NOT_FOUND','Media unavailable. Add or relink the original file.');
export function useResolvedMedia(id: string, resolver: MediaResolver) {
  const [resource,setResource] = useState<{ id: string; resolver: MediaResolver; value: ResolvedMedia } | null>(null);
  useEffect(() => {
    let active = true, held: ResolvedMedia | null = null;
    void resolver(id).then(result => {
      if (!result.ok) return;
      if (!active) { result.value.release(); return; }
      held=result.value;
      if (!/^(blob:|https?:)/.test(held.url)) { held.release(); held=null; return; }
      setResource({ id, resolver, value: held });
    }).catch(() => { /* Missing media remains visible and cannot become a ready claim. */ });
    return () => { active=false; held?.release(); };
  },[id,resolver]);
  return resource?.id===id && resource.resolver===resolver ? resource.value : null;
}
