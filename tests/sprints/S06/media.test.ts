/// <reference types="node" />
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { setDeviceSession, purgeProfileData } from '../../../src/lib/device-session';
import {
  writeLocalMedia,
  readLocalMedia,
  resolveLocalMedia,
} from '../../../src/features/media/local-media-store';
import type { MediaDescriptor } from '../../../src/domain/media';
const profile = 'a6000000-0000-4000-8000-000000000001',
  other = 'a6000000-0000-4000-8000-000000000002';
const bytes = new Uint8Array([1, 2, 3, 4]);
const asset: MediaDescriptor = {
  id: 'a6000000-0000-4000-8000-000000000010',
  workspaceId: 'a6000000-0000-4000-8000-000000000020',
  kind: 'video',
  mime: 'video/mp4',
  bytes: 4,
  sha256: '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
  revision: 1,
  location: 'local',
  originalName: 'local.mp4',
};
const blob = () => new NodeBlob([bytes], { type: 'video/mp4' }) as Blob;
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:local-proof'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  await setDeviceSession(profile);
});
afterEach(async () => {
  await purgeProfileData(profile);
  await purgeProfileData(other);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('persists actual bytes and recreates a revocable URL after reopening the database', async () => {
  expect((await writeLocalMedia(profile, asset, blob())).ok).toBe(true);
  const read = await readLocalMedia(profile, asset.id);
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error('Stored media missing');
  expect(new Uint8Array(await read.value.blob.arrayBuffer())).toEqual(bytes);
  const resolved = await resolveLocalMedia(profile, asset.id);
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) throw new Error('URL missing');
  resolved.value.release();
  resolved.value.release();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
});
it('refuses a foreign profile and removes old bytes/URLs on account change', async () => {
  await writeLocalMedia(profile, asset, blob());
  const url = await resolveLocalMedia(profile, asset.id);
  expect(url.ok).toBe(true);
  expect((await readLocalMedia(other, asset.id)).ok).toBe(false);
  await setDeviceSession(other);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-proof');
  expect((await readLocalMedia(profile, asset.id)).ok).toBe(false);
  expect((await readLocalMedia(other, asset.id)).ok).toBe(false);
  await setDeviceSession(profile);
  expect((await readLocalMedia(profile, asset.id)).ok).toBe(false);
});
it('rejects mismatched hashes and sizes before replacing a valid local file', async () => {
  await writeLocalMedia(profile, asset, blob());
  expect((await writeLocalMedia(profile, { ...asset, bytes: 5 }, blob())).ok).toBe(false);
  expect((await writeLocalMedia(profile, { ...asset, sha256: '0'.repeat(64) }, blob())).ok).toBe(
    false,
  );
  const retained = await readLocalMedia(profile, asset.id);
  expect(retained.ok).toBe(true);
  if (retained.ok) expect(retained.value.descriptor.sha256).toBe(asset.sha256);
});
