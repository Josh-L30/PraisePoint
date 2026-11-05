import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthContextValue } from '../../../src/features/auth/auth-context';
import { createAuthService } from '../../../src/features/auth/auth-service';
import { CallbackPage } from '../../../src/features/auth/CallbackPage';
import { AcceptInvitePage } from '../../../src/features/workspaces/AcceptInvitePage';
import {
  captureInvitation,
  readPendingInvitation,
} from '../../../src/features/workspaces/invitation-state';
import type { WorkspaceService } from '../../../src/features/workspaces/workspace-service';
import { church, ownerId, personal, teamService } from './fixtures';
const token = 'ab'.repeat(32);
beforeEach(() => {
  sessionStorage.clear();
  history.replaceState(null, '', '/invite#token=' + token);
});
function authState(authenticated: boolean): AuthContextValue {
  const common = {
    service: createAuthService(null),
    reload: async () => {},
    signOut: async () => {},
  };
  return authenticated
    ? {
        ...common,
        status: 'authenticated',
        profile: {
          profileId: ownerId,
          workspaceId: personal.id,
          displayName: 'Maria',
          avatarUrl: null,
        },
        error: null,
      }
    : { ...common, status: 'anonymous', profile: null, error: null };
}
function invite(authenticated: boolean, service: WorkspaceService) {
  return render(
    <MemoryRouter initialEntries={['/invite']}>
      <AuthContext.Provider value={authState(authenticated)}>
        <Routes>
          <Route path="/invite" element={<AcceptInvitePage service={service} />} />
          <Route path="/auth" element={<p>Sign-in route</p>} />
          <Route path="/app/w/:workspaceId/team" element={<p>Joined workspace</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
it('stores and scrubs the link before sign-in without reading or accepting team data', async () => {
  const accept = vi.fn(),
    team = vi.fn();
  invite(false, teamService({ acceptInvite: accept, team }));
  expect(await screen.findByRole('link', { name: 'Sign in with Google' })).toHaveAttribute(
    'href',
    '/auth',
  );
  expect(location.hash).toBe('');
  expect(readPendingInvitation()).toBe(token);
  expect(accept).not.toHaveBeenCalled();
  expect(team).not.toHaveBeenCalled();
});
it('waits for explicit confirmation, then joins and clears only the consumed invitation', async () => {
  const accept = vi.fn(async () => ({ ok: true as const, value: church.id }));
  invite(true, teamService({ acceptInvite: accept }));
  const button = await screen.findByRole('button', { name: 'Join church workspace' });
  expect(accept).not.toHaveBeenCalled();
  await userEvent.click(button);
  expect(await screen.findByText('Joined workspace')).toBeVisible();
  expect(accept).toHaveBeenCalledWith(token);
  expect(readPendingInvitation()).toBeNull();
});
it('keeps an unconsumed link available after a wrong-account or expired-invite denial', async () => {
  invite(
    true,
    teamService({
      acceptInvite: async () => ({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Use the invited Google account or ask for a new link.',
        },
      }),
    }),
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Join church workspace' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('invited Google account');
  expect(readPendingInvitation()).toBe(token);
  expect(screen.getByRole('button', { name: 'Use another Google account' })).toBeVisible();
});
it('returns from Google to the pending invitation instead of losing it on the dashboard', async () => {
  captureInvitation();
  render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <AuthContext.Provider value={authState(true)}>
        <Routes>
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route path="/invite" element={<p>Continue invitation</p>} />
          <Route path="/app" element={<p>Default dashboard</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  expect(await screen.findByText('Continue invitation')).toBeVisible();
});
