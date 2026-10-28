import {VideoLayer,type VideoPlayback} from '../../features/presenter/VideoLayer';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type { Slide } from '../../domain/slide';
import type { MediaResolver } from '../../domain/media';
import { useResolvedMedia } from './media-context';
export function BackgroundVideo({url,animate,style,onFailure,mode='background'}:{url:string;animate:boolean;style?:CSSProperties;onFailure?():void;mode?:'background'|'standalone'}){
 const video=useRef<HTMLVideoElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const element=video.current;return()=>{if(element && !element.paused)element.pause();};},[url]);
 useEffect(()=>{const element=video.current;if(!element)return;let active=true;if(!animate){if(!element.paused)element.pause();}else void Promise.resolve(element.play()).then(()=>{if(active)setFailed(false);}).catch(()=>{if(active){setFailed(true);onFailure?.();}});return()=>{active=false;};},[url,animate,onFailure]);
 return <><video ref={video} src={url} data-media-role={mode} loop={mode==='background' && animate} muted autoPlay={animate} playsInline preload={animate?'auto':'metadata'} style={style} onError={()=>{setFailed(true);onFailure?.();}}/>{failed && <span className="slide-media-missing">Background playback unavailable · verify and reopen output.</span>}</>;
}

export function MediaLayer({ mediaId, kind, resolver, style, fit = 'cover',videoMode='background',animate=true,playback,onFailure }: {
  mediaId: string; kind: 'image' | 'video'; resolver: MediaResolver; style?: CSSProperties; fit?: 'contain' | 'cover';videoMode?:'background'|'standalone';animate?:boolean;playback?:VideoPlayback;onFailure?():void;
}) {
  const media = useResolvedMedia(mediaId,resolver);
  if (!media) return <div style={style} className="slide-media-missing">Media unavailable · add or relink the original file.</div>;
  return kind==='image' ? <img src={media.url} alt="" draggable={false} style={{ ...style, objectFit: fit }} />
    : playback && videoMode==='standalone'?<VideoLayer url={media.url} control={playback} style={{...style,objectFit:fit}}/> : <BackgroundVideo url={media.url} mode={videoMode} animate={videoMode==='background' && animate} onFailure={onFailure} style={{...style,objectFit:fit}}/>;
}
export function BackgroundLayer({ background, resolver,animate=true,onFailure }: { animate?:boolean;background: Slide['background']; resolver: MediaResolver;onFailure?():void }) {
  const style: CSSProperties = { position: 'absolute', inset: 0, width: 1920, height: 1080 };
  return background.kind==='solid' ? <div style={{ ...style, backgroundColor: background.color }} />
    : <MediaLayer mediaId={background.mediaId} kind={background.kind} animate={animate} onFailure={onFailure} resolver={resolver} style={style} />;
}
