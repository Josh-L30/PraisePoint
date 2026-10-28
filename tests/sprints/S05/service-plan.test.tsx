import {expect,it,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter,RouterProvider} from 'react-router';
import {ServicePlanPage} from '../../../src/features/services/ServicePlanPage';
import {createServiceService} from '../../../src/features/services/service-service';
import type {Workspace} from '../../../src/features/workspaces/workspace-service';
const workspace={id:'a5000000-0000-4000-8000-000000000001',name:'Test church',kind:'church',role:'owner'} as Workspace;
const plan={id:'a5000000-0000-4000-8000-000000000020',workspaceId:workspace.id,title:'Sunday',date:'2026-11-01',revision:1,
 items:[{id:'a5000000-0000-4000-8000-000000000030',deckId:'a5000000-0000-4000-8000-000000000040',label:'First song',position:0},
 {id:'a5000000-0000-4000-8000-000000000031',deckId:'a5000000-0000-4000-8000-000000000041',label:'Welcome',position:1}]};
it('reorders stable service items and sends one atomic revisioned save',async()=>{
 const save=vi.fn().mockImplementation(async value=>({ok:true,value:{...value,revision:2}}));
 const service={...createServiceService(null),getService:async()=>({ok:true as const,value:structuredClone(plan)}),saveService:save};
 render(<RouterProvider router={createMemoryRouter([{path:'/',element:<ServicePlanPage profileId="a5000000-0000-4000-8000-000000000001" workspace={workspace} serviceId={plan.id} service={service}/>}])}/>);
 await screen.findByDisplayValue('Sunday');
 await userEvent.click(within(screen.getByRole('listitem',{name:'First song'})).getByRole('button',{name:'Move down'}));
 await userEvent.click(screen.getByRole('button',{name:'Save service plan'}));
 expect(save).toHaveBeenCalledWith({...plan,items:[{...plan.items[1],position:0},{...plan.items[0],position:1}]},1);
});
it('retains title changes on a save conflict',async()=>{
 const service={...createServiceService(null),getService:async()=>({ok:true as const,value:structuredClone(plan)}),saveService:async()=>({ok:false as const,error:{code:'CONFLICT' as const,message:'Newer service exists.'}})};
 render(<RouterProvider router={createMemoryRouter([{path:'/',element:<ServicePlanPage profileId="a5000000-0000-4000-8000-000000000001" workspace={workspace} serviceId={plan.id} service={service}/>}])}/>);
 const input=await screen.findByDisplayValue('Sunday');await userEvent.clear(input);await userEvent.type(input,'My service draft');
 await userEvent.click(screen.getByRole('button',{name:'Save service plan'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Newer service exists');expect(input).toHaveValue('My service draft');
});
