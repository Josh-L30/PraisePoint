import { Plus,ArrowLeft,ArrowRight,LayoutTemplate } from 'lucide-react';
import type { EditorCanvasProps } from './EditorCanvas';
import { SlideRenderer } from '../../../components/slide-renderer/SlideRenderer';
import { templateNames } from '../templates';
import { LIMITS } from '../../../domain/limits';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
const dragType='application/x-gather-slide';
export function SlideStrip({ state,onCommand,disabled = false,resolveMedia,onAdd,onChooseLayout,children }: EditorCanvasProps & { onAdd(): void;onChooseLayout():void;children?:ReactNode }) {
  const list=useRef<HTMLOListElement>(null);
  useLayoutEffect(()=>{
    const strip=list.current,active=strip?.querySelector<HTMLElement>('[aria-pressed="true"]');if(!strip||!active)return;
    const bounds=strip.getBoundingClientRect(),selected=active.getBoundingClientRect();
    if(selected.left<bounds.left)strip.scrollLeft+=selected.left-bounds.left;
    else if(selected.right>bounds.right)strip.scrollLeft+=selected.right-bounds.right;
  },[state.selectedSlideId]);
  return <nav className="slide-rail" aria-label="Presentation slides"><div className="rail-heading"><strong>Slides <span>{state.document.slides.length}/{LIMITS.slidesPerDeck}</span></strong><div className="action-row desktop-edit-only">{children}<button type="button" className="text-button" disabled={disabled || state.document.slides.length>=LIMITS.slidesPerDeck} onClick={onChooseLayout}><LayoutTemplate size={15}/>Choose layout</button><button type="button" className="button button-secondary" disabled={disabled || state.document.slides.length>=LIMITS.slidesPerDeck} onClick={onAdd}><Plus size={15}/>Add slide</button></div></div>
    <ol className="slide-order-list" ref={list}>{state.document.slides.map((slide,index) => <li key={slide.id} onDragOver={event => { if (!disabled && event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect='move'; } }} onDrop={event => {
      if (disabled) return;
      const id=event.dataTransfer.getData(dragType); if (!state.document.slides.some(item => item.id===id)) return;
      event.preventDefault(); event.stopPropagation(); onCommand({ type: 'reorder-slide',id,toIndex: index });
    }}>
      <button type="button" className="slide-thumbnail" draggable={!disabled} aria-label={'Slide ' + (index+1) + ': ' + templateNames[slide.category]} aria-pressed={slide.id===state.selectedSlideId} onClick={() => onCommand({ type: 'select',slideId: slide.id })} onDragStart={event => {
        if (disabled) { event.preventDefault(); return; }
        event.dataTransfer.setData(dragType,slide.id); event.dataTransfer.effectAllowed='move';
      }}><SlideRenderer animateMedia={false} slide={slide} resolveMedia={resolveMedia} mode="preview" /><span>{index+1} · {templateNames[slide.category]}</span></button>
      <div className="slide-reorder-controls desktop-edit-only"><button type="button" className="text-button" aria-label="Move slide earlier" title="Move slide earlier" disabled={disabled || index===0} onClick={() => onCommand({ type: 'reorder-slide',id: slide.id,toIndex: index-1 })}><ArrowLeft size={13} /></button><button type="button" className="text-button" aria-label="Move slide later" title="Move slide later" disabled={disabled || index===state.document.slides.length-1} onClick={() => onCommand({ type: 'reorder-slide',id: slide.id,toIndex: index+1 })}><ArrowRight size={13} /></button></div>
    </li>)}</ol>
  </nav>;
}
