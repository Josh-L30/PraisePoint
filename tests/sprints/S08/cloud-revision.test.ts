import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {Blob as NodeBlob} from 'node:buffer';
import {fixture,profile} from './fixture';
import {setDeviceSession,purgeProfileData} from '../../../src/lib/device-session';
import {promotePrepared,getPreparedRecord} from '../../../src/features/offline/prepared-store';
import {checkPreparedRevision} from '../../../src/features/offline/check-revision';
import {createReadinessService} from '../../../src/features/offline/readiness';
import {contentStampKey} from '../../../src/features/offline/content-changes';
beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);await setDeviceSession(profile);});
afterEach(async()=>{await purgeProfileData(profile);vi.unstubAllGlobals();});
const checks={shell:async()=>({ok:true as const,value:{appBuild:'test-build'}}),font:async()=>({ok:true as const,value:undefined}),decode:async()=>({ok:true as const,value:{kind:'image' as const,mime:'image/png'}})};
it('a newer known cloud revision marks the complete copy stale without deleting it',async()=>{
 const value=await fixture();await promotePrepared(value.manifest,value.files,'');const result=await checkPreparedRevision(profile,value.manifest.packageId,async()=>({ok:true,value:{...value.manifest.snapshot,sourceRevision:'b'.repeat(64)}}));expect(result.ok).toBe(true);expect((await getPreparedRecord(profile,value.manifest.packageId)).ok).toBe(true);expect((await createReadinessService(profile,checks).checkReadiness(value.manifest.packageId)).state).toBe('stale');
});
it('an unchanged source can clear a conservative local-change notice after an explicit check',async()=>{
 const value=await fixture();await promotePrepared(value.manifest,value.files,'');localStorage.setItem(contentStampKey(profile),'unrelated-edit');expect((await checkPreparedRevision(profile,value.manifest.packageId,async()=>({ok:true,value:value.manifest.snapshot}))).ok).toBe(true);expect((await createReadinessService(profile,checks).checkReadiness(value.manifest.packageId)).state).toBe('ready');
});
it('an unavailable cloud does not destroy a verified complete copy or pretend a check succeeded',async()=>{
 const value=await fixture();await promotePrepared(value.manifest,value.files,'');const result=await checkPreparedRevision(profile,value.manifest.packageId,async()=>({ok:false,error:{code:'NETWORK',message:'Offline'}}));expect(result.ok).toBe(false);expect((await createReadinessService(profile,checks).checkReadiness(value.manifest.packageId)).state).toBe('ready');
});
it('a local edit during a revision check cannot silently clear staleness',async()=>{
 const value=await fixture();await promotePrepared(value.manifest,value.files,'');const result=await checkPreparedRevision(profile,value.manifest.packageId,async()=>{localStorage.setItem(contentStampKey(profile),'edited-during-check');return {ok:true,value:value.manifest.snapshot};});expect(result.ok).toBe(false);expect((await createReadinessService(profile,checks).checkReadiness(value.manifest.packageId)).state).toBe('stale');
});
