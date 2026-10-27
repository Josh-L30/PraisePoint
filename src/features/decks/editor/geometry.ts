import type { Rect } from '../../../domain/slide';
export type StageBounds = { left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };
const clamp = (value: number,min: number,max: number) => Math.max(min,Math.min(max,value));
function valid(rect: Rect) {
  if (![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite) || rect.width<=0 || rect.height<=0 || rect.width>1920 || rect.height>1080) throw new RangeError('Invalid element geometry.');
}
export function toLogicalPoint(point: { clientX: number; clientY: number },stage: StageBounds): Point | null {
  if (![point.clientX,point.clientY,stage.left,stage.top,stage.width,stage.height].every(Number.isFinite) || stage.width<=0 || stage.height<=0) return null;
  const scale = stage.width/1920;
  if (Math.abs(stage.height-1080*scale)>1) return null;
  return { x: (point.clientX-stage.left)/scale,y: (point.clientY-stage.top)/scale };
}
export function moveElement(rect: Rect,delta: Point,bounds = { width: 1920 as const,height: 1080 as const }): Rect {
  valid(rect); if (![delta.x,delta.y].every(Number.isFinite)) throw new RangeError('Invalid movement.');
  return { x: clamp(rect.x+delta.x,0,bounds.width-rect.width),y: clamp(rect.y+delta.y,0,bounds.height-rect.height),width: rect.width,height: rect.height };
}
export function resizeElement(rect: Rect,delta: { width: number; height: number },bounds = { width: 1920 as const,height: 1080 as const }): Rect {
  valid(rect); if (![delta.width,delta.height].every(Number.isFinite)) throw new RangeError('Invalid size.');
  const x = clamp(rect.x,0,bounds.width-1),y = clamp(rect.y,0,bounds.height-1);
  return { x,y,width: clamp(rect.width+delta.width,1,bounds.width-x),height: clamp(rect.height+delta.height,1,bounds.height-y) };
}
export function alignElement(rect: Rect,alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): Rect {
  valid(rect);
  const x = alignment==='left' ? 0 : alignment==='center' ? (1920-rect.width)/2 : alignment==='right' ? 1920-rect.width : rect.x;
  const y = alignment==='top' ? 0 : alignment==='middle' ? (1080-rect.height)/2 : alignment==='bottom' ? 1080-rect.height : rect.y;
  return moveElement(rect,{ x: x-rect.x,y: y-rect.y });
}
export function alignmentGuides(rect: Rect): { axis: 'x' | 'y'; value: number }[] {
  const lines: { axis: 'x' | 'y'; value: number }[] = [];
  for (const value of [0,96,960,1824,1920]) if ([rect.x,rect.x+rect.width/2,rect.x+rect.width].some(edge => Math.abs(edge-value)<=8)) lines.push({ axis: 'x',value });
  for (const value of [0,96,540,984,1080]) if ([rect.y,rect.y+rect.height/2,rect.y+rect.height].some(edge => Math.abs(edge-value)<=8)) lines.push({ axis: 'y',value });
  return lines;
}
