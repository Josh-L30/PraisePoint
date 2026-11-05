import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
beforeEach(() => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => vi.unstubAllGlobals());
import { fixture } from '../S08/fixture';
import {
  inspectTransfer,
  parseTransferFile,
  TRANSFER_LIMIT,
} from '../../../src/features/transfer/transfer-schema';
import { encodeTransfer } from '../../../src/features/transfer/export-service';
const bundle = async () => ({
  format: 'church-service',
  version: 1,
  snapshot: (await fixture()).manifest.snapshot,
});
it('accepts bounded literal content and filenames without evaluating or fetching them', async () => {
  const value = await bundle();
  value.snapshot.title = '<script>alert(1)</script>';
  value.snapshot.media[0].originalName = '../../<img onerror=alert(1)>.png';
  expect(inspectTransfer(value).ok).toBe(true);
});
it('rejects malformed, future-version, credential and signed URL fields', async () => {
  for (const change of [
    null,
    {},
    { ...(await bundle()), version: 2 },
    { ...(await bundle()), access_token: 'secret' },
  ])
    expect(inspectTransfer(change).ok).toBe(false);
  const value = await bundle();
  expect(
    inspectTransfer({
      ...value,
      snapshot: {
        ...value.snapshot,
        media: [
          { ...value.snapshot.media[0], signedUrl: 'https://example.invalid/private?token=secret' },
        ],
      },
    }).ok,
  ).toBe(false);
});
it('rejects duplicate slide/element/media identities and missing references', async () => {
  const value = await bundle();
  expect(
    inspectTransfer({
      ...value,
      snapshot: { ...value.snapshot, slides: [...value.snapshot.slides, ...value.snapshot.slides] },
    }).ok,
  ).toBe(false);
  expect(
    inspectTransfer({
      ...value,
      snapshot: { ...value.snapshot, media: [...value.snapshot.media, ...value.snapshot.media] },
    }).ok,
  ).toBe(false);
  expect(inspectTransfer({ ...value, snapshot: { ...value.snapshot, media: [] } }).ok).toBe(false);
});
it('rejects inconsistent descriptors sharing a SHA256 identity', async () => {
  const value = await bundle(),
    other = { ...value.snapshot.media[0], id: crypto.randomUUID(), bytes: 4 };
  const slide = structuredClone(value.snapshot.slides[0]);
  slide.id = crypto.randomUUID();
  slide.elements = slide.elements.map((item) => ({ ...item, id: crypto.randomUUID() }));
  slide.background = { kind: 'image', mediaId: other.id };
  value.snapshot.slides.push(slide);
  value.snapshot.media.push(other);
  value.snapshot.sections[0].slideCount = 2;
  expect(inspectTransfer(value).ok).toBe(false);
});
it('checks bounds before reading a file and refuses invalid JSON', async () => {
  let read = false;
  expect(
    (
      await parseTransferFile({
        size: TRANSFER_LIMIT + 1,
        text: async () => {
          read = true;
          return '{}';
        },
      })
    ).ok,
  ).toBe(false);
  expect(read).toBe(false);
  expect((await parseTransferFile({ size: 1, text: async () => '{' })).ok).toBe(false);
});
it('exports only the validated metadata envelope and round trips literal text', async () => {
  const value = await bundle(),
    result = encodeTransfer(value.snapshot);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const parsed = JSON.parse(await result.value.text());
  expect(Object.keys(parsed).sort()).toEqual(['format', 'snapshot', 'version']);
  expect(inspectTransfer(parsed).ok).toBe(true);
  expect(JSON.stringify(parsed)).not.toMatch(/access_token|refresh_token|signedUrl/);
});
it('rejects a section larger than an editable deck and oversize input', async () => {
  const value = await bundle();
  value.snapshot.sections[0].slideCount = 201;
  expect(inspectTransfer(value).ok).toBe(false);
  expect(inspectTransfer({ ...(await bundle()), extra: 'x'.repeat(TRANSFER_LIMIT) }).ok).toBe(
    false,
  );
});
