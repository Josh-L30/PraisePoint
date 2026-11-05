import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { TeamPage } from '../../../src/features/workspaces/TeamPage';
import { church, personal, ownerId, memberId, teamService } from './fixtures';
describe('church team interface', () => {
  it('keeps the entered church name available when creation cannot be confirmed', async () => {
    const service = teamService({
      createChurch: async () => ({
        ok: false,
        error: { code: 'NETWORK', message: 'Check your connection.' },
      }),
    });
    render(
      <MemoryRouter>
        <TeamPage
          workspace={personal}
          profileId={ownerId}
          service={service}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    );
    const input = screen.getByRole('textbox', { name: 'Church name' });
    await userEvent.type(input, 'Our church');
    await userEvent.click(screen.getByRole('button', { name: 'Create church workspace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection.');
    expect(input).toHaveValue('Our church');
  });
  it('lets owners generate a link for manual sharing', async () => {
    const url = 'https://gather.example/invite#token=' + 'ab'.repeat(32);
    const service = teamService({
      inviteMember: async () => ({ ok: true, value: { url, expiresAt: '2026-11-03T00:00:00Z' } }),
    });
    render(
      <MemoryRouter>
        <TeamPage
          workspace={church}
          profileId={ownerId}
          service={service}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    );
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Volunteer email' }),
      'new@example.invalid',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create invitation link' }));
    expect(await screen.findByRole('textbox', { name: 'Invitation link' })).toHaveValue(url);
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
  });
  it('shows members shared access without owner membership controls', async () => {
    const invites = vi.fn(async () => ({ ok: true as const, value: [] }));
    render(
      <MemoryRouter>
        <TeamPage
          workspace={{ ...church, role: 'member' }}
          profileId={memberId}
          service={teamService({ invitations: invites })}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    );
    await screen.findByText('Daniel');
    expect(screen.queryByRole('textbox', { name: 'Volunteer email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove volunteer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave church workspace' })).toBeVisible();
    expect(invites).not.toHaveBeenCalled();
  });
  it('requires confirmation before transfer and reports a server denial', async () => {
    const transfer = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'FORBIDDEN' as const, message: 'Only the current owner can transfer.' },
    }));
    render(
      <MemoryRouter>
        <TeamPage
          workspace={church}
          profileId={ownerId}
          service={teamService({ transferOwner: transfer })}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Make owner' }));
    expect(transfer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the current owner');
    expect(screen.queryByText('Ownership transferred.')).not.toBeInTheDocument();
  });
  it('keeps the owner from removing themselves or leaving directly', async () => {
    render(
      <MemoryRouter>
        <TeamPage
          workspace={church}
          profileId={ownerId}
          service={teamService()}
          onRefresh={async () => {}}
        />
      </MemoryRouter>,
    );
    await screen.findByText('Maria');
    expect(
      screen.queryByRole('button', { name: 'Leave church workspace' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove volunteer' })).toHaveLength(1);
  });
});
