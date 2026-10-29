import {expect,it,vi} from 'vitest';
import {createWorkspaceService} from '../../../src/features/workspaces/workspace-service';
const id='ab110000-0000-4000-8000-000000000001';
it('begins the authorized deletion once without running cleanup batches',async()=>{
 const invoke=vi.fn().mockResolvedValue({data:{ok:true,value:{complete:false}},error:null}),service=createWorkspaceService({functions:{invoke}} as never,'https://gather-ccf-presentations.web.app');
 expect((await service.beginDeleteChurch(id,'CCF test')).ok).toBe(true);expect(invoke).toHaveBeenCalledExactlyOnceWith('media-upload',{headers:{'x-media-action':'begin-delete-workspace'},body:{workspaceId:id,expectedName:'CCF test'}});
});
it('continues bounded deletion batches until the backend confirms the whole workspace is gone',async()=>{
 const invoke=vi.fn().mockResolvedValueOnce({data:{ok:true,value:{complete:false}},error:null}).mockResolvedValue({data:{ok:true,value:{complete:true}},error:null}),service=createWorkspaceService({functions:{invoke}} as never,'https://gather-ccf-presentations.web.app') as unknown as {deleteChurch?:(id:string,name:string)=>Promise<{ok:boolean}>};expect(service.deleteChurch).toBeTypeOf('function');if(!service.deleteChurch)return;
 expect((await service.deleteChurch(id,'CCF test')).ok).toBe(true);expect(invoke).toHaveBeenCalledTimes(2);expect(invoke).toHaveBeenLastCalledWith('media-upload',{headers:{'x-media-action':'delete-workspace'},body:{workspaceId:id,expectedName:'CCF test'}});
});
it('returns a pending-upload/storage failure without claiming deletion or continuing batches',async()=>{
 const invoke=vi.fn().mockResolvedValue({data:{ok:false,error:{code:'CONFLICT',message:'Finish pending image uploads.'}},error:null}),service=createWorkspaceService({functions:{invoke}} as never,'https://gather-ccf-presentations.web.app') as unknown as {deleteChurch?:(id:string,name:string)=>Promise<unknown>};expect(service.deleteChurch).toBeTypeOf('function');if(!service.deleteChurch)return;
 expect(await service.deleteChurch(id,'CCF test')).toEqual({ok:false,error:{code:'CONFLICT',message:'Finish pending image uploads.'}});expect(invoke).toHaveBeenCalledOnce();
});
