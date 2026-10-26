import { createContext, useContext } from 'react';
import type { Workspace } from './workspace-service';
export type WorkspaceContextValue = { active: Workspace; workspaces: Workspace[]; refresh(): Promise<void> };
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is required.');
  return value;
}
