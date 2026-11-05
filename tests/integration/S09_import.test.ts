import { expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Public Supabase configuration required.');
const headers = { apikey: key, 'Content-Type': 'application/json' },
  id = 'a9000000-0000-4000-8000-000000000099';
it('denies anonymous metadata import before any destination write', async () => {
  const response = await fetch(url + '/rest/v1/rpc/import_service_metadata', {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_bundle: {}, p_destination_workspace_id: id }),
  });
  expect([401, 403]).toContain(response.status);
});
it('denies anonymous local-geometry confirmation', async () => {
  const response = await fetch(url + '/rest/v1/rpc/confirm_local_media_geometry', {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_media_id: id, p_width: 32, p_height: 18, p_duration: null }),
  });
  expect([401, 403]).toContain(response.status);
});
