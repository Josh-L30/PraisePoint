// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {hashMedia} from '../../../src/features/media/local-media-store';
it('reads at most one complete media buffer at a time',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;}),started:string[]=[];
 const first={arrayBuffer:async()=>{started.push('first');await gate;return new Uint8Array([1,2,3]).buffer;}} as Blob;
 const second={arrayBuffer:async()=>{started.push('second');return new Uint8Array([4,5,6]).buffer;}} as Blob;
 const a=hashMedia(first),b=hashMedia(second);
 try{await vi.waitFor(()=>expect(started).toContain('first'));expect(started).toEqual(['first']);}
 finally{release();await Promise.all([a,b]);}
 expect(started).toEqual(['first','second']);
});
it('continues hashing later files after one file cannot be read',async()=>{
 const broken={arrayBuffer:async():Promise<ArrayBuffer>=>{throw new Error('Unreadable original');}} as Blob;
 const failed=hashMedia(broken),valid=hashMedia(new Blob([new Uint8Array([1,2,3])]));await expect(failed).rejects.toThrow('Unreadable original');await expect(valid).resolves.toMatch(/^[0-9a-f]{64}$/);
});
