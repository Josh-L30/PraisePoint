import type {MediaDescriptor} from '../../domain/media';
import {FilePicker} from '../../components/FilePicker';
export function RelinkMediaDialog({asset,busy,onSelect}:{asset:MediaDescriptor;busy:boolean;onSelect(file:File):void}){
 return <div className="media-relink"><FilePicker label="Reselect exact original" hint="Relink original file" accept={asset.mime} disabled={busy} onChange={event=>{const original=event.target.files?.[0];if(original)onSelect(original);event.target.value='';}}/></div>;
}
