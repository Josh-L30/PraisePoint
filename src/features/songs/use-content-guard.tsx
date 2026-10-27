import { useEffect } from 'react';
import { useBlocker } from 'react-router';
export function useContentGuard(dirty:boolean,busy:boolean){
 const blocker=useBlocker(dirty || busy);
 useEffect(()=>{
  const unload=(event:BeforeUnloadEvent)=>{if(dirty || busy){event.preventDefault();event.returnValue='';}};
  const account=(event:Event)=>{if(busy || (dirty && !window.confirm('Discard your unsaved changes and sign out?')))event.preventDefault();};
  window.addEventListener('beforeunload',unload);window.addEventListener('gather-before-account-change',account);
  return()=>{window.removeEventListener('beforeunload',unload);window.removeEventListener('gather-before-account-change',account);};
 },[dirty,busy]);
 useEffect(()=>{if(blocker.state==='blocked' && !dirty && !busy)blocker.proceed();},[blocker,dirty,busy]);
 return blocker.state==='blocked'?<section className="confirmation-panel" aria-label="Unsaved changes"><h2>Keep your changes?</h2><p>{busy?'Wait for the save to finish.':'This page has unsaved changes. Leaving discards this draft.'}</p><div className="action-row"><button className="button" onClick={()=>blocker.reset()}>Stay here</button><button className="button" disabled={busy} onClick={()=>blocker.proceed()}>Discard and leave</button></div></section>:null;
}
