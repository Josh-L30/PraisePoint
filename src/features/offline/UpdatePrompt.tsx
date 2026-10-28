import {useState,useSyncExternalStore} from 'react';
import {hasAppUpdate,requestAppUpdate,subscribeAppUpdate} from './runtime-client';
export function UpdatePrompt(){const waiting=useSyncExternalStore(subscribeAppUpdate,hasAppUpdate,()=>false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 if(!waiting)return null;return <section className="glass update-notice" aria-label="App update"><strong>An app update is available.</strong><p>Apply it after preparing and presenting. Every Gather window must confirm it is idle.</p><button className="button" disabled={busy} onClick={()=>{setBusy(true);void requestAppUpdate().then(result=>{setMessage(result.ok?'Update approved. Idle windows will reload.':result.error.message);setBusy(false);});}}>Update app</button>{message && <p role="status">{message}</p>}</section>;
}
