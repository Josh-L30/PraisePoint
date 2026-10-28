import {failure} from '../../domain/result';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {z} from 'zod';
import {SlideRenderer} from '../../components/slide-renderer/SlideRenderer';
import {readDeviceSession} from '../../lib/device-session';
import {createPresenterChannel,type PresenterEvent} from './presenter-channel';
import {backgroundIdentity,type PresenterState} from './presenter-state';
import {localSnapshotResolver} from './local-snapshot-media';
import type {PlaybackFeedback} from './VideoLayer';
export function AudiencePage({sessionId}:{sessionId:string}){
 const [audienceId]=useState(()=>crypto.randomUUID()),[frame,setFrame]=useState<{state:PresenterState;profileId:string}|null>(null),[fault,setFault]=useState(false);
 const channel=useRef<ReturnType<typeof createPresenterChannel>|null>(null),current=useRef(frame),generation=useRef(0),lastHeartbeat=useRef(0);
 useEffect(()=>{
  if(!z.uuid().safeParse(sessionId).success)return;let active=true;
  const stop=()=>{if(!active)return;generation.current++;current.current=null;setFrame(null);setFault(false);};
  const connection=createPresenterChannel(sessionId,{audienceId,onEvent(event:PresenterEvent){
   if(event.kind==='stop')stop();
   if(event.kind==='heartbeat' && event.audienceId===audienceId){lastHeartbeat.current=performance.now();connection.post({kind:'heartbeat',audienceId});}
  }});channel.current=connection;
  connection.subscribe((state,profileId)=>{const request=++generation.current;
   void readDeviceSession().then(marker=>{if(!active || request!==generation.current)return;if(marker?.profileId!==profileId || marker.signedOut){stop();return;}
    const next={state,profileId};current.current=next;setFrame(next);lastHeartbeat.current=performance.now();
   }).catch(stop);
  });
  connection.post({kind:'join',audienceId});
  const timer=window.setInterval(()=>{
   if(performance.now()-lastHeartbeat.current>3500){if(current.current)stop();connection.post({kind:'join',audienceId});}
   if(current.current){const profileId=current.current.profileId;void readDeviceSession().then(marker=>{if(active && (marker?.profileId!==profileId || marker.signedOut))stop();}).catch(stop);}
  },1000);
  const fullscreen=(event:KeyboardEvent)=>{if(event.key.toLowerCase()==='f'){event.preventDefault();void document.documentElement.requestFullscreen().catch(()=>{const state=current.current?.state;connection.post({kind:'feedback',audienceId,sequence:state?.sequence??0,paused:true,time:0,duration:0,blocked:true,issue:'Fullscreen was blocked. Focus the projector window and use its browser fullscreen command.'});});}};
  const closing=()=>connection.post({kind:'closed',audienceId});window.addEventListener('pagehide',closing);window.addEventListener('keydown',fullscreen);
  return()=>{active=false;window.clearInterval(timer);closing();connection.close();channel.current=null;current.current=null;window.removeEventListener('pagehide',closing);window.removeEventListener('keydown',fullscreen);};
 },[sessionId,audienceId]);
 const snapshot=frame?.state.snapshot,profileId=frame?.profileId;
 const resolver=useMemo(()=>snapshot && profileId?localSnapshotResolver(profileId,snapshot):null,[profileId,snapshot]);
 const feedback=useCallback((value:PlaybackFeedback)=>{const state=current.current?.state;if(state)channel.current?.post({kind:'feedback',audienceId,sequence:state.sequence,...value});},[audienceId]);
 const fontStatus=useCallback((status:'loading'|'ready'|'missing')=>{if(status==='missing'){setFault(true);feedback({paused:true,time:0,duration:0,blocked:true,issue:'The projector font could not load. Reconnect and reopen the projector window.'});}},[feedback]);
 const asyncMedia=useCallback(async(id:string)=>{
  if(!resolver)return failure('NOT_FOUND','No service has been sent.');const result=await resolver(id);
  if(!result.ok && current.current){setFault(true);feedback({paused:true,time:0,duration:0,blocked:true,issue:'A required file is missing or damaged. Verify it, then reopen the projector.'});}return result;
 },[resolver,feedback]);
 const state=frame?.state;
 return <main className="audience-output" data-audience-id={audienceId}>
  {state && resolver && <SlideRenderer slide={state.snapshot.slides[state.index]} mode="audience" onFontStatus={fontStatus} backgroundIdentity={backgroundIdentity(state)} resolveMedia={asyncMedia} videoPlayback={{...state.standalone,blackout:state.blackout || fault,onFeedback:feedback}}/>}
  {(!state || state.blackout || fault) && <div className="audience-blackout" aria-label="Black projector output"/>}
 </main>;
}
