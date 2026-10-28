import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {failure,type Result} from '../../domain/result';
import {supabase} from '../../lib/supabase';
import {readDeviceSession} from '../../lib/device-session';
import {contentError} from '../songs/content-api';
import {noteLocalContentChange} from '../offline/content-changes';
import {inspectTransfer,type TransferBundle} from './transfer-schema';
export type ImportResult={serviceId:string;missingMediaIds:string[]};
const reply=z.object({serviceId:z.uuid(),missingMediaIds:z.array(z.uuid()).max(202000)}).strict();
const denied=()=>failure('FORBIDDEN','Your device profile changed. Reopen the service library with your current account.');
export function createImportService(profileId:string,client:SupabaseClient|null=supabase,bind:(token:string)=>SupabaseClient=token=>createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:'Bearer '+token}}})){
 async function current(){const marker=await readDeviceSession();return marker?.profileId===profileId && !marker.signedOut;}
 return {async importServiceMetadata(input:TransferBundle,destinationWorkspaceId:string):Promise<Result<ImportResult>>{
  const parsed=inspectTransfer(input);if(!parsed.ok)return parsed;if(!z.uuid().safeParse(destinationWorkspaceId).success)return failure('VALIDATION','Choose a destination workspace.');
  try{
   if(!client || !await current())return denied();const {data,error}=await client.auth.getSession();if(error || !data.session || data.session.user.id!==profileId || !await current())return denied();
   const result=await bind(data.session.access_token).rpc('import_service_metadata',{p_bundle:parsed.value,p_destination_workspace_id:destinationWorkspaceId.toLowerCase()});if(!await current())return denied();if(result.error)return contentError(result.error);
   const verified=reply.safeParse(result.data),source=parsed.value.snapshot;
   const oldIds=new Set([source.serviceId,source.workspaceId,...source.sections.flatMap(section=>[section.id,section.deckId]),...source.slides.flatMap(slide=>[slide.id,...slide.elements.map(element=>element.id)]),...source.media.map(asset=>asset.id)]);
   if(!verified.success || verified.data.missingMediaIds.length!==source.media.length)return failure('VALIDATION','The imported service could not be verified. Check the service library before importing again.');
   const ids=[verified.data.serviceId,...verified.data.missingMediaIds];if(new Set(ids).size!==ids.length || ids.some(id=>oldIds.has(id) || id===destinationWorkspaceId.toLowerCase()))return failure('VALIDATION','The import did not return independent record identities. Check the service library before retrying.');
   await noteLocalContentChange();return {ok:true,value:verified.data};
  }catch{return failure('NETWORK','The import response could not be confirmed. Check the service library before importing again; the server may already have saved the copy.');}
 }};
}
