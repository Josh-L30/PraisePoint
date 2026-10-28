import {TransferDialog} from '../transfer/TransferDialog';
import {ExportMetadataButton} from '../transfer/ExportMetadataButton';
import {PrepareServiceButton} from '../offline/PrepareServiceButton';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router';
import {ListOrdered,Plus,ArrowUp,ArrowDown} from 'lucide-react';
import type {Workspace} from '../workspaces/workspace-service';
import type {ServicePlan,ServiceSnapshot} from '../../domain/service';
import type {Song} from '../../domain/song';
import {serviceService,type ServiceService,type ServiceSummary} from './service-service';
import {songService,type SongService,type SongSummary} from '../songs/song-service';
import {deckService,type DeckService,type DeckSummary} from '../decks/deck-service';
import {LyricsEntryDialog} from '../songs/LyricsEntryDialog';
import {useContentGuard} from '../songs/use-content-guard';
import {SlideRenderer} from '../../components/slide-renderer/SlideRenderer';
import {createMediaService} from '../media/media-service';
type Props={profileId:string;workspace:Workspace;serviceId?:string;service?:ServiceService;songs?:SongService;decks?:DeckService};
export function ServicePlanPage({profileId,workspace,serviceId,service=serviceService,songs=songService,decks=deckService}:Props){
 const media=useMemo(()=>createMediaService(profileId),[profileId]);
 const [preparing,setPreparing]=useState(false),[transferOpen,setTransferOpen]=useState(false),[transferDirty,setTransferDirty]=useState(false);
 const [items,setItems]=useState<ServiceSummary[]>([]),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[version,setVersion]=useState(0);
 const [draft,setDraft]=useState<ServicePlan|null>(null),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[conflict,setConflict]=useState(false);
 const [picker,setPicker]=useState<'songs'|'decks'|null>(null),[pickPage,setPickPage]=useState(0),[pickMore,setPickMore]=useState(false),[picking,setPicking]=useState(false);
 const [songItems,setSongItems]=useState<SongSummary[]>([]),[deckItems,setDeckItems]=useState<DeckSummary[]>([]),[query,setQuery]=useState(''),[search,setSearch]=useState('');
 const [reviewedSong,setReviewedSong]=useState<Song|null>(null),[deleting,setDeleting]=useState<ServiceSummary|null>(null),[snapshot,setSnapshot]=useState<ServiceSnapshot|null>(null),[slideIndex,setSlideIndex]=useState(0);
 const mounted=useRef(true),writing=useRef(false),guard=useContentGuard(dirty || transferDirty,busy || preparing);
 const base='/app/w/'+workspace.id;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setLoading(true);
  if(serviceId)void service.getService(serviceId).then(result=>{if(!active)return;if(result.ok && result.value.workspaceId===workspace.id){setDraft(result.value);setDirty(false);}else setError(result.ok?'This service is not in this workspace.':result.error.message);setLoading(false);});
  else void service.list(workspace.id,page).then(result=>{if(!active)return;if(result.ok){setItems(result.value.items);setHasMore(result.value.hasMore);}else{setItems([]);setError(result.error.message);}setLoading(false);});
 });return()=>{active=false;};},[workspace.id,serviceId,service,page,version]);
 useEffect(()=>{let active=true;if(!picker)return;queueMicrotask(()=>{if(!active)return;setPicking(true);
  if(picker==='songs')void songs.list(workspace.id,query,pickPage).then(result=>{if(!active)return;if(result.ok){setSongItems(result.value.items);setPickMore(result.value.hasMore);}else{setSongItems([]);setError(result.error.message);}setPicking(false);});
  else void decks.list(workspace.id,pickPage).then(result=>{if(!active)return;if(result.ok){setDeckItems(result.value.items);setPickMore(result.value.hasMore);}else{setDeckItems([]);setError(result.error.message);}setPicking(false);});
 });return()=>{active=false;};},[picker,pickPage,query,workspace.id,songs,decks]);
 function change(next:ServicePlan){setDraft(next);setDirty(true);setSnapshot(null);}
 async function save(){if(!draft || writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.saveService(draft,draft.revision);if(!mounted.current)return;if(result.ok){setDraft(result.value);setDirty(false);setConflict(false);setSnapshot(null);}else{setError(result.error.message);setConflict(result.error.code==='CONFLICT');}}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 function reorder(index:number,delta:number){if(!draft || busy)return;const values=[...draft.items],target=index+delta;if(target<0 || target>=values.length)return;
  [values[index],values[target]]=[values[target],values[index]];change({...draft,items:values.map((item,position)=>({...item,position}))});
 }
 function chooseDeck(deck:DeckSummary){if(!draft || draft.items.length>=100 || deck.workspaceId!==workspace.id)return;
  change({...draft,items:[...draft.items,{id:crypto.randomUUID(),deckId:deck.id,label:deck.title,position:draft.items.length}]});setPicker(null);
 }
 async function chooseSong(id:string){if(writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await songs.getSong(id);if(!mounted.current)return;if(result.ok && result.value.workspaceId===workspace.id)setReviewedSong(result.value);else setError(result.ok?'Song unavailable in this workspace.':result.error.message);}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 async function appendSong(){if(!reviewedSong || !draft || dirty || writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.addSongToService(reviewedSong.id,draft.id,{songRevision:reviewedSong.revision,serviceRevision:draft.revision});if(!mounted.current)return;
   if(!result.ok){setError(result.error.message);return;}
   setReviewedSong(null);setPicker(null);setSnapshot(null);
   const refreshed=await service.getService(draft.id);if(!mounted.current)return;
   if(refreshed.ok && refreshed.value.workspaceId===workspace.id){setDraft(refreshed.value);setDirty(false);}else setError('The song was added, but the updated service could not load. Reload the latest service before making another change.');
  }finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 async function reviewService(){if(!draft || dirty || writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.buildServiceSnapshot(draft.id);if(!mounted.current)return;if(result.ok && result.value.workspaceId===workspace.id){setSnapshot(result.value);setSlideIndex(0);}else setError(result.ok?'Snapshot unavailable in this workspace.':result.error.message);}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 async function reload(){if(!draft || writing.current || (dirty && !window.confirm('Discard this draft and reload the saved service?')))return;writing.current=true;setBusy(true);
  try{const result=await service.getService(draft.id);if(!mounted.current)return;if(result.ok && result.value.workspaceId===workspace.id){setDraft(result.value);setDirty(false);setConflict(false);setError(null);setPicker(null);setReviewedSong(null);setSnapshot(null);}else setError(result.ok?'Service unavailable.':result.error.message);}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 async function remove(){if(!deleting || writing.current)return;writing.current=true;setBusy(true);setError(null);
  try{const result=await service.deleteService(deleting.id);if(!mounted.current)return;if(result.ok){setDeleting(null);setPage(0);setVersion(v=>v+1);}else setError(result.error.message);}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="page-content service-library" aria-busy={busy || preparing}>
  <header className="page-heading library-heading"><div><h1>A service, thoughtfully arranged.</h1><p>Bring the songs, message and moments together.</p></div>{!draft && !serviceId && <button className="button button-primary desktop-edit-only" disabled={busy || preparing} onClick={()=>{setDraft({id:crypto.randomUUID(),workspaceId:workspace.id,title:'',date:null,revision:0,items:[]});setDirty(false);setError(null);}}><Plus size={17}/>New service</button>}</header>
  {!draft && !serviceId && <button className="button" disabled={busy || preparing} onClick={()=>setTransferOpen(true)}>Import service metadata</button>}{transferOpen && <TransferDialog profileId={profileId} workspace={workspace} onBusyChange={setPreparing} onStaged={setTransferDirty} onCancel={()=>{setTransferOpen(false);setTransferDirty(false);setVersion(v=>v+1);}}/>}{guard}{error && <p role="alert" className="form-message form-error">{error}</p>}
  {draft?<><section className="content-editor glass"><div className="card-heading"><div><h2>{draft.revision?'Service plan':'Create a service plan'}</h2><p>{dirty?'Unsaved changes':draft.revision?'Saved · Revision '+draft.revision:'Save your service before adding song copies.'}</p></div>{serviceId?<Link className="text-button" to={base+'/services'}>All services</Link>:<button className="text-button" disabled={busy || preparing} onClick={()=>{if(dirty && !window.confirm('Discard this unsaved service draft?'))return;setDraft(null);setDirty(false);setPicker(null);setReviewedSong(null);setSnapshot(null);setError(null);setVersion(v=>v+1);}}>All services</button>}</div>
   <form onSubmit={event=>{event.preventDefault();void save();}}><div className="content-field-grid"><label className="field-label">Service title<input className="field-input" required maxLength={120} value={draft.title} disabled={busy || preparing} onChange={e=>change({...draft,title:e.target.value})}/></label><label className="field-label">Service date<input className="field-input" type="date" value={draft.date??''} disabled={busy || preparing} onChange={e=>change({...draft,date:e.target.value || null})}/></label></div>
    <div className="action-row"><button className="button button-primary" disabled={preparing || busy || !dirty}>{busy?'Saving…':'Save service plan'}</button>{draft.revision>0 && <button type="button" className="button" disabled={busy || preparing} onClick={()=>void reload()}>{conflict?'Discard draft and reload latest service':'Reload saved service'}</button>}</div>
   </form>
   <ol className="service-item-list" aria-label="Service order">{draft.items.map((item,index)=><li className="service-item" aria-label={item.label} key={item.id}><span className="service-position" aria-hidden="true">{index+1}</span><div><label className="field-label">Item label<input className="field-input" required maxLength={120} disabled={busy || preparing} value={item.label} onChange={e=>change({...draft,items:draft.items.map((value,n)=>n===index?{...value,label:e.target.value}:value)})}/></label><Link className="text-button" to={base+'/decks/'+item.deckId}>Edit this service’s presentation</Link></div><div className="service-item-actions"><button className="button" aria-label="Move up" disabled={preparing || busy || index===0} onClick={()=>reorder(index,-1)}><ArrowUp size={16}/></button><button className="button" aria-label="Move down" disabled={preparing || busy || index===draft.items.length-1} onClick={()=>reorder(index,1)}><ArrowDown size={16}/></button><button className="text-button" disabled={busy || preparing} onClick={()=>change({...draft,items:draft.items.filter((_,n)=>n!==index).map((value,position)=>({...value,position}))})}>Remove from service</button></div></li>)}</ol>
   {!draft.items.length && <p className="content-empty">Your service order is empty. Add a song copy or an existing presentation.</p>}
   <div className="action-row desktop-edit-only"><button className="button" disabled={preparing || busy || dirty || !draft.revision || draft.items.length>=100} onClick={()=>{setPicker('songs');setPickPage(0);}}>Add song copy</button><button className="button" disabled={preparing || busy || draft.items.length>=100} onClick={()=>{setPicker('decks');setPickPage(0);}}>Add existing presentation</button><button className="button" disabled={preparing || busy || dirty || !draft.revision || !draft.items.length} onClick={()=>void reviewService()}>Review service slides</button></div>
   {dirty && <p className="field-help">Save your service order before adding a song copy or reviewing slides.</p>}
  </section>
  {picker && !reviewedSong && <section className="content-editor glass" aria-label={picker==='songs'?'Choose a song':'Choose a presentation'}><div className="card-heading"><h2>{picker==='songs'?'Add a separate song copy.':'Choose an existing presentation.'}</h2><button className="text-button" disabled={busy || preparing} onClick={()=>setPicker(null)}>Close chooser</button></div>
   <p>{picker==='songs'?'Review the words, then add a service-specific copy. Edits to that copy leave the master unchanged.':'Edits to a selected presentation appear wherever that presentation is reused. Duplicate it in Presentations first if you need an independent version.'}</p>
   {picker==='songs' && <form className="library-search" onSubmit={e=>{e.preventDefault();setQuery(search);setPickPage(0);}}><label className="field-label">Search song titles<input className="field-input" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="button">Search songs</button></form>}
   {picking?<p role="status">Loading choices…</p>:picker==='songs'?songItems.map(song=><div className="content-picker-row" key={song.id}><span>{song.title}</span><button className="button" disabled={busy || preparing} onClick={()=>void chooseSong(song.id)}>Review {song.title}</button></div>):deckItems.map(deck=><div className="content-picker-row" key={deck.id}><span>{deck.title}</span><button className="button" disabled={busy || preparing} onClick={()=>chooseDeck(deck)}>Add {deck.title}</button></div>)}
   {!picking && !(picker==='songs'?songItems:deckItems).length && <p>No matching items. Create one in {picker==='songs'?'Song library':'Presentations'} first.</p>}
   {(pickPage>0 || pickMore) && <div className="library-pagination"><button className="button" disabled={preparing || busy || pickPage===0} onClick={()=>setPickPage(p=>p-1)}>Previous choices</button><button className="button" disabled={preparing || busy || !pickMore} onClick={()=>setPickPage(p=>p+1)}>Next choices</button></div>}
  </section>}
  {reviewedSong && <><section className="content-editor glass"><h2>{reviewedSong.title}</h2><p>{reviewedSong.author || 'Writer not recorded'} · {reviewedSong.source || 'Source not recorded'}</p>{reviewedSong.usageNotes && <p>{reviewedSong.usageNotes}</p>}<p>Revision {reviewedSong.revision}. Adjust the service copy in the presentation editor after adding it.</p></section><LyricsEntryDialog key={reviewedSong.id} initialLyrics={reviewedSong.lyrics} busy={busy} readOnly onConfirm={appendSong} onCancel={()=>setReviewedSong(null)}/></>}
  {snapshot && <section className="content-editor service-snapshot glass" aria-label="Frozen service review"><div className="card-heading"><div><h2>{snapshot.title}</h2><Link className="button button-primary" to={"/present/"+snapshot.serviceId}>Present service</Link><p>This review is a frozen snapshot. Review again to include later saved changes.</p></div><button className="text-button" onClick={()=>setSnapshot(null)}>Close service review</button></div><ExportMetadataButton snapshot={snapshot} disabled={busy || preparing}/><PrepareServiceButton profileId={profileId} snapshot={snapshot} onBusy={setPreparing}/><SlideRenderer slide={snapshot.slides[slideIndex]} resolveMedia={media.resolveMedia} mode="preview"/><div className="library-pagination"><button className="button" disabled={slideIndex===0} onClick={()=>setSlideIndex(i=>i-1)}>Previous slide</button><span>Slide {slideIndex+1} of {snapshot.slides.length}</span><button className="button" disabled={slideIndex===snapshot.slides.length-1} onClick={()=>setSlideIndex(i=>i+1)}>Next slide</button></div><p className="field-help">Present this saved service from a desktop laptop. Prepare a complete copy here before disconnecting this laptop.</p></section>}
  </>:loading?<p role="status">Loading services…</p>:serviceId?<Link className="button" to={base+'/services'}>Return to services</Link>:<>
   {!items.length?<section className="library-empty glass"><ListOrdered/><h2>Start with your next service.</h2><p>Save an ordered plan, then add your songs and presentations.</p>{error && <button className="button" onClick={()=>setVersion(v=>v+1)}>Try again</button>}</section>:<div className="content-list">{items.map(item=><article className="content-row glass" key={item.id}><ListOrdered size={22}/><div><h2><Link to={base+'/services/'+item.id}>{item.title}</Link></h2><p>{item.date || 'Date not set'} · Revision {item.revision}</p></div><div className="action-row"><Link className="button" to={base+'/services/'+item.id}>Open service</Link>{workspace.role==='owner' && <button className="text-button" disabled={busy || preparing} onClick={()=>setDeleting(item)}>Delete service</button>}</div></article>)}</div>}
   {(page>0 || hasMore) && <nav className="library-pagination" aria-label="Service pages"><button className="button" disabled={page===0 || busy} onClick={()=>setPage(p=>p-1)}>Previous page</button><span>Page {page+1}</span><button className="button" disabled={!hasMore || busy} onClick={()=>setPage(p=>p+1)}>Next page</button></nav>}
  </>}
  {deleting && <section className="confirmation-panel" aria-label="Delete service"><h2>Delete {deleting.title}?</h2><p>This removes the service order. Its presentations and song masters stay in the library.</p><div className="action-row"><button className="button" disabled={busy || preparing} onClick={()=>void remove()}>Confirm service deletion</button><button className="button" disabled={busy || preparing} onClick={()=>setDeleting(null)}>Cancel</button></div></section>}
 </div>;
}
