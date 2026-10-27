import { useMemo,useState } from 'react';
import { splitLyrics } from './split-lyrics';
import { createTemplate } from '../decks/templates';
import { SlideRenderer } from '../../components/slide-renderer/SlideRenderer';
type Props={initialLyrics:string;busy:boolean;readOnly?:boolean;onConfirm(lyrics:string):Promise<void>;onCancel():void};
export function LyricsEntryDialog({initialLyrics,busy,readOnly=false,onConfirm,onCancel}:Props){
 const [mode,setMode]=useState<'manual'|'paste'>('manual'),[raw,setRaw]=useState(initialLyrics),[slides,setSlides]=useState<string[]|null>(null);
 const [error,setError]=useState<string|null>(null),[checking,setChecking]=useState(false),[selected,setSelected]=useState(0);
 const [measure,setMeasure]=useState<((line:string)=>boolean)|null>(null);
 async function review(){
  if(checking || busy)return;setChecking(true);setError(null);
  try{
   const faces=await document.fonts?.load('72px Figtree');
   if(!faces?.some(face=>face.family.replaceAll('"','')==='Figtree' && face.status==='loaded') || !document.fonts.check('72px Figtree'))throw new Error('Figtree could not load. Reconnect and retry before reviewing slide fit.');
   const context=document.createElement('canvas').getContext('2d');if(!context)throw new Error('The browser could not measure your lyrics. Retry in a supported browser.');
   context.font='72px Figtree';const overflows=(line:string)=>context.measureText(line).width>1728;setMeasure(()=>overflows);
   const chunks=splitLyrics(raw,4,overflows);if(chunks.length>200 || chunks.some(s=>s.text.length>20000))throw new Error('Use at most 200 slides and 20,000 characters per slide. Split this song without removing words.');
   setSlides(chunks.map(s=>s.text));setSelected(0);
  }catch(reason){setError(reason instanceof Error?reason.message:'Your lyrics could not be reviewed.');}finally{setChecking(false);}
 }
 async function confirm(){
  if(!slides || busy)return;
  if(slides.some(s=>!s.trim() || s.replace(/\r\n?/g,'\n').split('\n').some(line=>!line.trim()) || s.replace(/\r\n?/g,'\n').split('\n').length>4 || s.length>20000)){
   setError('Each slide needs 1–4 non-empty lines. Move extra lines to another slide; no words will be removed.');return;
  }
  setError(null);await onConfirm(slides.join('\n\n'));
 }
 const current=slides?.[selected]??'';
 const preview=useMemo(()=>{const slide=createTemplate('lyrics');slide.elements=slide.elements.map(el=>el.kind==='text'?{...el,text:current}:el);return slide;},[current]);
 return <section className="lyrics-entry glass" aria-label="Lyric entry and break review" aria-busy={busy || checking}>
  <div className="card-heading"><div><h2>{slides?'Review every slide.':'Bring the words together.'}</h2><p>Blank lines separate stanzas. Keep up to four lines per slide.</p></div><button className="text-button" disabled={busy || checking} onClick={onCancel}>Cancel lyric changes</button></div>
  {error && <p role="alert" className="form-message form-error">{error}</p>}
  {!slides?<><div className="action-row" aria-label="Lyric entry method"><button className="button" aria-pressed={mode==='manual'} disabled={busy || checking} onClick={()=>setMode('manual')}>Type lyrics</button><button className="button" aria-pressed={mode==='paste'} disabled={busy || checking} onClick={()=>setMode('paste')}>Paste full lyrics</button></div>
   <label className="field-label" htmlFor="lyric-input">{mode==='manual'?'Type lyrics':'Full lyrics'}</label><textarea id="lyric-input" className="field-input lyrics-raw" value={raw} readOnly={readOnly} disabled={busy || checking} onChange={e=>setRaw(e.target.value)} />
   <p className="field-help">Type at your own pace or paste existing words. Explicit line breaks are preserved; long lines will be flagged.</p>
   <button className="button button-primary" disabled={busy || checking} onClick={()=>void review()}>{checking?'Checking font and slide breaks…':'Review slide breaks'}</button>
  </>:<><div className="lyric-review-layout"><div className="lyric-review-list">{slides.map((text,index)=><div className="lyric-review-card" key={index}>
    <label className="field-label" htmlFor={'review-slide-'+index}>Slide {index+1} words</label><textarea className="field-input" id={'review-slide-'+index} value={text} readOnly={readOnly} disabled={busy} onFocus={()=>setSelected(index)} onChange={e=>setSlides(values=>values!.map((value,n)=>n===index?e.target.value:value))} />
    {text.split('\n').some(line=>measure?.(line)) && <p className="slide-overflow-warning">Line exceeds the safe width. Add a line break or adjust this slide later in the editor.</p>}
    {!readOnly && <button className="text-button" disabled={busy || slides.length===1} onClick={()=>{setSlides(values=>values!.filter((_,n)=>n!==index));setSelected(0);}}>Remove slide {index+1}</button>}
   </div>)}</div><div className="lyric-review-preview"><SlideRenderer slide={preview} mode="preview" /><p>Slide {selected+1} of {slides.length} · 72px Figtree · fixed line breaks</p></div></div>
   <div className="action-row">{!readOnly && <button className="button" disabled={busy || slides.length>=200} onClick={()=>{setSlides([...slides,'']);setSelected(slides.length);}}>Add lyric slide</button>}<button className="button" disabled={busy} onClick={()=>{setRaw(slides.join('\n\n'));setSlides(null);}}>Back to full lyrics</button><button className="button button-primary" disabled={busy} onClick={()=>void confirm()}>{readOnly?'Add reviewed song to service':'Use reviewed lyrics'}</button></div>
  </>}
 </section>;
}
