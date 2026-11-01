import {acquireRuntimeActivity} from '../offline/runtime-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft,Maximize,Minimize } from 'lucide-react';
import { deckService, type DeckService } from './deck-service';
import type { DeckDocument } from '../../domain/deck';
import { readDraft } from '../../lib/draft-memory';
import { validateDeck } from '../../domain/slide-schema';
import {createMediaService} from '../media/media-service';
import { SlideRenderer } from '../../components/slide-renderer/SlideRenderer';
export function DeckPreviewPage({ workspaceId, deckId, profileId, service = deckService }: { workspaceId: string; deckId: string; profileId: string; service?: DeckService }) {
  const media=useMemo(()=>createMediaService(profileId),[profileId]);
  const navigate = useNavigate(), exit = useRef<HTMLAnchorElement>(null);
  const root=useRef<HTMLElement>(null),enteredFullscreen=useRef(false);
  const [fullscreen,setFullscreen]=useState(false),[fullscreenError,setFullscreenError]=useState<string|null>(null);
  const [document,setDocument] = useState<DeckDocument | null>(null), [error,setError] = useState<string | null>(null), [selected,setSelected] = useState(0);
  const back = '/app/w/' + workspaceId + '/decks/' + deckId;
  useEffect(() => {
    let active = true,releaseActivity:(()=>void)|undefined;
    async function load() {
      try {
        if(import.meta.env.PROD){const lease=await acquireRuntimeActivity();if(!active){if(lease.ok)lease.value();return;}if(!lease.ok){setError(lease.error.message);return;}releaseActivity=lease.value;}
        const result = await service.getDeck(deckId);
        if (!active) return;
        if (!result.ok) { setError(result.error.message); return; }
        if (result.value.document.workspaceId!==workspaceId) { setError('This presentation is not in the selected workspace.'); return; }
        const cached = readDraft(profileId,deckId);
        const parsed = validateDeck(cached?.document ?? result.value.document);
        if (!parsed.ok) setError(parsed.error.message);
        else if (parsed.value.workspaceId!==workspaceId || parsed.value.id!==deckId) setError('This draft could not be verified. Return to the editor.');
        else setDocument(parsed.value);
      } catch { if (active) setError('The preview could not be opened. Check your connection and return to the editor.'); }
    }
    queueMicrotask(() => { if (active) void load(); });
    return () => { active=false;releaseActivity?.(); };
  },[workspaceId,deckId,profileId,service]);
  useEffect(() => {
    const previous = window.document.body.style.overflow;
    window.document.body.style.overflow='hidden'; exit.current?.focus();
    const inspectFullscreen=()=>{setFullscreen(!!window.document.fullscreenElement);if(window.document.fullscreenElement===window.document.documentElement)enteredFullscreen.current=true;};
    inspectFullscreen();window.document.addEventListener('fullscreenchange',inspectFullscreen);
    function keyboard(event: KeyboardEvent) {
      if (event.key==='Escape') { event.preventDefault(); navigate(back); }
      if (event.key==='Tab') { const controls=Array.from(root.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')??[]);if(controls.length){event.preventDefault();const index=controls.indexOf(window.document.activeElement as HTMLElement);controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();} }
      if(event.key===' ' && (event.target as HTMLElement).closest('button'))return;
      if (event.key==='ArrowRight' || event.key===' ') { event.preventDefault(); setSelected(index => Math.min(index+1,(document?.slides.length ?? 1)-1)); }
      if (event.key==='ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0,index-1)); }
    }
    window.addEventListener('keydown',keyboard);
    return () => { window.document.body.style.overflow=previous; window.removeEventListener('keydown',keyboard);window.document.removeEventListener('fullscreenchange',inspectFullscreen); };
  },[document,back,navigate]);
  useEffect(()=>()=>{queueMicrotask(()=>{if(!root.current?.isConnected && enteredFullscreen.current && window.document.fullscreenElement===window.document.documentElement)void window.document.exitFullscreen().catch(()=>{});});},[]);
  async function toggleFullscreen(){
    setFullscreenError(null);
    try{if(window.document.fullscreenElement)await window.document.exitFullscreen();else{await window.document.documentElement.requestFullscreen();enteredFullscreen.current=true;}}
    catch{setFullscreenError('Fullscreen could not start. The complete slide is still visible; use your browser fullscreen control or return to the editor.');}
  }
  const slide=document?.slides[selected],backdrop=slide?.background.kind==='solid'?slide.background.color:'#12343d';
  return createPortal(<section ref={root} className="full-slide-preview" role="dialog" aria-modal="true" aria-label="Presentation preview" style={{background:backdrop}}>
    <div className="preview-controls"><Link ref={exit} className="preview-icon" to={back} aria-label="Back to editor" title="Back to editor"><ArrowLeft size={20}/></Link><button className="preview-icon" onClick={()=>void toggleFullscreen()} aria-label={fullscreen?'Exit fullscreen':'Enter fullscreen'} title={fullscreen?'Exit fullscreen':'Enter fullscreen'}>{fullscreen?<Minimize size={19}/>:<Maximize size={19}/>}</button></div>
    {fullscreenError && <p className="preview-fullscreen-message" role="status">{fullscreenError}</p>}
    {error ? <p role="alert" className="preview-error">{error}</p> : slide ? <SlideRenderer slide={slide} resolveMedia={media.resolveMedia} mode="audience" viewportBackground={backdrop} /> : <p className="preview-error" role="status">Opening preview…</p>}
  </section>,window.document.body);
}
