import {z} from 'zod';
import {cloudMediaKey,mediaAssetSchema,mediaId,type MediaAsset,type MediaBackend,type MediaErrorCode,type MediaResult} from './media-contract.ts';
type DecodedImage={mime:string;width:number;height:number};
type Options={backend(authorization:string):Promise<MediaResult<MediaBackend>>;decode(bytes:Uint8Array,mime:string):Promise<MediaResult<DecodedImage>>;origins?:string[]};
const statuses:Record<MediaErrorCode,number>={UNAUTHENTICATED:401,FORBIDDEN:403,VALIDATION:400,CONFLICT:409,CAPACITY:429,NOT_FOUND:404,UNSUPPORTED:400,STORAGE_UNAVAILABLE:503,NETWORK:503};
class Fault extends Error{constructor(readonly code:MediaErrorCode,message:string){super(message);}}
const unknownFailure=()=>new Fault('NETWORK','This operation could not be confirmed. Keep the original file and refresh your library before retrying.');
function value<T>(result:MediaResult<T>):T{if(!result.ok)throw new Fault(result.error.code,result.error.message);return result.value;}
async function readBody(request:Request,maximum:number,expected?:number):Promise<Uint8Array<ArrayBuffer>>{
 if(!request.body)throw new Fault('VALIDATION','Choose a non-empty file.');
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const next=await reader.read();if(next.done)break;total+=next.value.length;
  if(total>maximum || (expected!==undefined && total>expected)){await reader.cancel();throw new Fault('VALIDATION','The received file exceeds or differs from its recorded size.');}chunks.push(next.value);
 }}finally{reader.releaseLock();}
 if(expected!==undefined && total!==expected)throw new Fault('VALIDATION','The file was incomplete. Choose the original and retry.');
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
async function hash(bytes:Uint8Array):Promise<string>{const buffer=new Uint8Array(bytes).buffer;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),byte=>byte.toString(16).padStart(2,'0')).join('');}
function sameAsset(data:unknown,expected:MediaAsset):MediaAsset{
 const parsed=mediaAssetSchema.safeParse(data);
 if(!parsed.success || ['id','workspaceId','kind','location','mime','bytes','sha256'].some(key=>parsed.data[key as keyof MediaAsset]!==expected[key as keyof MediaAsset]))throw unknownFailure();
 return parsed.data;
}
async function jsonBody(request:Request):Promise<unknown>{try{return JSON.parse(new TextDecoder().decode(await readBody(request,4096)));}catch(error){if(error instanceof Fault)throw error;throw new Fault('VALIDATION','Invalid operation details.');}}
const copySchema=z.object({mediaId,destinationWorkspaceId:mediaId,newMediaId:mediaId}).strict(),deleteSchema=z.object({mediaId}).strict();
export function createMediaHandler(options:Options):(request:Request)=>Promise<Response>{
 const origins=new Set(options.origins??['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4173']);
 return async(request:Request)=>{
  const origin=request.headers.get('Origin'),headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'};
  if(origin && origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  const failure=(error:Fault)=>response({ok:false,error:{code:error.code,message:error.message}},statuses[error.code]);
  if(origin && !origins.has(origin))return failure(new Fault('FORBIDDEN','This website address is not configured for uploads.'));
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type,x-media-action,x-media-id,x-workspace-id,x-file-size,x-file-sha256,x-file-name'}});
  if(request.method!=='POST')return response({ok:false,error:{code:'VALIDATION',message:'Use POST for this operation.'}},405);
  const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return failure(new Fault('UNAUTHENTICATED','Sign in with Google to continue.'));
  let writerClaimed=false,mayCleanup=true;
  let backend:MediaBackend|undefined,lease:{id:string;key:string;asset:MediaAsset}|undefined;
  try{
   backend=value(await options.backend(authorization));const action=request.headers.get('x-media-action')??'upload';
   if(action==='delete'){
    const parsed=deleteSchema.safeParse(await jsonBody(request));if(!parsed.success)throw new Fault('VALIDATION','Choose a valid media item.');
    const deleting=value(await backend.beginDelete(parsed.data.mediaId));
    if(deleting.location==='cloud'){if(!deleting.objectKey)throw unknownFailure();value(await backend.remove(deleting.objectKey));}
    value(await backend.finishDelete(deleting.id));return response({ok:true,value:null});
   }
   if(action==='cleanup'){
    let reclaimed=0;
    for(const item of value(await backend.expired())){
     const aborted=await backend.abort(item.reservationId,false);if(!aborted.ok || aborted.value.status!=='aborting')continue;
     const removed=await backend.remove(aborted.value.objectKey);if(!removed.ok)continue;
     const released=await backend.release(item.reservationId);if(released.ok)reclaimed++;
    }
    return response({ok:true,value:{reclaimed}});
   }
   let asset:MediaAsset,source:MediaAsset|undefined;
   if(action==='copy'){
    const parsed=copySchema.safeParse(await jsonBody(request));if(!parsed.success)throw new Fault('VALIDATION','Choose valid source and destination items.');
    source=value(await backend.readAsset(parsed.data.mediaId));if(source.location!=='cloud' || source.kind!=='image')throw new Fault('UNSUPPORTED','Local files must be copied on the laptop that holds their original bytes.');
    asset={...source,id:parsed.data.newMediaId,workspaceId:parsed.data.destinationWorkspaceId,revision:1};
   }else if(action==='upload'){
    let name:string;try{name=decodeURIComponent(request.headers.get('x-file-name')??'');}catch{throw new Fault('VALIDATION','The filename could not be read.');}
    const parsed=mediaAssetSchema.safeParse({id:request.headers.get('x-media-id'),workspaceId:request.headers.get('x-workspace-id'),kind:'image',location:'cloud',mime:request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase(),
     bytes:Number(request.headers.get('x-file-size')),sha256:request.headers.get('x-file-sha256'),revision:1,originalName:name});
    if(!parsed.success)throw new Fault('VALIDATION','Choose a JPEG, PNG or WebP still image of at most 5 MiB. Videos stay on your laptop.');asset=parsed.data;
   }else throw new Fault('VALIDATION','Unknown media operation.');
   const reservation=value(await backend.reserve(asset,source?.id??null));
   if(reservation.status==='active')return response({ok:true,value:sameAsset(reservation.media,asset)});
   if(!mediaId.safeParse(reservation.reservationId).success || reservation.objectKey!==cloudMediaKey(asset))throw unknownFailure();
   lease={id:reservation.reservationId,key:reservation.objectKey,asset};
   const bytes=source?value(await backend.download(source)):await readBody(request,5*1024*1024,asset.bytes);
   if(bytes.length!==asset.bytes || await hash(bytes)!==asset.sha256)throw new Fault('VALIDATION','The received file does not match its recorded size or hash. Choose the original.');
   const decoded=value(await options.decode(bytes,asset.mime));if(decoded.mime!==asset.mime)throw new Fault('VALIDATION','The image type does not match its decoded bytes.');
   const claim=value(await backend.claim(lease.id));
   if(claim.status==='active')return response({ok:true,value:sameAsset(value(await backend.readAsset(asset.id)),asset)});
   writerClaimed=claim.status==='claimed';mayCleanup=writerClaimed;
   const uploaded=writerClaimed?await backend.upload(lease.key,bytes,asset.mime):null;
   if(!uploaded || !uploaded.ok){
    // A retry may find an object written before a previous response was lost.
    const found=await backend.download(asset);
    if(!found.ok && !writerClaimed)throw new Fault('CONFLICT','This upload is still in progress. Keep the original and retry shortly.');
    const existing=value(found);if(existing.length!==asset.bytes || await hash(existing)!==asset.sha256)throw unknownFailure();
   }
   const finalized=sameAsset(value(await backend.finalize(lease.id,asset.sha256,decoded.width,decoded.height)),asset);
   return response({ok:true,value:finalized});
  }catch(error){
   const problem=error instanceof Fault?error:unknownFailure();
   if(backend && lease && mayCleanup){
    try{
     const aborted=await backend.abort(lease.id,writerClaimed);
     if(aborted.ok && aborted.value.status==='active'){
      const authorized=await backend.readAsset(lease.asset.id);if(authorized.ok)return response({ok:true,value:sameAsset(authorized.value,lease.asset)});
     }else if(aborted.ok && aborted.value.status==='aborting' && aborted.value.objectKey===lease.key){
      const removed=await backend.remove(lease.key);if(removed.ok)await backend.release(lease.id);
     }
    }catch{/* Preserve charged capacity and bytes when cleanup cannot be confirmed. */}
   }
   return failure(problem);
  }
 };
}
