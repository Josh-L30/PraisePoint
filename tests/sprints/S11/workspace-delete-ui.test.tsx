import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { TeamPage } from '../../../src/features/workspaces/TeamPage';
import { church, ownerId, memberId, teamService } from '../S02/fixtures';
import { setDeviceSession } from '../../../src/lib/device-session';
import { purgeWorkspaceLocalData } from '../../../src/features/workspaces/workspace-local-cleanup';
vi.mock('../../../src/features/workspaces/workspace-local-cleanup', () => ({
  purgeWorkspaceLocalData: vi.fn(async () => ({ ok: true, value: undefined })),
}));
vi.mock('../../../src/features/offline/runtime-client', () => ({
  acquireRuntimeActivity: async () => ({ ok: true, value: () => {} }),
  markRuntimeBusy: () => () => {},
}));
beforeEach(async () => {
  vi.mocked(purgeWorkspaceLocalData).mockClear();
  await setDeviceSession(ownerId);
});
it('preserves local originals and prepared copies when the server cannot authorize deletion', async () => {
  const begin = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Finish pending uploads first.' },
    }),
    remove = vi.fn(),
    user = userEvent.setup();
  render(
    <MemoryRouter>
      <TeamPage
        workspace={church}
        profileId={ownerId}
        service={teamService({ beginDeleteChurch: begin, deleteChurch: remove } as never)}
        onRefresh={async () => {}}
      />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Delete church workspace' }));
  await user.type(screen.getByRole('textbox', { name: 'Type workspace name' }), church.name);
  await user.click(screen.getByRole('button', { name: 'Delete workspace' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Finish pending uploads');
  expect(purgeWorkspaceLocalData).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
  expect(begin).toHaveBeenCalledWith(church.id, church.name);
});
it('requires the exact workspace name and a centered confirmation; cancellation never calls deletion', async () => {
  const remove = vi.fn(),
    user = userEvent.setup();
  render(
    <MemoryRouter>
      <TeamPage
        workspace={church}
        profileId={ownerId}
        service={teamService({ deleteChurch: remove } as never)}
        onRefresh={async () => {}}
      />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Delete church workspace' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Delete church workspace?' });
  expect(dialog.parentElement).toBe(document.body);
  expect(within(dialog).getByRole('button', { name: 'Delete workspace' })).toBeDisabled();
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Type workspace name' }),
    church.name,
  );
  expect(within(dialog).getByRole('button', { name: 'Delete workspace' })).toBeEnabled();
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(remove).not.toHaveBeenCalled();
});
it('keeps a server cleanup failure inside the confirmation instead of claiming success', async () => {
  const remove = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK', message: 'Storage cleanup is not confirmed. Resume deletion.' },
    }),
    user = userEvent.setup();
  render(
    <MemoryRouter>
      <TeamPage
        workspace={church}
        profileId={ownerId}
        service={teamService({
          beginDeleteChurch: async () => ({ ok: true, value: undefined }),
          deleteChurch: remove,
        } as never)}
        onRefresh={async () => {}}
      />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Delete church workspace' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Delete church workspace?' });
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Type workspace name' }),
    church.name,
  );
  await user.click(within(dialog).getByRole('button', { name: 'Delete workspace' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Storage cleanup is not confirmed',
  );
  expect(remove).toHaveBeenCalledWith(church.id, church.name);
  expect(screen.queryByText('Workspace deleted.')).not.toBeInTheDocument();
});
it('never offers workspace deletion to volunteers', async () => {
  render(
    <MemoryRouter>
      <TeamPage
        workspace={{ ...church, role: 'member' }}
        profileId={memberId}
        service={teamService()}
        onRefresh={async () => {}}
      />
    </MemoryRouter>,
  );
  await screen.findByText('Daniel');
  expect(screen.queryByRole('button', { name: 'Delete church workspace' })).not.toBeInTheDocument();
});
