import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {SignInPage} from '../../../src/features/auth/SignInPage';
import {createAuthService} from '../../../src/features/auth/auth-service';

it('names the app PraisePoint and uses the real local CCF mark without changing Google sign-in',()=>{
 const view=render(<MemoryRouter><SignInPage service={createAuthService(null)}/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'PraisePoint home'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Welcome to PraisePoint.'})).toBeInTheDocument();
 expect(view.container.querySelector('.ccf-brand-mark')).not.toBeNull();
 expect(screen.getByRole('button',{name:'Continue with Google'})).toBeEnabled();
});
it('portals a labelled centered modal outside transformed app ancestors and restores focus on cancel',async()=>{
 const componentPath=new URL('../../../src/components/Modal.tsx',import.meta.url).pathname;
 const module=await import(/* @vite-ignore */ componentPath).catch(()=>null);
 expect(module?.Modal).toBeTypeOf('function');if(!module)return;
 const user=userEvent.setup(),cancel=vi.fn();const trigger=document.createElement('button');trigger.textContent='Delete item';document.body.append(trigger);trigger.focus();
 const view=render(<div style={{transform:'translateX(0)'}}><module.Modal aria-label="Confirm Deletion" onCancel={cancel}><h2>Confirm Deletion</h2><button onClick={cancel}>Cancel</button></module.Modal></div>);
 const dialog=screen.getByRole('dialog',{name:'Confirm Deletion'});expect(dialog.parentElement).toBe(document.body);
 await user.keyboard('{Escape}');expect(cancel).toHaveBeenCalledOnce();view.unmount();expect(trigger).toHaveFocus();trigger.remove();
});
it('keeps a real labelled file input while displaying a selected filename through custom chrome',async()=>{
 const componentPath=new URL('../../../src/components/FilePicker.tsx',import.meta.url).pathname;
 const module=await import(/* @vite-ignore */ componentPath).catch(()=>null);
 expect(module?.FilePicker).toBeTypeOf('function');if(!module)return;
 const user=userEvent.setup(),change=vi.fn();render(<module.FilePicker label="Choose media file" accept="image/png" filename="Sunday.png" onChange={change}/>);
 expect(screen.getByText('Sunday.png')).toBeInTheDocument();const input=screen.getByLabelText('Choose media file');expect(input).toHaveAttribute('type','file');expect(input).toHaveClass('file-input');
 await user.upload(input,new File(['image'],'Sunday.png',{type:'image/png'}));expect(change).toHaveBeenCalledOnce();
});
