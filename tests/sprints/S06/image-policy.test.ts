// @vitest-environment node
import {expect,it} from 'vitest';
import {inspectImageHeader} from '../../../supabase/functions/_shared/image-policy';
function png(width=32,height=18){
 const bytes=new Uint8Array(57),view=new DataView(bytes.buffer);bytes.set([137,80,78,71,13,10,26,10]);view.setUint32(8,13);bytes.set([73,72,68,82],12);view.setUint32(16,width);view.setUint32(20,height);bytes[24]=8;bytes[25]=6;
 bytes.set([73,68,65,84],37);bytes.set([73,69,78,68],49);return bytes;
}
it('reads bounded PNG dimensions before any full decoder allocation',()=>{
 expect(inspectImageHeader(png(),'image/png')).toEqual({ok:true,value:{mime:'image/png',width:32,height:18}});
 expect(inspectImageHeader(png(100000,100000),'image/png').ok).toBe(false);
});
it('rejects empty, oversized, truncated and mismatched image headers',()=>{
 expect(inspectImageHeader(new Uint8Array(),'image/png').ok).toBe(false);
 expect(inspectImageHeader(new Uint8Array(5*1024*1024+1),'image/png').ok).toBe(false);
 expect(inspectImageHeader(png().slice(0,-1),'image/png').ok).toBe(false);
 expect(inspectImageHeader(png(),'image/jpeg').ok).toBe(false);
 expect(inspectImageHeader(new TextEncoder().encode('<svg onload="alert(1)"/>'),'image/svg+xml').ok).toBe(false);
});
it('reads JPEG frame dimensions and requires the end marker',()=>{
 const bytes=new Uint8Array([255,216,255,192,0,17,8,0,18,0,32,3,1,17,0,2,17,0,3,17,0,255,217]);
 expect(inspectImageHeader(bytes,'image/jpeg')).toEqual({ok:true,value:{mime:'image/jpeg',width:32,height:18}});
 expect(inspectImageHeader(bytes.slice(0,-2),'image/jpeg').ok).toBe(false);
});
it('reads lossless WebP dimensions and rejects a truncated RIFF container',()=>{
 const bytes=new Uint8Array(26),view=new DataView(bytes.buffer);bytes.set(new TextEncoder().encode('RIFF'));view.setUint32(4,18,true);bytes.set(new TextEncoder().encode('WEBPVP8L'),8);view.setUint32(16,5,true);bytes.set([47,31,64,4,0],20);
 expect(inspectImageHeader(bytes,'image/webp')).toEqual({ok:true,value:{mime:'image/webp',width:32,height:18}});
 expect(inspectImageHeader(bytes.slice(0,-1),'image/webp').ok).toBe(false);
});
