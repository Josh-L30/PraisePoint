// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {verifyMediaActor,mediaBackendError,createSupabaseMediaBackend} from '../../../supabase/functions/_shared/supabase-media-backend';
it('requires a server-verified Google identity rather than editable profile metadata',async()=>{
 const getUser=vi.fn().mockResolvedValue({data:{user:{id:'u',email_confirmed_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{provider:'google'}}},error:null});
 expect((await verifyMediaActor({auth:{getUser}},'Bearer token')).ok).toBe(false);
 getUser.mockResolvedValue({data:{user:{id:'u',email_confirmed_at:'2026-01-01',app_metadata:{provider:'google'}}},error:null});
 expect((await verifyMediaActor({auth:{getUser}},'Bearer token')).ok).toBe(true);expect(getUser).toHaveBeenLastCalledWith('token');
 getUser.mockResolvedValue({data:{user:null},error:{message:'private detail'}});expect((await verifyMediaActor({auth:{getUser}},'Bearer token')).ok).toBe(false);
});
it('maps database failures without exposing provider or SQL details',()=>{
 expect(mediaBackendError({code:'53000',message:'secret schema'})).toEqual({ok:false,error:{code:'CAPACITY',message:expect.any(String)}});
 expect(JSON.stringify(mediaBackendError({code:'unknown',message:'secret schema'}))).not.toContain('secret schema');
});
it('rejects malformed trusted RPC responses and uses the user client for reservations',async()=>{
 const userRpc=vi.fn().mockResolvedValue({data:{status:'pending',reservationId:'bad',objectKey:'foreign'},error:null});
 const adminRpc=vi.fn();
 const backend=createSupabaseMediaBackend({rpc:userRpc} as never,{rpc:adminRpc} as never);
 const result=await backend.reserve({id:'a6000000-0000-4000-8000-000000000020',workspaceId:'a6000000-0000-4000-8000-000000000001',kind:'image',location:'cloud',mime:'image/png',bytes:3,sha256:'a'.repeat(64),revision:1,originalName:'still.png'},null);
 expect(result.ok).toBe(false);expect(userRpc).toHaveBeenCalledWith('reserve_image_upload',expect.any(Object));expect(adminRpc).not.toHaveBeenCalled();
});
