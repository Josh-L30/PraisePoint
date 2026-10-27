import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import { ArrowLeft, Save, Copy, Trash2,Undo2,Redo2 } from 'lucide-react';
import { deckService, type DeckService } from './deck-service';
import type { SavedDeck } from '../../domain/deck';
import type { ErrorCode } from '../../domain/result';
import { LIMITS } from '../../domain/limits';
import { templateNames } from './templates';
import { TemplatePicker } from './TemplatePicker';
import { SaveStatus } from './SaveStatus';
import { readDraft, rememberDraft, forgetDraft } from '../../lib/draft-memory';
import { createEditorState,reduceEditor,type EditorState,type EditorCommand } from './editor/editor-reducer';
import { EditorCanvas } from './editor/EditorCanvas';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { SlideStrip } from './editor/SlideStrip';
export type DeckEditorPageProps = { workspaceId: string; deckId: string; profileId: string; service?: DeckService };
export function DeckEditorPage({ workspaceId, deckId, profileId, service = deckService }: DeckEditorPageProps) {
  const navigate = useNavigate(), mounted = useRef(true), writing = useRef(false), allowNavigation = useRef(false);
  const [editor,setEditor] = useState<EditorState | null>(null), [revision,setRevision] = useState(1);
  const editorRef=useRef<EditorState | null>(null),savedVersion=useRef(0),root=useRef<HTMLDivElement>(null);
  const draft=editor?.document ?? null;
  const [dirty,setDirty] = useState(false), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true);
  const [error,setError] = useState<{ code: ErrorCode; message: string } | null>(null), [recovered,setRecovered] = useState(false);
  const [adding,setAdding] = useState(false), [deleteSlide,setDeleteSlide] = useState(false);
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
          const next=createEditorState(cached.document); editorRef.current=next; savedVersion.current=-1; setEditor(next); setRevision(cached.revision); setDirty(true); setRecovered(true);
          if (cached.revision!==result.value.revision) setError({ code: 'CONFLICT', message: 'A newer saved version exists. Your draft was recovered in this tab. Reload the saved version or save your draft as a copy.' });
        } else { const next=createEditorState(result.value.document); editorRef.current=next; savedVersion.current=next.version; setEditor(next); setRevision(result.value.revision); }
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
  function execute(command: EditorCommand) {
    const before=editorRef.current; if (!before || writing.current) return before;
    const next=reduceEditor(before,command); if (next===before) return next;
    editorRef.current=next; setEditor(next); const changed=next.version!==savedVersion.current; setDirty(changed);
    if (next.document!==before.document) {
      if (changed) rememberDraft(profileId,{ document: next.document,revision }); else forgetDraft(profileId,deckId);
      setRecovered(false); if (error?.code!=='CONFLICT') setError(null);
    }
    return next;
  }
  function validControls() {
    const invalid=root.current?.querySelector<HTMLInputElement>('input:invalid,textarea:invalid,select:invalid');
    if (!invalid) return true;
    invalid.reportValidity(); setError({ code: 'VALIDATION',message: 'Check the highlighted field and enter a value within its limits. Your draft is still here.' }); return false;
  }
  function accepted(value: SavedDeck) {
    const next=editorRef.current ? reduceEditor(editorRef.current,{ type: 'accept-saved',document: value.document }) : createEditorState(value.document);
    editorRef.current=next; savedVersion.current=next.version; setEditor(next);
    forgetDraft(profileId,deckId); setRevision(value.revision); setDirty(false); setError(null); setRecovered(false);
  }
  async function save(copy = false) {
    if (writing.current || !validControls()) return;
    const current=execute({ type: 'end-gesture' }); if (!current) return;
    writing.current=true; setBusy(true); setError(null);
    try {
      const result = copy ? await service.saveCopy(current.document,workspaceId) : await service.saveDeck(current.document,revision);
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
  if (!draft || !editor) return <section className="page-content">{back}<h1>Let’s reopen your presentation.</h1><p role="alert">{error?.message}</p><button className="button" onClick={() => window.location.reload()}>Reload page</button></section>;
  const selected=Math.max(0,draft.slides.findIndex(current => current.id===editor.selectedSlideId)),slide=draft.slides[selected];
  return <div ref={root} className="page-content deck-editor" aria-busy={busy} onKeyDown={event => {
    if (busy || event.defaultPrevented || (!event.ctrlKey && !event.metaKey) || (event.target as Element).closest('input,textarea,select,[contenteditable]:not([contenteditable=false])')) return;
    if (event.key.toLowerCase()==='z' || event.key.toLowerCase()==='y') {
      event.preventDefault(); execute({ type: event.key.toLowerCase()==='y' || event.shiftKey ? 'redo' : 'undo' });
    }
  }}>
    <header className="editor-heading">{back}<div className="editor-title-row"><div><span className="quiet-label">Presentation editor</span><h1>{draft.title}</h1></div>
      <div className="action-row"><button className="button desktop-edit-only" disabled={busy || (!editor.past.length && (!editor.gesture || editor.version===editor.gesture.version))} onClick={() => execute({ type: 'undo' })}><Undo2 size={15} />Undo</button>
        <button className="button desktop-edit-only" disabled={busy || !editor.future.length || !!(editor.gesture && editor.version!==editor.gesture.version)} onClick={() => execute({ type: 'redo' })}><Redo2 size={15} />Redo</button>
        <button className="button" disabled={busy} onClick={() => { if (!validControls()) return; execute({ type: 'end-gesture' }); allowNavigation.current=true; navigate('/app/w/' + workspaceId + '/decks/' + deckId + '/preview'); }}>Full-window preview</button>
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
      <SlideStrip state={editor} disabled={busy} onCommand={command => { execute(command); setDeleteSlide(false); }} onAdd={() => setAdding(value => !value)} />
      <div className="editor-canvas"><div className="canvas-toolbar"><strong>{templateNames[slide.category]}</strong><span>1920 × 1080 · 16:9</span></div>
        <EditorCanvas state={editor} onCommand={execute} disabled={busy} />
        <p className="canvas-caption">Line breaks stay exactly as entered. The same layout scales to your projector.</p>
        {adding && <section className="template-add-panel desktop-edit-only"><h2>Choose your next slide.</h2><TemplatePicker disabled={busy} onSelect={category => {
          execute({ type: 'add-slide',category }); setAdding(false);
        }} /></section>}
        <div className="slide-actions desktop-edit-only"><button className="text-button" disabled={busy || draft.slides.length>=LIMITS.slidesPerDeck} onClick={() => {
          execute({ type: 'duplicate-slide',id: slide.id });
        }}><Copy size={15} />Duplicate slide</button><button className="text-button" disabled={busy || draft.slides.length<=1} onClick={() => setDeleteSlide(true)}><Trash2 size={15} />Delete slide</button></div>
        {deleteSlide && <section className="confirmation-panel"><h3>Delete slide {selected+1}?</h3><p>This removes the slide from your draft. Undo restores it during this session.</p><div className="action-row"><button className="button" disabled={busy} onClick={() => { execute({ type: 'delete-slide',id: slide.id }); setDeleteSlide(false); }}>Confirm slide deletion</button><button className="button" onClick={() => setDeleteSlide(false)}>Cancel</button></div></section>}
      </div>
      <PropertiesPanel state={editor} onCommand={execute} disabled={busy} />
    </div>
  </div>;
}
