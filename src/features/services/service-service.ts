import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Result } from '../../domain/result';
import type { ServicePlan, ServiceSnapshot } from '../../domain/service';
import { slideSchema } from '../../domain/slide-schema';
import {mediaAssetSchema} from '../../../supabase/functions/_shared/media-contract';
import { supabase } from '../../lib/supabase';
import { contentId as id,contentRevision as revision,contentTitle as title,contentError,invalidContent } from '../songs/content-api';
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const day=new Date(value+'T00:00:00Z');return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value && !value.startsWith('0000');});
export const servicePlanSchema=z.object({id,workspaceId:id,title,date:calendarDate.nullable(),revision,
 items:z.array(z.object({id,deckId:id,label:title,position:z.number().int().min(0).max(99)}).strict()).max(100)
}).strict().refine(p=>new Set(p.items.map(i=>i.id)).size===p.items.length && p.items.every((i,n)=>i.position===n));
const section=z.object({id,deckId:id,label:title,startIndex:z.number().int().min(0),slideCount:z.number().int().positive(),sourceSongId:id.nullable()}).strict();
const snapshotSchema=z.object({schemaVersion:z.literal(1),serviceId:id,workspaceId:id,sourceRevision:z.string().regex(/^[0-9a-f]{64}$/),title,
 slides:z.array(slideSchema).min(1).max(2000),media:z.array(mediaAssetSchema).max(202000),sections:z.array(section).min(1).max(100)}).strict();
export type ServiceSummary=Pick<ServicePlan,'id'|'workspaceId'|'title'|'date'|'revision'>;
export type ServiceService={
 list(workspaceId:string,page?:number):Promise<Result<{items:ServiceSummary[];hasMore:boolean}>>;
 getService(id:string):Promise<Result<ServicePlan>>;
 saveService(plan:ServicePlan,expectedRevision:number):Promise<Result<ServicePlan>>;
 addSongToService(songId:string,serviceId:string,review?:{songRevision:number;serviceRevision:number}):Promise<Result<string>>;
 deleteService(id:string):Promise<Result<void>>;
 buildServiceSnapshot(id:string):Promise<Result<ServiceSnapshot>>;
};
function freeze<T>(value:T):T{if(value && typeof value==='object'){Object.freeze(value);for(const entry of Object.values(value)) freeze(entry);}return value;}
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
   const parsed=snapshotSchema.safeParse(result.value);if(!parsed.success || parsed.data.serviceId!==serviceId.toLowerCase() || new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength>16*1024*1024)return invalidContent();
   const snapshot=parsed.data, ids=new Set<string>(),sectionIds=new Set<string>();let next=0;
   for(const part of snapshot.sections){if(sectionIds.has(part.id) || part.startIndex!==next)return invalidContent();sectionIds.add(part.id);next+=part.slideCount;}
   if(next!==snapshot.slides.length)return invalidContent();
   for(const slide of snapshot.slides)for(const entry of [slide,...slide.elements]){if(ids.has(entry.id))return invalidContent();ids.add(entry.id);}
   const media=new Map(snapshot.media.map(asset=>[asset.id,asset]));
   if(media.size!==snapshot.media.length || snapshot.media.some(asset=>asset.workspaceId!==snapshot.workspaceId))return invalidContent();
   const referenced=new Set<string>();
   function reference(mediaId:string,kind:'image'|'video'):boolean{const asset=media.get(mediaId);referenced.add(mediaId);return !!asset && asset.kind===kind;}
   for(const slide of snapshot.slides){
    if(slide.background.kind!=='solid' && !reference(slide.background.mediaId,slide.background.kind))return invalidContent();
    if(slide.standaloneVideoId && !reference(slide.standaloneVideoId,'video'))return invalidContent();
    for(const element of slide.elements)if(element.kind==='image' && !reference(element.mediaId,'image'))return invalidContent();
   }
   if(referenced.size!==media.size)return invalidContent();
   return {ok:true,value:freeze(snapshot)};
  },
 };
}
export const serviceService=createServiceService(supabase);
