import type {ReactNode} from 'react';
import type { SlideCategory } from '../../domain/slide';
import { categories } from '../../domain/slide-schema';
import { templateNames } from './templates';
const samples:Record<SlideCategory,ReactNode>={
 lyrics:<><strong>Your lyrics go here</strong><span>One voice. One song.</span></>,
 scripture:<><span className="sample-passage">“For God so loved the world…”</span><strong>John 3:16</strong></>,
 sermon:<><strong>Faith for today</strong><span>1. Listen with hope</span><span>2. Live with purpose</span></>,
 announcement:<><span className="sample-date">SUN · 9 AM</span><strong>Worship together</strong><span>Everyone is welcome</span></>,
 'welcome-closing':<><strong>Welcome home.</strong><span>We’re glad you’re here.</span></>,
};
export function TemplatePicker({ onSelect, disabled = false }: { onSelect(category: SlideCategory): void; disabled?: boolean }) {
  return <div className="template-picker" aria-label="Slide templates">{categories.map(category => <button key={category} type="button" className="template-choice glass-control" disabled={disabled} onClick={() => onSelect(category)}>
    <span aria-hidden="true" className={'template-swatch layout-preview swatch-' + category}>{samples[category]}</span><strong>{templateNames[category]}</strong>
  </button>)}</div>;
}
