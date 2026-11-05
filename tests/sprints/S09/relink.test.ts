import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMediaService } from '../../../src/features/media/media-service';
import { decodeMedia } from '../../../src/features/media/decode-media';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import { hashMedia, readLocalMedia } from '../../../src/features/media/local-media-store';
import { profile } from '../S08/fixture';
vi.mock('../../../src/features/media/decode-media', () => ({ decodeMedia: vi.fn() }));
beforeEach(async () => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('File', NodeFile);
  vi.stubGlobal('crypto', webcrypto);
  await setDeviceSession(profile);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await purgeProfileData(profile);
  vi.unstubAllGlobals();
});
async function setup() {
  const file = new File([new Uint8Array([1, 2, 3])], 'Same name.png', { type: 'image/png' }),
    asset = {
      id: crypto.randomUUID(),
      workspaceId: crypto.randomUUID(),
      kind: 'image' as const,
      location: 'local' as const,
      mime: 'image/png',
      bytes: 3,
      sha256: await hashMedia(file),
      revision: 1,
      originalName: file.name,
    };
  const decoded = { ...asset, width: 32, height: 18, duration: null };
  vi.mocked(decodeMedia).mockResolvedValue({ ok: true, value: decoded });
  const rpc = vi.fn().mockResolvedValue({ data: asset, error: null }),
    single = vi.fn().mockResolvedValue({
      data: {
        id: asset.id,
        workspace_id: asset.workspaceId,
        kind: asset.kind,
        location: asset.location,
        mime: asset.mime,
        bytes: asset.bytes,
        sha256: asset.sha256,
        revision: 1,
        original_name: asset.originalName,
      },
      error: null,
    });
  const query = { select: () => query, eq: () => query, single };
  const client = {
    from: () => query,
    rpc,
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: profile }, access_token: 'captured' } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
  return { asset, file, rpc, decoded, service: createMediaService(profile, client, () => client) };
}
it('confirms actual decoded geometry and caches only the exact original', async () => {
  const s = await setup();
  expect((await s.service.relinkMedia(s.asset.id, s.file)).ok).toBe(true);
  expect(s.rpc).toHaveBeenCalledWith('confirm_local_media_geometry', {
    p_media_id: s.asset.id,
    p_width: 32,
    p_height: 18,
    p_duration: null,
  });
  expect((await readLocalMedia(profile, s.asset.id)).ok).toBe(true);
});
it('same filename/size with a different hash never relinks or writes', async () => {
  const s = await setup();
  vi.mocked(decodeMedia).mockResolvedValue({
    ok: true,
    value: { ...s.decoded, sha256: 'f'.repeat(64) },
  });
  expect((await s.service.relinkMedia(s.asset.id, s.file)).ok).toBe(false);
  expect(s.rpc).not.toHaveBeenCalled();
  expect((await readLocalMedia(profile, s.asset.id)).ok).toBe(false);
});
it('unconfirmed server geometry cannot report a completed relink', async () => {
  const s = await setup();
  s.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
  expect((await s.service.relinkMedia(s.asset.id, s.file)).ok).toBe(false);
  expect((await readLocalMedia(profile, s.asset.id)).ok).toBe(false);
});
