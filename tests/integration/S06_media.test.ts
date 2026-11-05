import { describe, expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Public Supabase configuration is required.');
const headers = { apikey: key, 'Content-Type': 'application/json' },
  id = 'a6000000-0000-4000-8000-000000000099';
describe('S06 live anonymous authorization', () => {
  it('denies anonymous media catalog reads and raw writes', async () => {
    for (const table of ['media_assets', 'deck_media'])
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
        const column = table === 'deck_media' ? 'media_id' : 'id';
        const response = await fetch(url + '/rest/v1/' + table + '?' + column + '=eq.' + id, {
          method,
          headers,
          ...(['POST', 'PATCH'].includes(method) ? { body: JSON.stringify({ [column]: id }) } : {}),
        });
        expect([401, 403], table + ' ' + method).toContain(response.status);
      }
  });
  it('denies reservation, management and server-only writer RPCs', async () => {
    const requests = [
      ['reserve_image_upload', { p_asset: {}, p_source_media_id: null }],
      [
        'register_local_media',
        { p_asset: {}, p_width: 32, p_height: 18, p_duration: null, p_source_media_id: null },
      ],
      ['get_media_usage', { p_workspace_id: id }],
      ['get_media_management', { p_workspace_id: id }],
      ['media_begin_write', { p_reservation_id: id }],
      ['media_abort_upload', { p_reservation_id: id, p_writer_claimed: true }],
      ['media_release_upload', { p_reservation_id: id }],
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
  it('the deployed upload proxy returns sign-in recovery without a bearer token', async () => {
    const response = await fetch(url + '/functions/v1/media-upload', {
      method: 'POST',
      headers,
      body: '{}',
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  });
});
