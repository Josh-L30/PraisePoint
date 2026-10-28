// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {createPresenterChannel,openAudience} from '../../../src/features/presenter/presenter-channel';
import {initialPresenterState,applyPresenterCommand} from '../../../src/features/presenter/presenter-state';
import {createTemplate} from '../../../src/features/decks/templates';
const session='a7000000-0000-4000-8000-000000000001',audience='a7000000-0000-4000-8000-000000000002',profile='a7000000-0000-4000-8000-000000000003';
function state(){return initialPresenterState(session,{schemaVersion:1,serviceId:crypto.randomUUID(),workspaceId:crypto.randomUUID(),sourceRevision:'a'.repeat(64),title:'Sunday',slides:[createTemplate('lyrics')],media:[],sections:[{id:crypto.randomUUID(),deckId:crypto.randomUUID(),label:'Welcome',startIndex:0,slideCount:1,sourceSongId:null}]});}
function transport(){const nodes=new Set<{onmessage:((e:{data:unknown})=>void)|null;postMessage(data:unknown):void;close():void}>();return ()=>{const node={onmessage:null as ((e:{data:unknown})=>void)|null,postMessage(data:unknown){for(const peer of nodes)if(peer!==node)peer.onmessage?.({data:structuredClone(data)});},close(){nodes.delete(node);}};nodes.add(node);return node;};}
it('requires explicit send, targets one audience and rejects stale or foreign states',()=>{
 const factory=transport(),operator=createPresenterChannel(session,{profileId:profile},factory),output=createPresenterChannel(session,{audienceId:audience},factory),other=createPresenterChannel(session,{audienceId:crypto.randomUUID()},factory),seen=vi.fn(),wrong=vi.fn();
 output.subscribe(seen);other.subscribe(wrong);output.post({kind:'join',audienceId:audience});expect(seen).not.toHaveBeenCalled();
 operator.setAudience(audience);const first=state();operator.send(first);expect(seen).toHaveBeenCalledOnce();expect(wrong).not.toHaveBeenCalled();
 operator.send(first);expect(seen).toHaveBeenCalledOnce();operator.send(applyPresenterCommand(first,{type:'restore'}));expect(seen).toHaveBeenCalledTimes(2);expect(seen.mock.calls[1][0].snapshot).toBe(seen.mock.calls[0][0].snapshot);
 const changed=structuredClone(first.snapshot);changed.title='Changed during service';operator.send({...first,sequence:999,snapshot:changed});expect(seen).toHaveBeenCalledTimes(2);
 operator.send({...first,sessionId:crypto.randomUUID(),sequence:99});expect(seen).toHaveBeenCalledTimes(2);operator.close();output.close();other.close();
});
it('ignores malformed payloads and closes subscriptions',()=>{
 const factory=transport(),output=createPresenterChannel(session,{audienceId:audience},factory),raw=factory(),seen=vi.fn(),off=output.subscribe(seen);raw.postMessage({kind:'state',sessionId:session,recipientId:audience,profileId:profile,state:{index:-1}});expect(seen).not.toHaveBeenCalled();
 const operator=createPresenterChannel(session,{profileId:profile},factory);operator.setAudience(audience);off();operator.send(state());expect(seen).not.toHaveBeenCalled();operator.close();output.close();raw.close();
});
it('reports blocked popups and opens only an unpredictable session route',()=>{
 const blocked=vi.fn(()=>null);expect(openAudience(session,blocked).ok).toBe(false);expect(blocked).toHaveBeenCalledWith('/audience/'+session,'gather-audience-'+session,'popup,width=1280,height=720');expect(openAudience('invalid',blocked).ok).toBe(false);expect(blocked).toHaveBeenCalledOnce();
});
