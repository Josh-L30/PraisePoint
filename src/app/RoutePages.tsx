import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { SignInPage } from '../features/auth/SignInPage';
import { AppShell } from './AppShell';
import { LoadingScreen } from './LoadingScreen';
import { DashboardPage } from './DashboardPage';
import { readPendingInvitation } from '../features/workspaces/invitation-state';
import { WorkspaceProvider } from '../features/workspaces/WorkspaceProvider';
import { useWorkspace } from '../features/workspaces/workspace-context';
import { TeamPage } from '../features/workspaces/TeamPage';
const DeckListPage = lazy(() => import('../features/decks/DeckListPage').then(module => ({ default: module.DeckListPage })));
const BackgroundGalleryPage = lazy(() => import('../features/decks/BackgroundGalleryPage').then(module => ({ default: module.BackgroundGalleryPage })));
const DeckEditorPage = lazy(() => import('../features/decks/DeckEditorPage').then(module => ({ default: module.DeckEditorPage })));
const DeckPreviewPage = lazy(() => import('../features/decks/DeckPreviewPage').then(module => ({ default: module.DeckPreviewPage })));
const SongLibraryPage = lazy(() => import('../features/songs/SongLibraryPage').then(module => ({ default: module.SongLibraryPage })));
const ServicePlanPage = lazy(() => import('../features/services/ServicePlanPage').then(module => ({ default: module.ServicePlanPage })));
const MediaLibraryPage=lazy(()=>import('../features/media/MediaLibraryPage').then(module=>({default:module.MediaLibraryPage})));
export function MediaLibrary(){const auth=useAuth(),{active,workspaces}=useWorkspace();return auth.status==='authenticated'?<MediaLibraryPage key={active.id} workspace={active} workspaces={workspaces} profileId={auth.profile.profileId}/>:null;}
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
  return <AppShell profile={auth.profile} onSignOut={auth.signOut} activeWorkspace={active} workspaces={workspaces}><Suspense fallback={<p className="page-content" role="status">Opening your workspace…</p>}><Outlet /></Suspense></AppShell>;
}
export function TeamRoute() {
  const auth = useAuth(), { active, refresh } = useWorkspace();
  if (auth.status!=='authenticated') return null;
  return <TeamPage key={active.id} workspace={active} profileId={auth.profile.profileId} onRefresh={refresh} />;
}
export function Dashboard() { const { active } = useWorkspace(); return <DashboardPage workspaceId={active.id} shared={active.kind==='church'} />; }
export function SongLibrary() { const {active}=useWorkspace();return <SongLibraryPage key={active.id} workspace={active}/>; }
export function ServicePlans() { const auth=useAuth(),{active}=useWorkspace(),{serviceId}=useParams();return auth.status==='authenticated'?<ServicePlanPage key={active.id+(serviceId??'list')} workspace={active} serviceId={serviceId} profileId={auth.profile.profileId}/>:null; }
export function DeckLibrary({ showTemplates = false }: { showTemplates?: boolean }) {
  const auth = useAuth(), { active, workspaces } = useWorkspace();
  if(auth.status!=='authenticated')return null;
  return showTemplates?<BackgroundGalleryPage key={active.id} workspace={active}/>:<DeckListPage key={active.id} workspace={active} workspaces={workspaces} profileId={auth.profile.profileId}/>;
}
export function DeckEditor() {
  const { deckId } = useParams(), auth = useAuth(), { active } = useWorkspace();
  return auth.status==='authenticated' && deckId ? <DeckEditorPage key={active.id + deckId} workspaceId={active.id} deckId={deckId} profileId={auth.profile.profileId} /> : null;
}
export function DeckPreview() {
  const { deckId } = useParams(), auth = useAuth(), { active } = useWorkspace();
  return auth.status==='authenticated' && deckId ? <DeckPreviewPage key={active.id + deckId} workspaceId={active.id} deckId={deckId} profileId={auth.profile.profileId} /> : null;
}

const OperatorPage=lazy(()=>import('../features/presenter/OperatorPage').then(module=>({default:module.OperatorPage})));
export function Presenter(){const auth=useAuth(),{serviceId}=useParams();if(auth.status==='loading')return <LoadingScreen/>;return auth.status==='authenticated' && serviceId?<Suspense fallback={<LoadingScreen/>}><OperatorPage key={auth.profile.profileId+serviceId} profileId={auth.profile.profileId} serviceId={serviceId}/></Suspense>:<Navigate to="/auth" replace/>;}
