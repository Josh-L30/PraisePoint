import {useMemo,useRef,useState} from 'react';
import {Link} from 'react-router';
import type {Result} from '../../domain/result';
import {createImportService,type ImportResult} from './import-service';
import {parseTransferFile,type TransferBundle} from './transfer-schema';
type Props={profileId:string;workspace:{id:string;name:string};importer?:{importServiceMetadata(bundle:TransferBundle,destination:string):Promise<Result<ImportResult>>};onBusyChange(value:boolean):void;onStaged(value:boolean):void;onCancel():void};
export function TransferDialog({profileId,workspace,importer,onBusyChange,onStaged,onCancel}:Props){
 const service=useMemo(()=>importer??createImportService(profileId),[importer,profileId]);
 const [candidate,setCandidate]=useState<TransferBundle|null>(null),[result,setResult]=useState<ImportResult|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);const working=useRef(false);
 function activity(value:boolean){working.current=value;setBusy(value);onBusyChange(value);}
 async function inspect(file:File){if(working.current)return;activity(true);setError(null);setCandidate(null);setResult(null);onStaged(false);try{const parsed=await parseTransferFile(file);if(parsed.ok){setCandidate(parsed.value);onStaged(true);}else setError(parsed.error.message);}finally{activity(false);}}
 async function importCopy(){if(!candidate || working.current)return;activity(true);setError(null);try{const imported=await service.importServiceMetadata(candidate,workspace.id);if(imported.ok){setResult(imported.value);setCandidate(null);onStaged(false);}else setError(imported.error.message);}catch{setError('Import could not be confirmed. Check the service library before importing again.');}finally{activity(false);}}
 return <section className="glass content-editor" aria-label="Import service metadata" aria-busy={busy}><h2>Bring a service to this workspace.</h2><p>Destination: {workspace.name}. Import creates independent presentations and service order; it does not change existing songs or permissions.</p><p>Media bytes are not included. Transfer original images and videos separately, then reselect each exact file in Media library. Only prepare after every file verifies.</p>
 {error && <p role="alert" className="form-message form-error">{error}</p>}
 {!result && <label className="field-label">Service metadata file<input className="field-input" type="file" accept=".json,application/json" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void inspect(file);event.target.value='';}}/></label>}
 {candidate && <div><h3>{candidate.snapshot.title}</h3><p>{candidate.snapshot.sections.length} service items · {candidate.snapshot.slides.length} slides · {candidate.snapshot.media.length} original media files to relink.</p><button className="button button-primary" disabled={busy} onClick={()=>void importCopy()}>Import independent service</button></div>}
 {result && <div role="status"><h3>Independent service imported.</h3><p>{result.missingMediaIds.length} media files require exact originals on this laptop. No file is marked ready by this import.</p><div className="action-row"><Link className="button button-primary" to={'/app/w/'+workspace.id+'/services/'+result.serviceId}>Open imported service</Link><Link className="button" to={'/app/w/'+workspace.id+'/media'}>Relink original files</Link></div></div>}
 <button className="text-button" disabled={busy} onClick={()=>{onStaged(false);onCancel();}}>Close import</button></section>;
}
