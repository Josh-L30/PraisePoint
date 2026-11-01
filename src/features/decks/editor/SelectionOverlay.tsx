import { useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type PointerEvent } from 'react';
import {Move} from 'lucide-react';
import {LIMITS} from '../../../domain/limits';
import type { Slide,Rect,SlideElement } from '../../../domain/slide';
import type { EditorCommand } from './editor-reducer';
import { toLogicalPoint,alignmentGuides,type Point } from './geometry';
type Mode='move' | 'width' | 'height' | 'both';
type Drag={ pointerId: number; id: string; origin: Rect; start: Point; mode: Mode; target: HTMLButtonElement };
const title=(element: SlideElement) => element.label || (element.kind==='text' ? element.text.split(/\r?\n/)[0].slice(0,40) || 'Text' : 'Image');
export function SelectionOverlay({ slide,selectedId,scale,disabled,instructionsId,onCommand }: { slide: Slide; selectedId: string | null; scale: number; disabled: boolean; instructionsId: string; onCommand(command: EditorCommand): void }) {
  const drag=useRef<Drag | null>(null),pending=useRef<Point | null>(null),frame=useRef<number | null>(null);
  const [editingId,setEditingId]=useState<string|null>(null),moved=useRef(false);
  const selected=slide.elements.find(element => element.id===selectedId),inverse=1/(scale || 1),size=24*inverse;
  useEffect(() => () => { if (frame.current!==null) cancelAnimationFrame(frame.current); },[]);
  function point(event: PointerEvent<HTMLButtonElement>) {
    const stage=event.currentTarget.closest('.slide-stage');
    return stage ? toLogicalPoint(event,stage.getBoundingClientRect()) : null;
  }
  function apply() {
    frame.current=null; const current=drag.current,latest=pending.current; pending.current=null;
    if (!current || !latest || disabled) return;
    const x=latest.x-current.start.x,y=latest.y-current.start.y;
    onCommand(current.mode==='move' ? { type: 'move',id: current.id,origin: current.origin,delta: { x,y } }
      : { type: 'resize',id: current.id,origin: current.origin,delta: { width: current.mode==='height' ? 0 : x,height: current.mode==='width' ? 0 : y } });
  }
  function start(event: PointerEvent<HTMLButtonElement>,element: SlideElement,mode: Mode) {
    if (disabled || event.button!==0) return;
    const position=point(event); if (!position) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
    onCommand({ type: 'select',elementId: element.id }); onCommand({ type: 'begin-gesture' });
    drag.current={ pointerId: event.pointerId,id: element.id,start: position,origin: { x: element.x,y: element.y,width: element.width,height: element.height },mode,target: event.currentTarget };
    moved.current=false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId!==event.pointerId) return;
    pending.current=point(event);if(pending.current && drag.current && Math.hypot(pending.current.x-drag.current.start.x,pending.current.y-drag.current.start.y)*scale>4)moved.current=true;
    if (frame.current===null) frame.current=requestAnimationFrame(apply);
  }
  function cancel() {
    if (!drag.current) return;
    const current=drag.current; drag.current=null; pending.current=null;
    if (frame.current!==null) cancelAnimationFrame(frame.current); frame.current=null;
    onCommand({ type: 'cancel-gesture' });
    if (current.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId);
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId!==event.pointerId) return;
    if (disabled) { cancel(); return; }
    pending.current=point(event); if (frame.current!==null) cancelAnimationFrame(frame.current); apply();
    const current=drag.current; drag.current=null; onCommand({ type: 'end-gesture' });
    if (current?.target.hasPointerCapture(event.pointerId)) current.target.releasePointerCapture(event.pointerId);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>,element: SlideElement,mode: Mode) {
    if (event.key==='Escape' && drag.current) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
    if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key==='Delete' || event.key==='Backspace') {
      event.preventDefault(); event.stopPropagation(); cancel();
      event.currentTarget.closest<HTMLElement>('.editor-canvas-surface')?.focus(); onCommand({ type: 'delete-element',id: element.id }); return;
    }
    const step=event.shiftKey ? 10 : 1;
    const x=event.key==='ArrowLeft' ? -step : event.key==='ArrowRight' ? step : 0,y=event.key==='ArrowUp' ? -step : event.key==='ArrowDown' ? step : 0;
    if (!x && !y) return;
    event.preventDefault(); event.stopPropagation();
    onCommand(mode==='move' ? { type: 'move',id: element.id,delta: { x,y } } : { type: 'resize',id: element.id,delta: { width: mode==='height' ? 0 : x,height: mode==='width' ? 0 : y } });
  }
  const shared={ onPointerMove: move,onPointerUp: finish,onPointerCancel: cancel,onLostPointerCapture: cancel };
  function edit(element:SlideElement){
    if(disabled || element.kind!=='text' || moved.current)return;
    onCommand({type:'select',elementId:element.id});onCommand({type:'begin-gesture'});setEditingId(element.id);
  }
  return <div className="editor-selection-layer" style={{ '--inverse-scale': inverse } as CSSProperties}>
    {[...slide.elements].sort((a,b) => a.z-b.z || a.id.localeCompare(b.id)).map(element => element.kind==='text' && element.id===editingId && element.id===selectedId ? <textarea key={element.id} className="inline-slide-text" aria-label="Edit slide text" autoFocus wrap="off" maxLength={LIMITS.textCharacters} disabled={disabled}
      style={{position:'absolute',left:element.x,top:element.y,width:element.width,height:element.height,zIndex:10003,fontFamily:element.fontFamily,fontSize:element.fontSize,lineHeight:1.2,color:element.color,textAlign:element.align}}
      value={element.text} onChange={event=>onCommand({type:'update-text',id:element.id,text:event.target.value})} onPointerDown={event=>event.stopPropagation()} onBlur={()=>{onCommand({type:'end-gesture'});setEditingId(null);}}
      onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();onCommand({type:'end-gesture'});setEditingId(null);}}}/> : <button type="button" key={element.id} className={'element-hitbox'+(element.kind==='text'?' text-hitbox':'')} aria-label={'Select ' + title(element)} aria-pressed={element.id===selectedId} aria-describedby={instructionsId} disabled={disabled}
      style={{ position: 'absolute',left: element.x,top: element.y,width: element.width,height: element.height,zIndex: element.id===selectedId ? 10002 : element.z }}
      onFocus={() => { if (!disabled) onCommand({ type: 'select',elementId: element.id }); }} onClick={event => {onCommand({ type: 'select',elementId: element.id });if(event.detail===0)edit(element);}} onDoubleClick={()=>edit(element)} onPointerDown={event => {
        if(element.kind==='text'){event.stopPropagation();moved.current=false;if(!disabled)onCommand({type:'select',elementId:element.id});}
        else start(event,element,'move');
      }} onKeyDown={event => keyboard(event,element,'move')} {...shared} />)}
    {selected && <>
      {selected.kind==='text' && <button type="button" className="editor-move-handle" aria-label="Move text box" title="Drag to move text" disabled={disabled} style={{left:selected.x,top:Math.max(0,selected.y-30*inverse),width:28*inverse,height:28*inverse,zIndex:10004}} onPointerDown={event=>start(event,selected,'move')} onKeyDown={event=>keyboard(event,selected,'move')} {...shared}><Move style={{width:16*inverse,height:16*inverse}}/></button>}
      <div className="selection-outline" aria-hidden="true" style={{ left: selected.x,top: selected.y,width: selected.width,height: selected.height,borderWidth: 2*inverse }} />
      {alignmentGuides(selected).map(guide => <span key={guide.axis+guide.value} className={'alignment-guide guide-' + guide.axis} aria-hidden="true" style={guide.axis==='x' ? { left: guide.value,borderLeftWidth: inverse } : { top: guide.value,borderTopWidth: inverse }} />)}
      {([{ mode: 'width',label: 'Resize width',x: selected.x+selected.width,y: selected.y+selected.height/2 },{ mode: 'height',label: 'Resize height',x: selected.x+selected.width/2,y: selected.y+selected.height },{ mode: 'both',label: 'Resize width and height',x: selected.x+selected.width,y: selected.y+selected.height }] as const).map(handle => <button type="button" key={handle.mode} className={'resize-handle resize-' + handle.mode} aria-label={handle.label} aria-describedby={instructionsId} disabled={disabled}
        style={{ left: handle.x-size/2,top: handle.y-size/2,width: size,height: size,borderWidth: inverse }} onPointerDown={event => start(event,selected,handle.mode)} onKeyDown={event => keyboard(event,selected,handle.mode)} {...shared} />)}
    </>}
  </div>;
}
