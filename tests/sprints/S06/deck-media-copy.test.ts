// @vitest-environment node
import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDeckService } from '../../../src/features/decks/deck-service';
import { createTemplate } from '../../../src/features/decks/templates';
const sourceWs = 'a6000000-0000-4000-8000-000000000001',
  destination = 'a6000000-0000-4000-8000-000000000002',
  mediaId = 'a6000000-0000-4000-8000-000000000010',
  newMediaId = 'a6000000-0000-4000-8000-000000000011';
function fixture() {
  const slide = createTemplate('lyrics');
  slide.background = { kind: 'image', mediaId };
  const document = {
    schemaVersion: 1 as const,
    id: sourceWs,
    workspaceId: sourceWs,
    title: 'Sunday',
    width: 1920 as const,
    height: 1080 as const,
    slides: [slide],
  };
  const single = vi.fn().mockResolvedValue({ data: { document, revision: 2 }, error: null }),
    builder = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single },
    rpc = vi.fn();
  return {
    document,
    rpc,
    client: { from: vi.fn(() => builder), rpc } as unknown as SupabaseClient,
  };
}
it('copies each referenced asset before asking the server to remap a cross-workspace presentation', async () => {
  const f = fixture(),
    copyMedia = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { id: newMediaId, workspaceId: destination } });
  f.rpc.mockResolvedValue({
    data: {
      document: {
        ...f.document,
        id: destination,
        workspaceId: destination,
        slides: [{ ...f.document.slides[0], background: { kind: 'image', mediaId: newMediaId } }],
      },
      revision: 1,
    },
    error: null,
  });
  const result = await createDeckService(f.client, { copyMedia } as never).duplicateDeck(
    sourceWs,
    destination,
  );
  expect(result.ok).toBe(true);
  expect(copyMedia).toHaveBeenCalledWith(mediaId, destination);
  expect(f.rpc).toHaveBeenCalledWith(
    'duplicate_slide_deck_with_media',
    expect.objectContaining({
      p_expected_revision: 2,
      p_media_map: [{ sourceId: mediaId, destinationId: newMediaId }],
    }),
  );
});
it('does not publish a presentation if one required file cannot be copied', async () => {
  const f = fixture(),
    copyMedia = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Original required.' },
    });
  const result = await createDeckService(f.client, { copyMedia } as never).duplicateDeck(
    sourceWs,
    destination,
  );
  expect(result.ok).toBe(false);
  expect(f.rpc).not.toHaveBeenCalled();
});
