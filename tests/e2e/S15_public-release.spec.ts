import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { teamFixture, personalId } from './support/team-fixture';
import { deckFixture, deckId, libraryPath } from './support/deck-fixture';

test('published S15 serves the gallery and navigation with the intended hosting policy', async ({
  page,
}) => {
  const origin = process.env.GATHER_HOSTED_VERIFY_URL;
  test.skip(!origin, 'Explicit owned production-site check only.');
  if (origin !== 'https://gather-ccf-presentations.web.app')
    throw Error('Unexpected release origin');
  test.setTimeout(90000);
  await page.addInitScript(() => {
    Object.defineProperty(window, 's15TransitionCalls', { value: 0, writable: true });
    if (document.startViewTransition) {
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (...args: Parameters<Document['startViewTransition']>) => {
        (window as unknown as { s15TransitionCalls: number }).s15TransitionCalls++;
        return start(...args);
      };
    }
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  const response = await page.goto(origin + '/auth');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain('https://cdn.visualrevival.com');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({ path: 'docs/evidence/S15-public-login.png' });
  await page.waitForFunction(
    async () =>
      !!(await navigator.serviceWorker.getRegistration())?.active &&
      !!navigator.serviceWorker.controller,
    {},
    { timeout: 30000 },
  );
  // Synthetic auth/API fixtures verify the deployed bundle, never real church records.
  await teamFixture(page, { personalOnly: true });
  await page.goto(origin + '/app/w/' + personalId + '/templates');
  await expect(page.getByRole('heading', { name: 'Backgrounds for worship.' })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.locator('.top-bar').getByRole('button', { name: 'Switch workspace', exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'New presentation', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('link', {
      name: /View .* on (?:ChurchRaise|Visual Revival|Motion Worship|Church Media Drop)/,
    }),
  ).toHaveCount(18);
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeHidden();
  const menu = page.getByRole('button', { name: 'Expand navigation', exact: true });
  await menu.hover();
  await expect(menu.locator('.brand-menu-icon')).toHaveCSS('opacity', '1');
  await menu.click();
  await page.locator('.background-preview img').first().scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        page
          .locator('.background-preview img')
          .first()
          .evaluate((el: HTMLImageElement) => el.naturalWidth),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/evidence/S15-public-gallery.png' });
  await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Workspaces' })).toBeVisible({ timeout: 20000 });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(
      () => (window as unknown as { s15TransitionCalls: number }).s15TransitionCalls,
    ),
  ).toBe(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await deckFixture(page);
  await page.goto(origin + libraryPath + '/' + deckId);
  await page.getByRole('button', { name: 'Add slide', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Slide 2: Lyrics', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Slide 2: Lyrics', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({ path: 'docs/evidence/S15-public-editor.png' });
  await writeFile(
    'docs/evidence/S15-public-browser.json',
    JSON.stringify(
      {
        origin,
        loginRendered: true,
        googleSignInNotRepeated: true,
        syntheticAuthAndApiOnly: true,
        realChurchDataMutated: false,
        gallery: true,
        workspaceHeader: true,
        sidebarToggle: true,
        externalPreviewLoaded: true,
        glassWorkspaceMenu: true,
        themePersistence: true,
        immediateAddSlide: true,
        saveReloadWithFixtures: true,
      },
      null,
      2,
    ),
  );
});
