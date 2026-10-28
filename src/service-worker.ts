/// <reference lib="webworker" />
import {PrecacheController} from 'workbox-precaching';
import {APP_BUILD,RUNTIME_LOCK} from './features/offline/runtime-constants';
import {isOfflineNavigation,validateShellEntries,hasUpdateProof,type ShellEntry} from './features/offline/cache-policy';
declare const self:ServiceWorkerGlobalScope & {__WB_MANIFEST:ShellEntry[]};
const entries=self.__WB_MANIFEST as ShellEntry[],cacheName='gather-shell-'+APP_BUILD,precache=new PrecacheController({cacheName});
precache.addToCacheList(entries);
self.addEventListener('install',event=>event.waitUntil(precache.install(event)));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await precache.activate(event);await self.clients.claim();
 for(const name of await caches.keys())if(name.startsWith('gather-shell-') && name!==cacheName)await caches.delete(name);
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const key=precache.getCacheKeyForURL(url.href);
 if(key){event.respondWith(precache.matchPrecache(url.href).then(response=>response??new Response('Cached app file is missing.',{status:503})));return;}
 if(request.mode==='navigate' && isOfflineNavigation(url,self.location.origin))event.respondWith(precache.matchPrecache('index.html').then(response=>response??new Response('Prepare the app online before opening it offline.',{status:503})));
});
async function verifyShell(){
 if(!validateShellEntries(entries))return {ok:false,reason:'The app cache manifest is incomplete.'};
 let total=0;for(const entry of entries){const response=await precache.matchPrecache(entry.url);if(!response || response.status!==200)return {ok:false,reason:'A required app or font file is missing. Reconnect and refresh the app.'};
  const bytes=await response.arrayBuffer();total+=bytes.byteLength;if(bytes.byteLength>2*1024*1024 || total>32*1024*1024)return {ok:false,reason:'The app cache exceeds its verified limits.'};
  const digest=await crypto.subtle.digest('SHA-256',bytes),actual='sha256-'+btoa(String.fromCharCode(...new Uint8Array(digest)));if(actual!==entry.integrity)return {ok:false,reason:'A cached app or font file is damaged. Reconnect and refresh the app.'};
 }return {ok:true,build:APP_BUILD,fileCount:entries.length};
}
function askIdle(client:WindowClient):Promise<boolean>{return new Promise(resolve=>{
 const message=new MessageChannel(),timer=setTimeout(()=>{message.port1.close();resolve(false);},1200);
 message.port1.onmessage=event=>{clearTimeout(timer);message.port1.close();resolve(event.data?.idle===true);};client.postMessage({type:'GATHER_QUERY_IDLE'},[message.port2]);
});}
self.addEventListener('message',event=>{
 const port=event.ports[0],data=event.data;if(!port || !data || typeof data!=='object')return;
 if(data.type==='GATHER_VERIFY_SHELL')event.waitUntil(verifyShell().then(result=>port.postMessage(result)).catch(()=>port.postMessage({ok:false,reason:'The app cache could not be verified.'})));
 if(data.type==='GATHER_BUILD')port.postMessage({ok:true,build:APP_BUILD});
 if(data.type==='GATHER_ACTIVATE_IF_IDLE')event.waitUntil((async()=>{
  const source=event.source;if(!self.navigator.locks || !source || !('url' in source) || new URL(source.url).origin!==self.location.origin || !hasUpdateProof((await self.navigator.locks.query()).held??[],RUNTIME_LOCK,data.nonce)){port.postMessage({ok:false,reason:'The requesting window does not hold the exclusive update lease.'});return;}
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(!(await Promise.all(clients.map(askIdle))).every(Boolean)){port.postMessage({ok:false,reason:'Another Gather window is busy or could not confirm its state. Close it or finish its work before updating.'});return;}
  const after=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(after.length!==clients.length || after.some(client=>!clients.some(before=>before.id===client.id)) || !hasUpdateProof((await self.navigator.locks.query()).held??[],RUNTIME_LOCK,data.nonce)){port.postMessage({ok:false,reason:'The open windows or update lease changed. Retry when they are idle.'});return;}
  port.postMessage({ok:true});await self.skipWaiting();
 })().catch(()=>port.postMessage({ok:false,reason:'The update was deferred. Keep using this app version.'})));

});
