import type { Workspace } from './workspace-service';
import { useId } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown } from 'lucide-react';
export type WorkspacePickerProps = { workspaces: Workspace[]; selected: Workspace; onSelect?(): void };
export function WorkspacePicker({ workspaces, selected, onSelect }: WorkspacePickerProps) {
  const controlId = useId(), navigate = useNavigate();
  return <div className="workspace-picker glass-control workspace-switch">
    <span className="workspace-letter" aria-hidden="true">{selected.kind==='personal' ? 'P' : 'C'}</span>
    <div className="picker-fields"><label className="sr-only" htmlFor={controlId}>Switch workspace</label>
      <select id={controlId} value={selected.id} title={selected.name} onChange={event => {
        const next = workspaces.find(w => w.id===event.target.value);
        if (!next) return;
        navigate('/app/w/' + next.id); onSelect?.();
      }}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <small className="collapse-copy">{selected.kind==='personal' ? 'Private to you' : 'Shared with your church'}</small>
    </div><ChevronDown aria-hidden="true" className="collapse-copy picker-chevron" size={15} />
  </div>;
}
