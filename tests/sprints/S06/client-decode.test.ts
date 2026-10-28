// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Blob as NodeBlob} from 'node:buffer';
import {webcrypto} from 'node:crypto';
import {Image} from 'imagescript';
import {decodeMedia} from '../../../src/features/media/decode-media';
const close=vi.fn(),bitmap=vi.fn();
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('createImageBitmap',bitmap);bitmap.mockResolvedValue({width:32,height:18,close});});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
function file(bytes:Uint8Array,type:string,name='test.png'){return Object.assign(new NodeBlob([bytes as Uint8Array<ArrayBuffer>],{type}),{name,lastModified:0,webkitRelativePath:''}) as File;}
it('checks actual image decoding and returns a hash without retaining decoded pixels',async()=>{
 const image=new Image(32,18);image.fill(0x006c78ff);const result=await decodeMedia(file(await image.encodePNG(),'image/png'));
 expect(result.ok).toBe(true);if(result.ok){expect(result.value).toMatchObject({kind:'image',mime:'image/png',width:32,height:18,duration:null});expect(result.value.sha256).toMatch(/^[0-9a-f]{64}$/);}
 expect(close).toHaveBeenCalledOnce();
});
it('rejects empty and oversized files before reading their bytes',async()=>{
 const arrayBuffer=vi.fn();
 expect((await decodeMedia({size:0,type:'image/png',name:'empty.png',arrayBuffer} as unknown as File)).ok).toBe(false);
 expect((await decodeMedia({size:5*1024*1024+1,type:'image/png',name:'large.png',arrayBuffer} as unknown as File)).ok).toBe(false);
 expect((await decodeMedia({size:128*1024*1024+1,type:'video/mp4',name:'large.mp4',arrayBuffer} as unknown as File)).ok).toBe(false);
 expect(arrayBuffer).not.toHaveBeenCalled();
});
it('refuses wrong-MIME and corrupt decoder results',async()=>{
 const image=new Image(32,18),bytes=await image.encodePNG();
 expect((await decodeMedia(file(bytes,'image/jpeg'))).ok).toBe(false);expect(bitmap).not.toHaveBeenCalled();
 bitmap.mockRejectedValueOnce(new Error('corrupt pixels'));
 expect((await decodeMedia(file(bytes,'image/png'))).ok).toBe(false);
});
it('rejects truncated MP4/WebM containers and unsupported file types',async()=>{
 expect((await decodeMedia(file(new Uint8Array([0,0,0,20,102,116,121,112]),'video/mp4','broken.mp4'))).ok).toBe(false);
 expect((await decodeMedia(file(new Uint8Array([1,2,3,4]),'video/webm','broken.webm'))).ok).toBe(false);
 expect((await decodeMedia(file(new TextEncoder().encode('<svg/>'),'image/svg+xml','unsafe.svg'))).ok).toBe(false);
});
