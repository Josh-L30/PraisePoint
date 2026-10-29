import {useEffect,useRef,useState} from 'react';
import {Modal} from '../../components/Modal';
import type {Song} from '../../domain/song';
import {songService,type SongService,type SongSummary} from './song-service';

export function SongPicker({workspaceId,onSelect,onClose,service=songService}:{workspaceId:string;onSelect(song:Song):void;onClose():void;service?:SongService}){
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[items,setItems]=useState<SongSummary[]>([]),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setLoading(true);setError(null);void service.list(workspaceId,query,page).then(result=>{if(!active)return;if(result.ok){setItems(result.value.items);setMore(result.value.hasMore);}else{setItems([]);setError(result.error.message);}setLoading(false);}).catch(()=>{if(active){setLoading(false);setError('Songs could not be loaded. Check your connection and search again.');}});});return()=>{active=false;};},[workspaceId,query,page,service]);
 async function choose(id:string){
  if(busy)return;setBusy(true);setError(null);
  try{const result=await service.getSong(id);if(!mounted.current)return;if(!result.ok){setError(result.error.message);return;}if(result.value.workspaceId!==workspaceId){setError('This song is not in the selected workspace.');return;}onSelect(result.value);}
  catch{if(mounted.current)setError('This song could not be opened. Retry after checking your connection.');}
  finally{if(mounted.current)setBusy(false);}
 }
 return <Modal className="song-picker" aria-label="Import song slides" busy={busy} onCancel={onClose}><div className="card-heading"><h2>Choose a song.</h2><button className="text-button" disabled={busy} onClick={onClose}>Cancel import</button></div><p>Review its saved slide breaks, then add independent lyric slides to the end of this presentation. The song master stays unchanged.</p>
 <form className="library-search" onSubmit={event=>{event.preventDefault();setQuery(search);setPage(0);}}><label className="field-label">Search song titles<input className="field-input" value={search} maxLength={120} disabled={busy} onChange={event=>setSearch(event.target.value)}/></label><button className="button" disabled={busy}>Search songs</button></form>
 {error && <p className="form-error" role="alert">{error}</p>}{loading?<p role="status">Loading songs…</p>:items.length?items.map(song=><div className="content-picker-row" key={song.id}><div><strong>{song.title}</strong><p>{song.author||'Writer not recorded'}</p></div><button className="button" disabled={busy} onClick={()=>void choose(song.id)}>Review {song.title}</button></div>):<p>No matching songs. Save a song in Song library first.</p>}
 {(page>0 || more) && <div className="library-pagination"><button className="button" disabled={busy || page===0} onClick={()=>setPage(value=>value-1)}>Previous songs</button><button className="button" disabled={busy || !more} onClick={()=>setPage(value=>value+1)}>Next songs</button></div>}</Modal>;
}
