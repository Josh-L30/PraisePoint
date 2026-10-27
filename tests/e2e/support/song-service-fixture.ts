import type {Page} from '@playwright/test';
import type {Song} from '../../../src/domain/song';
import type {ServicePlan} from '../../../src/domain/service';
import type {DeckDocument} from '../../../src/domain/deck';
import {splitLyrics} from '../../../src/features/songs/split-lyrics';
import {deckFixture} from './deck-fixture';
export async function songServiceFixture(page:Page){
 const deckState=await deckFixture(page,false),songs=new Map<string,Song>(),plans=new Map<string,ServicePlan>();
 const state={...deckState,songs,plans,failSong:false,failPlan:false};
 await page.route('**/rest/v1/songs*',route=>{
  const url=new URL(route.request().url()),id=url.searchParams.get('id')?.slice(3),ws=url.searchParams.get('workspace_id')?.slice(3);
  if(id){const s=songs.get(id);return route.fulfill(s?{json:{id:s.id,workspace_id:s.workspaceId,title:s.title,lyrics:s.lyrics,author:s.author,source:s.source,usage_notes:s.usageNotes,revision:s.revision}}:{status:406,json:{code:'PGRST116'}});}
  const search=(url.searchParams.get('title')??'').replace(/^ilike\.%|%$/g,'').toLowerCase();
  return route.fulfill({json:[...songs.values()].filter(s=>s.workspaceId===ws && s.title.toLowerCase().includes(search)).map(s=>({id:s.id,workspace_id:s.workspaceId,title:s.title,author:s.author,revision:s.revision}))});
 });
 await page.route('**/rest/v1/service_plans*',route=>route.fulfill({json:[...plans.values()].map(p=>({id:p.id,workspace_id:p.workspaceId,title:p.title,service_date:p.date,revision:p.revision}))}));
 await page.route('**/rest/v1/rpc/save_song',route=>{
  const {p_song:s,p_expected_revision:rev}=route.request().postDataJSON() as {p_song:Song;p_expected_revision:number};
  if(state.failSong || (songs.get(s.id)?.revision??0)!==rev){state.failSong=false;return route.fulfill({status:409,json:{code:'40001'}});}
  const saved={...s,lyrics:splitLyrics(s.lyrics,4).map(s=>s.text).join('\n\n'),revision:rev+1};songs.set(s.id,saved);return route.fulfill({json:saved});
 });
 await page.route('**/rest/v1/rpc/save_service_plan',route=>{
  const {p_plan:p,p_expected_revision:rev}=route.request().postDataJSON() as {p_plan:ServicePlan;p_expected_revision:number};
  if(state.failPlan || (plans.get(p.id)?.revision??0)!==rev){state.failPlan=false;return route.fulfill({status:409,json:{code:'40001'}});}
  const saved={...p,revision:rev+1};plans.set(p.id,saved);return route.fulfill({json:saved});
 });
 await page.route('**/rest/v1/rpc/get_service_plan',route=>{
  const {p_id}=route.request().postDataJSON();return route.fulfill(plans.has(p_id)?{json:plans.get(p_id)}:{status:403,json:{code:'42501'}});
 });
 await page.route('**/rest/v1/rpc/add_song_to_service',route=>{
  const args=route.request().postDataJSON(),song=songs.get(args.p_song_id),plan=plans.get(args.p_service_id);
  if(!song || !plan || song.revision!==args.p_expected_song_revision || plan.revision!==args.p_expected_service_revision)return route.fulfill({status:409,json:{code:'40001'}});
  const id=crypto.randomUUID(),document:DeckDocument={schemaVersion:1,id,workspaceId:plan.workspaceId,title:song.title,width:1920,height:1080,
   slides:splitLyrics(song.lyrics,4).map(chunk=>({id:crypto.randomUUID(),category:'lyrics',background:{kind:'solid',color:'#12343D'},elements:[{id:crypto.randomUUID(),kind:'text',z:1,label:'Lyrics',x:96,y:300,width:1728,height:480,text:chunk.text,fontFamily:'Figtree',fontSize:72,color:'#FFFFFF',align:'center'}]}))};
  state.documents.set(id,{document,revision:1});plans.set(plan.id,{...plan,revision:plan.revision+1,items:[...plan.items,{id:crypto.randomUUID(),deckId:id,label:song.title,position:plan.items.length}]});
  return route.fulfill({json:id});
 });
 await page.route('**/rest/v1/rpc/delete_slide_deck',route=>{
  const {p_deck_id}=route.request().postDataJSON();const plan=[...plans.values()].find(p=>p.items.some(i=>i.deckId===p_deck_id));
  if(plan)return route.fulfill({status:409,json:{code:'23503',message:'Presentation is used by services: '+plan.title+'. Remove it from these services first.'}});
  state.documents.delete(p_deck_id);return route.fulfill({status:204});
 });
 await page.route('**/rest/v1/rpc/build_service_snapshot',route=>{
  const {p_id}=route.request().postDataJSON(),plan=plans.get(p_id);if(!plan)return route.fulfill({status:403,json:{code:'42501'}});
  const slides:DeckDocument['slides']=[],sections=[];
  for(const item of plan.items){const deck=state.documents.get(item.deckId)!;sections.push({id:item.id,deckId:item.deckId,label:item.label,startIndex:slides.length,slideCount:deck.document.slides.length,sourceSongId:null});
   slides.push(...deck.document.slides.map(s=>({...structuredClone(s),id:crypto.randomUUID(),elements:s.elements.map(e=>({...e,id:crypto.randomUUID()}))})));}
  return route.fulfill({json:{schemaVersion:1,serviceId:plan.id,workspaceId:plan.workspaceId,title:plan.title,sourceRevision:'a'.repeat(64),slides,sections,media:[]}});
 });
 return state;
}
