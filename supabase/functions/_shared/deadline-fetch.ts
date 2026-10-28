/** One upstream deadline per proxy request, including authorization and cleanup. */
export function createDeadlineFetch(base:typeof fetch=fetch,milliseconds=90000):typeof fetch{
 const deadline=AbortSignal.timeout(milliseconds);
 return (input,init)=>{
  const signal=init?.signal??(input instanceof Request?input.signal:null);
  return base(input,{...init,signal:signal?AbortSignal.any([signal,deadline]):deadline});
 };
}
