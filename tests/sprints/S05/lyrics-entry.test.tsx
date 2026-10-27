import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LyricsEntryDialog} from '../../../src/features/songs/LyricsEntryDialog';
const fonts=Object.getOwnPropertyDescriptor(document,'fonts');
beforeEach(()=>{
 Object.defineProperty(document,'fonts',{configurable:true,value:{load:async()=>[{family:'Figtree',status:'loaded'}],check:()=>true}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText:(text:string)=>({width:text.length*40})} as unknown as CanvasRenderingContext2D);
});
afterEach(()=>{vi.restoreAllMocks();if(fonts)Object.defineProperty(document,'fonts',fonts);else Reflect.deleteProperty(document,'fonts');});
it('reviews paste breaks before saving and permits manual slide corrections',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);
 render(<LyricsEntryDialog initialLyrics="" busy={false} onConfirm={save} onCancel={()=>{}} />);
 await userEvent.click(screen.getByRole('button',{name:'Paste full lyrics'}));
 await userEvent.type(screen.getByRole('textbox',{name:'Full lyrics'}),'Verse one\nVerse two\n\nChorus');
 expect(save).not.toHaveBeenCalled();
 await userEvent.click(screen.getByRole('button',{name:'Review slide breaks'}));
 expect(await screen.findByRole('textbox',{name:'Slide 1 words'})).toHaveValue('Verse one\nVerse two');
 const second=screen.getByRole('textbox',{name:'Slide 2 words'});
 await userEvent.clear(second);await userEvent.type(second,'Corrected chorus');
 await userEvent.click(screen.getByRole('button',{name:'Use reviewed lyrics'}));
 expect(save).toHaveBeenCalledWith('Verse one\nVerse two\n\nCorrected chorus');
});
it('supports manual entry and warns on wide lines without truncating them',async()=>{
 const save=vi.fn().mockResolvedValue(undefined), words='Praise'.repeat(12);
 render(<LyricsEntryDialog initialLyrics="" busy={false} onConfirm={save} onCancel={()=>{}} />);
 await userEvent.type(screen.getByRole('textbox',{name:'Type lyrics'}),words);
 await userEvent.click(screen.getByRole('button',{name:'Review slide breaks'}));
 expect(await screen.findByText(/Line exceeds the safe width/)).toBeVisible();
 expect(screen.getByRole('textbox',{name:'Slide 1 words'})).toHaveValue(words);
});
it('blocks review when the real presentation font is unavailable',async()=>{
 Object.defineProperty(document,'fonts',{configurable:true,value:{load:async()=>[],check:()=>false}});
 render(<LyricsEntryDialog initialLyrics="Words" busy={false} onConfirm={async()=>{}} onCancel={()=>{}} />);
 await userEvent.click(screen.getByRole('button',{name:'Review slide breaks'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Figtree could not load');
 expect(screen.queryByRole('button',{name:'Use reviewed lyrics'})).toBeNull();
});
