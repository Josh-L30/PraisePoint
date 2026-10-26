import { describe, expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Public Supabase configuration is required.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
describe('S02 live anonymous authorization',() => {
  it('uses a working public key with Google enabled', async () => {
    const response = await fetch(url + '/auth/v1/settings',{ headers });
    expect(response.status).toBe(200);
    expect((await response.json()).external.google).toBe(true);
  });
  it('denies anonymous invitation and membership reads', async () => {
    for (const [table,column] of [['invitations','id'],['workspace_members','workspace_id']]) {
      const response = await fetch(url + '/rest/v1/' + table + '?select=' + column,{ headers });
      expect([401,403],table + ': ' + await response.text()).toContain(response.status);
    }
  });
  it('denies anonymous team RPC calls even with syntactically valid forged IDs', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const requests = [
      ['create_church_workspace',{ p_name: 'Unauthorized' }],
      ['get_workspace_team',{ p_workspace_id: id }],
      ['create_team_invitation',{ p_workspace_id: id, p_email: 'nobody@example.invalid' }],
      ['accept_team_invitation',{ p_token: 'ab'.repeat(32) }],
      ['remove_workspace_member',{ p_workspace_id: id, p_user_id: id }],
      ['transfer_workspace_owner',{ p_workspace_id: id, p_new_owner_id: id }],
      ['leave_church_workspace',{ p_workspace_id: id }],
    ] as const;
    for (const [name,body] of requests) {
      const response = await fetch(url + '/rest/v1/rpc/' + name,{ method: 'POST', headers, body: JSON.stringify(body) });
      expect([401,403],name).toContain(response.status);
    }
  });
});
