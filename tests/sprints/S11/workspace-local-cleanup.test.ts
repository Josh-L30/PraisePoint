import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { openBrowserDB } from '../../../src/lib/browser-db';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import { promotePrepared, getPreparedRecord } from '../../../src/features/offline/prepared-store';
import { writeLocalMedia, readLocalMedia } from '../../../src/features/media/local-media-store';
import { fixture, profile } from '../S08/fixture';
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('Blob', NodeBlob);
  await setDeviceSession(profile);
});
afterEach(async () => {
  await purgeProfileData(profile);
  vi.unstubAllGlobals();
});
it('removes only this workspace local files/packages while preserving another workspace and shared prepared bytes', async () => {
  const componentPath = new URL(
      '../../../src/features/workspaces/workspace-local-cleanup.ts',
      import.meta.url,
    ).pathname,
    module = await import(/* @vite-ignore */ componentPath).catch(() => null);
  expect(module?.purgeWorkspaceLocalData).toBeTypeOf('function');
  if (!module) return;
  const first = await fixture(),
    second = await fixture();
  expect((await promotePrepared(first.manifest, first.files, '')).ok).toBe(true);
  expect((await promotePrepared(second.manifest, second.files, '')).ok).toBe(true);
  await writeLocalMedia(profile, first.manifest.snapshot.media[0], first.blob);
  await writeLocalMedia(profile, second.manifest.snapshot.media[0], second.blob);
  expect((await module.purgeWorkspaceLocalData(profile, first.manifest.workspaceId)).ok).toBe(true);
  expect((await getPreparedRecord(profile, first.manifest.packageId)).ok).toBe(false);
  expect((await getPreparedRecord(profile, second.manifest.packageId)).ok).toBe(true);
  expect((await readLocalMedia(profile, first.manifest.snapshot.media[0].id)).ok).toBe(false);
  expect((await readLocalMedia(profile, second.manifest.snapshot.media[0].id)).ok).toBe(true);
  const db = await openBrowserDB();
  try {
    expect(await db.getAll('preparedAssets')).toMatchObject([{ refCount: 1 }]);
  } finally {
    db.close();
  }
});
