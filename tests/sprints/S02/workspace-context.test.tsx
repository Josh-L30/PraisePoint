import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { WorkspaceProvider } from '../../../src/features/workspaces/WorkspaceProvider';
import { useWorkspace } from '../../../src/features/workspaces/workspace-context';
import { church, personal, teamService } from './fixtures';
function Current() { const { active } = useWorkspace(); return <h1>{active.name}</h1>; }
it('selects only a workspace returned for the current account', async () => {
  const list = vi.fn(async () => ({ ok: true as const, value: [personal,church] }));
  render(<MemoryRouter initialEntries={['/app/w/' + church.id + '/team']}><WorkspaceProvider personalId={personal.id} service={teamService({ list })}><Current /></WorkspaceProvider></MemoryRouter>);
  expect(await screen.findByRole('heading',{ name: church.name })).toBeVisible();
  expect(list).toHaveBeenCalledOnce();
});
it('does not render a forged or removed workspace from the URL', async () => {
  render(<MemoryRouter initialEntries={['/app/w/' + church.id]}><WorkspaceProvider personalId={personal.id} service={teamService({ list: async () => ({ ok: true, value: [personal] }) })}><Current /></WorkspaceProvider></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('no longer have access');
  expect(screen.queryByRole('heading',{ name: church.name })).not.toBeInTheDocument();
  expect(screen.getByRole('link',{ name: 'Return to personal workspace' })).toHaveAttribute('href','/app');
});
it('shows a failed workspace read instead of inventing a local membership', async () => {
  render(<MemoryRouter><WorkspaceProvider personalId={personal.id} service={teamService({ list: async () => ({ ok: false, error: { code: 'NETWORK', message: 'Workspaces could not be loaded.' } }) })}><Current /></WorkspaceProvider></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByRole('heading',{ name: personal.name })).not.toBeInTheDocument();
});
