import {useEffect,useRef,type CSSProperties} from 'react';
export type PlaybackFeedback={paused:boolean;time:number;duration:number;blocked:boolean;issue?:string};
export type VideoPlayback={paused:boolean;volume:number;time:number;seekSequence:number;blackout:boolean;onFeedback(value:PlaybackFeedback):void};
/** Only the audience receives this controller; all ordinary previews remain muted. */
export function VideoLayer({url,style,control}:{url:string;style?:CSSProperties;control:VideoPlayback}){
 const {paused,volume,time,seekSequence,blackout,onFeedback}=control;
 const video=useRef<HTMLVideoElement>(null),seek=useRef({url:'',sequence:-1}),attempt=useRef(0);
 useEffect(()=>{
  const element=video.current;if(!element)return;let active=true;
  const report=(blocked=false,issue?:string)=>{if(active)onFeedback({paused:element.paused,time:Number.isFinite(element.currentTime)?Math.min(86400,element.currentTime):0,duration:Number.isFinite(element.duration)?Math.min(86400,element.duration):0,blocked,...(issue?{issue}:{})});};
  const play=()=>{const current=++attempt.current;void element.play().then(()=>{if(active && current===attempt.current)report();}).catch(()=>{if(active && current===attempt.current)report(true,'Playback was blocked. Click the projector window and press Space, or choose Play video again.');});};
  const apply=()=>{
   element.volume=volume;element.muted=blackout;
   if(blackout || paused){attempt.current++;element.pause();}
   if(element.readyState>=1 && (seek.current.url!==url || seek.current.sequence!==seekSequence)){
    try{element.currentTime=Math.min(time,Number.isFinite(element.duration)?Math.max(0,element.duration-.001):time);seek.current={url,sequence:seekSequence};}catch{report(true,'The requested video position is unavailable.');}
   }
   if(!blackout && !paused && element.paused)play();else report();
  };
  const update=()=>report(),error=()=>{element.pause();element.muted=true;report(true,'This video could not play. Stop output and verify the original on this laptop.');};
  const gesture=(event:KeyboardEvent)=>{if(event.code==='Space' && !blackout && !paused){event.preventDefault();play();}};
  element.addEventListener('loadedmetadata',apply);for(const name of ['timeupdate','pause','playing','ended','volumechange'])element.addEventListener(name,update);element.addEventListener('error',error);window.addEventListener('keydown',gesture);apply();
  return()=>{active=false;element.removeEventListener('loadedmetadata',apply);for(const name of ['timeupdate','pause','playing','ended','volumechange'])element.removeEventListener(name,update);element.removeEventListener('error',error);window.removeEventListener('keydown',gesture);};
 },[url,paused,volume,time,seekSequence,blackout,onFeedback]);
 useEffect(()=>{const element=video.current;if(element && element.getAttribute('src')!==url)element.src=url;return()=>{if(element){element.pause();element.muted=true;element.removeAttribute('src');element.load();}};},[url]);
 return <video ref={video} src={url} data-media-role="standalone" playsInline preload="auto" style={style}/>;
}
