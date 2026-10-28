import {acquireRuntimeActivity} from '../offline/runtime-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { deckService, type DeckService } from './deck-service';
import type { DeckDocument } from '../../domain/deck';
import { readDraft } from '../../lib/draft-memory';
import { validateDeck } from '../../domain/slide-schema';
import {createMediaService} from '../media/media-service';
import { SlideRenderer } from '../../components/slide-renderer/SlideRenderer';
export function DeckPreviewPage({ workspaceId, deckId, profileId, service = deckService }: { workspaceId: string; deckId: string; profileId: string; service?: DeckService }) {
  const media=useMemo(()=>createMediaService(profileId),[profileId]);
  const navigate = useNavigate(), exit = useRef<HTMLAnchorElement>(null);
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
    function keyboard(event: KeyboardEvent) {
      if (event.key==='Escape') { event.preventDefault(); navigate(back); }
      if (event.key==='Tab') { event.preventDefault(); exit.current?.focus(); }
      if (event.key==='ArrowRight' || event.key===' ') { event.preventDefault(); setSelected(index => Math.min(index+1,(document?.slides.length ?? 1)-1)); }
      if (event.key==='ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0,index-1)); }
    }
    window.addEventListener('keydown',keyboard);
    return () => { window.document.body.style.overflow=previous; window.removeEventListener('keydown',keyboard); };
  },[document,back,navigate]);
  return <section className="full-slide-preview" role="dialog" aria-modal="true" aria-label="Presentation preview">
    <Link ref={exit} className="button preview-exit" to={back}><ArrowLeft size={16} />Exit preview</Link>
    {error ? <p role="alert" className="preview-error">{error}</p> : document ? <SlideRenderer slide={document.slides[selected]} resolveMedia={media.resolveMedia} mode="audience" /> : <p className="preview-error" role="status">Opening preview…</p>}
  </section>;
}
