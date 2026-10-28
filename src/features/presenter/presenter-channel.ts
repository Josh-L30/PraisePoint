import {z} from 'zod';
import {failure,type Result} from '../../domain/result';
import {validateServiceSnapshot} from '../services/snapshot-validation';
import type {PresenterState} from './presenter-state';
const id=z.uuid(),sequence=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const eventSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('join'),audienceId:id}).strict(),
 z.object({kind:z.literal('closed'),audienceId:id}).strict(),
 z.object({kind:z.literal('heartbeat'),audienceId:id}).strict(),
 z.object({kind:z.literal('stop')}).strict(),
 z.object({kind:z.literal('feedback'),audienceId:id,sequence,paused:z.boolean(),time:z.number().finite().min(0).max(86400),duration:z.number().finite().min(0).max(86400),blocked:z.boolean(),issue:z.string().max(250).optional()}).strict()
]);
export type PresenterEvent=z.infer<typeof eventSchema>;
const frame=z.object({sessionId:id,sequence,snapshot:z.unknown(),index:z.number().int().nonnegative().max(1999),blackout:z.boolean(),standalone:z.object({paused:z.boolean(),volume:z.number().min(0).max(1),time:z.number().min(0).max(86400),seekSequence:sequence}).strict()}).strict();
type Transport=Pick<BroadcastChannel,'postMessage'|'close'|'onmessage'>;
type Options={profileId?:string;audienceId?:string;packageId?:string;onEvent?(event:PresenterEvent):void};
/** Same-origin local messages only; never place bearer tokens in this protocol. */
export function createPresenterChannel(sessionId:string,options:Options={},factory:(name:string)=>Transport=name=>new BroadcastChannel(name)){
 if(!id.safeParse(sessionId).success)throw new Error('Invalid presenter session.');
 const transport=factory('gather-presenter-v1:'+sessionId),listeners=new Set<(state:PresenterState,profileId:string,packageId?:string)=>void>();
 let closed=false,lastSequence=-1,recipient:string|null=null;
 let fixedSnapshot:PresenterState['snapshot']|null=null,snapshotText='',fixedProfile='',fixedPackage:string|null=null;
 transport.onmessage=event=>{
  try{
   const envelope=z.object({version:z.literal(1),sessionId:id,payload:z.unknown()}).strict().safeParse(event.data);
   if(closed || !envelope.success || envelope.data.sessionId!==sessionId)return;
   const data=envelope.data.payload;
   const incoming=z.object({kind:z.literal('state'),recipientId:id,profileId:id,packageId:id.optional(),state:frame}).strict().safeParse(data);
   if(incoming.success){
    const {state,recipientId,profileId,packageId}=incoming.data;if(!options.audienceId || recipientId!==options.audienceId || state.sessionId!==sessionId || state.sequence<=lastSequence || state.standalone.seekSequence>state.sequence)return;
    const raw=state.snapshot;if(!raw || typeof raw!=='object' || !('serviceId' in raw) || typeof raw.serviceId!=='string')return;
    const parsed=validateServiceSnapshot(raw,raw.serviceId);if(!parsed.ok || state.index>=parsed.value.slides.length)return;
    const text=JSON.stringify(parsed.value);if(fixedSnapshot && (text!==snapshotText || profileId!==fixedProfile || (packageId??null)!==fixedPackage))return;
    if(!fixedSnapshot){fixedSnapshot=parsed.value;snapshotText=text;fixedProfile=profileId;fixedPackage=packageId??null;}
    lastSequence=state.sequence;for(const listener of listeners)listener({...state,snapshot:fixedSnapshot},profileId,packageId);return;
   }
   const parsed=eventSchema.safeParse(data);if(parsed.success)options.onEvent?.(parsed.data);
  }catch{/* Malformed/oversize messages never replace the current output. */}
 };
 function post(payload:PresenterEvent){if(!closed && eventSchema.safeParse(payload).success)transport.postMessage({version:1,sessionId,payload});}
 return {
  setAudience(audienceId:string){if(id.safeParse(audienceId).success)recipient=audienceId;},
  send(state:PresenterState){if(!closed && recipient && options.profileId && state.sessionId===sessionId)transport.postMessage({version:1,sessionId,payload:{kind:'state',recipientId:recipient,profileId:options.profileId,...(options.packageId?{packageId:options.packageId}:{}),state}});},
  post,
  subscribe(callback:(state:PresenterState,profileId:string,packageId?:string)=>void){listeners.add(callback);return ()=>{listeners.delete(callback);};},
  close(){if(closed)return;closed=true;listeners.clear();transport.onmessage=null;transport.close();}
 };
}
export function openAudience(sessionId:string,opener:(url:string,target:string,features:string)=>Window|null=window.open.bind(window)):Result<Window>{
 if(!id.safeParse(sessionId).success)return failure('VALIDATION','This presentation session is invalid. Reopen the presenter.');
 try{const output=opener('/audience/'+sessionId,'gather-audience-'+sessionId,'popup,width=1280,height=720');return output?{ok:true,value:output}:failure('UNSUPPORTED','The projector window was blocked. Allow pop-ups for this website and choose Open projector again.');}
 catch{return failure('UNSUPPORTED','The projector window could not open. Allow pop-ups and try again.');}
}
