import {Modal} from '../../components/Modal';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Presentation, Plus, Copy, Trash2, ArrowRight } from 'lucide-react';
import { createDeckService, type DeckService, type DeckSummary } from './deck-service';
import type { Workspace } from '../workspaces/workspace-service';
import { TemplatePicker } from './TemplatePicker';
import type { SlideCategory } from '../../domain/slide';
import {supabase} from '../../lib/supabase';
import {createMediaService} from '../media/media-service';
import {useContentGuard} from '../songs/use-content-guard';
export type DeckListPageProps = { workspace: Workspace; profileId: string; workspaces: Workspace[]; service?: DeckService };
export function DeckListPage({ workspace, profileId, workspaces, service:provided }: DeckListPageProps) {
  const service=useMemo(()=>provided??createDeckService(supabase,createMediaService(profileId)),[provided,profileId]);
  const navigate = useNavigate(), mounted = useRef(true), writing = useRef(false);
  const [items,setItems] = useState<DeckSummary[]>([]), [hasMore,setHasMore] = useState(false), [page,setPage] = useState(0);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [version,setVersion] = useState(0);
  const [error,setError] = useState<string | null>(null), [choosing,setChoosing] = useState(false);
  const [action,setAction] = useState<{ kind: 'copy' | 'delete'; deck: DeckSummary } | null>(null), [destination,setDestination] = useState(workspace.id);
  const guard=useContentGuard(false,busy);
  const base = '/app/w/' + workspace.id + '/decks';
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; },[]);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const result = await service.list(workspace.id,page);
        if (!active) return;
        if (result.ok) { setItems(result.value.items); setHasMore(result.value.hasMore); }
        else { setItems([]); setHasMore(false); setError(result.error.message); }
      } catch { if (active) { setItems([]); setError('Your presentations could not be loaded. Check your connection and try again.'); } }
      finally { if (active) setLoading(false); }
    }
    queueMicrotask(() => { if (active) void load(); });
    return () => { active=false; };
  },[workspace.id,page,version,service]);
  async function create(category: SlideCategory) {
    if (writing.current) return;
    writing.current=true; setBusy(true); setError(null);
    try {
      const result = await service.createDeck(workspace.id,category);
      if (!mounted.current) return;
      if (result.ok) navigate(base + '/' + result.value.document.id); else setError(result.error.message);
    } catch { if (mounted.current) setError('Creation could not be confirmed. Refresh the library before trying again.'); }
    finally { writing.current=false; if (mounted.current) setBusy(false); }
  }
  async function confirmAction() {
    if (!action || writing.current || (action.kind==='copy' && !workspaces.some(w => w.id===destination))) return;
    writing.current=true; setBusy(true); setError(null);
    try {
      if (action.kind==='copy') {
        const result = await service.duplicateDeck(action.deck.id,destination);
        if (!mounted.current) return;
        if (result.ok) navigate('/app/w/' + destination + '/decks/' + result.value.document.id); else setError(result.error.message);
      } else {
        const result = await service.deleteDeck(action.deck.id);
        if (!mounted.current) return;
        if (result.ok) { setAction(null); if (items.length===1 && page>0) setPage(page-1); setVersion(value => value+1); }
        else setError(result.error.message);
      }
    } catch { if (mounted.current) setError('This change could not be confirmed. Refresh before trying again.'); }
    finally { writing.current=false; if (mounted.current) setBusy(false); }
  }
  return <div className="page-content deck-library" aria-busy={busy}>
    {guard}<header className="page-heading library-heading"><div><h1>Words with purpose.</h1><p>Your presentations, ready for thoughtful preparation.</p></div>
      <button className="button button-primary desktop-edit-only" disabled={busy} onClick={() => setChoosing(value => !value)}><Plus size={17} />New presentation</button></header>
    {error && !action && <p className="form-message form-error" role="alert">{error}</p>}
    <p className="desktop-edit-note">Use a laptop or desktop to create and edit presentations. Open an existing presentation to preview it here.</p>
    {choosing && <section className="template-panel glass desktop-edit-only"><div className="card-heading"><h2>Start with a clear layout.</h2><button className="text-button" disabled={busy} onClick={() => setChoosing(false)}>Close templates</button></div><p>Choose a starting point. Every word, color and text style is editable.</p><TemplatePicker disabled={busy} onSelect={category => void create(category)} /></section>}
    {loading ? <p role="status">Loading presentations…</p> : error && !items.length ? <button className="button" onClick={() => setVersion(value => value+1)}>Try again</button>
      : !items.length ? <section className="library-empty glass"><span className="feature-icon"><Presentation /></span><h2>Make space for your next service.</h2><p>Choose New presentation to begin with lyrics, Scripture, a message, an announcement, or a welcome.</p><small>{workspace.kind==='personal' ? 'Only you can access presentations created here.' : 'Your church’s volunteers can edit presentations created here.'}</small></section>
      : <div className="deck-grid">{items.map(deck => <article className="deck-card glass" key={deck.id} aria-label={deck.title}>
        <div className="deck-card-art" aria-hidden="true"><Presentation size={32} /><span>Prepare with care.</span></div><div className="deck-card-content"><h2><Link to={base + '/' + deck.id}>{deck.title}</Link></h2>
          <p>Revision {deck.revision} · {new Intl.DateTimeFormat(undefined,{ dateStyle: 'medium' }).format(new Date(deck.updatedAt))}</p>
          <Link className="text-button" to={base + '/' + deck.id}>Open presentation <ArrowRight size={15} /></Link>
          <div className="deck-card-actions desktop-edit-only"><button className="text-button" disabled={busy} onClick={() => { setAction({ kind: 'copy',deck }); setDestination(workspace.id); }}><Copy size={14} />Make a copy</button>
            {(workspace.role==='owner' || deck.createdBy===profileId) && <button className="text-button" disabled={busy} onClick={() => setAction({ kind: 'delete',deck })}><Trash2 size={14} />Delete</button>}</div>
        </div>
      </article>)}</div>}
    {action && <Modal className="confirmation-panel library-confirmation" role="dialog" aria-label={action.kind==='copy' ? 'Copy presentation' : 'Delete presentation'} onCancel={()=>setAction(null)} busy={busy}>
      <h2>{action.kind==='copy' ? 'Create a separate copy?' : 'Delete this presentation?'}</h2>{error && <p className="form-error" role="alert">{error}</p>}<p><strong><bdi>{action.deck.title}</bdi></strong></p>
      {action.kind==='copy' ? <><label className="field-label" htmlFor="copy-destination">Copy to workspace</label><select className="field-input" id="copy-destination" value={destination} disabled={busy} onChange={event => setDestination(event.target.value)}>{workspaces.map(w => <option value={w.id} key={w.id}>{w.name}{w.kind==='church' ? ' · Shared' : ' · Private'}</option>)}</select><p>Copying to a church makes this separate copy available to its volunteers. The original stays where it is. Media must belong to the destination workspace.</p></>
        : <p>This removes the saved presentation. Presentations referenced by a service must be removed from that service first.</p>}
      <div className="action-row"><button className={'button '+(action.kind==='copy'?'button-primary':'button-danger')} disabled={busy} onClick={() => void confirmAction()}>{busy ? 'Working…' : action.kind==='copy' ? 'Create separate copy' : 'Confirm presentation deletion'}</button><button className="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button></div>
    </Modal>}
    {!loading && (page>0 || hasMore) && <nav className="library-pagination" aria-label="Presentation pages"><button className="button" disabled={page===0 || busy} onClick={() => setPage(value => value-1)}>Previous page</button><span>Page {page+1}</span><button className="button" disabled={!hasMore || busy} onClick={() => setPage(value => value+1)}>Next page</button></nav>}
    <footer className="workspace-footer">Online saves are authoritative. Prepare a service for offline use when the presentation tools are ready.</footer>
  </div>;
}
