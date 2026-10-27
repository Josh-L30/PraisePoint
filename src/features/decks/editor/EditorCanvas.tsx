import type { EditorState,EditorCommand } from './editor-reducer';
import { useId } from 'react';
import { SlideRenderer } from '../../../components/slide-renderer/SlideRenderer';
import { SelectionOverlay } from './SelectionOverlay';
export type EditorCanvasProps = { state: EditorState; disabled?: boolean; onCommand(command: EditorCommand): void };
export function EditorCanvas({ state,onCommand,disabled = false }: EditorCanvasProps) {
  const instructionsId=useId(),slide=state.document.slides.find(current => current.id===state.selectedSlideId)!;
  return <div className="editor-canvas-surface" tabIndex={0} aria-label="Slide editing canvas" aria-describedby={instructionsId} onPointerDown={event => {
    if (!disabled && !(event.target as HTMLElement).closest('button')) onCommand({ type: 'select',elementId: null });
  }}><SlideRenderer slide={slide} mode="editor" editorOverlay={scale => <SelectionOverlay slide={slide} selectedId={state.selectedElementId} scale={scale} instructionsId={instructionsId} disabled={disabled} onCommand={onCommand} />} />
    <p className="canvas-caption" id={instructionsId}>Select a box, then drag or use arrow keys to move 1 pixel. Shift moves 10 pixels. Focus a resize handle and use arrow keys to resize. Delete removes the selected box.</p>
  </div>;
}
