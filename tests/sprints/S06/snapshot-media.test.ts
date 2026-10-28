// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {createServiceService} from '../../../src/features/services/service-service';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createTemplate} from '../../../src/features/decks/templates';
const ws='a6000000-0000-4000-8000-000000000001',id='a6000000-0000-4000-8000-000000000020';
const media={id,workspaceId:ws,kind:'image',location:'cloud',mime:'image/png',bytes:123,sha256:'a'.repeat(64),revision:1,originalName:'still.png'};
function snapshot(){return {schemaVersion:1,serviceId:ws,workspaceId:ws,sourceRevision:'a'.repeat(64),title:'Sunday',slides:[{...createTemplate('lyrics'),background:{kind:'image',mediaId:id}}],media:[media],sections:[{id:ws,deckId:ws,label:'Song',startIndex:0,slideCount:1,sourceSongId:null}]};}
async function check(data:unknown){return createServiceService({rpc:vi.fn().mockResolvedValue({data,error:null})} as unknown as SupabaseClient).buildServiceSnapshot(ws);}
it('accepts the exact referenced descriptors and freezes them',async()=>{const result=await check(snapshot());expect(result.ok).toBe(true);if(result.ok)expect(Object.isFrozen(result.value.media[0])).toBe(true);});
it('rejects missing, duplicate, unreferenced and foreign media',async()=>{
 const data=snapshot();for(const media of [[],[data.media[0],data.media[0]],[{...data.media[0],id:ws}],[{...data.media[0],workspaceId:id}]])expect((await check({...data,media})).ok).toBe(false);
});
it('rejects an image reference whose descriptor is a video',async()=>{const data=snapshot();expect((await check({...data,media:[{...media,kind:'video',location:'local',mime:'video/mp4'}]})).ok).toBe(false);});
