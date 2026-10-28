import {webcrypto} from 'node:crypto';
import {Blob as NodeBlob} from 'node:buffer';
import {expect,it,vi} from 'vitest';
import {setDeviceSession,purgeProfileData} from '../../../src/lib/device-session';
import {writeLocalMedia,hashMedia} from '../../../src/features/media/local-media-store';
import {localSnapshotResolver} from '../../../src/features/presenter/local-snapshot-media';
import type {MediaDescriptor} from '../../../src/domain/media';
import type {ServiceSnapshot} from '../../../src/domain/service';
it('audience local reads require the exact sent descriptor and current profile',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:audience-local')});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});
 const profile=crypto.randomUUID(),blob=new Blob([new Uint8Array([1,2,3])],{type:'image/png'});await setDeviceSession(profile);
 const asset:MediaDescriptor={id:crypto.randomUUID(),workspaceId:crypto.randomUUID(),kind:'image',location:'local',mime:'image/png',bytes:3,sha256:await hashMedia(blob),revision:1,originalName:'Synthetic bytes.png'};
 expect((await writeLocalMedia(profile,asset,blob)).ok).toBe(true);const snapshot={media:[asset]} as ServiceSnapshot;
 const result=await localSnapshotResolver(profile,snapshot)(asset.id);expect(result.ok).toBe(true);if(result.ok)result.value.release();
 expect((await localSnapshotResolver(profile,{media:[]} as unknown as ServiceSnapshot)(asset.id)).ok).toBe(false);
 expect((await localSnapshotResolver(profile,{media:[{...asset,sha256:'a'.repeat(64)}]} as ServiceSnapshot)(asset.id)).ok).toBe(false);
 await purgeProfileData(profile);expect((await localSnapshotResolver(profile,snapshot)(asset.id)).ok).toBe(false);
});
