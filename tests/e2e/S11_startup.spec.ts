import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { teamFixture } from './support/team-fixture';
test('isolated public cold-start diagnostic preserves runtime protection', async ({ browser }) => {
  const origin = process.env.GATHER_HOSTED_VERIFY_URL;
  test.skip(!origin, 'Explicit owned-public-site diagnostic only.');
  if (origin !== 'https://gather-ccf-presentations.web.app')
    throw Error('Unexpected diagnostic origin');
  test.setTimeout(240000);
  const results = [];
  for (let attempt = 1; attempt <= 10; attempt++) {
    const context = await browser.newContext({ baseURL: origin }),
      errors: string[] = [];
    try {
      await context.addInitScript(() => {
        const match = CacheStorage.prototype.match;
        CacheStorage.prototype.match = function (request, options) {
          return match.call(this, request, options).catch((error) => {
            console.warn('S11_RUNTIME_DIAGNOSTIC cache-match', String(error));
            throw error;
          });
        };
        const post = ServiceWorker.prototype.postMessage;
        ServiceWorker.prototype.postMessage = function (
          ...args: Parameters<ServiceWorker['postMessage']>
        ) {
          try {
            return Reflect.apply(post, this, args);
          } catch (error) {
            console.warn('S11_RUNTIME_DIAGNOSTIC worker-post', String(error));
            throw error;
          }
        };
      });
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.text().startsWith('S11_RUNTIME_DIAGNOSTIC')) errors.push(message.text());
      });
      await page.goto('/auth');
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      await page.waitForFunction(
        async () =>
          !!(await navigator.serviceWorker.getRegistration())?.active &&
          !!navigator.serviceWorker.controller,
      );
      await teamFixture(page, { personalOnly: true });
      await page.goto('/app');
      let passed = true;
      try {
        await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible({
          timeout: 12000,
        });
      } catch {
        passed = false;
      }
      results.push({
        attempt,
        passed,
        errors,
        body: passed ? undefined : (await page.locator('body').innerText()).slice(-1800),
      });
    } finally {
      await context.close();
    }
  }
  await writeFile(
    'docs/evidence/S11-public-startup.json',
    JSON.stringify(
      { origin, isolatedColdBrowserContexts: 10, syntheticAuthOnly: true, results },
      null,
      2,
    ),
  );
  expect(
    results.filter((result) => !result.passed),
    JSON.stringify(results),
  ).toHaveLength(0);
});
