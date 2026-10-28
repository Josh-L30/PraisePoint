import { Plus,ArrowUp,ArrowDown } from 'lucide-react';
import type { EditorCanvasProps } from './EditorCanvas';
import { SlideRenderer } from '../../../components/slide-renderer/SlideRenderer';
import { templateNames } from '../templates';
import { LIMITS } from '../../../domain/limits';
const dragType='application/x-gather-slide';
export function SlideStrip({ state,onCommand,disabled = false,resolveMedia,onAdd }: EditorCanvasProps & { onAdd(): void }) {
  return <nav className="slide-rail" aria-label="Presentation slides"><div className="rail-heading"><strong>Slides</strong><span>{state.document.slides.length}/{LIMITS.slidesPerDeck}</span></div>
    <ol className="slide-order-list">{state.document.slides.map((slide,index) => <li key={slide.id} onDragOver={event => { if (!disabled && event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect='move'; } }} onDrop={event => {
      if (disabled) return;
      const id=event.dataTransfer.getData(dragType); if (!state.document.slides.some(item => item.id===id)) return;
      event.preventDefault(); event.stopPropagation(); onCommand({ type: 'reorder-slide',id,toIndex: index });
    }}>
      <button type="button" className="slide-thumbnail" draggable={!disabled} aria-label={'Slide ' + (index+1) + ': ' + templateNames[slide.category]} aria-pressed={slide.id===state.selectedSlideId} onClick={() => onCommand({ type: 'select',slideId: slide.id })} onDragStart={event => {
        if (disabled) { event.preventDefault(); return; }
        event.dataTransfer.setData(dragType,slide.id); event.dataTransfer.effectAllowed='move';
      }}><SlideRenderer animateMedia={false} slide={slide} resolveMedia={resolveMedia} mode="preview" /><span>{index+1} · {templateNames[slide.category]}</span></button>
      <div className="slide-reorder-controls desktop-edit-only"><button type="button" className="text-button" aria-label="Move slide up" title="Move slide up" disabled={disabled || index===0} onClick={() => onCommand({ type: 'reorder-slide',id: slide.id,toIndex: index-1 })}><ArrowUp size={13} /></button><button type="button" className="text-button" aria-label="Move slide down" title="Move slide down" disabled={disabled || index===state.document.slides.length-1} onClick={() => onCommand({ type: 'reorder-slide',id: slide.id,toIndex: index+1 })}><ArrowDown size={13} /></button></div>
    </li>)}</ol>
    <button type="button" className="button desktop-edit-only" disabled={disabled || state.document.slides.length>=LIMITS.slidesPerDeck} onClick={onAdd}><Plus size={15} />Add slide</button>
  </nav>;
}
