import { createBrowserRouter, Navigate } from 'react-router';
import { CallbackPage } from '../features/auth/CallbackPage';
import { AuthPage, ProtectedShell, Dashboard, TeamRoute, DeckLibrary, DeckEditor, DeckPreview,SongLibrary,ServicePlans } from './RoutePages';
import { AcceptInvitePage } from '../features/workspaces/AcceptInvitePage';
import { FeaturePendingPage } from './FeaturePendingPage';
import { SetupPage } from './SetupPage';
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth" replace /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/auth/callback', element: <CallbackPage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/invite', element: <AcceptInvitePage /> },
  { path: '/app', element: <ProtectedShell />, children: [
    { index: true, element: <Dashboard /> }, { path: 'w/:workspaceId', element: <Dashboard /> },
    { path: 'w/:workspaceId/team', element: <TeamRoute /> },
    { path: 'w/:workspaceId/decks', element: <DeckLibrary /> },
    { path: 'w/:workspaceId/decks/:deckId', element: <DeckEditor /> },
    { path: 'w/:workspaceId/decks/:deckId/preview', element: <DeckPreview /> },
    { path: 'w/:workspaceId/templates', element: <DeckLibrary showTemplates /> },
    { path: 'w/:workspaceId/songs', element: <SongLibrary /> },
    { path: 'w/:workspaceId/services', element: <ServicePlans /> },
    { path: 'w/:workspaceId/services/:serviceId', element: <ServicePlans /> },
    { path: 'w/:workspaceId/:section', element: <FeaturePendingPage /> },
  ] },
  { path: '*', element: <main className="center-page"><section className="glass message-panel"><h1>Page not found.</h1><a className="button" href="/">Return to Gather</a></section></main> },
]);
