export const UPDATE_FENCE_CACHE='gather-update-fence-v2';
export function createUpdateFence(storage:CacheStorage,origin:string){
 const key=new URL('/__gather_runtime_update__',origin).href;
 const pending=async()=>!!await storage.match(key,{cacheName:UPDATE_FENCE_CACHE});
 return {pending,async begin(build:string,nonce:string){
  if(!/^[0-9a-f]{64}$/.test(build) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(nonce) || await pending())throw new Error('An update is already pending or its identity is invalid.');
  const cache=await storage.open(UPDATE_FENCE_CACHE);await cache.put(key,new Response(JSON.stringify({protocol:2,build,nonce}),{headers:{'Content-Type':'application/json'}}));
 },async clear(){await storage.delete(UPDATE_FENCE_CACHE);}};
}
export const pendingUpdate=()=>createUpdateFence(caches,location.origin).pending();
export const beginUpdate=(build:string,nonce:string)=>createUpdateFence(caches,location.origin).begin(build,nonce);
export const finishUpdate=()=>createUpdateFence(caches,location.origin).clear();
