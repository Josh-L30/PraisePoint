import { describe, it, expect } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configure the public Supabase URL and publishable key before running integration tests.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
describe('S01 live anonymous authorization', () => {
  it('denies anonymous profile access instead of returning private records', async () => {
    const response = await fetch(url + '/rest/v1/profiles?select=id', { headers });
    expect([401,403]).toContain(response.status);
  });
  it('denies anonymous initialization instead of creating a workspace', async () => {
    const response = await fetch(url + '/rest/v1/rpc/ensure_personal_workspace', { method: 'POST', headers, body: '{}' });
    expect([401,403]).toContain(response.status);
  });
});
