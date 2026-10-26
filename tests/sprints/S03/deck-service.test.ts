import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDeckService } from '../../../src/features/decks/deck-service';
import { deckFixture, deckId, workspaceId } from '../../support/deck-fixture';
import type { TextElement } from '../../../src/domain/slide';
function rpcClient(error: { code: string; message?: string } | null = null) {
  const rpc = vi.fn(async (name: string,args: Record<string,unknown>) => ({ data: { document: args.p_document ?? args.p_draft ?? deckFixture(), revision: name==='create_slide_deck' ? 1 : 2 }, error }));
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}
it.each(['lyrics','scripture','sermon','announcement','welcome-closing'] as const)('creates a validated %s document in the requested workspace',async category => {
  const { client, rpc } = rpcClient(), result = await createDeckService(client).createDeck(workspaceId,category);
  expect(result.ok).toBe(true);
  expect(rpc).toHaveBeenCalledWith('create_slide_deck',expect.objectContaining({ p_workspace_id: workspaceId, p_document: expect.objectContaining({ workspaceId, slides: [expect.objectContaining({ category })] }) }));
});
it('validates before writes and sends the expected revision with unchanged text',async () => {
  const { client, rpc } = rpcClient(), service = createDeckService(client), doc = deckFixture();
  (doc.slides[0].elements[0] as TextElement).text='主よ\r\n<script>literal</script>';
  expect((await service.saveDeck(doc,1)).ok).toBe(true);
  expect(rpc).toHaveBeenCalledWith('save_slide_deck',{ p_document: doc, p_expected_revision: 1 });
  rpc.mockClear();
  expect((await service.saveDeck({ ...doc, schemaVersion: 2 } as never,1)).ok).toBe(false);
  expect((await service.saveDeck(doc,0)).ok).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
it.each([['40001','CONFLICT'],['53000','CAPACITY'],['53100','CAPACITY'],['P0001','CAPACITY'],['42501','FORBIDDEN'],['0A000','UNSUPPORTED']])('maps %s without exposing SQL text',async (code,expected) => {
  const { client } = rpcClient({ code, message: 'private database detail' });
  const result = await createDeckService(client).saveDeck(deckFixture(),1);
  expect(result).toMatchObject({ ok: false, error: { code: expected } });
  if (!result.ok) expect(result.error.message).not.toContain('private database');
});
it('rejects a successful-looking response with another document identity',async () => {
  const doc = deckFixture(), rpc = vi.fn(async () => ({ data: { document: { ...doc, id: crypto.randomUUID() }, revision: 2 }, error: null }));
  const result = await createDeckService({ rpc } as unknown as SupabaseClient).saveDeck(doc,1);
  expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
});
it('does not call an unchanged revision a successful save',async () => {
  const doc = deckFixture(), rpc = vi.fn(async () => ({ data: { document: doc,revision: 1 },error: null }));
  expect(await createDeckService({ rpc } as unknown as SupabaseClient).saveDeck(doc,1)).toMatchObject({ ok: false,error: { code: 'VALIDATION' } });
});
it('saves a conflict copy from the draft rather than silently copying the stored revision',async () => {
  const doc = deckFixture(); doc.title='My retained draft';
  const destination = '77777777-7777-4777-8777-777777777777';
  const rpc = vi.fn(async (_name: string,args: Record<string,unknown>) => ({ data: { document: { ...(args.p_draft as object), id: crypto.randomUUID(), workspaceId: destination }, revision: 1 }, error: null }));
  expect((await createDeckService({ rpc } as unknown as SupabaseClient).saveCopy(doc,destination)).ok).toBe(true);
  expect(rpc).toHaveBeenCalledWith('duplicate_slide_deck',{ p_deck_id: deckId, p_destination_workspace_id: destination, p_draft: doc });
});
