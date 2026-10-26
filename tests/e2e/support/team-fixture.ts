import type { Page } from '@playwright/test';
try { process.loadEnvFile('.env.local'); } catch { /* CI supplies public configuration. */ }
export const ownerId = '22222222-2222-4222-8222-222222222222';
export const memberId = '33333333-3333-4333-8333-333333333333';
export const personalId = '44444444-4444-4444-8444-444444444444';
export const churchId = '11111111-1111-4111-8111-111111111111';
export const token = 'ab'.repeat(32);
export async function teamFixture(page: Page, options: { member?: boolean; personalOnly?: boolean; longName?: boolean } = {}) {
  const projectUrl = process.env.VITE_SUPABASE_URL;
  if (!projectUrl) throw new Error('Public Supabase configuration is required.');
  const profileId = options.member ? memberId : ownerId;
  const state = { joined: !options.personalOnly, owner: ownerId, revoked: false, invited: false, writes: [] as string[], inviteRequests: [] as unknown[] };
  const expiresAt = Math.floor(Date.now()/1000)+3600;
  const user = { id: profileId, aud: 'authenticated', role: 'authenticated', email: 'volunteer@example.invalid', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwt = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: profileId, aud: 'authenticated', exp: expiresAt }) + '.test-signature';
  await page.addInitScript(({ key, session }) => localStorage.setItem(key,JSON.stringify(session)), {
    key: 'sb-' + new URL(projectUrl).hostname.split('.')[0] + '-auth-token',
    session: { access_token: jwt, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: expiresAt, expires_in: 3600, user },
  });
  await page.route('**/auth/v1/user',route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/rpc/ensure_personal_workspace',route => route.fulfill({ json: {
    profileId, workspaceId: personalId, displayName: options.member ? 'Daniel' : 'Maria', avatarUrl: null,
  } }));
  await page.route('**/rest/v1/workspace_members*',route => route.fulfill({ json: [
    { role: 'owner', workspaces: { id: personalId, kind: 'personal', name: 'Personal workspace', owner_id: profileId } },
    ...(state.joined ? [{ role: state.owner===profileId ? 'owner' : 'member', workspaces: {
      id: churchId, kind: 'church', name: options.longName ? 'Our church preparing worship together with volunteers from every generation' : 'CCF team (test)', owner_id: state.owner,
    } }] : []),
  ] }));
  await page.route('**/rest/v1/invitations*',route => route.fulfill({ json: state.invited && !state.revoked ? [{
    id: '55555555-5555-4555-8555-555555555555', normalized_email: 'new@example.invalid',
    expires_at: new Date(Date.now()+7*86400000).toISOString(), accepted_at: null, revoked_at: null,
  }] : [] }));
  await page.route('**/rest/v1/rpc/get_workspace_team',route => route.fulfill({ json: [
    { userId: ownerId, displayName: options.longName ? 'Maria長い名前' .repeat(8) : 'Maria', avatarUrl: null, role: state.owner===ownerId ? 'owner' : 'member' },
    { userId: memberId, displayName: 'Daniel', avatarUrl: null, role: state.owner===memberId ? 'owner' : 'member' },
  ] }));
  for (const name of ['create_church_workspace','create_team_invitation','revoke_team_invitation','transfer_workspace_owner','leave_church_workspace','accept_team_invitation']) {
    await page.route('**/rest/v1/rpc/' + name, async route => {
      state.writes.push(name);
      const body: unknown = route.request().postDataJSON();
      if (name==='create_church_workspace' || name==='accept_team_invitation') {
        state.joined=true;
        if (name==='accept_team_invitation') state.inviteRequests.push(body);
        await route.fulfill({ json: churchId });
      } else if (name==='create_team_invitation') {
        state.invited=true;
        await route.fulfill({ json: { id: '55555555-5555-4555-8555-555555555555', token, expiresAt: new Date(Date.now()+7*86400000).toISOString() } });
      } else {
        if (name==='revoke_team_invitation') state.revoked=true;
        if (name==='transfer_workspace_owner') state.owner=memberId;
        if (name==='leave_church_workspace') state.joined=false;
        await route.fulfill({ status: 204 });
      }
    });
  }
  return state;
}
