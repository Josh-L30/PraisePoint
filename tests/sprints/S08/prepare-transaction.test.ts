import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { fixture, profile } from './fixture';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import { createPreparationService } from '../../../src/features/offline/prepare-service';
import { getPreparedRecord, promotePrepared } from '../../../src/features/offline/prepared-store';
import { contentStampKey } from '../../../src/features/offline/content-changes';
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
async function setup() {
  const value = await fixture(),
    release = vi.fn(),
    dependencies = {
      snapshot: vi.fn(async () => ({ ok: true as const, value: value.manifest.snapshot })),
      media: vi.fn(async () => ({ ok: true as const, value: value.blob })),
      decode: vi.fn(async () => ({
        ok: true as const,
        value: { kind: 'image' as const, mime: 'image/png' },
      })),
      font: vi.fn(async () => ({ ok: true as const, value: undefined })),
      shell: vi.fn(async () => ({ ok: true as const, value: { appBuild: 'test-build' } })),
      acquire: vi.fn(async () => ({ ok: true as const, value: release })),
    };
  return { value, release, dependencies };
}
it('promotes only after every check and a second source revision agrees', async () => {
  const { value, release, dependencies } = await setup(),
    result = await createPreparationService(profile, dependencies).prepareService(
      value.manifest.snapshot.serviceId,
    );
  expect(result.ok).toBe(true);
  expect(dependencies.snapshot).toHaveBeenCalledTimes(2);
  expect(release).toHaveBeenCalledOnce();
  if (result.ok) expect((await getPreparedRecord(profile, result.value.packageId)).ok).toBe(true);
});
it('partial file failure retains the previous complete package', async () => {
  const { value, release, dependencies } = await setup();
  await promotePrepared(value.manifest, value.files, '');
  dependencies.media = vi.fn(async () => ({
    ok: false as const,
    error: { code: 'NETWORK' as const, message: 'File unavailable.' },
  })) as never;
  expect(
    (
      await createPreparationService(profile, dependencies).prepareService(
        value.manifest.snapshot.serviceId,
      )
    ).ok,
  ).toBe(false);
  expect((await getPreparedRecord(profile, value.manifest.packageId)).ok).toBe(true);
  expect(release).toHaveBeenCalledOnce();
});
it('a bad hash or decoder failure never promotes an incomplete refresh', async () => {
  const { value, dependencies } = await setup();
  await promotePrepared(value.manifest, value.files, '');
  dependencies.media = vi.fn(async () => ({
    ok: true as const,
    value: new Blob([new Uint8Array([9, 9, 9])], { type: 'image/png' }),
  }));
  expect(
    (
      await createPreparationService(profile, dependencies).prepareService(
        value.manifest.snapshot.serviceId,
      )
    ).ok,
  ).toBe(false);
  dependencies.media = vi.fn(async () => ({ ok: true as const, value: value.blob }));
  dependencies.decode = vi.fn(async () => ({
    ok: false as const,
    error: { code: 'VALIDATION' as const, message: 'Bad pixels.' },
  })) as never;
  expect(
    (
      await createPreparationService(profile, dependencies).prepareService(
        value.manifest.snapshot.serviceId,
      )
    ).ok,
  ).toBe(false);
  expect((await getPreparedRecord(profile, value.manifest.packageId)).ok).toBe(true);
});
it('a source change during preparation retains the prior snapshot', async () => {
  const { value, dependencies } = await setup();
  await promotePrepared(value.manifest, value.files, '');
  dependencies.snapshot
    .mockResolvedValueOnce({ ok: true, value: value.manifest.snapshot })
    .mockResolvedValueOnce({
      ok: true,
      value: { ...value.manifest.snapshot, sourceRevision: 'b'.repeat(64) },
    });
  expect(
    (
      await createPreparationService(profile, dependencies).prepareService(
        value.manifest.snapshot.serviceId,
      )
    ).ok,
  ).toBe(false);
  expect((await getPreparedRecord(profile, value.manifest.packageId)).ok).toBe(true);
});
it('a local edit during file preparation prevents promotion', async () => {
  const { value, dependencies } = await setup();
  await promotePrepared(value.manifest, value.files, '');
  dependencies.media = vi.fn(async () => {
    localStorage.setItem(contentStampKey(profile), 'edited');
    return { ok: true as const, value: value.blob };
  });
  expect(
    (
      await createPreparationService(profile, dependencies).prepareService(
        value.manifest.snapshot.serviceId,
      )
    ).ok,
  ).toBe(false);
  expect((await getPreparedRecord(profile, value.manifest.packageId)).ok).toBe(true);
});
