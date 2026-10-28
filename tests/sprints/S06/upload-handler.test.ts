// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {createMediaHandler} from '../../../supabase/functions/_shared/media-handler';
import {cloudMediaKey,type MediaAsset,type MediaBackend,type MediaResult} from '../../../supabase/functions/_shared/media-contract';
const bytes=new Uint8Array([1,2,3]),asset:MediaAsset={id:'a6000000-0000-4000-8000-000000000020',workspaceId:'a6000000-0000-4000-8000-000000000001',kind:'image',location:'cloud',mime:'image/png',bytes:3,
 sha256:createHash('sha256').update(bytes).digest('hex'),revision:1,originalName:'Test still.png'},reservationId='a6000000-0000-4000-8000-000000000030';
const ok=<T>(value:T):MediaResult<T>=>({ok:true,value}),network={ok:false as const,error:{code:'NETWORK' as const,message:'Could not confirm.'}};
let backend:MediaBackend;
beforeEach(()=>{backend={claim:vi.fn().mockResolvedValue(ok({status:'claimed'})),reserve:vi.fn().mockResolvedValue(ok({status:'pending',reservationId,objectKey:cloudMediaKey(asset),expiresAt:'2099-01-01T00:00:00Z'})),finalize:vi.fn().mockResolvedValue(ok(asset)),abort:vi.fn().mockResolvedValue(ok({status:'aborting',reservationId,objectKey:cloudMediaKey(asset)})),
 release:vi.fn().mockResolvedValue(ok(null)),upload:vi.fn().mockResolvedValue(ok(null)),download:vi.fn().mockResolvedValue(ok(bytes)),remove:vi.fn().mockResolvedValue(ok(null)),readAsset:vi.fn().mockResolvedValue(ok(asset)),
 beginDelete:vi.fn().mockResolvedValue(ok({id:asset.id,location:'cloud',objectKey:cloudMediaKey(asset)})),finishDelete:vi.fn().mockResolvedValue(ok(null)),expired:vi.fn().mockResolvedValue(ok([]))};});
function request(overrides:Record<string,string>={},body:Uint8Array=bytes){return new Request('https://example.invalid/media-upload',{method:'POST',body:body as Uint8Array<ArrayBuffer>,headers:{Authorization:'Bearer fixture-token',Origin:'http://127.0.0.1:5173','Content-Type':asset.mime,'x-media-id':asset.id,'x-workspace-id':asset.workspaceId,'x-file-size':String(asset.bytes),'x-file-sha256':asset.sha256,'x-file-name':encodeURIComponent(asset.originalName),...overrides}});}
function handler(){return createMediaHandler({backend:async()=>ok(backend),decode:async()=>ok({mime:'image/png',width:32,height:18})});}
it('denies unauthenticated calls before obtaining a backend or reading a file',async()=>{
 const factory=vi.fn(),run=createMediaHandler({backend:factory,decode:vi.fn()});const req=request();req.headers.delete('Authorization');
 expect((await run(req)).status).toBe(401);expect(factory).not.toHaveBeenCalled();
});
it('never sends a video to cloud storage',async()=>{
 const response=await handler()(request({'Content-Type':'video/mp4'}));expect(response.status).toBe(400);expect(backend.reserve).not.toHaveBeenCalled();expect(backend.upload).not.toHaveBeenCalled();
});
it('bounds the actual body independently of the declared size',async()=>{
 const response=await handler()(request({},new Uint8Array([1,2,3,4])));expect(response.status).toBe(400);expect(backend.upload).not.toHaveBeenCalled();expect(backend.abort).toHaveBeenCalledWith(reservationId,false);expect(backend.release).toHaveBeenCalledOnce();
});
it('uploads and finalizes only the verified bytes at the exact reserved key',async()=>{
 const response=await handler()(request());expect(response.status).toBe(200);expect(await response.json()).toEqual(ok(asset));
 expect(backend.upload).toHaveBeenCalledWith(cloudMediaKey(asset),bytes,'image/png');expect(backend.finalize).toHaveBeenCalledWith(reservationId,asset.sha256,32,18);
});
it('does not delete an active image when the finalization response is lost',async()=>{
 vi.mocked(backend.finalize).mockResolvedValue(network);vi.mocked(backend.abort).mockResolvedValue(ok({status:'active',media:asset}));
 const response=await handler()(request());expect(response.status).toBe(200);expect(backend.remove).not.toHaveBeenCalled();expect(backend.release).not.toHaveBeenCalled();
});
it('retains quota and bytes if upload state cannot be confirmed',async()=>{
 vi.mocked(backend.finalize).mockResolvedValue(network);vi.mocked(backend.abort).mockResolvedValue(network);
 expect((await handler()(request())).status).toBe(503);expect(backend.remove).not.toHaveBeenCalled();expect(backend.release).not.toHaveBeenCalled();
});
it('does not free capacity after a failed object deletion',async()=>{
 vi.mocked(backend.remove).mockResolvedValue(network);const req=new Request('https://example.invalid/media-upload',{method:'POST',headers:{Authorization:'Bearer fixture-token','Content-Type':'application/json','x-media-action':'delete'},body:JSON.stringify({mediaId:asset.id})});
 expect((await handler()(req)).status).toBe(503);expect(backend.finishDelete).not.toHaveBeenCalled();
});
it('does not write undecodable pixels or trust a different reservation path',async()=>{
 const run=createMediaHandler({backend:async()=>ok(backend),decode:async()=>({ok:false,error:{code:'VALIDATION',message:'Invalid pixels.'}})});
 expect((await run(request())).status).toBe(400);expect(backend.upload).not.toHaveBeenCalled();
 vi.mocked(backend.reserve).mockResolvedValue(ok({status:'pending',reservationId,objectKey:'foreign/path.png',expiresAt:'2099-01-01T00:00:00Z'}));
 expect((await handler()(request())).status).toBe(503);expect(backend.upload).not.toHaveBeenCalled();
});

it('does not write or abort a busy writer when no completed object is available',async()=>{
 vi.mocked(backend.claim).mockResolvedValue(ok({status:'busy'}));vi.mocked(backend.download).mockResolvedValue(network);
 expect((await handler()(request())).status).toBe(409);expect(backend.upload).not.toHaveBeenCalled();expect(backend.abort).not.toHaveBeenCalled();
});
it('a busy retry can finalize verified existing bytes without another write',async()=>{
 vi.mocked(backend.claim).mockResolvedValue(ok({status:'busy'}));
 expect((await handler()(request())).status).toBe(200);expect(backend.upload).not.toHaveBeenCalled();expect(backend.finalize).toHaveBeenCalledOnce();expect(backend.abort).not.toHaveBeenCalled();
});
it('rechecks authorized access after an already active write claim',async()=>{
 vi.mocked(backend.claim).mockResolvedValue(ok({status:'active',media:asset}));
 expect((await handler()(request())).status).toBe(200);expect(backend.readAsset).toHaveBeenCalledWith(asset.id);expect(backend.upload).not.toHaveBeenCalled();expect(backend.finalize).not.toHaveBeenCalled();
});
it('identifies cleanup from its own failed claimed write',async()=>{
 vi.mocked(backend.upload).mockResolvedValue(network);vi.mocked(backend.download).mockResolvedValue(network);
 expect((await handler()(request())).status).toBe(503);expect(backend.abort).toHaveBeenCalledWith(reservationId,true);
});
