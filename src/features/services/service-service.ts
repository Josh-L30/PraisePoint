import {validateServiceSnapshot} from './snapshot-validation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Result } from '../../domain/result';
import type { ServicePlan, ServiceSnapshot } from '../../domain/service';
import { supabase } from '../../lib/supabase';
import { contentId as id,contentRevision as revision,contentTitle as title,contentError,invalidContent } from '../songs/content-api';
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const day=new Date(value+'T00:00:00Z');return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value && !value.startsWith('0000');});
export const servicePlanSchema=z.object({id,workspaceId:id,title,date:calendarDate.nullable(),revision,
 items:z.array(z.object({id,deckId:id,label:title,position:z.number().int().min(0).max(99)}).strict()).max(100)
}).strict().refine(p=>new Set(p.items.map(i=>i.id)).size===p.items.length && p.items.every((i,n)=>i.position===n));
export type ServiceSummary=Pick<ServicePlan,'id'|'workspaceId'|'title'|'date'|'revision'>;
export type ServiceService={
 list(workspaceId:string,page?:number):Promise<Result<{items:ServiceSummary[];hasMore:boolean}>>;
 getService(id:string):Promise<Result<ServicePlan>>;
 saveService(plan:ServicePlan,expectedRevision:number):Promise<Result<ServicePlan>>;
 addSongToService(songId:string,serviceId:string,review?:{songRevision:number;serviceRevision:number}):Promise<Result<string>>;
 deleteService(id:string):Promise<Result<void>>;
 buildServiceSnapshot(id:string):Promise<Result<ServiceSnapshot>>;
};
export function createServiceService(client:SupabaseClient|null):ServiceService{
 async function rpc(name:string,args:Record<string,unknown>):Promise<Result<unknown>>{
  if(!client) return contentError(null);
  try{const {data,error}=await client.rpc(name,args);return error?contentError(error):{ok:true,value:data};}catch{return contentError(null);}
 }
 function plan(data:unknown,expectedId:string,workspace?:string):Result<ServicePlan>{
  const parsed=servicePlanSchema.safeParse(data);
  return parsed.success && parsed.data.revision>0 && parsed.data.id===expectedId.toLowerCase() && (!workspace || parsed.data.workspaceId===workspace.toLowerCase()) ? {ok:true,value:parsed.data}:invalidContent();
 }
 return {
  async list(workspaceId,page=0){
   if(!id.safeParse(workspaceId).success || !Number.isInteger(page) || page<0 || page>100000) return invalidContent(); if(!client) return contentError(null);
   try{const {data,error}=await client.from('service_plans').select('id,workspace_id,title,service_date,revision').eq('workspace_id',workspaceId).order('updated_at',{ascending:false}).order('id').range(page*24,page*24+24);
    if(error)return contentError(error);
    const parsed=z.array(z.object({id,workspace_id:id,title,service_date:calendarDate.nullable(),revision:revision.min(1)}).strict()).max(25).safeParse(data);
    if(!parsed.success || parsed.data.some(p=>p.workspace_id!==workspaceId.toLowerCase()))return invalidContent();
    return {ok:true,value:{items:parsed.data.slice(0,24).map(p=>({id:p.id,workspaceId:p.workspace_id,title:p.title,date:p.service_date,revision:p.revision})),hasMore:parsed.data.length>24}};
   }catch{return contentError(null);}
  },
  async getService(serviceId){if(!id.safeParse(serviceId).success)return invalidContent();const result=await rpc('get_service_plan',{p_id:serviceId});return result.ok?plan(result.value,serviceId):result;},
  async saveService(document,expectedRevision){
   const parsed=servicePlanSchema.safeParse(document);if(!parsed.success || !revision.safeParse(expectedRevision).success)return invalidContent();
   const result=await rpc('save_service_plan',{p_plan:parsed.data,p_expected_revision:expectedRevision});if(!result.ok)return result;
   const saved=plan(result.value,document.id,document.workspaceId);return saved.ok && saved.value.revision!==expectedRevision+1 ? invalidContent():saved;
  },
  async addSongToService(songId,serviceId,review){
   if(!id.safeParse(songId).success || !id.safeParse(serviceId).success || (review && (!revision.min(1).safeParse(review.songRevision).success || !revision.min(1).safeParse(review.serviceRevision).success)))return invalidContent();
   const result=await rpc('add_song_to_service',{p_song_id:songId,p_service_id:serviceId,p_expected_song_revision:review?.songRevision??null,p_expected_service_revision:review?.serviceRevision??null});
   if(!result.ok)return result;const parsed=id.safeParse(result.value);return parsed.success?{ok:true,value:parsed.data}:invalidContent();
  },
  async deleteService(serviceId){if(!id.safeParse(serviceId).success)return invalidContent();const result=await rpc('delete_service_plan',{p_id:serviceId});return result.ok?{ok:true,value:undefined}:result;},
  async buildServiceSnapshot(serviceId){
   if(!id.safeParse(serviceId).success)return invalidContent();const result=await rpc('build_service_snapshot',{p_id:serviceId});if(!result.ok)return result;
   return validateServiceSnapshot(result.value,serviceId);
  },
 };
}
export const serviceService=createServiceService(supabase);
