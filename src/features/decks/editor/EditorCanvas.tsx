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
  }}><SlideRenderer slide={slide} resolveMedia={resolveMedia} mode="editor" editorOverlay={scale => <SelectionOverlay slide={slide} selectedId={state.selectedElementId} scale={scale} instructionsId={instructionsId} disabled={disabled} onCommand={onCommand} />} />
    <p className="canvas-caption" id={instructionsId}>Click text to edit its words. Drag the move handle to position a text box, or use arrow keys to move 1 pixel. Shift moves 10 pixels. Resize handles adjust the box. Escape finishes text editing.</p>
  </div>;
}
