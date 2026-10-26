import type { CSSProperties } from 'react';
import type { Slide } from '../../domain/slide';
import type { MediaResolver } from '../../domain/media';
import { useResolvedMedia } from './media-context';
export function MediaLayer({ mediaId, kind, resolver, style, fit = 'cover' }: {
  mediaId: string; kind: 'image' | 'video'; resolver: MediaResolver; style?: CSSProperties; fit?: 'contain' | 'cover';
}) {
  const media = useResolvedMedia(mediaId,resolver);
  if (!media) return <div style={style} className="slide-media-missing">Media unavailable · add or relink the original file.</div>;
  return kind==='image' ? <img src={media.url} alt="" draggable={false} style={{ ...style, objectFit: fit }} />
    : <video src={media.url} loop muted autoPlay playsInline style={{ ...style, objectFit: 'cover' }} />;
}
export function BackgroundLayer({ background, resolver }: { background: Slide['background']; resolver: MediaResolver }) {
  const style: CSSProperties = { position: 'absolute', inset: 0, width: 1920, height: 1080 };
  return background.kind==='solid' ? <div style={{ ...style, backgroundColor: background.color }} />
    : <MediaLayer mediaId={background.mediaId} kind={background.kind} resolver={resolver} style={style} />;
}
