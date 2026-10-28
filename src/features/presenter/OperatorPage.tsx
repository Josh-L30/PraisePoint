import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router';
import {ArrowLeft,ArrowRight,MonitorUp,Square,Play,Pause,RotateCcw} from 'lucide-react';
import {SlideRenderer} from '../../components/slide-renderer/SlideRenderer';
import {serviceService} from '../services/service-service';
import {createMediaService} from '../media/media-service';
import {createPresenterChannel,openAudience} from './presenter-channel';
import {initialPresenterState,applyPresenterCommand,isPresenterInput,type PresenterCommand,type PresenterState} from './presenter-state';
import type {PlaybackFeedback} from './VideoLayer';
export function OperatorPage({profileId,serviceId}:{profileId:string;serviceId:string}){
 const [sessionId]=useState(()=>crypto.randomUUID()),[state,setState]=useState<PresenterState|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState('Loading the saved service…');
 const [sent,setSent]=useState(false),[connected,setConnected]=useState(false),[connectionStatus,setConnectionStatus]=useState('Open the projector window when you are ready.'),[jump,setJump]=useState('1'),[thumbnailPage,setThumbnailPage]=useState(0),[playback,setPlayback]=useState<PlaybackFeedback|null>(null);
 const current=useRef(state),channel=useRef<ReturnType<typeof createPresenterChannel>|null>(null),audience=useRef<string|null>(null),output=useRef<Window|null>(null),armed=useRef(false),lastSeen=useRef(0);
 const media=useMemo(()=>createMediaService(profileId),[profileId]);
 const dispatch=useCallback((command:PresenterCommand)=>{const previous=current.current;if(!previous)return;const next=applyPresenterCommand(previous,command);current.current=next;setState(next);setThumbnailPage(Math.floor(next.index/8));if(armed.current)channel.current?.send(next);},[]);
 useEffect(()=>{
  let active=true;queueMicrotask(()=>{if(!active)return;setError(null);setLoading('Loading the saved service…');
   void(async()=>{
    const result=await serviceService.buildServiceSnapshot(serviceId);if(!active)return;if(!result.ok){setError(result.error.message);setLoading('');return;}
    try{
     const fonts=await document.fonts.load('72px Figtree');if(!active)return;if(!fonts.some(font=>font.status==='loaded') || !document.fonts.check('72px Figtree'))throw new Error('Figtree could not load. Reconnect and reload before presenting.');
     for(let i=0;i<result.value.media.length;i++){
      setLoading('Verifying file '+(i+1)+' of '+result.value.media.length+'…');const verified=await media.verifyMedia(result.value.media[i].id);if(!active)return;if(!verified.ok)throw new Error(result.value.media[i].originalName+': '+verified.error.message);
      const expected=result.value.media[i];if(verified.value.workspaceId!==expected.workspaceId || verified.value.sha256!==expected.sha256 || verified.value.bytes!==expected.bytes || verified.value.revision!==expected.revision)throw new Error('A file differs from this saved service. Review the latest service before presenting.');
     }
     const next=initialPresenterState(sessionId,result.value);current.current=next;setState(next);setLoading('');
    }catch(error){if(active){setError(error instanceof Error?error.message:'This service could not be verified.');setLoading('');}}
   })();
  });return()=>{active=false;current.current=null;};
 },[profileId,serviceId,sessionId,media]);
 useEffect(()=>{
  const connection=createPresenterChannel(sessionId,{profileId,onEvent(event){
   if(event.kind==='join'){
    audience.current=event.audienceId;connection.setAudience(event.audienceId);armed.current=false;setSent(false);lastSeen.current=performance.now();setConnected(true);setPlayback(null);setConnectionStatus('Projector connected · send the current slide when ready.');
   }else if('audienceId' in event && event.audienceId===audience.current){
    if(event.kind==='heartbeat'){lastSeen.current=performance.now();}
    if(event.kind==='closed'){armed.current=false;setConnected(false);setConnectionStatus('Projector window closed. Open it again to reconnect.');}
    if(event.kind==='feedback' && event.sequence===current.current?.sequence){lastSeen.current=performance.now();setPlayback(event);setError(event.issue??null);}
   }
  }});channel.current=connection;
  const stop=()=>{armed.current=false;connection.post({kind:'stop'});};
  const timer=window.setInterval(()=>{
   if(output.current?.closed){if(audience.current){audience.current=null;armed.current=false;setConnected(false);setConnectionStatus('Projector window closed. Open it again to reconnect.');}return;}
   if(audience.current){connection.post({kind:'heartbeat',audienceId:audience.current});if(performance.now()-lastSeen.current>4500){armed.current=false;setConnected(false);setConnectionStatus('Projector connection lost. Reopen it and send the current slide.');}}
  },1000);
  const keyboard=(event:KeyboardEvent)=>{
   if(event.repeat || event.altKey || event.ctrlKey || event.metaKey || isPresenterInput(event.target))return;
   if(event.code==='Space' && event.target instanceof Element && event.target.closest('button,a'))return;
   const command:PresenterCommand|null=event.code==='Space' || event.key==='ArrowRight'?{type:'next'}:event.key==='ArrowLeft'?{type:'previous'}:event.key.toLowerCase()==='b' || event.key==='Escape'?{type:'blackout'}:null;
   if(command){event.preventDefault();dispatch(command);}
  };
  window.addEventListener('keydown',keyboard);window.addEventListener('pagehide',stop);window.addEventListener('gather-before-account-change',stop);
  return()=>{stop();window.clearInterval(timer);connection.close();channel.current=null;window.removeEventListener('keydown',keyboard);window.removeEventListener('pagehide',stop);window.removeEventListener('gather-before-account-change',stop);};
 },[sessionId,profileId,dispatch]);

 function open(){
  if(output.current && !output.current.closed){output.current.focus();return;}
  audience.current=null;armed.current=false;setConnected(false);setError(null);const result=openAudience(sessionId);
  if(!result.ok){setError(result.error.message);return;}output.current=result.value;setConnectionStatus('Waiting for the projector window…');
 }
 function send(){if(!current.current || !audience.current || !connected)return;setError(null);armed.current=true;setSent(true);const next=applyPresenterCommand(applyPresenterCommand(current.current,{type:'pause'}),{type:'restore'});current.current=next;setState(next);channel.current?.send(next);setConnectionStatus('Current slide sent to the projector.');}
 const slide=state?.snapshot.slides[state.index],next=state?.snapshot.slides[state.index+1],part=state?.snapshot.sections.find(section=>state.index>=section.startIndex && state.index<section.startIndex+section.slideCount);
 const exit=state?'/app/w/'+state.snapshot.workspaceId+'/services/'+serviceId:'/app';
 return <main className="operator-page"><header className="operator-header glass"><div><Link className="text-button" to={exit}><ArrowLeft size={15} aria-hidden="true"/>Exit presenter</Link><p className="eyebrow">Service presenter</p><h1>{state?.snapshot.title??'Preparing your service.'}</h1></div><div className="action-row"><button className="button" disabled={!state} onClick={open}><MonitorUp size={17}/>Open projector</button><button className="button button-primary" disabled={!state || !connected} onClick={send}>Send current slide</button></div></header>
  <section className="operator-status glass"><p role="status">{connectionStatus}</p><p className="field-help">Move the output window to your projector. Focus it and press F for fullscreen, or use the browser’s fullscreen command. New or reopened output stays black until you send a slide.</p></section>
  {loading && <p className="page-content" role="status">{loading}</p>}{error && <p className="form-message form-error" role="alert">{error}</p>}
  {state && slide && <>
  <section className="operator-controls glass" aria-label="Presentation controls"><div className="action-row"><button className="button" disabled={state.index===0} onClick={()=>dispatch({type:'previous'})}><ArrowLeft size={17}/>Previous slide</button><button className="button button-primary" disabled={state.index===state.snapshot.slides.length-1} onClick={()=>dispatch({type:'next'})}>Next slide<ArrowRight size={17}/></button><button className="button" onClick={()=>dispatch({type:'blackout'})}><Square size={16}/>Blackout</button><button className="button" disabled={!state.blackout} onClick={()=>dispatch({type:'restore'})}>Restore output</button><label className="field-label">Go to slide<input className="field-input" type="number" min={1} max={state.snapshot.slides.length} value={jump} onChange={event=>setJump(event.target.value)}/></label><button className="button" onClick={()=>{const index=Number(jump)-1;if(Number.isInteger(index))dispatch({type:'jump',index});}}>Jump to slide</button></div><p className="field-help">Right arrow / Space: next · Left arrow: previous · B / Escape: blackout. Shortcuts ignore text fields; Space activates a focused button.</p></section>
<section className="operator-previews"><article className="glass"><div className="card-heading"><h2>Current slide</h2><span>{state.blackout?'Blackout':sent?'Sent to projector':'Not sent'} · {state.index+1}/{state.snapshot.slides.length}</span></div><SlideRenderer slide={slide} mode="preview" resolveMedia={media.resolveMedia} animateMedia={false}/><p>{part?.label}</p></article><article className="glass"><h2>Next slide</h2>{next?<SlideRenderer slide={next} mode="preview" resolveMedia={media.resolveMedia} animateMedia={false}/>:<div className="operator-end">End of service</div>}<p className="field-help">Previews stay muted. Slides advance only when you choose.</p></article></section>
  {slide.standaloneVideoId && <section className="operator-video glass" aria-label="Standalone video controls"><h2>Video transport</h2><div className="action-row"><button className="button" disabled={state.blackout || !sent} onClick={()=>{setError(null);dispatch({type:'play'});}}><Play size={16}/>Play video</button><button className="button" onClick={()=>dispatch({type:'pause'})}><Pause size={16}/>Pause video</button><button className="button" onClick={()=>dispatch({type:'seek',time:0})}><RotateCcw size={16}/>Restart video</button><label className="field-label">Video volume<input type="range" min={0} max={1} step={.05} value={state.standalone.volume} onChange={event=>dispatch({type:'volume',value:Number(event.target.value)})}/></label><label className="field-label">Video position (seconds)<input type="range" min={0} max={playback?.duration || 1} step={.1} disabled={!playback?.duration} value={Math.min(playback?.time??0,playback?.duration || 1)} onChange={event=>dispatch({type:'seek',time:Number(event.target.value)})}/></label></div><p>{playback?.blocked?'Playback needs attention':playback?playback.paused?'Video paused':'Video playing':'Waiting for the audience video.'} · Only the audience window can play audio.</p></section>}
  <section className="operator-thumbnails glass" aria-label="Slide thumbnails"><div className="operator-thumbnail-grid">{state.snapshot.slides.slice(thumbnailPage*8,thumbnailPage*8+8).map((item,n)=><button className="operator-thumbnail" key={item.id} aria-label={'Show slide '+(thumbnailPage*8+n+1)} aria-pressed={state.index===thumbnailPage*8+n} onClick={()=>dispatch({type:'jump',index:thumbnailPage*8+n})}><div aria-hidden="true"><SlideRenderer slide={item} mode="preview" animateMedia={false} resolveMedia={media.resolveMedia}/></div><span>{thumbnailPage*8+n+1}</span></button>)}</div><div className="library-pagination"><button className="button" disabled={thumbnailPage===0} onClick={()=>setThumbnailPage(page=>page-1)}>Previous thumbnails</button><span>Thumbnails {thumbnailPage*8+1}–{Math.min(state.snapshot.slides.length,thumbnailPage*8+8)}</span><button className="button" disabled={(thumbnailPage+1)*8>=state.snapshot.slides.length} onClick={()=>setThumbnailPage(page=>page+1)}>Next thumbnails</button></div></section>
  <nav className="operator-sections glass" aria-label="Service sections">{state.snapshot.sections.map(section=><button className="button" aria-current={part?.id===section.id?'step':undefined} key={section.id} onClick={()=>dispatch({type:'jump',index:section.startIndex})}>{section.label} · {section.startIndex+1}</button>)}</nav></>}
  <p className="operator-desktop-note">Present from a desktop laptop connected to your projector. Keep this operator window on the laptop.</p>
 </main>;
}
