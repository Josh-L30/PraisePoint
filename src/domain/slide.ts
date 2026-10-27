export type SlideCategory = 'lyrics' | 'scripture' | 'sermon' | 'announcement' | 'welcome-closing';
export type Rect = { x: number; y: number; width: number; height: number };
export type TextElement = Rect & { id: string; kind: 'text'; z: number; label?: string; text: string; fontFamily: 'Figtree'; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
export type ImageElement = Rect & { id: string; kind: 'image'; z: number; label?: string; mediaId: string; fit: 'contain' | 'cover' };
export type SlideElement = TextElement | ImageElement;
export type Slide = { id: string; category: SlideCategory; background: { kind: 'solid'; color: string } | { kind: 'image' | 'video'; mediaId: string }; elements: SlideElement[]; standaloneVideoId?: string };
export function measureSlideOverflow(slide: Slide): string[] {
  return slide.elements.filter(element => element.x+element.width>1920 || element.y+element.height>1080
    || (element.kind==='text' && element.text.split(/\r\n|\r|\n/).length*element.fontSize*1.2>element.height))
    .map(element => element.id);
}
