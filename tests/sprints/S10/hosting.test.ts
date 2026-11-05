// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('the static-host policy permits actual app capabilities without executable third-party content', () => {
  const policy = (
    JSON.parse(readFileSync('firebase.json', 'utf8')).hosting.headers as {
      headers: { key: string; value: string }[];
    }[]
  )
    .flatMap((rule) => rule.headers.map((header) => header.key + ': ' + header.value))
    .join('\n');
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("worker-src 'self'");
  expect(policy).toContain("media-src 'self' blob:");
  expect(policy).toContain('https://tnrmotwiarlpknamxoyp.supabase.co');
  expect(policy).toContain('X-Content-Type-Options: nosniff');
  expect(policy).toContain('Cache-Control: no-cache');
});
