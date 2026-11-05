import type { Page } from '@playwright/test';
import type { DeckDocument, SavedDeck } from '../../../src/domain/deck';
import { deckFixture as makeDeck, deckId } from '../../support/deck-fixture';
import { teamFixture, personalId, ownerId } from './team-fixture';
export { deckId };
export async function deckFixture(page: Page, seed = true) {
  await teamFixture(page, { personalOnly: true });
  const documents = new Map<string, SavedDeck>();
  if (seed) documents.set(deckId, { document: makeDeck(), revision: 1 });
  const state = {
    documents,
    failNextSave: null as 'network' | 'conflict' | null,
    saveRequests: [] as { p_document: DeckDocument; p_expected_revision: number }[],
  };
  await page.route('**/rest/v1/decks*', (route) => {
    const url = new URL(route.request().url()),
      requestedId = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (requestedId) {
      const found = documents.get(requestedId);
      return route.fulfill(
        found ? { json: found } : { status: 406, json: { code: 'PGRST116', message: 'No record' } },
      );
    }
    const workspace = url.searchParams.get('workspace_id')?.replace(/^eq\./, '');
    const offset = Number(url.searchParams.get('offset') ?? 0),
      limit = Number(url.searchParams.get('limit') ?? 25);
    return route.fulfill({
      json: [...documents.values()]
        .filter((item) => item.document.workspaceId === workspace)
        .slice(offset, offset + limit)
        .map((item) => ({
          id: item.document.id,
          workspace_id: item.document.workspaceId,
          title: item.document.title,
          revision: item.revision,
          created_by: ownerId,
          updated_at: '2026-10-26T00:00:00Z',
        })),
    });
  });
  await page.route('**/rest/v1/rpc/create_slide_deck', async (route) => {
    const args = route.request().postDataJSON() as { p_document: DeckDocument };
    const value = { document: structuredClone(args.p_document), revision: 1 };
    documents.set(value.document.id, value);
    await route.fulfill({ json: value });
  });
  await page.route('**/rest/v1/rpc/save_slide_deck', async (route) => {
    const args = route.request().postDataJSON() as {
      p_document: DeckDocument;
      p_expected_revision: number;
    };
    state.saveRequests.push(args);
    const failure = state.failNextSave;
    state.failNextSave = null;
    if (failure === 'network') {
      await route.abort('failed');
      return;
    }
    const old = documents.get(args.p_document.id);
    if (failure === 'conflict' || old?.revision !== args.p_expected_revision) {
      if (old && failure === 'conflict')
        documents.set(old.document.id, {
          document: { ...old.document, title: 'Newer volunteer version' },
          revision: old.revision + 1,
        });
      await route.fulfill({ status: 409, json: { code: '40001', message: 'Newer revision' } });
      return;
    }
    const value = {
      document: structuredClone(args.p_document),
      revision: args.p_expected_revision + 1,
    };
    documents.set(value.document.id, value);
    await route.fulfill({ json: value });
  });
  await page.route('**/rest/v1/rpc/duplicate_slide_deck', async (route) => {
    const args = route.request().postDataJSON() as {
      p_deck_id: string;
      p_destination_workspace_id: string;
      p_draft: DeckDocument | null;
    };
    const source = args.p_draft ?? documents.get(args.p_deck_id)?.document;
    if (!source) {
      await route.fulfill({ status: 403, json: { code: '42501' } });
      return;
    }
    const value = {
      document: {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        workspaceId: args.p_destination_workspace_id,
      },
      revision: 1,
    };
    documents.set(value.document.id, value);
    await route.fulfill({ json: value });
  });
  await page.route('**/rest/v1/rpc/delete_slide_deck', async (route) => {
    const args = route.request().postDataJSON() as { p_deck_id: string };
    documents.delete(args.p_deck_id);
    await route.fulfill({ status: 204 });
  });
  return state;
}
export const libraryPath = '/app/w/' + personalId + '/decks';
