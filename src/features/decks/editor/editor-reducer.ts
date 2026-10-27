import type { DeckDocument } from '../../../domain/deck';
import type { Rect, SlideCategory, SlideElement, TextElement } from '../../../domain/slide';
import { snapshot,pushSnapshot,type EditorSnapshot,type HistoryEntry } from './history';
import { moveElement,resizeElement,alignElement } from './geometry';
import { createTemplate } from '../templates';
import { LIMITS } from '../../../domain/limits';
export type EditorState = EditorSnapshot & { past: HistoryEntry[]; future: HistoryEntry[]; gesture: HistoryEntry | null; nextVersion: number };
type StylePatch = Partial<Pick<TextElement,'text' | 'fontFamily' | 'fontSize' | 'color' | 'align' | 'label'>>;
export type EditorCommand =
  | { type: 'select'; slideId?: string; elementId?: string | null }
  | { type: 'update-text'; id: string; text: string }
  | { type: 'update-element'; id: string; patch: StylePatch }
  | { type: 'move'; id: string; delta: { x: number; y: number }; origin?: Rect }
  | { type: 'resize'; id: string; delta: { width: number; height: number }; origin?: Rect }
  | { type: 'align'; id: string; alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
  | { type: 'reorder-layer'; id: string; direction: 'forward' | 'backward' | 'front' | 'back' }
  | { type: 'add-text' } | { type: 'delete-element'; id: string }
  | { type: 'add-slide'; category: SlideCategory } | { type: 'duplicate-slide'; id: string }
  | { type: 'delete-slide'; id: string } | { type: 'reorder-slide'; id: string; toIndex: number }
  | { type: 'set-title'; title: string } | { type: 'set-background'; color: string }
  | { type: 'begin-gesture' | 'end-gesture' | 'cancel-gesture' | 'undo' | 'redo' }
  | { type: 'accept-saved'; document: DeckDocument };
export function createEditorState(document: DeckDocument): EditorState {
  return { document,selectedSlideId: document.slides[0].id,selectedElementId: document.slides[0].elements[0]?.id ?? null,version: 0,nextVersion: 1,past: [],future: [],gesture: null };
}
function restore(state: EditorState,entry: EditorSnapshot): EditorState {
  return { ...state,document: entry.document,selectedSlideId: entry.selectedSlideId,selectedElementId: entry.selectedElementId,version: entry.version,gesture: null };
}
function finishGesture(state: EditorState): EditorState {
  if (!state.gesture) return state;
  if (JSON.stringify(state.document)===JSON.stringify(state.gesture.document)) return restore(state,state.gesture);
  return { ...state,past: pushSnapshot(state.past,state.gesture),future: [],gesture: null };
}
function changed(state: EditorState,document: DeckDocument,selection: Partial<Pick<EditorState,'selectedSlideId' | 'selectedElementId'>> = {}): EditorState {
  const newVersion=!state.gesture || state.version===state.gesture.version;
  return { ...state,document,...selection,version: newVersion ? state.nextVersion : state.version,nextVersion: state.nextVersion+(newVersion ? 1 : 0),
    past: state.gesture ? state.past : pushSnapshot(state.past,snapshot(state)),future: state.gesture ? state.future : [] };
}
function elementChange(state: EditorState,id: string,update: (element: SlideElement) => SlideElement): EditorState {
  const slide=state.document.slides.find(current => current.id===state.selectedSlideId)!;
  const element=slide.elements.find(current => current.id===id); if (!element) return state;
  const next=update(element);
  if (Object.entries(next).every(([key,value]) => Reflect.get(element,key)===value)) return state;
  const document={ ...state.document,slides: state.document.slides.map(current => current.id===slide.id ? { ...current,elements: current.elements.map(item => item.id===id ? next : item) } : current) };
  return changed(state,document);
}
const rectOf = (value: Rect): Rect => ({ x: value.x,y: value.y,width: value.width,height: value.height });
export function reduceEditor(state: EditorState,command: EditorCommand): EditorState {
  if (command.type==='begin-gesture') { const current=finishGesture(state); return { ...current,gesture: snapshot(current) }; }
  if (command.type==='end-gesture') return finishGesture(state);
  if (command.type==='cancel-gesture') return state.gesture ? restore(state,state.gesture) : state;
  if (command.type==='undo' || command.type==='redo') {
    const current=finishGesture(state),source=command.type==='undo' ? current.past : current.future,entry=source.at(-1);
    if (!entry) return current;
    const next=restore(current,entry);
    return command.type==='undo' ? { ...next,past: source.slice(0,-1),future: pushSnapshot(current.future,snapshot(current)) }
      : { ...next,past: pushSnapshot(current.past,snapshot(current)),future: source.slice(0,-1) };
  }
  if (command.type==='accept-saved') {
    if (command.document.id!==state.document.id || command.document.workspaceId!==state.document.workspaceId) return createEditorState(command.document);
    const slide=command.document.slides.find(current => current.id===state.selectedSlideId) ?? command.document.slides[0];
    return { ...state,document: command.document,selectedSlideId: slide.id,selectedElementId: slide.elements.some(element => element.id===state.selectedElementId) ? state.selectedElementId : slide.elements[0]?.id ?? null,gesture: null };
  }
  if (command.type==='select') {
    const slide=state.document.slides.find(current => current.id===(command.slideId ?? state.selectedSlideId)); if (!slide) return state;
    const elementId=command.elementId===undefined ? slide.id===state.selectedSlideId ? state.selectedElementId : slide.elements[0]?.id ?? null : command.elementId;
    if (elementId && !slide.elements.some(element => element.id===elementId)) return state;
    if (slide.id===state.selectedSlideId && elementId===state.selectedElementId) return state;
    return { ...finishGesture(state),selectedSlideId: slide.id,selectedElementId: elementId };
  }
  if (command.type==='set-title') return command.title===state.document.title ? state : changed(state,{ ...state.document,title: command.title });
  if (command.type==='update-text') return elementChange(state,command.id,element => element.kind==='text' ? { ...element,text: command.text } : element);
  if (command.type==='update-element') return elementChange(state,command.id,element => element.kind==='text' ? { ...element,...command.patch } : { ...element,...('label' in command.patch ? { label: command.patch.label } : {}) });
  if (command.type==='move') return elementChange(state,command.id,element => ({ ...element,...moveElement(rectOf(command.origin ?? element),command.delta) }));
  if (command.type==='resize') return elementChange(state,command.id,element => ({ ...element,...resizeElement(rectOf(command.origin ?? element),command.delta) }));
  if (command.type==='align') return elementChange(state,command.id,element => ({ ...element,...alignElement(rectOf(element),command.alignment) }));
  const slide=state.document.slides.find(current => current.id===state.selectedSlideId)!;
  if (command.type==='set-background') {
    if (!/^#[0-9a-f]{6}$/i.test(command.color) || (slide.background.kind==='solid' && slide.background.color===command.color)) return state;
    return changed(state,{ ...state.document,slides: state.document.slides.map(current => current.id===slide.id ? { ...current,background: { kind: 'solid',color: command.color } } : current) });
  }
  if (command.type==='reorder-layer') {
    const ordered=[...slide.elements].sort((a,b) => a.z-b.z || a.id.localeCompare(b.id));
    const from=ordered.findIndex(element => element.id===command.id); if (from<0) return state;
    const to=command.direction==='front' ? ordered.length-1 : command.direction==='back' ? 0 : Math.max(0,Math.min(ordered.length-1,from+(command.direction==='forward' ? 1 : -1)));
    if (from===to) return state;
    ordered.splice(to,0,ordered.splice(from,1)[0]); const order=new Map(ordered.map((element,index) => [element.id,index+1]));
    return changed(state,{ ...state.document,slides: state.document.slides.map(current => current.id===slide.id ? { ...current,elements: current.elements.map(element => ({ ...element,z: order.get(element.id)! })) } : current) });
  }
  if (command.type==='add-text') {
    if (slide.elements.length>=LIMITS.elementsPerSlide) return state;
    const element: TextElement={ id: crypto.randomUUID(),kind: 'text',label: 'Text ' + (slide.elements.length+1),text: 'Your words here',fontFamily: 'Figtree',fontSize: 72,color: '#FFFFFF',align: 'left',x: 96,y: 96,width: 1000,height: 200,z: Math.max(0,...slide.elements.map(item => item.z))+1 };
    return changed(state,{ ...state.document,slides: state.document.slides.map(current => current.id===slide.id ? { ...current,elements: [...current.elements,element] } : current) },{ selectedElementId: element.id });
  }
  if (command.type==='delete-element') {
    if (!slide.elements.some(element => element.id===command.id)) return state;
    const elements=slide.elements.filter(element => element.id!==command.id);
    return changed(state,{ ...state.document,slides: state.document.slides.map(current => current.id===slide.id ? { ...current,elements } : current) },{ selectedElementId: state.selectedElementId===command.id ? elements[0]?.id ?? null : state.selectedElementId });
  }
  if (command.type==='add-slide' || command.type==='duplicate-slide') {
    if (state.document.slides.length>=LIMITS.slidesPerDeck) return state;
    const source=command.type==='duplicate-slide' ? state.document.slides.find(current => current.id===command.id) : null;
    if (command.type==='duplicate-slide' && !source) return state;
    const next=source ? structuredClone(source) : createTemplate((command as Extract<EditorCommand,{ type: 'add-slide' }>).category);
    if (source) { next.id=crypto.randomUUID(); next.elements.forEach(element => { element.id=crypto.randomUUID(); }); }
    const index=state.document.slides.findIndex(current => current.id===(source?.id ?? state.selectedSlideId)),slides=[...state.document.slides]; slides.splice(index+1,0,next);
    return changed(state,{ ...state.document,slides },{ selectedSlideId: next.id,selectedElementId: next.elements[0]?.id ?? null });
  }
  if (command.type==='delete-slide') {
    if (state.document.slides.length<=1) return state;
    const index=state.document.slides.findIndex(current => current.id===command.id); if (index<0) return state;
    const slides=state.document.slides.filter(current => current.id!==command.id),next=slides[Math.min(index,slides.length-1)];
    return changed(state,{ ...state.document,slides },state.selectedSlideId===command.id ? { selectedSlideId: next.id,selectedElementId: next.elements[0]?.id ?? null } : {});
  }
  if (command.type==='reorder-slide') {
    if (!Number.isInteger(command.toIndex)) return state;
    const from=state.document.slides.findIndex(current => current.id===command.id),to=Math.max(0,Math.min(state.document.slides.length-1,command.toIndex));
    if (from<0 || from===to) return state;
    const slides=[...state.document.slides]; slides.splice(to,0,slides.splice(from,1)[0]); return changed(state,{ ...state.document,slides });
  }
  return state;
}
