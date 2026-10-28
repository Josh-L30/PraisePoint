import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Blob as NodeBlob} from 'node:buffer';
import {webcrypto} from 'node:crypto';
import {setDeviceSession,purgeProfileData,readDeviceSession} from '../../../src/lib/device-session';
import {openBrowserDB} from '../../../src/lib/browser-db';
import {promotePrepared,getPreparedRecord,deletePrepared} from '../../../src/features/offline/prepared-store';
import {fixture,profile} from './fixture';
beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);await setDeviceSession(profile);});
afterEach(async()=>{vi.restoreAllMocks();await purgeProfileData(profile);vi.unstubAllGlobals();});
it('promotes complete immutable bytes and reference-counts shared files across packages',async()=>{
 const first=await fixture(),second=await fixture();expect((await promotePrepared(first.manifest,first.files,'')).ok).toBe(true);expect((await promotePrepared(second.manifest,second.files,'')).ok).toBe(true);
 const db=await openBrowserDB();expect((await db.getAll('preparedAssets'))).toMatchObject([{refCount:2}]);db.close();
 expect((await deletePrepared(profile,first.manifest.packageId)).ok).toBe(true);const check=await openBrowserDB();expect((await check.getAll('preparedAssets'))).toMatchObject([{refCount:1}]);check.close();expect((await getPreparedRecord(profile,second.manifest.packageId)).ok).toBe(true);
});
it('rejects a bad hash or changed profile without replacing a good package',async()=>{
 const first=await fixture();expect((await promotePrepared(first.manifest,first.files,'')).ok).toBe(true);const bad=await fixture(first.manifest.snapshot.serviceId);bad.files.set([...bad.files.keys()][0],new Blob([new Uint8Array([9,9,9])],{type:'image/png'}));
 expect((await promotePrepared(bad.manifest,bad.files,'')).ok).toBe(false);expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(true);
 await setDeviceSession(crypto.randomUUID());expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(false);expect((await promotePrepared(bad.manifest,bad.files,'')).ok).toBe(false);
});
it('a quota failure during promotion rolls back asset counters and retains the previous copy',async()=>{
 const first=await fixture();expect((await promotePrepared(first.manifest,first.files,'')).ok).toBe(true);const next=await fixture(first.manifest.snapshot.serviceId),put=IDBObjectStore.prototype.put;
 vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof put>){if(this.name==='preparedServices')throw new DOMException('Test quota','QuotaExceededError');return put.apply(this,args);});
 expect((await promotePrepared(next.manifest,next.files,'')).ok).toBe(false);vi.restoreAllMocks();expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(true);const db=await openBrowserDB();expect((await db.getAll('preparedAssets'))).toMatchObject([{refCount:1}]);db.close();
});
it('sign-out locks offline access even when data removal fails, then allows a safe retry',async()=>{
 const first=await fixture();expect((await promotePrepared(first.manifest,first.files,'')).ok).toBe(true);const remove=IDBCursor.prototype.delete;
 vi.spyOn(IDBCursor.prototype,'delete').mockImplementation(function(this:IDBCursor){const source=this.source,name='objectStore' in source?source.objectStore.name:source.name;if(name==='preparedServices')throw new DOMException('Test failure','UnknownError');return remove.call(this);});
 expect((await purgeProfileData(profile)).ok).toBe(false);expect(await readDeviceSession()).toMatchObject({profileId:profile,signedOut:true});expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(false);vi.restoreAllMocks();expect((await purgeProfileData(profile)).ok).toBe(true);
});
it('blocks the old profile when the initial database sign-out marker cannot be written',async()=>{
 const first=await fixture();expect((await promotePrepared(first.manifest,first.files,'')).ok).toBe(true);const put=IDBObjectStore.prototype.put;
 vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof put>){if(this.name==='meta')throw new DOMException('Synthetic metadata failure','QuotaExceededError');return put.apply(this,args);});
 expect((await purgeProfileData(profile)).ok).toBe(false);expect(await readDeviceSession()).toMatchObject({profileId:profile,signedOut:true});expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(false);
 vi.restoreAllMocks();const next=crypto.randomUUID();await setDeviceSession(next);expect(await readDeviceSession()).toEqual({profileId:next,signedOut:false});expect((await getPreparedRecord(profile,first.manifest.packageId)).ok).toBe(false);await purgeProfileData(next);
});
