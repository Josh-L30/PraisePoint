import { mayChangeAccount } from '../../../src/lib/navigation-guard';
import { expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { MediaLibraryPage } from '../../../src/features/media/MediaLibraryPage';
const emptyAux = {
  getUsage: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      workspaceUsed: 0,
      workspaceReserved: 0,
      workspaceLimit: 52428800,
      applicationUsed: 0,
      applicationReserved: 0,
      applicationLimit: 524288000,
    },
  }),
  getManagement: vi.fn().mockResolvedValue({ ok: true, value: [] }),
};
const workspace = {
  id: 'a6000000-0000-4000-8000-000000000001',
  name: 'Personal',
  ownerId: 'a6000000-0000-4000-8000-000000000001',
  kind: 'personal' as const,
  role: 'owner' as const,
};
it('imports a selected video locally and never calls cloud upload', async () => {
  const user = userEvent.setup(),
    service = {
      ...emptyAux,
      list: vi.fn().mockResolvedValue({ ok: true, value: { items: [], hasMore: false } }),
      importLocalMedia: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      uploadImage: vi.fn(),
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
  await user.upload(
    screen.getByLabelText('Choose media file'),
    new File(['video'], 'worship.mp4', { type: 'video/mp4' }),
  );
  await user.click(screen.getByRole('button', { name: 'Import media' }));
  await waitFor(() => expect(service.importLocalMedia).toHaveBeenCalledOnce());
  expect(service.uploadImage).not.toHaveBeenCalled();
});
it('shows a failed import without claiming the file is ready', async () => {
  const user = userEvent.setup(),
    service = {
      ...emptyAux,
      list: vi.fn().mockResolvedValue({ ok: true, value: { items: [], hasMore: false } }),
      importLocalMedia: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'VALIDATION', message: 'Cannot decode video.' },
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
  await user.upload(
    screen.getByLabelText('Choose media file'),
    new File(['bad'], 'worship.mp4', { type: 'video/mp4' }),
  );
  await user.click(screen.getByRole('button', { name: 'Import media' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot decode video.');
  expect(screen.queryByText('Media imported.')).not.toBeInTheDocument();
});

it('blocks account changes while an import is still being confirmed', async () => {
  const user = userEvent.setup();
  let complete!: (value: unknown) => void;
  const service = {
    ...emptyAux,
    list: vi.fn().mockResolvedValue({ ok: true, value: { items: [], hasMore: false } }),
    importLocalMedia: vi.fn(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    ),
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
  await user.upload(
    screen.getByLabelText('Choose media file'),
    new File(['video'], 'worship.mp4', { type: 'video/mp4' }),
  );
  await user.click(screen.getByRole('button', { name: 'Import media' }));
  await waitFor(() => expect(service.importLocalMedia).toHaveBeenCalledOnce());
  expect(await mayChangeAccount()).toBe(false);
  await act(async () =>
    complete({ ok: false, error: { code: 'NETWORK', message: 'Not confirmed.' } }),
  );
});

it('refreshes a missing thumbnail after its original file is verified', async () => {
  const user = userEvent.setup(),
    asset = {
      id: 'a6000000-0000-4000-8000-000000000020',
      workspaceId: workspace.id,
      kind: 'image' as const,
      location: 'local' as const,
      mime: 'image/png',
      bytes: 195,
      sha256: 'a'.repeat(64),
      revision: 1,
      originalName: 'Recovered image.png',
    };
  const service = {
    ...emptyAux,
    list: vi.fn().mockResolvedValue({ ok: true, value: { items: [asset], hasMore: false } }),
    resolveMedia: vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Original required.' },
      })
      .mockResolvedValue({
        ok: true,
        value: { url: 'blob:recovered-test-image', release: vi.fn() },
      }),
    verifyMedia: vi.fn().mockResolvedValue({ ok: true, value: asset }),
  };
  const view = render(
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
  expect(await screen.findByText('Original needed')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^Verify file$/ }));
  await waitFor(() => expect(view.container.querySelector('.media-thumbnail img')).not.toBeNull());
});
