import {openBrowserDB,type StoredMedia} from '../../lib/browser-db';
import {readDeviceSession} from '../../lib/device-session';
import type {MediaDescriptor,ResolvedMedia} from '../../domain/media';
import {failure,type Result} from '../../domain/result';
import {createMediaUrl,revokeMediaUrls} from './media-urls';
let hashTail:Promise<void>=Promise.resolve();
// A single full-file read at a time bounds temporary buffers for large local clips.
export function hashMedia(blob:Blob):Promise<string>{
 const work=hashTail.then(async()=>{const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');});
 hashTail=work.then(()=>undefined,()=>undefined);return work;
}
const unavailable=()=>failure('STORAGE_UNAVAILABLE','This browser could not store or reopen the file. Free device space, keep the original file, and retry.');
const denied=()=>failure('FORBIDDEN','This local file belongs to another profile, or this profile has signed out.');
export async function writeLocalMedia(profileId:string,descriptor:MediaDescriptor,blob:Blob):Promise<Result<void>>{
 try{
  if(!blob.size || blob.size!==descriptor.bytes || blob.type!==descriptor.mime || await hashMedia(blob)!==descriptor.sha256)return failure('VALIDATION','The file does not match its recorded size, type or hash. Choose the original file.');
  const db=await openBrowserDB();try{
   const tx=db.transaction(['meta','mediaFiles'],'readwrite'),session=await tx.objectStore('meta').get('session');
   if(session?.profileId!==profileId || session.signedOut){await tx.done;return denied();}
   const previous=await tx.objectStore('mediaFiles').get([profileId,descriptor.id]);
   if(previous && (previous.descriptor.workspaceId!==descriptor.workspaceId || previous.descriptor.sha256!==descriptor.sha256)){await tx.done;return failure('CONFLICT','Use a new media item for a different file or workspace.');}
   await tx.objectStore('mediaFiles').put({profileId,descriptor:structuredClone(descriptor),blob});await tx.done;
   return {ok:true,value:undefined};
  }finally{db.close();}
 }catch{return unavailable();}
}
export async function readLocalMedia(profileId:string,mediaId:string):Promise<Result<StoredMedia>>{
 try{
  const db=await openBrowserDB();let value:StoredMedia|undefined;
  try{const tx=db.transaction(['meta','mediaFiles'],'readonly'),session=await tx.objectStore('meta').get('session');
   if(session?.profileId!==profileId || session.signedOut){await tx.done;return denied();}
   value=await tx.objectStore('mediaFiles').get([profileId,mediaId]);await tx.done;
  }finally{db.close();}
  if(!value)return failure('NOT_FOUND','This laptop needs the original file. Reselect it before presenting.');
  if(value.profileId!==profileId || value.descriptor.id!==mediaId || value.blob.size!==value.descriptor.bytes || value.blob.type!==value.descriptor.mime || await hashMedia(value.blob)!==value.descriptor.sha256)
   return failure('VALIDATION','The stored file is incomplete or damaged. Reselect the original file.');
  return {ok:true,value};
 }catch{return unavailable();}
}
export async function resolveLocalMedia(profileId:string,mediaId:string):Promise<Result<ResolvedMedia>>{
 const stored=await readLocalMedia(profileId,mediaId);if(!stored.ok)return stored;
 try{const session=await readDeviceSession();if(session?.profileId!==profileId || session.signedOut)return denied();
  return {ok:true,value:createMediaUrl(profileId,mediaId,stored.value.blob)};
 }catch{return unavailable();}
}
export async function removeLocalMedia(profileId:string,mediaId:string):Promise<Result<void>>{
 try{const db=await openBrowserDB();try{await db.delete('mediaFiles',[profileId,mediaId]);}finally{db.close();}
  revokeMediaUrls(profileId,mediaId);return {ok:true,value:undefined};
 }catch{return unavailable();}
}
