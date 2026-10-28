import {afterEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen} from '@testing-library/react';
import {PropertiesPanel} from '../../../src/features/decks/editor/PropertiesPanel';
import {createEditorState} from '../../../src/features/decks/editor/editor-reducer';
import {deckFixture} from '../../support/deck-fixture';
afterEach(()=>vi.restoreAllMocks());
it('does not let a delayed property sync overwrite newer numeric input',()=>{
 const pending:VoidFunction[]=[];vi.spyOn(globalThis,'queueMicrotask').mockImplementation(callback=>pending.push(callback));
 const state=createEditorState(deckFixture());render(<PropertiesPanel state={state} onCommand={()=>{}}/>);
 const input=screen.getByRole('spinbutton',{name:'Text size'});fireEvent.change(input,{target:{value:''}});
 act(()=>{for(const task of pending)task();});expect(input).toHaveValue(null);
 fireEvent.change(input,{target:{value:'68'}});expect(input).toHaveValue(68);
});
it('resets partial property input when a different element is selected',()=>{
 const doc=deckFixture(),first=doc.slides[0].elements[0],second={...first,id:crypto.randomUUID()};doc.slides[0].elements.push(second);
 const state=createEditorState(doc),view=render(<PropertiesPanel state={state} onCommand={()=>{}}/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Text size'}),{target:{value:''}});
 view.rerender(<PropertiesPanel state={{...state,selectedElementId:second.id}} onCommand={()=>{}}/>);
 expect(screen.getByRole('spinbutton',{name:'Text size'})).toHaveValue(72);
});
