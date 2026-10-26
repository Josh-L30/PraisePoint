import type { SlideCategory } from '../../domain/slide';
import { categories } from '../../domain/slide-schema';
import { templateNames } from './templates';
export function TemplatePicker({ onSelect, disabled = false }: { onSelect(category: SlideCategory): void; disabled?: boolean }) {
  return <div className="template-picker" aria-label="Slide templates">{categories.map(category => <button key={category} type="button" className="template-choice glass-control" disabled={disabled} onClick={() => onSelect(category)}>
    <span aria-hidden="true" className={'template-swatch swatch-' + category}><i /><i /></span><strong>{templateNames[category]}</strong>
  </button>)}</div>;
}
