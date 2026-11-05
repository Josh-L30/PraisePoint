import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { DeckListPage } from '../../../src/features/decks/DeckListPage';
import { createDeckService, type DeckService } from '../../../src/features/decks/deck-service';
import { church, personal, ownerId, memberId } from '../S02/fixtures';
import { deckFixture } from '../../support/deck-fixture';
function library(overrides: Partial<DeckService> = {}, member = false) {
  const service: DeckService = {
    ...createDeckService(null),
    list: async () => ({ ok: true, value: { items: [], hasMore: false } }),
    ...overrides,
  };
  return render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: (
            <DeckListPage
              workspace={{ ...church, role: member ? 'member' : 'owner' }}
              workspaces={[personal, church]}
              profileId={member ? memberId : ownerId}
              service={service}
            />
          ),
        },
        { path: '/app/w/:workspaceId/decks/:deckId', element: <p>Editor opened</p> },
      ])}
    />,
  );
}
it('creates a presentation only after an explicit template selection', async () => {
  const createDeck = vi.fn(async () => ({
    ok: true as const,
    value: { document: { ...deckFixture(), workspaceId: church.id }, revision: 1 },
  }));
  library({ createDeck });
  await userEvent.click(await screen.findByRole('button', { name: 'New presentation' }));
  expect(createDeck).not.toHaveBeenCalled();
  for (const name of ['Lyrics', 'Scripture', 'Sermon', 'Announcement', 'Welcome / closing'])
    expect(screen.getByRole('button', { name })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Lyrics' }));
  expect(await screen.findByText('Editor opened')).toBeVisible();
  expect(createDeck).toHaveBeenCalledWith(church.id, 'lyrics');
});
it('does not offer members deletion of another volunteer’s presentation', async () => {
  library(
    {
      list: async () => ({
        ok: true,
        value: {
          hasMore: false,
          items: [
            {
              id: crypto.randomUUID(),
              workspaceId: church.id,
              title: 'Another volunteer’s deck',
              revision: 1,
              createdBy: ownerId,
              updatedAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              workspaceId: church.id,
              title: 'My deck',
              revision: 1,
              createdBy: memberId,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      }),
    },
    true,
  );
  expect(
    within(await screen.findByRole('article', { name: 'Another volunteer’s deck' })).queryByRole(
      'button',
      { name: 'Delete' },
    ),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('article', { name: 'My deck' })).getByRole('button', {
      name: 'Delete',
    }),
  ).toBeVisible();
});
