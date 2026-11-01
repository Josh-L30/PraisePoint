import type {MediaResolver} from '../../../domain/media';
import type { EditorState,EditorCommand } from './editor-reducer';
import { useId } from 'react';
import { SlideRenderer } from '../../../components/slide-renderer/SlideRenderer';
import { SelectionOverlay } from './SelectionOverlay';
export type EditorCanvasProps = { state: EditorState; disabled?: boolean; resolveMedia?:MediaResolver; onCommand(command: EditorCommand): void };
export function EditorCanvas({ state,onCommand,disabled = false,resolveMedia }: EditorCanvasProps) {
  const instructionsId=useId(),slide=state.document.slides.find(current => current.id===state.selectedSlideId)!;
  return <div className="editor-canvas-surface" tabIndex={0} aria-label="Slide editing canvas" aria-describedby={instructionsId} onPointerDown={event => {
    if (!disabled && !(event.target as HTMLElement).closest('button,textarea,input,[contenteditable]')) onCommand({ type: 'select',elementId: null });
  }}><SlideRenderer slide={slide} resolveMedia={resolveMedia} mode="editor" viewportBackground="var(--canvas-well)" editorOverlay={scale => <SelectionOverlay slide={slide} selectedId={state.selectedElementId} scale={scale} instructionsId={instructionsId} disabled={disabled} onCommand={onCommand} />} />
    <p className="canvas-caption" id={instructionsId}>Double-click text or press Enter to edit. Drag its handle to move; arrows nudge (Shift = 10 pixels). Escape finishes editing.</p>
  </div>;
}
