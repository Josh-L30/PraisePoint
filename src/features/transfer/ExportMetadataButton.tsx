import {useState} from 'react';
import type {ServiceSnapshot} from '../../domain/service';
import {encodeTransfer} from './export-service';
export function ExportMetadataButton({snapshot,disabled=false}:{snapshot:ServiceSnapshot;disabled?:boolean}){
 const [error,setError]=useState<string|null>(null);
 return <><button className="button" disabled={disabled} onClick={()=>{setError(null);const result=encodeTransfer(snapshot);if(!result.ok){setError(result.error.message);return;}const url=URL.createObjectURL(result.value),anchor=document.createElement('a');anchor.href=url;anchor.download='gather-service-metadata.json';anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),10000);}}>Download service metadata</button>{error && <p role="alert">{error}</p>}<p className="field-help">Metadata only. Keep original media separately; importing requires online sign-in, then exact-file relinking and preparation on the destination laptop.</p></>;
}
