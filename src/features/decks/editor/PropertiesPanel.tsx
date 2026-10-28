import type { EditorCanvasProps } from './EditorCanvas';
import { useEffect,useRef,useState } from 'react';
import { ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Type,ImagePlus,Trash2 } from 'lucide-react';
import { LIMITS } from '../../../domain/limits';
function NumberField({ label,value,min,max,onValue,onStart,onEnd }: { label: string; value: number; min: number; max: number; onValue(value: number): void; onStart(): void; onEnd(): void }) {
  const [raw,setRaw]=useState(String(value));
  const inputVersion=useRef(0);
  useEffect(() => { let active=true; const version=inputVersion.current; queueMicrotask(() => { if (active && inputVersion.current===version) setRaw(String(Math.round(value*1000)/1000)); }); return () => { active=false; }; },[value]);
  return <label className="number-field">{label}<input className="field-input" type="number" step="any" required min={min} max={max} value={raw} onFocus={onStart} onBlur={onEnd} onKeyDown={event => {
    if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); setRaw(String(value)); }
  }} onChange={event => {
    const input=event.target.value; inputVersion.current++; setRaw(input);
    const parsed=Number(input); if (input!=='' && Number.isFinite(parsed) && parsed>=min && parsed<=max) onValue(parsed);
  }} /></label>;
}
export function PropertiesPanel({ state,onCommand,disabled = false,onPickImage }: EditorCanvasProps & { onPickImage?(): void }) {
  const slide=state.document.slides.find(current => current.id===state.selectedSlideId)!;
  const selected=slide.elements.find(element => element.id===state.selectedElementId);
  const start=() => onCommand({ type: 'begin-gesture' }),end=() => onCommand({ type: 'end-gesture' });
  const layers=[...slide.elements].sort((a,b) => a.z-b.z || a.id.localeCompare(b.id));
  const index=layers.findIndex(element => element.id===state.selectedElementId);
  return <aside className="editor-inspector glass"><h2>Make it yours.</h2><fieldset disabled={disabled}>
    <label className="field-label" htmlFor="presentation-title">Presentation title</label><input className="field-input" id="presentation-title" value={state.document.title} required maxLength={LIMITS.nameCharacters} onFocus={start} onBlur={end} onChange={event => onCommand({ type: 'set-title',title: event.target.value })} />
    {slide.elements.filter(element => element.kind==='text').map((element,index) => <section className="text-inspector" key={element.id}>
      <label className="field-label" htmlFor={'text-' + element.id}>{element.label || 'Text ' + (index+1)}</label><textarea id={'text-' + element.id} className="field-input" rows={index===0 ? 5 : 3} value={element.text} aria-invalid={element.text.length>LIMITS.textCharacters} onFocus={() => { onCommand({ type: 'select',elementId: element.id }); start(); }} onBlur={end} onChange={event => onCommand({ type: 'update-text',id: element.id,text: event.target.value })} />
      <p className="field-help">{element.text.length.toLocaleString()} / {LIMITS.textCharacters.toLocaleString()} characters · Enter adds a line break.</p>
    </section>)}
    <div className="element-add-controls"><button type="button" className="button" disabled={slide.elements.length>=LIMITS.elementsPerSlide} onClick={() => onCommand({ type: 'add-text' })}><Type size={15} />Add text</button>
      <button type="button" className="button" disabled={!onPickImage || slide.elements.length>=LIMITS.elementsPerSlide} onClick={onPickImage}><ImagePlus size={15} />Add image</button></div>
    {!onPickImage && <p className="field-help">The media library is being prepared. Image insertion will be available there.</p>}
    <section className="layer-panel"><h3>Layers</h3><ol className="layer-list">{[...layers].reverse().map(element => <li key={element.id}><button type="button" className="layer-choice" aria-label={'Layer ' + (element.label || (element.kind==='text' ? element.text.split(/\r?\n/)[0].slice(0,40) || 'Text' : 'Image'))} aria-pressed={element.id===state.selectedElementId} onClick={() => onCommand({ type: 'select',elementId: element.id })}>
      <span aria-hidden="true">{element.kind==='text' ? 'T' : '▧'}</span><bdi>{element.label || (element.kind==='text' ? element.text.split(/\r?\n/)[0].slice(0,40) || 'Text' : 'Image')}</bdi></button></li>)}</ol>
      {selected && <div className="layer-order-controls">{(['backward','forward','back','front'] as const).map(direction => <button type="button" className="text-button" key={direction} disabled={(direction==='back' || direction==='backward') ? index===0 : index===layers.length-1} onClick={() => onCommand({ type: 'reorder-layer',id: selected.id,direction })}>{direction==='backward' ? 'Send backward' : direction==='forward' ? 'Bring forward' : direction==='back' ? 'Send to back' : 'Bring to front'}</button>)}</div>}
    </section>
    {selected ? <section className="selected-properties" key={selected.id}><label className="field-label" htmlFor="layer-name">Layer name</label><input className="field-input" id="layer-name" value={selected.label ?? ''} required={selected.label!==undefined} maxLength={LIMITS.nameCharacters} onFocus={start} onBlur={end} onChange={event => onCommand({ type: 'update-element',id: selected.id,patch: { label: event.target.value } })} />
      <h3>Position and size</h3><div className="geometry-fields">
        <NumberField label="X position" value={selected.x} min={0} max={1920-selected.width} onStart={start} onEnd={end} onValue={value => onCommand({ type: 'move',id: selected.id,delta: { x: value-selected.x,y: 0 } })} />
        <NumberField label="Y position" value={selected.y} min={0} max={1080-selected.height} onStart={start} onEnd={end} onValue={value => onCommand({ type: 'move',id: selected.id,delta: { x: 0,y: value-selected.y } })} />
        <NumberField label="Box width" value={selected.width} min={1} max={1920-selected.x} onStart={start} onEnd={end} onValue={value => onCommand({ type: 'resize',id: selected.id,delta: { width: value-selected.width,height: 0 } })} />
        <NumberField label="Box height" value={selected.height} min={1} max={1080-selected.y} onStart={start} onEnd={end} onValue={value => onCommand({ type: 'resize',id: selected.id,delta: { width: 0,height: value-selected.height } })} />
      </div>
      <div className="nudge-controls" aria-label="Move selected element">{[
        { name: 'Move left',x: -1,y: 0,icon: ArrowLeft },{ name: 'Move up',x: 0,y: -1,icon: ArrowUp },{ name: 'Move down',x: 0,y: 1,icon: ArrowDown },{ name: 'Move right',x: 1,y: 0,icon: ArrowRight },
      ].map(({ name,x,y,icon: Icon }) => <button type="button" className="button" key={name} aria-label={name} title={name} onClick={event => onCommand({ type: 'move',id: selected.id,delta: { x: x*(event.shiftKey ? 10 : 1),y: y*(event.shiftKey ? 10 : 1) } })}><Icon size={16} /></button>)}</div>
      <p className="field-help">Move 1 logical pixel. Hold Shift for 10 pixels.</p><h3>Align to slide</h3><div className="align-controls">{(['left','center','right','top','middle','bottom'] as const).map(alignment => <button type="button" className="text-button" key={alignment} onClick={() => onCommand({ type: 'align',id: selected.id,alignment })}>{alignment[0].toUpperCase()+alignment.slice(1)}</button>)}</div>
      {selected.kind==='image' && <label className="field-label">Image fit<select className="field-input" value={selected.fit} onChange={event=>onCommand({type:'set-image-fit',id:selected.id,fit:event.target.value as 'contain'|'cover'})}><option value="contain">Show entire image</option><option value="cover">Fill box and crop</option></select></label>}
      {selected.kind==='text' && <div className="style-controls"><NumberField label="Text size" value={selected.fontSize} min={8} max={300} onStart={start} onEnd={end} onValue={value => onCommand({ type: 'update-element',id: selected.id,patch: { fontSize: value } })} />
        <label>Text color<input type="color" value={selected.color} onFocus={start} onBlur={end} onChange={event => onCommand({ type: 'update-element',id: selected.id,patch: { color: event.target.value } })} /></label>
      </div>}
      {selected.kind==='text' && <><label className="field-label" htmlFor="selected-text-align">Text alignment</label><select className="field-input" id="selected-text-align" value={selected.align} onChange={event => onCommand({ type: 'update-element',id: selected.id,patch: { align: event.target.value as 'left' | 'center' | 'right' } })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></>}
      <button type="button" className="text-button" onClick={() => onCommand({ type: 'delete-element',id: selected.id })}><Trash2 size={14} />{selected.kind==='image'?'Remove image':'Remove text box'}</button>
    </section> : <p className="field-help">Select a text box or image to position it.</p>}
    {slide.background.kind!=='solid' && <button type="button" className="button" onClick={()=>onCommand({type:'set-background',color:'#101A20'})}>Use solid background</button>}
    {slide.background.kind==='solid' && <label className="field-label background-control">Background color<input type="color" value={slide.background.color} onFocus={start} onBlur={end} onChange={event => onCommand({ type: 'set-background',color: event.target.value })} /></label>}
  </fieldset>{slide.category==='scripture' && <p className="field-help">Enter the passage, reference and translation manually. Check each before presenting.</p>}</aside>;
}
