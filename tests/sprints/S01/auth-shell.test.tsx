import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppShell } from '../../../src/app/AppShell';
import { SignInPage } from '../../../src/features/auth/SignInPage';
import { createAuthService } from '../../../src/features/auth/auth-service';

const profile = { profileId: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222', displayName: 'Maria', avatarUrl: null };
describe('workspace shell', () => {
  it('keeps navigation accessible when collapsed', async () => {
    render(<MemoryRouter><AppShell profile={profile} onSignOut={async () => {}} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Presentations' })).toBeVisible();
  });
  it('provides a menu button and closes the mobile drawer with Escape', async () => {
    render(<MemoryRouter><AppShell profile={profile} onSignOut={async () => {}} /></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Open navigation' });
    await userEvent.click(menu);
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('link', { name: 'Gather overview' })).toHaveFocus());
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Sign out' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Gather overview' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });
  it('offers solid surfaces and a useful empty workspace without invented decks', async () => {
    render(<MemoryRouter><AppShell profile={profile} onSignOut={async () => {}} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Reduce transparency' }));
    expect(document.documentElement).toHaveAttribute('data-transparency', 'reduced');
    expect(screen.queryByText('24 slides')).not.toBeInTheDocument();
  });
  it('offers recovery when Google login is not configured', async () => {
    render(<MemoryRouter><SignInPage service={createAuthService(null)} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Supabase/i);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });
});
