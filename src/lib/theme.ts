export type Theme='light'|'dark';
const key='praisepoint-theme',eventName='praisepoint-theme-change';
let workspaceThemeEnabled=false;
function savedTheme():Theme|null{try{const value=localStorage.getItem(key);return value==='light'||value==='dark'?value:null;}catch{return null;}}
export function getTheme():Theme{return document.documentElement.dataset.theme==='dark'?'dark':'light';}
function apply(theme:Theme){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;window.dispatchEvent(new Event(eventName));}
export function setTheme(theme:Theme){try{localStorage.setItem(key,theme);}catch{/* The current session can still change theme. */}apply(theme);}
function preferredTheme():Theme{return savedTheme()??(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light');}
export function setThemeAccess(authenticated:boolean){workspaceThemeEnabled=authenticated;apply(authenticated?preferredTheme():'light');}
export function initializeTheme(){
 const system=window.matchMedia('(prefers-color-scheme: dark)');
 const update=()=>apply(workspaceThemeEnabled?preferredTheme():'light');
 update();system.addEventListener('change',update);window.addEventListener('storage',event=>{if(event.key===key||event.key===null)update();});
}
export async function transitionTheme(theme:Theme,origin:{x:number;y:number}){
 if(!document.startViewTransition||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setTheme(theme);return;}
 const root=document.documentElement,radius=Math.hypot(Math.max(origin.x,innerWidth-origin.x),Math.max(origin.y,innerHeight-origin.y));
 root.classList.add('theme-changing');
 let skipTransition:(()=>void)|undefined;
 try{
  const transition=document.startViewTransition(()=>setTheme(theme));skipTransition=()=>transition.skipTransition();await transition.ready;
  await root.animate({clipPath:[`circle(0px at ${origin.x}px ${origin.y}px)`,`circle(${radius}px at ${origin.x}px ${origin.y}px)`]},{duration:420,easing:'cubic-bezier(.16,1,.3,1)',pseudoElement:'::view-transition-new(root)'}).finished;
  await transition.finished;
 }catch{skipTransition?.();setTheme(theme);}
 finally{root.classList.remove('theme-changing');}
}
export function subscribeTheme(listener:()=>void){window.addEventListener(eventName,listener);return()=>window.removeEventListener(eventName,listener);}
