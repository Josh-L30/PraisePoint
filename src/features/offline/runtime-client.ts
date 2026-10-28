import {updateProofName} from './cache-policy';
import {failure,type Result} from '../../domain/result';
import {APP_BUILD,RUNTIME_LOCK} from './runtime-constants';
let activity=0,initialized=false,registration:ServiceWorkerRegistration|null=null,waiting=false;
const listeners=new Set<()=>void>();
function changed(){for(const listener of listeners)listener();}
export const subscribeAppUpdate=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const hasAppUpdate=()=>waiting;
export function markRuntimeBusy(){activity++;let released=false;return()=>{if(!released){released=true;activity--;}};}
export function initializeOfflineRuntime(){
 if(initialized || !import.meta.env.PROD || !('serviceWorker' in navigator))return;initialized=true;let previous=navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='GATHER_QUERY_IDLE')event.ports[0]?.postMessage({idle:activity===0 && !location.pathname.startsWith('/auth/callback')});});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{const next=navigator.serviceWorker.controller;waiting=false;changed();if(previous && next!==previous && activity===0)location.reload();previous=next;});
 void navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).then(value=>{
  registration=value;const inspect=()=>{waiting=!!value.waiting && !!navigator.serviceWorker.controller;changed();};inspect();
  value.addEventListener('updatefound',()=>{value.installing?.addEventListener('statechange',inspect);});
 }).catch(()=>{/* Online use remains available; preparation reports the unavailable cache. */});
}
async function message(worker:ServiceWorker,type:string,timeout=12000,extra:Record<string,unknown>={}):Promise<Record<string,unknown>>{
 return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(new Error('The app cache did not respond. Reconnect and reopen the app.'));},timeout);
  channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data as Record<string,unknown>);};worker.postMessage({type,...extra},[channel.port2]);
 });
}
async function controlledWorker():Promise<ServiceWorker>{
 let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('The app cache is unavailable. Reconnect and reopen the app.')),12000);})]);}finally{clearTimeout(timer);}
 if(navigator.serviceWorker.controller)return navigator.serviceWorker.controller;
 return await new Promise((resolve,reject)=>{const ready=()=>{const worker=navigator.serviceWorker.controller;if(worker){clearTimeout(timeout);navigator.serviceWorker.removeEventListener('controllerchange',ready);resolve(worker);}},timeout=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',ready);reject(new Error('The app cache is still starting. Reopen this page and retry.'));},2000);navigator.serviceWorker.addEventListener('controllerchange',ready);ready();});
}
export async function verifyAppShell():Promise<Result<{appBuild:string}>>{
 if(!import.meta.env.PROD || !('serviceWorker' in navigator))return failure('UNSUPPORTED','Offline preparation is available in the installed or published app.');
 try{
  initializeOfflineRuntime();const worker=await controlledWorker();
  const response=await message(worker,'GATHER_VERIFY_SHELL');if(response.ok!==true)return failure('STORAGE_UNAVAILABLE',typeof response.reason==='string'?response.reason:'The app cache is incomplete.');
  if(response.build!==APP_BUILD)return failure('CONFLICT','The app version changed. Reload before preparing or presenting.');return {ok:true,value:{appBuild:APP_BUILD}};
 }catch(error){return failure('STORAGE_UNAVAILABLE',error instanceof Error?error.message:'The app cache could not be verified.');}
}
export async function acquireRuntimeActivity(kind:'present'|'prepare'='present'):Promise<Result<()=>void>>{
 if(!navigator.locks)return failure('UNSUPPORTED','This browser cannot safely protect an offline presentation. Use current desktop Chrome or Edge.');
 const releaseBusy=markRuntimeBusy();return new Promise(resolve=>{
  let releaseHold:(()=>void)|undefined,settled=false;const finish=(result:Result<()=>void>)=>{if(!settled){settled=true;resolve(result);}};
  void navigator.locks.request(RUNTIME_LOCK,kind==='prepare'?{mode:'exclusive',ifAvailable:true}:{mode:'shared',signal:AbortSignal.timeout(15000)},async lock=>{
   if(!lock){releaseBusy();finish(failure('CONFLICT','Finish presenting or preparing in the other window before changing prepared copies.'));return;}
   try{
    if(import.meta.env.PROD){const worker=await controlledWorker();
     const response=await message(worker,'GATHER_BUILD');if(response.build!==APP_BUILD){releaseBusy();finish(failure('CONFLICT','The app has updated. Reload before preparing or presenting.'));return;}}
    await new Promise<void>(release=>{releaseHold=release;let released=false;finish({ok:true,value:()=>{if(!released){released=true;releaseBusy();release();}}});});
   }catch{releaseBusy();finish(failure('STORAGE_UNAVAILABLE','This browser could not protect the presentation from an app update.'));}
  }).catch(()=>{releaseBusy();releaseHold?.();finish(failure('STORAGE_UNAVAILABLE','The presentation lock is unavailable.'));});
 });
}
export async function requestAppUpdate():Promise<Result<void>>{
 const target=registration?.waiting;if(!target)return failure('NOT_FOUND','No app update is waiting.');if(!navigator.locks)return failure('UNSUPPORTED','Close all Gather windows and reopen to update safely.');
 try{return await navigator.locks.request(RUNTIME_LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)return failure('CONFLICT','Finish preparing or presenting before updating the app.');const nonce=crypto.randomUUID();
  return await navigator.locks.request(updateProofName(nonce),{mode:'exclusive'},async()=>{
   const previous=navigator.serviceWorker.controller;let changed:(()=>void)|undefined;
   const activated=new Promise<void>(resolve=>{changed=()=>{if(navigator.serviceWorker.controller!==previous)resolve();};navigator.serviceWorker.addEventListener('controllerchange',changed);});
   try{const response=await message(target,'GATHER_ACTIVATE_IF_IDLE',12000,{nonce});if(response.ok!==true)return failure('CONFLICT',typeof response.reason==='string'?response.reason:'Finish preparing or presenting before updating.');await activated;return {ok:true as const,value:undefined};}
   finally{if(changed)navigator.serviceWorker.removeEventListener('controllerchange',changed);}
  });
 });}catch{return failure('NETWORK','The update could not confirm every window is idle. Keep using this version and retry later.');}
}
