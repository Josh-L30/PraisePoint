import {useEffect,useMemo,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router';
import type {PreparedManifest} from '../../domain/prepared-service';
import {readDeviceSession} from '../../lib/device-session';
import {PresenterConsole} from '../presenter/PresenterConsole';
import {createReadinessService} from './readiness';
import {acquireRuntimeActivity} from './runtime-client';
import {preparedSnapshotResolver} from './prepared-resolver';
export function OfflineServicePage(){
 const {packageId}=useParams(),[query]=useSearchParams(),allowSaved=query.get('saved')==='1';
 const [manifest,setManifest]=useState<PreparedManifest|null>(null),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true,release:(()=>void)|undefined,profileId='';void(async()=>{
  const marker=await readDeviceSession();if(!active)return;if(!marker || marker.signedOut || !packageId){setError('No prepared device profile is available. Sign in online and prepare a service first.');return;}profileId=marker.profileId;
  const lease=await acquireRuntimeActivity();if(!lease.ok){if(active)setError(lease.error.message);return;}if(!active){lease.value();return;}release=lease.value;
  const result=await createReadinessService(profileId).openPrepared(packageId,allowSaved);if(!active)return;if(!result.ok){setError(result.error.message);return;}setManifest(result.value);
 })().catch(()=>{if(active)setError('This complete copy could not be reopened. Reconnect and prepare it again.');});
 const timer=window.setInterval(()=>{if(profileId)void readDeviceSession().then(marker=>{if(active && (marker?.profileId!==profileId || marker.signedOut)){setManifest(null);setError('The device profile changed or signed out.');release?.();}}).catch(()=>{if(active){setManifest(null);setError('Device storage could not be verified.');release?.();}});},1000);
 return()=>{active=false;window.clearInterval(timer);release?.();};},[packageId,allowSaved]);
 const resolver=useMemo(()=>manifest?preparedSnapshotResolver(manifest.profileId,manifest.snapshot):null,[manifest]);
 return manifest && resolver?<><p className="prepared-version-note">Prepared at {new Date(manifest.preparedAt).toLocaleString()}. Online changes have not been checked during this offline session.</p><PresenterConsole profileId={manifest.profileId} snapshot={manifest.snapshot} packageId={manifest.packageId} resolveMedia={resolver} exitPath="/offline"/></>:<main className="center-page"><section className="glass message-panel"><h1>Opening the complete copy.</h1><p role={error?'alert':'status'}>{error??'Checking the app, font and every prepared file…'}</p><Link className="button" to="/offline">Prepared services</Link></section></main>;
}
