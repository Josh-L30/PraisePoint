import { useEffect, useState } from 'react';
import type { MediaResolver, ResolvedMedia } from '../../domain/media';
import { failure } from '../../domain/result';
export const unavailableMedia: MediaResolver = async () =>
  failure('NOT_FOUND', 'Media unavailable. Add or relink the original file.');
type MediaState =
  { status: 'loading' | 'failed'; value?: never } | { status: 'ready'; value: ResolvedMedia };
export function useResolvedMedia(id: string, resolver: MediaResolver): MediaState {
  const [resource, setResource] = useState<{
    id: string;
    resolver: MediaResolver;
    state: MediaState;
  } | null>(null);
  useEffect(() => {
    let active = true,
      held: ResolvedMedia | null = null;
    const failed = () => {
      if (active) setResource({ id, resolver, state: { status: 'failed' } });
    };
    void Promise.resolve()
      .then(() => resolver(id))
      .then((result) => {
        if (!result.ok) {
          failed();
          return;
        }
        if (!active) {
          result.value.release();
          return;
        }
        held = result.value;
        if (!/^(blob:|https?:)/.test(held.url)) {
          held.release();
          held = null;
          failed();
          return;
        }
        setResource({ id, resolver, state: { status: 'ready', value: held } });
      })
      .catch(failed);
    return () => {
      active = false;
      held?.release();
    };
  }, [id, resolver]);
  return resource?.id === id && resource.resolver === resolver
    ? resource.state
    : { status: 'loading' };
}
