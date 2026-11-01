import type { Workspace } from './workspace-service';
import { useId } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown } from 'lucide-react';
export type WorkspacePickerProps = { workspaces: Workspace[]; selected: Workspace; onSelect?(): void };
export function WorkspacePicker({ workspaces, selected, onSelect }: WorkspacePickerProps) {
  const controlId = useId(), navigate = useNavigate();
  return <div className="workspace-picker glass-control workspace-switch">
    <span className="workspace-letter" aria-hidden="true">{selected.kind==='personal' ? 'P' : 'C'}</span>
    <div className="picker-fields"><span className="workspace-name" title={selected.name}>{selected.name}</span>
      <small>{selected.kind==='personal' ? 'Private to you' : 'Shared with your church'}</small>
    </div><label className="workspace-dropdown" htmlFor={controlId}><span className="sr-only">Switch workspace</span><ChevronDown aria-hidden="true" size={18}/>
      <select className="workspace-select" id={controlId} value={selected.id} title="Switch workspace" onChange={event => {
        const next = workspaces.find(w => w.id===event.target.value);
        if (!next) return;
        navigate('/app/w/' + next.id); onSelect?.();
      }}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
    </label>
  </div>;
}
