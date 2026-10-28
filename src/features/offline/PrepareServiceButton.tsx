import {useMemo,useState} from 'react';
import type {ServiceSnapshot} from '../../domain/service';
import {failure} from '../../domain/result';
import {readLocalMedia} from '../media/local-media-store';
import {createMediaService} from '../media/media-service';
import {serviceService} from '../services/service-service';
import {createPreparationService} from './prepare-service';
export function PrepareServiceButton({profileId,snapshot,onBusy}:{profileId:string;snapshot:ServiceSnapshot;onBusy?(busy:boolean):void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState<string|null>(null),[complete,setComplete]=useState(false),media=useMemo(()=>createMediaService(profileId),[profileId]);
 async function prepare(){if(busy)return;setBusy(true);onBusy?.(true);setError(null);setComplete(false);
  try{const service=createPreparationService(profileId,{snapshot:serviceService.buildServiceSnapshot,media:async asset=>{
   const verified=await media.verifyMedia(asset.id);if(!verified.ok)return verified;if((['id','workspaceId','sha256','bytes','mime','kind','location','revision'] as const).some(key=>verified.value[key]!==asset[key]))return failure('VALIDATION','This file differs from the reviewed service.');
   const file=await readLocalMedia(profileId,asset.id);return file.ok?{ok:true,value:file.value.blob}:file;
  }}),result=await service.prepareService(snapshot.serviceId,snapshot.sourceRevision,setMessage);if(result.ok){setComplete(true);setMessage('Service prepared on this laptop.');}else{setError(result.error.message);setMessage('');}}
  finally{setBusy(false);onBusy?.(false);}
 }
 return <section className="offline-prepare"><button className="button" disabled={busy} onClick={()=>void prepare()}>{busy?'Preparing complete copy…':'Prepare for offline'}</button>{message && <p role="status">{message}</p>}{error && <p role="alert" className="form-message form-error">{error}</p>}{complete && <a className="text-button" href="/offline">Open prepared services</a>}</section>;
}
