import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { fixture, profile } from './fixture';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import { openBrowserDB } from '../../../src/lib/browser-db';
import { promotePrepared, preparedAssetKey } from '../../../src/features/offline/prepared-store';
import { createReadinessService } from '../../../src/features/offline/readiness';
import { contentStampKey } from '../../../src/features/offline/content-changes';
const deps = () => ({
  shell: vi.fn(async () => ({ ok: true as const, value: { appBuild: 'test-build' } })),
  font: vi.fn(async () => ({ ok: true as const, value: undefined })),
  decode: vi.fn(async () => ({
    ok: true as const,
    value: { kind: 'image' as const, mime: 'image/png' },
  })),
});
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('Blob', NodeBlob);
  await setDeviceSession(profile);
});
afterEach(async () => {
  await purgeProfileData(profile);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function saved() {
  const value = await fixture();
  expect((await promotePrepared(value.manifest, value.files, '')).ok).toBe(true);
  return value;
}
it('rechecks complete local bytes, the app and the font without a cloud call', async () => {
  const value = await saved(),
    dependencies = deps(),
    fetch = vi.fn().mockRejectedValue(new Error('Offline'));
  vi.stubGlobal('fetch', fetch);
  const status = await createReadinessService(profile, dependencies).checkReadiness(
    value.manifest.packageId,
  );
  expect(status.state).toBe('ready');
  expect(dependencies.decode).toHaveBeenCalledOnce();
  expect(dependencies.font).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
});
it('missing prepared media is never ready', async () => {
  const value = await saved(),
    db = await openBrowserDB();
  await db.delete('preparedAssets', [profile, preparedAssetKey(value.manifest.snapshot.media[0])]);
  db.close();
  expect(
    (await createReadinessService(profile, deps()).checkReadiness(value.manifest.packageId)).state,
  ).toBe('failed');
});
it('same-size damaged bytes are never ready', async () => {
  const value = await saved(),
    db = await openBrowserDB(),
    key = preparedAssetKey(value.manifest.snapshot.media[0]),
    asset = (await db.get('preparedAssets', [profile, key]))!;
  await db.put('preparedAssets', {
    ...asset,
    blob: new Blob([new Uint8Array([9, 9, 9])], { type: 'image/png' }),
  });
  db.close();
  expect(
    (await createReadinessService(profile, deps()).checkReadiness(value.manifest.packageId)).state,
  ).toBe('failed');
});
it('a missing or corrupt app cache stops readiness before decoding files', async () => {
  const value = await saved(),
    dependencies = deps();
  dependencies.shell = vi.fn(async () => ({
    ok: false as const,
    error: { code: 'STORAGE_UNAVAILABLE' as const, message: 'Missing app asset.' },
  })) as never;
  expect(
    (await createReadinessService(profile, dependencies).checkReadiness(value.manifest.packageId))
      .state,
  ).toBe('failed');
  expect(dependencies.decode).not.toHaveBeenCalled();
});
it('a missing font or failed native decode cannot become ready', async () => {
  const value = await saved(),
    dependencies = deps();
  dependencies.font = vi.fn(async () => ({
    ok: false as const,
    error: { code: 'UNSUPPORTED' as const, message: 'Missing font.' },
  })) as never;
  expect(
    (await createReadinessService(profile, dependencies).checkReadiness(value.manifest.packageId))
      .state,
  ).toBe('failed');
  const other = deps();
  other.decode = vi.fn(async () => ({
    ok: false as const,
    error: { code: 'VALIDATION' as const, message: 'Undecodable pixels.' },
  })) as never;
  expect(
    (await createReadinessService(profile, other).checkReadiness(value.manifest.packageId)).state,
  ).toBe('failed');
});
it('rejects unknown renderer versions and changed manifest contents', async () => {
  const value = await saved(),
    db = await openBrowserDB(),
    record = (await db.get('preparedServices', [profile, value.manifest.packageId]))!;
  await db.put('preparedServices', {
    ...record,
    manifest: { ...record.manifest, rendererVersion: 2 },
  } as never);
  expect(
    (await createReadinessService(profile, deps()).checkReadiness(value.manifest.packageId)).state,
  ).toBe('failed');
  await db.put('preparedServices', {
    ...record,
    manifest: {
      ...record.manifest,
      snapshot: { ...record.manifest.snapshot, title: 'Changed without integrity update' },
    },
  });
  db.close();
  expect(
    (await createReadinessService(profile, deps()).checkReadiness(value.manifest.packageId)).state,
  ).toBe('failed');
});
it('known local edits are stale and require explicit choice to present the saved version', async () => {
  const value = await saved();
  localStorage.setItem(contentStampKey(profile), 'known-edit');
  const service = createReadinessService(profile, deps());
  expect((await service.checkReadiness(value.manifest.packageId)).state).toBe('stale');
  expect((await service.openPrepared(value.manifest.packageId)).ok).toBe(false);
  expect((await service.openPrepared(value.manifest.packageId, true)).ok).toBe(true);
});
it('another profile cannot open a previous profile package', async () => {
  const value = await saved();
  await setDeviceSession(crypto.randomUUID());
  expect(
    (await createReadinessService(profile, deps()).openPrepared(value.manifest.packageId)).ok,
  ).toBe(false);
});
