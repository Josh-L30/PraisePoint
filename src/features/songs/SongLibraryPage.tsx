import {Modal,useConfirmation} from '../../components/Modal';
import {useEffect,useRef,useState} from 'react';
import {Music,Plus,Search} from 'lucide-react';
import type {Song} from '../../domain/song';
import type {Workspace} from '../workspaces/workspace-service';
import {songService,type SongService,type SongSummary} from './song-service';
import {LyricsEntryDialog} from './LyricsEntryDialog';
import {useContentGuard} from './use-content-guard';
export function SongLibraryPage({workspace,service=songService}:{workspace:Workspace;service?:SongService}){
 const [items,setItems]=useState<SongSummary[]>([]),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[version,setVersion]=useState(0);
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [draft,setDraft]=useState<Song|null>(null),[dirty,setDirty]=useState(false),[review,setReview]=useState(false),[error,setError]=useState<string|null>(null);
 const [deleting,setDeleting]=useState<SongSummary|null>(null),[conflict,setConflict]=useState(false),[savedLabel,setSavedLabel]=useState<'Saved'|'Updated'|null>(null);
 const {confirm,dialog:confirmationDialog}=useConfirmation();
 const writing=useRef(false),mounted=useRef(true),guard=useContentGuard(dirty || review,busy);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setLoading(true);void service.list(workspace.id,query,page).then(result=>{
  if(!active)return;if(result.ok){setItems(result.value.items);setHasMore(result.value.hasMore);}else{setItems([]);setError(result.error.message);}setLoading(false);
 });});return()=>{active=false;};},[workspace.id,query,page,version,service]);
 async function open(id:string){
  if(writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.getSong(id);if(!mounted.current)return;
   if(result.ok && result.value.workspaceId===workspace.id){setDraft(result.value);setDirty(false);setReview(false);setConflict(false);setSavedLabel(null);}else setError(result.ok?'This song is not in this workspace.':result.error.message);
  }finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 function change(patch:Partial<Song>){setDraft(value=>value?{...value,...patch}:value);setDirty(true);setSavedLabel(null);}
 async function save(){
  if(!draft || writing.current || review)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.saveSong(draft,draft.revision);if(!mounted.current)return;
   if(result.ok){setSavedLabel(draft.revision?'Updated':'Saved');setDraft(result.value);setDirty(false);setConflict(false);setVersion(v=>v+1);}else{setError(result.error.message);setConflict(result.error.code==='CONFLICT');}
  }finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 async function close(){if((dirty || review) && !await confirm({title:'Discard unsaved song?',message:'Your song draft has not been saved.',confirmLabel:'Discard draft',danger:true}))return;setDraft(null);setReview(false);setDirty(false);setConflict(false);setError(null);}
 async function remove(){
  if(!deleting || writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.deleteSong(deleting.id);if(!mounted.current)return;if(result.ok){setDeleting(null);setPage(0);setVersion(v=>v+1);}else setError(result.error.message);}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="page-content song-library" aria-busy={busy}>
  <header className="page-heading library-heading"><div><h1>Words worth keeping.</h1><p>A reusable song library for your worship team.</p></div>{!draft && <button className="button button-primary desktop-edit-only" disabled={busy} onClick={()=>{setDraft({id:crypto.randomUUID(),workspaceId:workspace.id,title:'',lyrics:'',author:null,source:null,usageNotes:null,revision:0});setDirty(false);setReview(false);setSavedLabel(null);setError(null);}}><Plus size={17}/>New song</button>}</header>
  {confirmationDialog}{guard}{error && !deleting && !review && <p className="form-message form-error" role="alert">{error}</p>}
  {draft?<><section className="content-editor glass"><div className="card-heading"><div><h2>{draft.revision?'Edit song master':'Create a song master'}</h2><p>Updating this master leaves existing service copies unchanged.</p></div><button className="text-button" disabled={busy} onClick={close}>Close song</button></div>
   <form onSubmit={e=>{e.preventDefault();void save();}}><label className="field-label" htmlFor="song-title">Song title</label><input className="field-input" id="song-title" required maxLength={120} disabled={busy} value={draft.title} onChange={e=>change({title:e.target.value})}/>
    <div className="content-field-grid"><label className="field-label">Author / writer<input className="field-input" maxLength={500} disabled={busy} value={draft.author??''} onChange={e=>change({author:e.target.value || null})}/></label><label className="field-label">Source / attribution<input className="field-input" maxLength={2000} disabled={busy} value={draft.source??''} onChange={e=>change({source:e.target.value || null})}/></label></div>
    <label className="field-label">Usage notes<textarea className="field-input" maxLength={2000} disabled={busy} value={draft.usageNotes??''} onChange={e=>change({usageNotes:e.target.value || null})}/></label>
    {!review && <><p className="field-help">{draft.lyrics?draft.lyrics.split('\n\n').length+' reviewed lyric slides':'Review lyrics before saving.'}</p><div className="action-row"><button type="button" className="button" disabled={busy} onClick={()=>setReview(true)}>Edit lyrics and slide breaks</button><button className="button button-primary" disabled={busy || !draft.lyrics || !dirty}>{busy?'Saving…':savedLabel??(draft.revision?'Update song master':'Save song master')}</button></div>{savedLabel && <p className="field-help" role="status">{savedLabel} successfully.</p>}</>}
   </form>
   {conflict && <button className="button" disabled={busy} onClick={async()=>{if(await confirm({title:'Reload saved song?',message:'This replaces the current draft with the latest saved song.',confirmLabel:'Discard draft and reload',danger:true}))void open(draft.id);}}>Discard draft and reload latest song</button>}
  </section>{review && <LyricsEntryDialog externalError={error} key={draft.id} initialLyrics={draft.lyrics} busy={busy} onConfirm={async lyrics=>{change({lyrics});setReview(false);}} onCancel={()=>setReview(false)}/>}</>
  :<><form className="library-search" onSubmit={e=>{e.preventDefault();setQuery(search);setPage(0);setError(null);}}><label className="field-label" htmlFor="song-search">Find a song</label><div className="action-row"><input className="field-input" id="song-search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/><button className="button" disabled={busy}><Search size={16}/>Search</button></div></form>
   {loading?<p role="status">Loading songs…</p>:!items.length?<section className="library-empty glass"><Music/><h2>{query?'No matching songs.':'Begin with a song.'}</h2><p>{query?'Try another title.':'Type or paste lyrics, review their slide breaks, and save them here.'}</p>{error && <button className="button" onClick={()=>setVersion(v=>v+1)}>Try again</button>}</section>:<div className="content-list">{items.map(song=><article className="content-row glass" key={song.id}><Music size={22}/><div><h2>{song.title}</h2><p>{song.author || 'Writer not recorded'} · Revision {song.revision}</p></div><div className="action-row"><button className="button" disabled={busy} onClick={()=>void open(song.id)}>Open song</button>{workspace.role==='owner' && <button className="text-button text-button-danger" disabled={busy} onClick={()=>setDeleting(song)}>Delete song</button>}</div></article>)}</div>}
   {(page>0 || hasMore) && <nav className="library-pagination" aria-label="Song pages"><button className="button" disabled={page===0 || busy} onClick={()=>setPage(p=>p-1)}>Previous page</button><span>Page {page+1}</span><button className="button" disabled={!hasMore || busy} onClick={()=>setPage(p=>p+1)}>Next page</button></nav>}
  </>}
  {deleting && <Modal className="confirmation-panel" aria-label="Delete song" onCancel={()=>setDeleting(null)} busy={busy}><h2>Delete {deleting.title}?</h2>{error && <p className="form-error" role="alert">{error}</p>}<p>Song masters with linked presentations cannot be deleted. Remove those presentations first.</p><div className="action-row"><button className="button button-danger" disabled={busy} onClick={()=>void remove()}>Confirm song deletion</button><button className="button" disabled={busy} onClick={()=>setDeleting(null)}>Cancel</button></div></Modal>}
 </div>;
}
