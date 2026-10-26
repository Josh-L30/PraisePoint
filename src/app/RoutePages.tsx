import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { SignInPage } from '../features/auth/SignInPage';
import { AppShell } from './AppShell';
import { LoadingScreen } from './LoadingScreen';
import { DashboardPage } from './DashboardPage';
export function AuthPage() {
  const auth = useAuth();
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status === 'authenticated') return <Navigate replace to="/app" />;
  return <SignInPage service={auth.service} initialError={auth.error} />;
}
export function ProtectedShell() {
  const auth = useAuth();
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status !== 'authenticated') return <Navigate replace to="/auth" />;
  return <AppShell profile={auth.profile} onSignOut={auth.signOut}><Outlet /></AppShell>;
}
export function Dashboard() { const auth = useAuth(); return <DashboardPage workspaceId={auth.profile?.workspaceId} />; }
