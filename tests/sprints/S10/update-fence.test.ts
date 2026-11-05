// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { createUpdateFence } from '../../../src/features/offline/update-fence';
function storage() {
  const entries = new Map<string, Response>(),
    put = vi.fn(async (request: RequestInfo | URL, response: Response) => {
      entries.set(String(request), response);
    });
  const cache = {
    match: async (request: RequestInfo | URL) => entries.get(String(request)),
    open: async () => ({ put }),
    delete: async () => {
      entries.clear();
      return true;
    },
  };
  return { entries, put, cache: cache as unknown as CacheStorage };
}
it('persists an update barrier until activation clears it; any stored barrier blocks actors', async () => {
  const s = storage(),
    fence = createUpdateFence(s.cache, 'https://gather.example.invalid');
  expect(await fence.pending()).toBe(false);
  await fence.begin('a'.repeat(64), 'a1000000-0000-4000-8000-000000000001');
  expect(await fence.pending()).toBe(true);
  for (const key of s.entries.keys()) s.entries.set(key, new Response('corrupt fence'));
  expect(await fence.pending()).toBe(true);
  await fence.clear();
  expect(await fence.pending()).toBe(false);
});
it('a failed fence write rejects acceptance instead of claiming a protected update', async () => {
  const s = storage(),
    fence = createUpdateFence(s.cache, 'https://gather.example.invalid');
  s.put.mockRejectedValue(new DOMException('Quota', 'QuotaExceededError'));
  await expect(
    fence.begin('a'.repeat(64), 'a1000000-0000-4000-8000-000000000001'),
  ).rejects.toThrow();
  expect(await fence.pending()).toBe(false);
});
