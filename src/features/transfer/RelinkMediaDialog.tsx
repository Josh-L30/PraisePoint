import type {MediaDescriptor} from '../../domain/media';
export function RelinkMediaDialog({asset,busy,onSelect}:{asset:MediaDescriptor;busy:boolean;onSelect(file:File):void}){
 return <label className="media-relink">Reselect exact original<input type="file" accept={asset.mime} disabled={busy} onChange={event=>{const original=event.target.files?.[0];if(original)onSelect(original);event.target.value='';}}/></label>;
}
