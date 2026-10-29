import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createEditorState,reduceEditor} from '../../../src/features/decks/editor/editor-reducer';
import {deckFixture,workspaceId} from '../../support/deck-fixture';
const words=['We worship You\n一起敬拜','Literal <words> & hope'];
it('appends exact reviewed lyric breaks as independent slides in one undo without replacing existing content',()=>{
 const before=createEditorState(deckFixture()),after=reduceEditor(before,{type:'append-lyrics',slides:words} as never);
 expect(after.document.slides).toHaveLength(3);expect(after.document.slides[0]).toEqual(before.document.slides[0]);expect(after.document.slides.slice(1).map(slide=>slide.elements[0].kind==='text'?slide.elements[0].text:null)).toEqual(words);
 expect(reduceEditor(after,{type:'undo'}).document).toEqual(before.document);expect(before.document.slides).toHaveLength(1);
});
it('rejects over-capacity or blank lyric imports as a whole instead of silently truncating words',()=>{
 const before=createEditorState(deckFixture());expect(reduceEditor(before,{type:'append-lyrics',slides:Array(200).fill('Words')} as never)).toBe(before);expect(reduceEditor(before,{type:'append-lyrics',slides:['One','','Three']} as never)).toBe(before);
});
it('offers saved song breaks for review and refuses a mismatched workspace response',async()=>{
 const componentPath=new URL('../../../src/features/songs/SongPicker.tsx',import.meta.url).pathname,module=await import(/* @vite-ignore */ componentPath).catch(()=>null);expect(module?.SongPicker).toBeTypeOf('function');if(!module)return;
 const song={id:'55555555-5555-4555-8555-555555555555',workspaceId,title:'Hallelujah',lyrics:words.join('\n\n'),author:null,source:null,usageNotes:null,revision:1},selected=vi.fn(),service={list:vi.fn().mockResolvedValue({ok:true,value:{items:[song],hasMore:false}}),getSong:vi.fn().mockResolvedValueOnce({ok:true,value:{...song,workspaceId:'11111111-1111-4111-8111-111111111111'}}).mockResolvedValue({ok:true,value:song})};
 render(<module.SongPicker workspaceId={workspaceId} service={service} onSelect={selected} onClose={()=>{}}/>);const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Review Hallelujah'}));expect(await screen.findByRole('alert')).toHaveTextContent('selected workspace');expect(selected).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Review Hallelujah'}));expect(selected).toHaveBeenCalledWith(song);expect(song.lyrics).toBe(words.join('\n\n'));
});
