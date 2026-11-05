import { expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { mayChangeAccount } from '../../../src/lib/navigation-guard';
import { useContentGuard } from '../../../src/features/songs/use-content-guard';
import { MediaLibraryPage } from '../../../src/features/media/MediaLibraryPage';

function Guarded() {
  return (
    <>
      {useContentGuard(true, false)}
      <p>Unsaved song words</p>
    </>
  );
}
it('waits for a centered custom discard decision and cancellation protects the draft', async () => {
  const native = vi.spyOn(window, 'confirm').mockReturnValue(false),
    user = userEvent.setup();
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Guarded /> }])} />);
  let decision!: ReturnType<typeof mayChangeAccount>;
  act(() => {
    decision = mayChangeAccount();
  });
  expect(native).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('alertdialog');
  expect(dialog.parentElement).toBe(document.body);
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(await decision).toBe(false);
  expect(screen.getByText('Unsaved song words')).toBeVisible();
  act(() => {
    decision = mayChangeAccount();
  });
  await user.click(await screen.findByRole('button', { name: 'Discard and sign out' }));
  expect(await decision).toBe(true);
});
it('requires Confirm Deletion, cancels without a write, and retains a failed deletion with its error in the modal', async () => {
  const user = userEvent.setup(),
    workspace = {
      id: 'a6000000-0000-4000-8000-000000000001',
      name: 'Church',
      ownerId: 'a6000000-0000-4000-8000-000000000001',
      kind: 'church' as const,
      role: 'owner' as const,
    },
    asset = {
      id: 'a6000000-0000-4000-8000-000000000020',
      workspaceId: workspace.id,
      kind: 'image',
      location: 'cloud',
      mime: 'image/png',
      bytes: 195,
      sha256: 'a'.repeat(64),
      revision: 1,
      originalName: 'Sunday.png',
    };
  const service = {
    list: vi.fn().mockResolvedValue({ ok: true, value: { items: [asset], hasMore: false } }),
    getUsage: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        workspaceUsed: 195,
        workspaceReserved: 0,
        applicationUsed: 195,
        applicationReserved: 0,
      },
    }),
    getManagement: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    resolveMedia: vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Original required.' },
    }),
    deleteMedia: vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK', message: 'Stored bytes could not be removed. Retry deletion.' },
    }),
  };
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: (
            <MediaLibraryPage
              workspace={workspace}
              profileId={workspace.id}
              service={service as never}
            />
          ),
        },
      ])}
    />,
  );
  await user.click(await screen.findByRole('button', { name: 'Delete media' }));
  let dialog = screen.getByRole('alertdialog', { name: 'Confirm Deletion' });
  expect(dialog.parentElement).toBe(document.body);
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(service.deleteMedia).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Delete media' }));
  dialog = screen.getByRole('alertdialog', { name: 'Confirm Deletion' });
  await user.click(within(dialog).getByRole('button', { name: 'Confirm media deletion' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Stored bytes could not be removed',
  );
  expect(service.deleteMedia).toHaveBeenCalledOnce();
  expect(screen.queryByText('Media deleted.')).not.toBeInTheDocument();
});
