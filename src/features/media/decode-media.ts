import {IMAGE_LIMITS,inspectImageHeader} from '../../../supabase/functions/_shared/image-policy';
import {failure,type Result} from '../../domain/result';
import {hashMedia} from './local-media-store';
export const MEDIA_LIMITS={imageBytes:IMAGE_LIMITS.bytes,imagePixels:IMAGE_LIMITS.pixels,videoBytes:128*1024*1024,videoPixels:8*1024*1024,videoSeconds:86400} as const;
export type DecodedMedia={kind:'image'|'video';mime:string;bytes:number;sha256:string;width:number;height:number;duration:number|null};
function completeVideoContainer(bytes:Uint8Array,mime:string):boolean{
 if(mime==='video/webm')return bytes.length>=16 && [26,69,223,163].every((value,index)=>bytes[index]===value);
 if(bytes.length<24 || String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')return false;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=0,metadata=false,pixels=false;
 try{while(offset+8<=bytes.length){let size=view.getUint32(offset);let header=8;
  if(size===1){if(offset+16>bytes.length)return false;const wide=view.getBigUint64(offset+8);if(wide>BigInt(bytes.length))return false;size=Number(wide);header=16;}
  if(size===0)size=bytes.length-offset;if(size<header || offset+size>bytes.length)return false;
  const tag=String.fromCharCode(...bytes.subarray(offset+4,offset+8));metadata ||= tag==='moov';pixels ||= tag==='mdat';offset+=size;
 }return offset===bytes.length && metadata && pixels;}catch{return false;}
}
function waitForVideo(video:HTMLVideoElement,event:string,ready:boolean):Promise<void>{
 if(video.error)return Promise.reject(new Error('Video decoder failed'));if(ready)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,loaded);video.removeEventListener('error',failed);};
  const loaded=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(new Error('Video decoder failed'));};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Video decoder timed out'));},30000);
  video.addEventListener(event,loaded,{once:true});video.addEventListener('error',failed,{once:true});
 });
}
async function imageDimensions(file:File):Promise<{width:number;height:number}>{
 if(typeof createImageBitmap==='function'){const bitmap=await createImageBitmap(file);try{return {width:bitmap.width,height:bitmap.height};}finally{bitmap.close();}}
 const url=URL.createObjectURL(file),image=new Image();try{image.src=url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};}finally{image.src='';URL.revokeObjectURL(url);}
}
async function videoDimensions(file:File):Promise<{width:number;height:number;duration:number}>{
 const url=URL.createObjectURL(file),video=document.createElement('video');
 try{video.muted=true;video.volume=0;video.playsInline=true;video.preload='auto';video.src=url;video.load();
  await waitForVideo(video,'loadedmetadata',video.readyState>=1);
  const width=video.videoWidth,height=video.videoHeight,duration=video.duration;
  if(!width || !height || width*height>MEDIA_LIMITS.videoPixels || !Number.isFinite(duration) || duration<=0 || duration>MEDIA_LIMITS.videoSeconds)throw new Error('Unsupported video dimensions or duration');
  await waitForVideo(video,'loadeddata',video.readyState>=2);
  const ending=Math.max(0,duration-.2);if(ending>0){video.currentTime=ending;await waitForVideo(video,'seeked',!video.seeking && video.readyState>=2);}
  return {width,height,duration};
 }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export async function decodeMedia(file:File):Promise<Result<DecodedMedia>>{
 const kind=['image/jpeg','image/png','image/webp'].includes(file.type)?'image':['video/mp4','video/webm'].includes(file.type)?'video':null;
 if(!kind)return failure('UNSUPPORTED','Choose a JPEG, PNG or WebP still image, or a completed MP4 / WebM video. MP4 with H.264/AAC is the recommended video format.');
 if(!file.size || file.size>(kind==='image'?MEDIA_LIMITS.imageBytes:MEDIA_LIMITS.videoBytes))return failure('VALIDATION',kind==='image'?'Choose an image between 1 byte and 5 MiB.':'Choose a video between 1 byte and 128 MiB. Compress or shorten a larger original.');
 if(!file.name?.trim() || file.name.length>255)return failure('VALIDATION','Use a filename of 1–255 characters.');
 try{const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)return failure('VALIDATION','The file changed or could not be read completely. Reselect the original.');
  if(kind==='image'){
   const header=inspectImageHeader(bytes,file.type);if(!header.ok)return header;
   const dimensions=await imageDimensions(file);
   if(!dimensions.width || !dimensions.height || dimensions.width*dimensions.height>MEDIA_LIMITS.imagePixels)throw new Error('Invalid image dimensions');
   return {ok:true,value:{...dimensions,kind,mime:file.type,bytes:file.size,sha256:await hashMedia(file),duration:null}};
  }
  if(!completeVideoContainer(bytes,file.type))return failure('VALIDATION','This video container is incomplete or does not match its file type. Export a complete MP4 / WebM and retry.');
  const dimensions=await videoDimensions(file);return {ok:true,value:{...dimensions,kind,mime:file.type,bytes:file.size,sha256:await hashMedia(file)}};
 }catch{return failure('VALIDATION',kind==='image'?'This browser could not decode the image. Export a valid JPEG, PNG or WebP and retry.':'This browser could not decode the video’s first and ending frames. Try a complete MP4 with H.264/AAC, up to 4K and 24 hours, or a supported WebM.');}
}
