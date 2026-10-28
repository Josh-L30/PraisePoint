import {z} from 'zod';
import type {ServiceSnapshot} from '../../domain/service';
import {failure,type Result} from '../../domain/result';
import {validateServiceSnapshot} from '../services/snapshot-validation';
import {validateDeck} from '../../domain/slide-schema';
export const TRANSFER_LIMIT=16*1024*1024;
export type TransferBundle={format:'church-service';version:1;snapshot:ServiceSnapshot};
const envelope=z.object({format:z.literal('church-service'),version:z.literal(1),snapshot:z.unknown()}).strict();
const invalid=()=>failure('VALIDATION','Choose a complete supported service metadata file, no larger than 16 MiB. Media originals must be transferred separately.');
export function inspectTransfer(input:unknown):Result<TransferBundle>{
 try{
  const json=JSON.stringify(input);if(!json || new TextEncoder().encode(json).byteLength>TRANSFER_LIMIT)return invalid();
  const parsed=envelope.safeParse(input);if(!parsed.success)return invalid();const source=parsed.data.snapshot;
  if(!source || typeof source!=='object' || !('serviceId' in source) || typeof source.serviceId!=='string')return invalid();
  const result=validateServiceSnapshot(source,source.serviceId);if(!result.ok)return invalid();const snapshot=result.value;
  const hashes=new Map<string,string>();for(const asset of snapshot.media){const identity=[asset.kind,asset.mime,asset.bytes].join(':');if(hashes.has(asset.sha256) && hashes.get(asset.sha256)!==identity)return invalid();hashes.set(asset.sha256,identity);}
  for(const section of snapshot.sections){if(!validateDeck({schemaVersion:1,id:section.deckId,workspaceId:snapshot.workspaceId,title:section.label,width:1920,height:1080,slides:snapshot.slides.slice(section.startIndex,section.startIndex+section.slideCount)}).ok)return invalid();}
  return {ok:true,value:{format:'church-service',version:1,snapshot}};
 }catch{return invalid();}
}
export async function parseTransferFile(file:Pick<File,'size'|'text'>):Promise<Result<TransferBundle>>{
 if(file.size<1 || file.size>TRANSFER_LIMIT)return invalid();try{const text=await file.text();if(new TextEncoder().encode(text).byteLength>TRANSFER_LIMIT)return invalid();return inspectTransfer(JSON.parse(text));}catch{return invalid();}
}
