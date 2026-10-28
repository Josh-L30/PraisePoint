import {VideoLayer,type VideoPlayback} from '../../features/presenter/VideoLayer';
import type { CSSProperties } from 'react';
import type { Slide } from '../../domain/slide';
import type { MediaResolver } from '../../domain/media';
import { useResolvedMedia } from './media-context';
export function MediaLayer({ mediaId, kind, resolver, style, fit = 'cover',videoMode='background',animate=true,playback }: {
  mediaId: string; kind: 'image' | 'video'; resolver: MediaResolver; style?: CSSProperties; fit?: 'contain' | 'cover';videoMode?:'background'|'standalone';animate?:boolean;playback?:VideoPlayback;
}) {
  const media = useResolvedMedia(mediaId,resolver);
  if (!media) return <div style={style} className="slide-media-missing">Media unavailable · add or relink the original file.</div>;
  return kind==='image' ? <img src={media.url} alt="" draggable={false} style={{ ...style, objectFit: fit }} />
    : playback && videoMode==='standalone'?<VideoLayer url={media.url} control={playback} style={{...style,objectFit:fit}}/> : <video src={media.url} data-media-role={videoMode} loop={videoMode==='background' && animate} muted autoPlay={videoMode==='background' && animate} playsInline preload={videoMode==='background' && animate?'auto':'metadata'} style={{ ...style, objectFit: fit }} />;
}
export function BackgroundLayer({ background, resolver,animate=true }: { animate?:boolean;background: Slide['background']; resolver: MediaResolver }) {
  const style: CSSProperties = { position: 'absolute', inset: 0, width: 1920, height: 1080 };
  return background.kind==='solid' ? <div style={{ ...style, backgroundColor: background.color }} />
    : <MediaLayer mediaId={background.mediaId} kind={background.kind} animate={animate} resolver={resolver} style={style} />;
}
