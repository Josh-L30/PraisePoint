import {useSyncExternalStore} from 'react';
import {Moon,Sun} from 'lucide-react';
import {getTheme,setTheme,subscribeTheme} from '../lib/theme';
export function ThemeToggle(){
 const theme=useSyncExternalStore(subscribeTheme,getTheme,()=> 'light'),label=theme==='dark'?'Switch to light mode':'Switch to dark mode';
 return <button type="button" className="nav-item theme-toggle" aria-label={label} title={label} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}<span className="collapse-copy">{theme==='dark'?'Light mode':'Dark mode'}</span></button>;
}
