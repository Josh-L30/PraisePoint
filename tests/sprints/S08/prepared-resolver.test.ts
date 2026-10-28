import {beforeEach,it,expect,vi} from 'vitest';
import {preparedSnapshotResolver} from '../../../src/features/offline/prepared-resolver';
import {readPreparedAsset} from '../../../src/features/offline/prepared-store';
import {readDeviceSession} from '../../../src/lib/device-session';
import type {ServiceSnapshot} from '../../../src/domain/service';
vi.mock('../../../src/features/offline/prepared-store',()=>({readPreparedAsset:vi.fn()}));vi.mock('../../../src/lib/device-session',()=>({readDeviceSession:vi.fn()}));
beforeEach(()=>{vi.mocked(readDeviceSession).mockResolvedValue({profileId:'profile',signedOut:false});let count=0;Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:prepared-'+(++count))});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});});
it('overlapping prepared previews share one verified file read but release their own URLs',async()=>{
 const asset={id:'media',kind:'video',mime:'video/mp4'},snapshot={media:[asset]} as unknown as ServiceSnapshot;let complete!:(value:Awaited<ReturnType<typeof readPreparedAsset>>)=>void;vi.mocked(readPreparedAsset).mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));const resolver=preparedSnapshotResolver('profile',snapshot),first=resolver('media'),second=resolver('media');expect(readPreparedAsset).toHaveBeenCalledTimes(1);complete({ok:true,value:new Blob([new Uint8Array([1,2,3])],{type:'video/mp4'})});const values=await Promise.all([first,second]);expect(values.every(value=>value.ok)).toBe(true);for(const value of values)if(value.ok)value.value.release();expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});
