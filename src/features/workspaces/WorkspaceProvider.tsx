import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useMatch } from 'react-router';
import { WorkspaceContext } from './workspace-context';
import { workspaceService, type Workspace, type WorkspaceService } from './workspace-service';
import { LoadingScreen } from '../../app/LoadingScreen';
export function WorkspaceProvider({
  personalId,
  service = workspaceService,
  children,
}: {
  personalId: string;
  service?: WorkspaceService;
  children: ReactNode;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true),
    generation = useRef(0);
  const match = useMatch('/app/w/:workspaceId/*');
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await service.list();
      if (!mounted.current || current !== generation.current) return;
      if (result.ok) {
        setWorkspaces(result.value);
        setError(null);
      } else {
        setWorkspaces(null);
        setError(result.error.message);
      }
    } catch {
      if (mounted.current && current === generation.current) {
        setWorkspaces(null);
        setError('Your workspaces could not be loaded. Check your connection and try again.');
      }
    }
  }, [service]);
  useEffect(() => {
    const requests = generation;
    mounted.current = true;
    queueMicrotask(() => {
      if (mounted.current) void refresh();
    });
    return () => {
      mounted.current = false;
      requests.current++;
    };
  }, [refresh]);
  if (!workspaces && !error) return <LoadingScreen />;
  const active = workspaces?.find(
    (workspace) => workspace.id === (match?.params.workspaceId ?? personalId),
  );
  if (error || !active)
    return (
      <main className="center-page">
        <section className="glass message-panel">
          <h1>Let’s find your workspace.</h1>
          <p role="alert">
            {error ?? 'You no longer have access to this workspace, or the link is incorrect.'}
          </p>
          <button className="button button-primary" onClick={() => void refresh()}>
            Refresh workspaces
          </button>
          <Link className="button" to="/app">
            Return to personal workspace
          </Link>
        </section>
      </main>
    );
  return (
    <WorkspaceContext.Provider value={{ active, workspaces: workspaces!, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
