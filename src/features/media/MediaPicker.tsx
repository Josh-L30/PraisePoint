import {Modal} from '../../components/Modal';
import {useEffect,useState} from 'react';
import type {MediaAsset} from '../../../supabase/functions/_shared/media-contract';
import type {MediaService} from './media-service';
import type {ResolvedMedia} from '../../domain/media';
export function MediaThumbnail({asset,service}:{asset:MediaAsset;service:MediaService}){
 const [media,setMedia]=useState<ResolvedMedia|null>(null),[missing,setMissing]=useState(false);
 useEffect(()=>{let active=true,loaded:ResolvedMedia|null=null;void service.resolveMedia(asset.id).then(result=>{if(result.ok){loaded=result.value;if(active)setMedia(result.value);else result.value.release();}else if(active)setMissing(true);});return()=>{active=false;loaded?.release();};},[asset.id,service]);
 return <div className="media-thumbnail">{media?asset.kind==='image'?<img src={media.url} alt="" loading="lazy"/>:<video src={media.url} muted playsInline preload="metadata"/>:<span>{missing?'Original needed':asset.kind==='video'?'Video':'Image'}</span>}</div>;
}
export function MediaPicker({workspaceId,service,kind,onSelect,onClose,busy=false,externalError}:{workspaceId:string;service:MediaService;kind?:'image'|'video';busy?:boolean;externalError?:string|null;onSelect(asset:MediaAsset):void;onClose():void}){
 const [items,setItems]=useState<MediaAsset[]>([]),[page,setPage]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setLoading(true);void service.list(workspaceId,page).then(result=>{if(!active)return;if(result.ok){setItems(result.value.items);setMore(result.value.hasMore);setError(null);}else setError(result.error.message);setLoading(false);});});return()=>{active=false;};},[workspaceId,service,page]);
 return <Modal className="confirmation-panel media-picker" role="dialog" aria-labelledby="media-picker-heading" onCancel={onClose} busy={busy}><div className="card-heading"><h2 id="media-picker-heading">Choose {kind??'background'} media</h2><button className="button" disabled={busy} onClick={onClose}>Close media picker</button></div><p>Import files in the Media library first. Local files need their original bytes on this laptop.</p>
 {(error||externalError) && <p role="alert">{error||externalError}</p>}{loading?<p role="status">Loading media…</p>:<div className="media-picker-grid">{items.filter(asset=>!kind || asset.kind===kind).map(asset=><button className="media-choice glass" disabled={busy} key={asset.id} onClick={()=>onSelect(asset)}><MediaThumbnail asset={asset} service={service}/><strong>{asset.originalName}</strong><span>{asset.location==='local'?'This laptop':'Private cloud image'}</span></button>)}</div>}
 {!loading && !items.some(asset=>!kind || asset.kind===kind) && <p>No matching files on this page. Import media or try the next page.</p>}
 {(page>0 || more) && <nav className="action-row" aria-label="Media picker pages"><button className="button" disabled={busy || loading || page===0} onClick={()=>setPage(p=>p-1)}>Previous page</button><span>Page {page+1}</span><button className="button" disabled={loading || !more} onClick={()=>setPage(p=>p+1)}>Next page</button></nav>}
 </Modal>;
}
