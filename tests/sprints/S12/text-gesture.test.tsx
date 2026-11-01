import {expect,it,vi} from 'vitest';
import {useState} from 'react';
import {fireEvent,render,screen} from '@testing-library/react';
import {SelectionOverlay} from '../../../src/features/decks/editor/SelectionOverlay';
import {deckFixture} from '../../support/deck-fixture';
it('pressing text selects it without starting a move gesture',()=>{
 const onCommand=vi.fn(),document=deckFixture();
 function Harness(){const [selected,setSelected]=useState<string|null>(null);return <div className="slide-stage"><SelectionOverlay slide={document.slides[0]} selectedId={selected} scale={1} disabled={false} instructionsId="help" onCommand={command=>{onCommand(command);if(command.type==='select')setSelected(command.elementId??null);}}/></div>;}
 render(<Harness/>);
 const hitbox=screen.getByRole('button',{name:'Select Lyrics'});
 fireEvent.pointerDown(hitbox,{button:0,pointerId:1});
 expect(onCommand.mock.calls.map(([command])=>command.type)).not.toContain('begin-gesture');
 fireEvent.doubleClick(hitbox);
 expect(screen.getByRole('textbox',{name:'Edit slide text'})).toHaveFocus();
});
