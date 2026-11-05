// @vitest-environment node
import { beforeAll, expect, it } from 'vitest';
import { Image } from 'imagescript';
import { validateImageBytes } from '../../../supabase/functions/_shared/decode-image';
import { inspectImageHeader } from '../../../supabase/functions/_shared/image-policy';
let samples: { mime: string; bytes: Uint8Array }[];
beforeAll(async () => {
  const image = new Image(32, 18);
  image.fill(0x006c78ff);
  samples = [
    { mime: 'image/png', bytes: await image.encodePNG() },
    { mime: 'image/jpeg', bytes: await image.encodeJPEG(85) },
    { mime: 'image/webp', bytes: await image.encodeWebP({ quality: 80, effort: 2 }) },
  ];
});
it('fully decodes JPEG, PNG and WebP without changing their original bytes', async () => {
  for (const sample of samples) {
    const before = sample.bytes.slice();
    expect(await validateImageBytes(sample.bytes, sample.mime)).toEqual({
      ok: true,
      value: { mime: sample.mime, width: 32, height: 18 },
    });
    expect(sample.bytes).toEqual(before);
  }
});
it('refuses corrupt pixel data even when its size/header checks pass', async () => {
  const corrupt = samples[0].bytes.slice(),
    view = new DataView(corrupt.buffer);
  let offset = 8;
  while (String.fromCharCode(...corrupt.subarray(offset + 4, offset + 8)) !== 'IDAT')
    offset += view.getUint32(offset) + 12;
  corrupt.fill(0, offset + 8, offset + 13);
  expect(inspectImageHeader(corrupt, 'image/png').ok).toBe(true);
  expect((await validateImageBytes(corrupt, 'image/png')).ok).toBe(false);
});
it('refuses truncated bytes and a mismatched advertised MIME', async () => {
  for (const sample of samples) {
    expect((await validateImageBytes(sample.bytes.slice(0, -3), sample.mime)).ok).toBe(false);
    expect((await validateImageBytes(sample.bytes, 'application/octet-stream')).ok).toBe(false);
  }
});
