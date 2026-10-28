/** Header checks bound allocation; callers must still fully decode the pixels. */
export const IMAGE_LIMITS={bytes:5*1024*1024,pixels:4*1024*1024} as const;
export type ImageHeader={mime:'image/png'|'image/jpeg'|'image/webp';width:number;height:number};
type HeaderResult={ok:true;value:ImageHeader}|{ok:false;error:{code:'VALIDATION';message:string}};
const invalid=():HeaderResult=>({ok:false,error:{code:'VALIDATION',message:'Choose a complete, non-animated JPEG, PNG or WebP image of at most 5 MiB and 4 megapixels.'}});
export function inspectImageHeader(bytes:Uint8Array,mime:string):HeaderResult{
 if(!bytes.length || bytes.length>IMAGE_LIMITS.bytes)return invalid();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(offset:number)=>String.fromCharCode(...bytes.subarray(offset,offset+4));
 let width=0,height=0;
 try{
  if(mime==='image/png'){
   if(bytes.length<57 || ![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return invalid();
   let offset=8,header=false,data=false,ended=false;
   while(offset+12<=bytes.length){const length=view.getUint32(offset),name=tag(offset+4),end=offset+12+length;
    if(end>bytes.length || name==='acTL')return invalid();
    if(!header){if(name!=='IHDR' || length!==13)return invalid();width=view.getUint32(offset+8);height=view.getUint32(offset+12);header=true;}
    else if(name==='IHDR')return invalid();
    if(name==='IDAT')data=true;
    if(name==='IEND'){if(length!==0 || end!==bytes.length)return invalid();ended=true;break;}
    offset=end;
   }
   if(!header || !data || !ended)return invalid();
  }else if(mime==='image/jpeg'){
   if(bytes.length<12 || bytes[0]!==255 || bytes[1]!==216 || bytes.at(-2)!==255 || bytes.at(-1)!==217)return invalid();
   let offset=2;
   while(offset+3<bytes.length){if(bytes[offset++]!==255)return invalid();while(bytes[offset]===255)offset++;
    const marker=bytes[offset++];if(marker===218 || marker===217)break;
    if(marker===1 || (marker>=208 && marker<=215))continue;
    const length=view.getUint16(offset);if(length<2 || offset+length>bytes.length)return invalid();
    if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
     if(length<8)return invalid();height=view.getUint16(offset+3);width=view.getUint16(offset+5);break;
    }
    offset+=length;
   }
  }else if(mime==='image/webp'){
   if(bytes.length<26 || tag(0)!=='RIFF' || tag(8)!=='WEBP' || view.getUint32(4,true)+8!==bytes.length)return invalid();
   let offset=12,image=false;
   while(offset+8<=bytes.length){const name=tag(offset),length=view.getUint32(offset+4,true),start=offset+8,end=start+length+(length%2);
    if(end>bytes.length || name==='ANIM' || name==='ANMF')return invalid();
    if(name==='VP8X'){
     if(length!==10 || (bytes[start]&2))return invalid();
     width=1+bytes[start+4]+(bytes[start+5]<<8)+(bytes[start+6]<<16);height=1+bytes[start+7]+(bytes[start+8]<<8)+(bytes[start+9]<<16);
    }else if(name==='VP8L'){
     if(image || length<5 || bytes[start]!==47)return invalid();image=true;
     const w=1+bytes[start+1]+((bytes[start+2]&63)<<8),h=1+(bytes[start+2]>>6)+(bytes[start+3]<<2)+((bytes[start+4]&15)<<10);
     if((width && width!==w) || (height && height!==h))return invalid();width=w;height=h;
    }else if(name==='VP8 '){
     if(image || length<10 || bytes[start+3]!==157 || bytes[start+4]!==1 || bytes[start+5]!==42)return invalid();image=true;
     const w=view.getUint16(start+6,true)&16383,h=view.getUint16(start+8,true)&16383;
     if((width && width!==w) || (height && height!==h))return invalid();width=w;height=h;
    }
    offset=end;
   }
   if(!image || offset!==bytes.length)return invalid();
  }else return invalid();
  if(!width || !height || width*height>IMAGE_LIMITS.pixels)return invalid();
  return {ok:true,value:{mime:mime as ImageHeader['mime'],width,height}};
 }catch{return invalid();}
}
