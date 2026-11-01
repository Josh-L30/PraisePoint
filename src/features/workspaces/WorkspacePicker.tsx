import type {Workspace} from './workspace-service';
import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router';
import {Check,ChevronDown} from 'lucide-react';
export type WorkspacePickerProps={workspaces:Workspace[];selected:Workspace;onSelect?():void};
const initials=(workspace:Workspace)=>workspace.kind==='personal'?'PW':workspace.name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase()||'CW';
export function WorkspacePicker({workspaces,selected,onSelect}:WorkspacePickerProps){
 const id=useId(),navigate=useNavigate(),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState({top:0,left:0,width:300,maxHeight:400});
 function close(restoreFocus=false){setOpen(false);if(restoreFocus)trigger.current?.focus();}
 function show(){const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(320,window.innerWidth-24),top=rect.bottom+10;setPosition({top,left:Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12)),width,maxHeight:Math.max(100,window.innerHeight-top-12)});setOpen(true);}
 useLayoutEffect(()=>{if(open)menu.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();},[open]);
 useEffect(()=>{
  if(!open)return;
  function outside(event:PointerEvent){if(!menu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setOpen(false);}
  function dismiss(){setOpen(false);}
  function scroll(event:Event){if(!menu.current?.contains(event.target as Node))setOpen(false);}
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);document.addEventListener('scroll',scroll,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);document.removeEventListener('scroll',scroll,true);};
 },[open]);
 function keyboard(event:KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'){close(true);return;}
  const choices=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')??[]),current=choices.indexOf(document.activeElement as HTMLButtonElement);
  const next=event.key==='Home'?0:event.key==='End'?choices.length-1:event.key==='ArrowDown'?(current+1)%choices.length:event.key==='ArrowUp'?(current-1+choices.length)%choices.length:-1;
  if(next>=0){event.preventDefault();choices[next]?.focus();}
 }
 return <><button type="button" ref={trigger} className="workspace-trigger glass-control" aria-label="Switch workspace" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>open?close():show()} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show();}if(event.key==='Escape')close();}}><span className="workspace-letter" aria-hidden="true">{initials(selected)}</span><ChevronDown size={17} aria-hidden="true"/></button>
  {open&&createPortal(<div className="workspace-menu glass" ref={menu} style={{position:'fixed',...position}} onKeyDown={keyboard}><h2>Your workspaces</h2><div id={id} role="listbox" aria-label="Workspaces">{workspaces.map(workspace=><button type="button" role="option" aria-label={workspace.name} aria-describedby={id+workspace.id} aria-selected={workspace.id===selected.id} tabIndex={workspace.id===selected.id?0:-1} className="workspace-option" key={workspace.id} onClick={()=>{navigate('/app/w/'+workspace.id);close(true);onSelect?.();}}><span className="workspace-letter" aria-hidden="true">{initials(workspace)}</span><span className="workspace-option-copy"><strong><bdi>{workspace.name}</bdi></strong><small id={id+workspace.id}>{workspace.kind==='personal'?'Private to you':workspace.role==='owner'?'Church workspace · Owner':'Church workspace · Member'}</small></span>{workspace.id===selected.id&&<Check size={17} aria-hidden="true"/>}</button>)}</div><p>Each workspace keeps its own slides, songs and media.</p></div>,document.body)}
 </>;
}
