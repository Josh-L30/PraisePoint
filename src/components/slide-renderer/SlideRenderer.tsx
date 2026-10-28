import { measureSlideOverflow, type Slide } from '../../domain/slide';
import type { MediaResolver } from '../../domain/media';
import { useEffect, useRef, useState, type CSSProperties,type ReactNode } from 'react';
import { BackgroundLayer, MediaLayer } from './BackgroundLayer';
import { unavailableMedia } from './media-context';
export type SlideRendererProps = { slide: Slide; resolveMedia?: MediaResolver; mode: 'editor' | 'preview' | 'audience';animateMedia?:boolean; onIssues?(issues: string[]): void; editorOverlay?(scale: number): ReactNode };
export function SlideRenderer({ slide, resolveMedia = unavailableMedia, mode, onIssues,editorOverlay,animateMedia=true }: SlideRendererProps) {
  const viewport = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [font,setFont] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [layout,setLayout] = useState({ scale: 0, left: 0, top: 0 });
  const [issues,setIssues] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const faces = await document.fonts?.load('72px Figtree');
        if (active) setFont(faces?.some(face => face.family.replaceAll('"','')==='Figtree' && face.status==='loaded') && document.fonts.check('72px Figtree') ? 'ready' : 'missing');
      } catch { if (active) setFont('missing'); }
    }
    void load(); return () => { active=false; };
  },[]);
  useEffect(() => {
    let active = true;
    function measure() {
      if (!active || !viewport.current) return;
      const bounds = viewport.current.getBoundingClientRect(), scale = Math.min(bounds.width/1920,bounds.height/1080);
      setLayout({ scale, left: (bounds.width-1920*scale)/2, top: (bounds.height-1080*scale)/2 });
      const overflow = new Set(measureSlideOverflow(slide));
      stage.current?.querySelectorAll<HTMLElement>('[data-text-id]').forEach(element => {
        if (element.scrollWidth>element.clientWidth+1 || element.scrollHeight>element.clientHeight+1) overflow.add(element.dataset.textId!);
      });
      const result = Array.from(overflow); setIssues(result); onIssues?.(result);
    }
    queueMicrotask(measure);
    const observer = typeof ResizeObserver!=='undefined' ? new ResizeObserver(measure) : null;
    if (viewport.current) observer?.observe(viewport.current);
    window.addEventListener('resize',measure);
    return () => { active=false; observer?.disconnect(); window.removeEventListener('resize',measure); };
  },[slide,font,onIssues]);
  return <>
    <div ref={viewport} className="slide-viewport" data-mode={mode} data-font-ready={font==='ready'} style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: '16/9', height: mode==='audience' ? '100%' : undefined, background: '#000' }}>
      {font==='ready' ? <div ref={stage} data-testid="slide-stage" className="slide-stage" style={{ position: 'absolute', width: 1920, height: 1080, left: layout.left, top: layout.top, transform: `scale(${layout.scale})`, transformOrigin: 'top left', overflow: 'hidden' }}>
        <BackgroundLayer background={slide.background} resolver={resolveMedia} animate={animateMedia} />
        {slide.standaloneVideoId && <MediaLayer mediaId={slide.standaloneVideoId} kind="video" videoMode="standalone" fit="contain" resolver={resolveMedia} style={{position:'absolute',inset:0,width:1920,height:1080}} />}
        {[...slide.elements].sort((a,b) => a.z-b.z || a.id.localeCompare(b.id)).map(element => {
          const style: CSSProperties = { position: 'absolute', left: element.x, top: element.y, width: element.width, height: element.height, zIndex: element.z+1 };
          return element.kind==='text' ? <div key={element.id} data-testid={'element-' + element.id} data-text-id={element.id} style={{ ...style, fontFamily: 'Figtree', fontSize: element.fontSize, color: element.color, textAlign: element.align, whiteSpace: 'pre', lineHeight: 1.2, overflow: 'hidden' }}>{element.text}</div>
            : <MediaLayer key={element.id} mediaId={element.mediaId} kind="image" fit={element.fit} resolver={resolveMedia} style={style} />;
        })}
        {mode==='editor' && editorOverlay?.(layout.scale)}
      </div> : <p className="slide-font-message" role={font==='missing' ? 'alert' : 'status'}>{font==='missing' ? 'Figtree could not load. Reconnect and reload before presenting.' : 'Loading presentation font…'}</p>}
    </div>
    {mode!=='audience' && issues.length>0 && <p className="slide-overflow-warning" role="status">Some text or elements extend beyond their box. Add line breaks, reduce text size, or split this slide.</p>}
  </>;
}
