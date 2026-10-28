import {Image} from 'imagescript';
import {IMAGE_LIMITS,inspectImageHeader} from './image-policy.ts';
export async function validateImageBytes(bytes:Uint8Array,mime:string):Promise<ReturnType<typeof inspectImageHeader>>{
 const header=inspectImageHeader(bytes,mime);if(!header.ok)return header;
 try{
  const decoded=await Image.decode(bytes,{maxPixels:IMAGE_LIMITS.pixels,applyOrientation:false});
  if(decoded.width!==header.value.width || decoded.height!==header.value.height)throw new Error('Decoded dimensions differ');
  return header;
 }catch{return {ok:false,error:{code:'VALIDATION',message:'This image could not be decoded completely. Export a valid JPEG, PNG or WebP and try again.'}};}
}
