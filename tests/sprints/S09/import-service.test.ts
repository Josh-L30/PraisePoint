import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fixture, profile } from '../S08/fixture';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import { createImportService } from '../../../src/features/transfer/import-service';
beforeEach(async () => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('crypto', webcrypto);
  await setDeviceSession(profile);
});
afterEach(async () => {
  await purgeProfileData(profile);
  vi.unstubAllGlobals();
});
function setup() {
  const rpc = vi.fn(),
    getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: profile }, access_token: 'captured' } },
      error: null,
    });
  const client = { rpc, auth: { getSession } } as unknown as SupabaseClient;
  return { rpc, client, bind: vi.fn(() => client) };
}
it('refuses malformed bundles before taking a token or writing', async () => {
  const m = setup();
  expect(
    (
      await createImportService(profile, m.client, m.bind).importServiceMetadata(
        {} as never,
        crypto.randomUUID(),
      )
    ).ok,
  ).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.bind).not.toHaveBeenCalled();
});
it('uses the chosen destination and captured token, validating the complete fresh-ID response', async () => {
  const m = setup(),
    source = (await fixture()).manifest.snapshot,
    destination = crypto.randomUUID(),
    sid = crypto.randomUUID(),
    mid = crypto.randomUUID();
  m.rpc.mockResolvedValue({ data: { serviceId: sid, missingMediaIds: [mid] }, error: null });
  const result = await createImportService(profile, m.client, m.bind).importServiceMetadata(
    { format: 'church-service', version: 1, snapshot: source },
    destination,
  );
  expect(result).toEqual({ ok: true, value: { serviceId: sid, missingMediaIds: [mid] } });
  expect(m.bind).toHaveBeenCalledWith('captured');
  expect(m.rpc).toHaveBeenCalledWith('import_service_metadata', {
    p_bundle: expect.objectContaining({ format: 'church-service' }),
    p_destination_workspace_id: destination,
  });
});
it('rejects incomplete, duplicate or reused-source IDs in an import response', async () => {
  for (const reply of [
    { serviceId: crypto.randomUUID(), missingMediaIds: [] },
    { serviceId: 'bad', missingMediaIds: [crypto.randomUUID()] },
  ]) {
    const m = setup(),
      source = (await fixture()).manifest.snapshot;
    m.rpc.mockResolvedValue({ data: reply, error: null });
    expect(
      (
        await createImportService(profile, m.client, m.bind).importServiceMetadata(
          { format: 'church-service', version: 1, snapshot: source },
          crypto.randomUUID(),
        )
      ).ok,
    ).toBe(false);
  }
  const m = setup(),
    source = (await fixture()).manifest.snapshot;
  m.rpc.mockResolvedValue({
    data: { serviceId: source.serviceId, missingMediaIds: [source.media[0].id] },
    error: null,
  });
  expect(
    (
      await createImportService(profile, m.client, m.bind).importServiceMetadata(
        { format: 'church-service', version: 1, snapshot: source },
        crypto.randomUUID(),
      )
    ).ok,
  ).toBe(false);
});
it('refuses a switched profile both before and after an in-flight import', async () => {
  const m = setup(),
    source = (await fixture()).manifest.snapshot;
  m.rpc.mockImplementation(async () => {
    await purgeProfileData(profile);
    return {
      data: { serviceId: crypto.randomUUID(), missingMediaIds: [crypto.randomUUID()] },
      error: null,
    };
  });
  expect(
    (
      await createImportService(profile, m.client, m.bind).importServiceMetadata(
        { format: 'church-service', version: 1, snapshot: source },
        crypto.randomUUID(),
      )
    ).ok,
  ).toBe(false);
  m.rpc.mockClear();
  expect(
    (
      await createImportService(profile, m.client, m.bind).importServiceMetadata(
        { format: 'church-service', version: 1, snapshot: source },
        crypto.randomUUID(),
      )
    ).ok,
  ).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
});
