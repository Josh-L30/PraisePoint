import { describe, expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { deckFixture, deckId, workspaceId } from '../support/deck-fixture';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Public Supabase configuration is required.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
describe('S03 live anonymous authorization', () => {
  it('denies reads of presentation content', async () => {
    const response = await fetch(url + '/rest/v1/decks?select=document,revision', { headers });
    expect([401, 403]).toContain(response.status);
  });
  it('denies raw insert, update and deletion paths', async () => {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const response = await fetch(url + '/rest/v1/decks?id=eq.' + deckId, {
        method,
        headers,
        ...(method === 'DELETE'
          ? {}
          : {
              body: JSON.stringify(
                method === 'POST'
                  ? {
                      id: deckId,
                      workspace_id: workspaceId,
                      created_by: workspaceId,
                      title: 'Denied',
                      document: deckFixture(),
                      byte_size: 1000,
                    }
                  : { revision: 99 },
              ),
            }),
      });
      expect([401, 403], method).toContain(response.status);
    }
  });
  it('denies save/copy/delete RPCs without a verified session', async () => {
    const requests = [
      ['create_slide_deck', { p_workspace_id: workspaceId, p_document: deckFixture() }],
      ['save_slide_deck', { p_document: deckFixture(), p_expected_revision: 1 }],
      [
        'duplicate_slide_deck',
        { p_deck_id: deckId, p_destination_workspace_id: workspaceId, p_draft: null },
      ],
      ['delete_slide_deck', { p_deck_id: deckId }],
    ] as const;
    for (const [name, body] of requests) {
      const response = await fetch(url + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      expect([401, 403], name).toContain(response.status);
    }
  });
});
