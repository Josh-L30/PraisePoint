import { describe, expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Public Supabase configuration is required.');
const headers = { apikey: key, 'Content-Type': 'application/json' },
  id = 'a5000000-0000-4000-8000-000000000010';
describe('S05 live anonymous authorization', () => {
  it('denies all song and service table reads and raw writes', async () => {
    for (const table of ['songs', 'service_plans', 'service_items'])
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
        const response = await fetch(url + '/rest/v1/' + table + '?id=eq.' + id, {
          method,
          headers,
          ...(['POST', 'PATCH'].includes(method) ? { body: JSON.stringify({ id }) } : {}),
        });
        expect([401, 403], table + ' ' + method).toContain(response.status);
      }
  });
  it('denies every song/service RPC without a verified session', async () => {
    const requests = [
      ['save_song', { p_song: {}, p_expected_revision: 0 }],
      ['save_service_plan', { p_plan: {}, p_expected_revision: 0 }],
      ['get_service_plan', { p_id: id }],
      ['add_song_to_service', { p_song_id: id, p_service_id: id }],
      ['delete_song', { p_id: id }],
      ['delete_service_plan', { p_id: id }],
      ['build_service_snapshot', { p_id: id }],
    ] as const;
    for (const [name, body] of requests) {
      const response = await fetch(url + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      expect([401, 403], name).toContain(response.status);
    }
  });
});
