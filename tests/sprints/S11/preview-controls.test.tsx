import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {DeckPreviewPage} from '../../../src/features/decks/DeckPreviewPage';
import {deckFixture,deckId,workspaceId} from '../../support/deck-fixture';
const service={getDeck:async()=>({ok:true,value:{document:deckFixture(),revision:1}})};
function preview(){return render(<MemoryRouter><DeckPreviewPage workspaceId={workspaceId} deckId={deckId} profileId={workspaceId} service={service as never}/></MemoryRouter>);}
it('uses a labelled Back icon without the old Exit preview pill',async()=>{preview();const back=screen.getByRole('link',{name:'Back to editor'});expect(back.textContent?.trim()).toBe('');expect(screen.queryByText('Exit preview')).not.toBeInTheDocument();});
it('requests actual fullscreen on a user gesture and keeps a usable preview when it is refused',async()=>{
 const old=Object.getOwnPropertyDescriptor(document.documentElement,'requestFullscreen'),request=vi.fn().mockRejectedValue(new Error('Not allowed'));Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:request});
 try{preview();await userEvent.click(screen.getByRole('button',{name:'Enter fullscreen'}));expect(request).toHaveBeenCalledOnce();expect(await screen.findByText(/Fullscreen could not start/)).toBeInTheDocument();expect(screen.getByRole('link',{name:'Back to editor'})).toBeInTheDocument();}finally{if(old)Object.defineProperty(document.documentElement,'requestFullscreen',old);else delete (document.documentElement as unknown as {requestFullscreen?:unknown}).requestFullscreen;}
});
