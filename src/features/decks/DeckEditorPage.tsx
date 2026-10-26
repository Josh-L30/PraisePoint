import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import { ArrowLeft, Save, Plus, Copy, Trash2 } from 'lucide-react';
import { deckService, type DeckService } from './deck-service';
import type { DeckDocument, SavedDeck } from '../../domain/deck';
import type { SlideCategory, TextElement } from '../../domain/slide';
import type { ErrorCode } from '../../domain/result';
import { LIMITS } from '../../domain/limits';
import { createTemplate, templateNames } from './templates';
import { SlideRenderer } from '../../components/slide-renderer/SlideRenderer';
import { TemplatePicker } from './TemplatePicker';
import { SaveStatus } from './SaveStatus';
import { readDraft, rememberDraft, forgetDraft } from '../../lib/draft-memory';
export type DeckEditorPageProps = { workspaceId: string; deckId: string; profileId: string; service?: DeckService };
const fieldNames: Record<SlideCategory,string[]> = { lyrics: ['Lyrics'], scripture: ['Passage','Reference','Translation'], sermon: ['Message title','Main points'], announcement: ['Announcement title','Details'], 'welcome-closing': ['Welcome or closing message','Supporting line'] };
export function DeckEditorPage({ workspaceId, deckId, profileId, service = deckService }: DeckEditorPageProps) {
  const navigate = useNavigate(), mounted = useRef(true), writing = useRef(false), allowNavigation = useRef(false);
  const [draft,setDraft] = useState<DeckDocument | null>(null), [revision,setRevision] = useState(1);
  const [dirty,setDirty] = useState(false), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true);
  const [error,setError] = useState<{ code: ErrorCode; message: string } | null>(null), [recovered,setRecovered] = useState(false);
  const [selected,setSelected] = useState(0), [adding,setAdding] = useState(false), [deleteSlide,setDeleteSlide] = useState(false);
  const blocker = useBlocker(() => !allowNavigation.current && (dirty || writing.current));
  useEffect(() => {
    mounted.current=true; let active = true;
    async function load() {
      try {
        const result = await service.getDeck(deckId);
        if (!active) return;
        if (!result.ok) { setError(result.error); return; }
        if (result.value.document.workspaceId!==workspaceId) { setError({ code: 'FORBIDDEN', message: 'This presentation is not in the selected workspace.' }); return; }
        const cached = readDraft(profileId,deckId);
        if (cached && cached.document.workspaceId===workspaceId) {
          setDraft(cached.document); setRevision(cached.revision); setDirty(true); setRecovered(true);
          if (cached.revision!==result.value.revision) setError({ code: 'CONFLICT', message: 'A newer saved version exists. Your draft was recovered in this tab. Reload the saved version or save your draft as a copy.' });
        } else { setDraft(result.value.document); setRevision(result.value.revision); }
      } catch { if (active) setError({ code: 'NETWORK', message: 'The presentation could not be loaded. Check your connection and retry.' }); }
      finally { if (active) setLoading(false); }
    }
    queueMicrotask(() => { if (active) void load(); });
    return () => { active=false; mounted.current=false; };
  },[deckId,workspaceId,profileId,service]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty || writing.current) { event.preventDefault(); event.returnValue=''; } }
    function accountChange(event: Event) {
      if (writing.current) { event.preventDefault(); setError({ code: 'CONFLICT', message: 'Wait for the save to finish before signing out.' }); }
      else if (dirty) {
        if (!window.confirm('Discard your unsaved presentation changes and sign out?')) event.preventDefault();
        else forgetDraft(profileId,deckId);
      }
    }
    window.addEventListener('beforeunload',beforeUnload); window.addEventListener('gather-before-account-change',accountChange);
    return () => { window.removeEventListener('beforeunload',beforeUnload); window.removeEventListener('gather-before-account-change',accountChange); };
  },[dirty,profileId,deckId]);
  useEffect(() => { if (blocker.state==='blocked' && !dirty && !busy) blocker.proceed(); },[blocker,dirty,busy]);
  function change(document: DeckDocument) {
    if (writing.current) return;
    setDraft(document); setDirty(true); setRecovered(false);
    if (error?.code!=='CONFLICT') setError(null);
    rememberDraft(profileId,{ document,revision });
  }
  function accepted(value: SavedDeck) {
    forgetDraft(profileId,deckId); setDraft(value.document); setRevision(value.revision); setDirty(false); setError(null); setRecovered(false);
    setSelected(index => Math.min(index,value.document.slides.length-1));
  }
  async function save(copy = false) {
    if (!draft || writing.current) return;
    writing.current=true; setBusy(true); setError(null);
    try {
      const result = copy ? await service.saveCopy(draft,workspaceId) : await service.saveDeck(draft,revision);
      if (!mounted.current) return;
      if (!result.ok) { setError(result.error); return; }
      accepted(result.value);
      if (copy) { allowNavigation.current=true; navigate('/app/w/' + workspaceId + '/decks/' + result.value.document.id); }
    } catch { if (mounted.current) setError({ code: 'NETWORK', message: 'Saving could not be confirmed. Your draft is still here. Retry after checking your connection.' }); }
    finally { writing.current=false; if (mounted.current) setBusy(false); }
  }
  async function reloadSaved() {
    if (writing.current) return;
    writing.current=true; setBusy(true);
    try {
      const result = await service.getDeck(deckId);
      if (!mounted.current) return;
      if (!result.ok) setError(result.error);
      else if (result.value.document.workspaceId!==workspaceId) setError({ code: 'FORBIDDEN', message: 'This presentation is not in the selected workspace.' });
      else accepted(result.value);
    } catch { if (mounted.current) setError({ code: 'NETWORK', message: 'Reload failed. Your draft has been kept.' }); }
    finally { writing.current=false; if (mounted.current) setBusy(false); }
  }
  const back = <Link className="text-button" to={'/app/w/' + workspaceId + '/decks'}><ArrowLeft size={16} />Back to presentations</Link>;
  if (loading) return <section className="page-content"><p role="status">Opening your presentation…</p></section>;
  if (!draft) return <section className="page-content">{back}<h1>Let’s reopen your presentation.</h1><p role="alert">{error?.message}</p><button className="button" onClick={() => window.location.reload()}>Reload page</button></section>;
  const slide = draft.slides[selected] ?? draft.slides[0];
  function textChange(elementId: string,patch: Partial<TextElement>) {
    change({ ...draft!, slides: draft!.slides.map(current => current.id!==slide.id ? current : { ...current, elements: current.elements.map(element => element.id===elementId && element.kind==='text' ? { ...element,...patch } : element) }) });
  }
  return <div className="page-content deck-editor" aria-busy={busy}>
    <header className="editor-heading">{back}<div className="editor-title-row"><div><span className="quiet-label">Presentation editor</span><h1>{draft.title}</h1></div>
      <div className="action-row"><button className="button" disabled={busy} onClick={() => { allowNavigation.current=true; navigate('/app/w/' + workspaceId + '/decks/' + deckId + '/preview'); }}>Full-window preview</button>
        <button className="button button-primary desktop-edit-only" disabled={busy || !dirty || error?.code==='CONFLICT'} onClick={() => void save()}><Save size={16} />{busy ? 'Saving…' : 'Save presentation'}</button></div></div>
      <SaveStatus dirty={dirty} busy={busy} error={error} revision={revision} />
      {recovered && <p className="field-help">Your unsaved draft was recovered in this tab. Save it before closing.</p>}
      {error?.code==='CONFLICT' && <div className="conflict-actions"><p>Reload replaces your current draft with the saved version. A copy preserves your draft separately.</p><div className="action-row">
        <button className="button" disabled={busy} onClick={() => void reloadSaved()}>Reload saved version</button><button className="button button-primary" disabled={busy} onClick={() => void save(true)}>Save draft as a copy</button>
      </div></div>}
    </header>
    <p className="desktop-edit-note">Open this presentation on a laptop or desktop to edit. You can preview slides here.</p>
    {blocker.state==='blocked' && <section className="confirmation-panel draft-confirmation" role="alertdialog" aria-labelledby="leave-heading">
      <h2 id="leave-heading">{busy ? 'Your save is still finishing.' : 'Leave without saving?'}</h2><p>{busy ? 'Keep this tab open until the result is confirmed.' : 'Your changes have not been saved online. Keep editing or discard them to leave.'}</p>
      <div className="action-row"><button className="button button-primary" onClick={() => blocker.reset()}>Keep editing</button><button className="button" disabled={busy} onClick={() => { forgetDraft(profileId,deckId); allowNavigation.current=true; blocker.proceed(); }}>Discard changes and leave</button></div>
    </section>}
    <div className="editor-layout">
      <nav className="slide-rail" aria-label="Presentation slides"><div className="rail-heading"><strong>Slides</strong><span>{draft.slides.length}/{LIMITS.slidesPerDeck}</span></div>
        {draft.slides.map((current,index) => <button key={current.id} className="slide-thumbnail" aria-label={'Slide ' + (index+1) + ': ' + templateNames[current.category]} aria-pressed={index===selected} onClick={() => { setSelected(index); setDeleteSlide(false); }}>
          <SlideRenderer slide={current} mode="preview" /><span>{index+1} · {templateNames[current.category]}</span></button>)}
        <button className="button desktop-edit-only" disabled={busy || draft.slides.length>=LIMITS.slidesPerDeck} onClick={() => setAdding(value => !value)}><Plus size={15} />Add slide</button>
      </nav>
      <div className="editor-canvas"><div className="canvas-toolbar"><strong>{templateNames[slide.category]}</strong><span>1920 × 1080 · 16:9</span></div>
        <SlideRenderer slide={slide} mode="editor" />
        <p className="canvas-caption">Line breaks stay exactly as entered. The same layout scales to your projector.</p>
        {adding && <section className="template-add-panel desktop-edit-only"><h2>Choose your next slide.</h2><TemplatePicker disabled={busy} onSelect={category => {
          const slides = [...draft.slides]; slides.splice(selected+1,0,createTemplate(category)); change({ ...draft,slides }); setSelected(selected+1); setAdding(false);
        }} /></section>}
        <div className="slide-actions desktop-edit-only"><button className="text-button" disabled={busy || draft.slides.length>=LIMITS.slidesPerDeck} onClick={() => {
          const copy = structuredClone(slide); copy.id=crypto.randomUUID(); copy.elements.forEach(element => { element.id=crypto.randomUUID(); });
          const slides = [...draft.slides]; slides.splice(selected+1,0,copy); change({ ...draft,slides }); setSelected(selected+1);
        }}><Copy size={15} />Duplicate slide</button><button className="text-button" disabled={busy || draft.slides.length<=1} onClick={() => setDeleteSlide(true)}><Trash2 size={15} />Delete slide</button></div>
        {deleteSlide && <section className="confirmation-panel"><h3>Delete slide {selected+1}?</h3><p>This removes the slide from your draft.</p><div className="action-row"><button className="button" disabled={busy} onClick={() => { change({ ...draft,slides: draft.slides.filter(current => current.id!==slide.id) }); setSelected(Math.max(0,selected-1)); setDeleteSlide(false); }}>Confirm slide deletion</button><button className="button" onClick={() => setDeleteSlide(false)}>Cancel</button></div></section>}
      </div>
      <aside className="editor-inspector glass"><h2>Make it yours.</h2><fieldset disabled={busy}><label className="field-label" htmlFor="presentation-title">Presentation title</label><input className="field-input" id="presentation-title" value={draft.title} onChange={event => change({ ...draft,title: event.target.value })} />
        {slide.elements.filter(element => element.kind==='text').map((element,index) => <section className="text-inspector" key={element.id}>
          <label className="field-label" htmlFor={'text-' + element.id}>{fieldNames[slide.category][index] ?? 'Text ' + (index+1)}</label>
          <textarea id={'text-' + element.id} className="field-input" rows={index===0 ? 5 : 3} value={element.text} onChange={event => textChange(element.id,{ text: event.target.value })} />
          <p className="field-help">{element.text.length.toLocaleString()} / {LIMITS.textCharacters.toLocaleString()} characters · use Enter for a line break.</p>
          <div className="style-controls"><label>Text size<input className="field-input" type="number" min={8} max={300} step="any" required value={element.fontSize===0 ? '' : element.fontSize} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value)) textChange(element.id,{ fontSize: value }); }} /></label>
            <label>Text color<input type="color" value={element.color} onChange={event => textChange(element.id,{ color: event.target.value })} /></label></div>
          <label className="field-label" htmlFor={'align-' + element.id}>Text alignment</label><select className="field-input" id={'align-' + element.id} value={element.align} onChange={event => textChange(element.id,{ align: event.target.value as TextElement['align'] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
        </section>)}
        {slide.background.kind==='solid' && <label className="field-label background-control">Background color<input type="color" value={slide.background.color} onChange={event => change({ ...draft,slides: draft.slides.map(current => current.id===slide.id ? { ...current,background: { kind: 'solid',color: event.target.value } } : current) })} /></label>}
      </fieldset>{slide.category==='scripture' && <p className="field-help">Scripture is entered manually. Check the passage, reference and translation before presenting.</p>}</aside>
    </div>
  </div>;
}
