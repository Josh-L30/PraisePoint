import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({page}) => { await page.addInitScript(() => sessionStorage.setItem('praisepoint-entrance-seen', '1')); });

// This fixture verifies UI/session recovery only. Real OAuth and RLS have separate live evidence.
try { process.loadEnvFile('.env.local'); } catch { /* CI can supply the public config directly. */ }
async function sessionFixture(page: Page, expired = false) {
  const projectUrl = process.env.VITE_SUPABASE_URL;
  if (!projectUrl) throw new Error('Public Supabase URL is required for the auth UI fixture.');
  const profileId = '11111111-1111-4111-8111-111111111111';
  const workspaceId = '22222222-2222-4222-8222-222222222222';
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: profileId, aud: 'authenticated', role: 'authenticated',
    email: 'volunteer@example.invalid', app_metadata: { provider: 'google' }, user_metadata: {},
    created_at: '2026-01-01T00:00:00Z' };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: profileId, aud: 'authenticated', exp: expiresAt }) + '.test-signature';
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: 'sb-' + new URL(projectUrl).hostname.split('.')[0] + '-auth-token',
    session: { access_token: token, refresh_token: 'test-only-refresh', token_type: 'bearer', expires_at: expiresAt, expires_in: 3600, user },
  });
  await page.route('**/auth/v1/user', route => route.fulfill(expired
    ? { status: 401, json: { code: 'session_not_found', message: 'Session expired' } }
    : { json: user }));
  await page.route('**/rest/v1/rpc/ensure_personal_workspace', route => route.fulfill({ json: {
    profileId, workspaceId, displayName: 'Test volunteer', avatarUrl: null,
  } }));
  await page.route('**/rest/v1/workspace_members*', route => route.fulfill({ json: [{ role: 'owner', workspaces: {
    id: workspaceId, kind: 'personal', name: 'Personal workspace', owner_id: profileId,
  } }] }));
}
test('anonymous protected navigation returns to Google sign-in', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});
test('disabled Google provider stays on the website and permits retry', async ({ page }) => {
  await page.route('**/auth/v1/settings', route => route.fulfill({ json: { external: { google: false } } }));
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('not enabled');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
});
test('failed provider check offers recovery', async ({ page }) => {
  await page.route('**/auth/v1/settings', route => route.abort('failed'));
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('connection');
  await expect(page.getByRole('link', { name: 'View connection help' })).toBeVisible();
});
test('sign-in reflows on a phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mobile workspace drawer traps keyboard focus and returns focus on Escape (UI fixture)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sessionFixture(page);
  await page.goto('/app');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await menu.click();
  const first = page.getByRole('link', { name: 'PraisePoint overview' });
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const drawerState = await page.evaluate(() => ({
    focus: document.activeElement?.outerHTML,
    visibility: getComputedStyle(document.querySelector('#workspace-navigation')!).visibility,
    transform: getComputedStyle(document.querySelector('#workspace-navigation')!).transform,
  }));
  await expect(first, JSON.stringify(drawerState)).toBeFocused();
  await page.screenshot({ path: 'docs/evidence/S01-mobile-drawer.png' });
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(first).not.toBeVisible();
});

test('expired server identity returns to sign-in with recovery (UI fixture)', async ({ page }) => {
  await sessionFixture(page, true);
  await page.goto('/app');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
});
