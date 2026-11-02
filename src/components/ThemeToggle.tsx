import {useState,useSyncExternalStore} from 'react';
import {Moon,Sun} from 'lucide-react';
import {getTheme,transitionTheme,subscribeTheme} from '../lib/theme';
export function ThemeToggle(){
 const [changing,setChanging]=useState(false),theme=useSyncExternalStore(subscribeTheme,getTheme,()=> 'light'),label=theme==='dark'?'Switch to light mode':'Switch to dark mode';
 return <button type="button" className="nav-item theme-toggle" aria-label={label} title={label} disabled={changing} onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();setChanging(true);void transitionTheme(theme==='dark'?'light':'dark',{x:rect.left+rect.width/2,y:rect.top+rect.height/2}).finally(()=>setChanging(false));}}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}<span className="collapse-copy">{theme==='dark'?'Light mode':'Dark mode'}</span></button>;
}
