// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createMediaService} from '../../../src/features/media/media-service';
import {writeLocalMedia,hashMedia,removeLocalMedia} from '../../../src/features/media/local-media-store';
import {decodeMedia} from '../../../src/features/media/decode-media';
import {setDeviceSession,purgeProfileData} from '../../../src/lib/device-session';
vi.mock('../../../src/features/media/decode-media',()=>({decodeMedia:vi.fn()}));
const profile='a6000000-0000-4000-8000-000000000001',ws='a6000000-0000-4000-8000-000000000002';
function mockClient(){const invoke=vi.fn(),rpc=vi.fn(),getSession=vi.fn().mockResolvedValue({data:{session:{user:{id:profile},access_token:'captured-token'}},error:null});const client={auth:{getSession},functions:{invoke},rpc} as unknown as SupabaseClient;return {invoke,rpc,getSession,client};}
beforeEach(async()=>{await setDeviceSession(profile);vi.mocked(decodeMedia).mockReset();});
it('rejects cloud video before decoding, obtaining a token or invoking uploads',async()=>{const mock=mockClient();const service=createMediaService(profile,mock.client,()=>mock.client);expect((await service.uploadImage(new File(['video'],'song.mp4',{type:'video/mp4'}),ws)).ok).toBe(false);expect(mock.getSession).not.toHaveBeenCalled();expect(mock.invoke).not.toHaveBeenCalled();});
it('does not upload when the profile changes during image decode',async()=>{const mock=mockClient();vi.mocked(decodeMedia).mockImplementation(async()=>{await purgeProfileData(profile);return {ok:true,value:{kind:'image',mime:'image/png',bytes:3,sha256:'a'.repeat(64),width:1,height:1,duration:null}};});
 const service=createMediaService(profile,mock.client,()=>mock.client);expect((await service.uploadImage(new File(['abc'],'still.png',{type:'image/png'}),ws)).ok).toBe(false);expect(mock.invoke).not.toHaveBeenCalled();});
it('keeps a stable media ID when retrying the same unconfirmed image file',async()=>{const mock=mockClient();vi.mocked(decodeMedia).mockResolvedValue({ok:true,value:{kind:'image',mime:'image/png',bytes:3,sha256:'a'.repeat(64),width:1,height:1,duration:null}});mock.invoke.mockResolvedValue({data:null,error:new Error('lost response')});
 const service=createMediaService(profile,mock.client,()=>mock.client),file=new File(['abc'],'still.png',{type:'image/png'});await service.uploadImage(file,ws);await service.uploadImage(file,ws);
 expect(mock.invoke).toHaveBeenCalledTimes(2);expect(mock.invoke.mock.calls[0][1].headers['x-media-id']).toBe(mock.invoke.mock.calls[1][1].headers['x-media-id']);
});
it('refuses unverified upload success responses',async()=>{const mock=mockClient();vi.mocked(decodeMedia).mockResolvedValue({ok:true,value:{kind:'image',mime:'image/png',bytes:3,sha256:'a'.repeat(64),width:1,height:1,duration:null}});mock.invoke.mockResolvedValue({data:{ok:true,value:{id:ws}},error:null});expect((await createMediaService(profile,mock.client,()=>mock.client).uploadImage(new File(['abc'],'still.png',{type:'image/png'}),ws)).ok).toBe(false);});

it('refuses to retry an unfinished image with different original bytes',async()=>{const mock=mockClient();vi.mocked(decodeMedia).mockResolvedValue({ok:true,value:{kind:'image',mime:'image/png',bytes:3,sha256:'a'.repeat(64),width:1,height:1,duration:null}});const asset={id:ws,workspaceId:ws,kind:'image' as const,location:'cloud' as const,mime:'image/png',bytes:3,sha256:'b'.repeat(64),revision:1,originalName:'still.png'};expect((await createMediaService(profile,mock.client,()=>mock.client).retryImage(asset,new File(['abc'],'still.png',{type:'image/png'}))).ok).toBe(false);expect(mock.invoke).not.toHaveBeenCalled();});
it('does not display impossible free-storage accounting as verified usage',async()=>{const mock=mockClient();mock.rpc.mockResolvedValue({data:{workspaceUsed:52428800,workspaceReserved:1,workspaceLimit:52428800,applicationUsed:52428800,applicationReserved:1,applicationLimit:524288000},error:null});expect((await createMediaService(profile,mock.client,()=>mock.client).getUsage(ws)).ok).toBe(false);});

it('shares concurrent resolutions of one original instead of reading and hashing it for every thumbnail',async()=>{
 const mock=mockClient(),blob=new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),asset={id:'a6000000-0000-4000-8000-000000000020',workspaceId:ws,kind:'image' as const,location:'local' as const,mime:'image/png',bytes:3,sha256:await hashMedia(blob),revision:1,originalName:'Fixture.png'};
 expect((await writeLocalMedia(profile,asset,blob)).ok).toBe(true);
 const single=vi.fn().mockResolvedValue({data:{id:asset.id,workspace_id:ws,kind:asset.kind,location:asset.location,mime:asset.mime,bytes:asset.bytes,sha256:asset.sha256,revision:1,original_name:asset.originalName},error:null});const builder={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single};Object.assign(mock.client,{from:vi.fn(()=>builder)});
 const service=createMediaService(profile,mock.client,()=>mock.client),results=await Promise.all([service.resolveMedia(asset.id),service.resolveMedia(asset.id)]);
 try{expect(results.every(result=>result.ok)).toBe(true);expect(single).toHaveBeenCalledOnce();}
 finally{for(const result of results)if(result.ok)result.value.release();await removeLocalMedia(profile,asset.id);}
});
