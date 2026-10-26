import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { SignInPage } from '../features/auth/SignInPage';
import { AppShell } from './AppShell';
import { LoadingScreen } from './LoadingScreen';
import { DashboardPage } from './DashboardPage';
import { readPendingInvitation } from '../features/workspaces/invitation-state';
import { WorkspaceProvider } from '../features/workspaces/WorkspaceProvider';
import { useWorkspace } from '../features/workspaces/workspace-context';
import { TeamPage } from '../features/workspaces/TeamPage';
export function AuthPage() {
  const auth = useAuth();
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status === 'authenticated') return <Navigate replace to={readPendingInvitation() ? '/invite' : '/app'} />;
  return <SignInPage service={auth.service} initialError={auth.error} />;
}
export function ProtectedShell() {
  const auth = useAuth();
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status !== 'authenticated') return <Navigate replace to="/auth" />;
  return <WorkspaceProvider key={auth.profile.profileId} personalId={auth.profile.workspaceId}><WorkspaceLayout /></WorkspaceProvider>;
}
function WorkspaceLayout() {
  const auth = useAuth(), { active, workspaces } = useWorkspace();
  if (auth.status!=='authenticated') return null;
  return <AppShell profile={auth.profile} onSignOut={auth.signOut} activeWorkspace={active} workspaces={workspaces}><Outlet /></AppShell>;
}
export function TeamRoute() {
  const auth = useAuth(), { active, refresh } = useWorkspace();
  if (auth.status!=='authenticated') return null;
  return <TeamPage key={active.id} workspace={active} profileId={auth.profile.profileId} onRefresh={refresh} />;
}
export function Dashboard() { const { active } = useWorkspace(); return <DashboardPage workspaceId={active.id} shared={active.kind==='church'} />; }
