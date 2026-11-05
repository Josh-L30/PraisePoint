import { test, expect } from '@playwright/test';
import { teamFixture, personalId } from './support/team-fixture';
import { songServiceFixture } from './support/song-service-fixture';
import { libraryPath } from './support/deck-fixture';
import { writeFile } from 'node:fs/promises';
import { staticPolicyServer } from './support/static-policy-server';

test('Templates browses backgrounds without offering presentation creation or uploading files', async ({
  page,
}) => {
  await teamFixture(page);
  await page.goto('/app/w/' + personalId + '/templates');
  await expect(page.getByRole('heading', { name: 'Backgrounds for worship.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New presentation' })).toHaveCount(0);
  await expect(
    page.getByRole('link', {
      name: /View .* on (?:ChurchRaise|Visual Revival|Motion Worship|Church Media Drop)/,
    }),
  ).toHaveCount(18);
  await page.getByRole('button', { name: 'Moving backgrounds', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: /View .* on (?:ChurchRaise|Visual Revival|Motion Worship|Church Media Drop)/,
    }),
  ).toHaveCount(10);
  await page.route('https://cdn.visualrevival.com/**', (route) => route.abort());
  await page.reload();
  await expect(
    page
      .getByRole('link', {
        name: /View .* on (?:ChurchRaise|Visual Revival|Motion Worship|Church Media Drop)/,
      })
      .first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Import downloaded media' })).toHaveAttribute(
    'href',
    '/app/w/' + personalId + '/media',
  );
});

test('production gallery loads external thumbnails under the hosting policy without cloud uploads', async ({
  page,
}) => {
  test.setTimeout(180000);
  const host = await staticPolicyServer(),
    writes: string[] = [];
  try {
    await teamFixture(page);
    page.on('request', (request) => {
      if (request.url().includes('/functions/v1/') && request.method() === 'POST')
        writes.push(request.url());
    });
    const response = await page.goto(host.baseURL + '/app/w/' + personalId + '/templates');
    expect(response?.headers()['content-security-policy']).toContain(
      'https://cdn.visualrevival.com',
    );
    await expect(page.getByRole('heading', { name: 'Backgrounds for worship.' })).toBeVisible();
    for (const img of await page.locator('.background-preview img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), {
          timeout: 30000,
          message: 'Preview did not load: ' + (await img.getAttribute('src')),
        })
        .toBeGreaterThan(0);
    }
    expect(writes).toEqual([]);
    await writeFile(
      'docs/evidence/S12-external-previews.json',
      JSON.stringify(
        {
          productionBuild: true,
          hostingPolicy: true,
          loadedPreviews: 18,
          cloudMediaWrites: writes,
        },
        null,
        2,
      ),
    );
  } finally {
    await host.close();
  }
});

test('workspace switch lives in sticky header and collapsed rail hides sign out', async ({
  page,
}) => {
  await teamFixture(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/app');
  await expect(
    page.locator('.top-bar').getByRole('button', { name: 'Switch workspace', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('#workspace-navigation')
      .getByRole('button', { name: 'Switch workspace', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeHidden();
  const toggle = page.getByRole('button', { name: 'Expand navigation', exact: true });
  await expect(toggle).toBeVisible();
  await page.mouse.move(700, 300);
  await expect(toggle.locator('.brand-menu-icon')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'docs/evidence/S12-collapsed-rail.png' });
  await toggle.hover();
  await expect(toggle.locator('.brand-menu-icon')).toHaveCSS('opacity', '1');
  await expect(toggle.locator('.ccf-brand-mark')).toHaveCSS('opacity', '0');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
  await page.getByRole('option', { name: 'Personal workspace', exact: true }).click();
  await page.evaluate(() => {
    document
      .querySelector('main')!
      .insertAdjacentHTML('beforeend', '<div style="height:1800px">Scroll test</div>');
    window.scrollTo(0, 650);
  });
  await expect
    .poll(() =>
      page.locator('.top-bar').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBe(12);
  await page.screenshot({ path: 'docs/evidence/S12-sticky-header.png' });
});

test('new song starts with song details and saves only reviewed lyrics', async ({ page }) => {
  await songServiceFixture(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/app/w/' + personalId + '/songs');
  await page.getByRole('button', { name: 'New song', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create a song master' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Song title', exact: true }).fill('Sunday praise');
  await page.getByRole('button', { name: 'Edit lyrics and slide breaks' }).click();
  await page.getByRole('textbox', { name: 'Type lyrics', exact: true }).fill('Sing together');
  await page.getByRole('button', { name: 'Review slide breaks', exact: true }).click();
  await page.getByRole('button', { name: 'Use reviewed lyrics', exact: true }).click();
  await page.getByRole('button', { name: 'Save song master', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Song title', exact: true })
    .fill('Sunday praise updated');
  await page.getByRole('button', { name: 'Update song master', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Updated', exact: true })).toBeDisabled();
});

test('text drag selects words without moving the box; handle moves it and Save reflects confirmed state', async ({
  page,
}) => {
  await songServiceFixture(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(libraryPath);
  await page.getByRole('button', { name: 'New presentation', exact: true }).click();
  await page.getByRole('button', { name: 'Lyrics', exact: true }).click();
  const hitbox = page.getByRole('button', { name: 'Select Lyrics', exact: true }),
    before = await hitbox.boundingBox();
  if (!before) throw Error('No text');
  await page.mouse.move(before.x + 20, before.y + 25);
  await page.mouse.down();
  await page.mouse.move(before.x + 100, before.y + 25);
  await page.mouse.up();
  expect(await hitbox.boundingBox()).toEqual(before);
  await expect(page.getByRole('textbox', { name: 'Edit slide text' })).toHaveCount(0);
  await hitbox.dblclick();
  const text = page.getByRole('textbox', { name: 'Edit slide text' });
  await text.fill('Praise together');
  expect(
    await text.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
    }),
  ).toBe(true);
  await text.press('Home');
  await text.press('Control+Shift+ArrowRight');
  expect(
    await text.evaluate((el: HTMLTextAreaElement) => el.selectionEnd > el.selectionStart),
  ).toBe(true);
  await text.press('Escape');
  const handle = page.getByRole('button', { name: 'Move text box', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw Error('No move handle');
  expect(
    await handle.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }),
  ).toBe(true);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
  await page.mouse.up();
  await expect.poll(async () => (await hitbox.boundingBox())!.x).toBeGreaterThan(before.x + 20);
  await page.route('**/rest/v1/rpc/save_slide_deck', (route) => route.abort('failed'), {
    times: 1,
  });
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not be confirmed');
  await expect(page.getByRole('button', { name: 'Save presentation', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
});

test('responsive screens, native dropdown, hover contrast and action spacing', async ({ page }) => {
  test.setTimeout(120000);
  const state = await songServiceFixture(page),
    measurements = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const id = crypto.randomUUID();
  state.plans.set(id, {
    id,
    workspaceId: personalId,
    title: 'Sunday worship',
    date: null,
    revision: 1,
    items: [],
  });
  for (const width of [320, 390, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['', '/decks', '/songs', '/services', '/templates', '/team']) {
      await page.goto('/app/w/' + personalId + route);
      await expect(
        page.locator('.top-bar').getByRole('button', { name: 'Switch workspace', exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.locator('main h1')).toBeVisible();
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(fits, route + ' at ' + width).toBe(true);
      await expect(
        page.locator('.top-bar').getByRole('button', { name: 'Switch workspace', exact: true }),
      ).toBeVisible();
      measurements.push({ width, route, fits });
    }
    if (width === 320 || width === 390) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Open navigation', exact: true }),
      ).toBeFocused();
      await page.evaluate(() => {
        document
          .querySelector('main')!
          .insertAdjacentHTML('beforeend', '<div style="height:1800px">Scroll test</div>');
        window.scrollTo(0, 650);
      });
      await expect
        .poll(() =>
          page.locator('.top-bar').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        )
        .toBe(10);
    }
  }
  await page.goto('/app/w/' + personalId + '/services/' + id);
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  const actions = page.locator('.service-plan-actions');
  expect(
    await actions.evaluate((el) => parseFloat(getComputedStyle(el).gap)),
  ).toBeGreaterThanOrEqual(12);
  const enabled = page.getByRole('button', { name: 'Add existing presentation', exact: true }),
    normal = await enabled.evaluate((el) => getComputedStyle(el).backgroundColor);
  await enabled.hover();
  await expect
    .poll(() => enabled.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(normal);
  await page.screenshot({ path: 'docs/evidence/S12-service-actions.png', fullPage: true });
  await page.goto('/app/w/' + personalId + '/templates');
  await expect(page.getByRole('heading', { name: 'Backgrounds for worship.' })).toBeVisible();
  await page.locator('.background-preview img').evaluateAll((images) =>
    Promise.all(
      images.map((img) => {
        const image = img as HTMLImageElement;
        return image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            });
      }),
    ),
  );
  await page.screenshot({ path: 'docs/evidence/S12-background-gallery.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Backgrounds for worship.' })).toBeVisible();
  await expect(page.locator('#workspace-navigation')).toBeHidden();
  await page.screenshot({ path: 'docs/evidence/S12-mobile-gallery.png', animations: 'disabled' });
  expect(errors).toEqual([]);
  await writeFile(
    'docs/evidence/S12-responsive.json',
    JSON.stringify(
      {
        measurements,
        pageErrors: errors,
        device: 'Chromium viewport emulation; no physical device',
      },
      null,
      2,
    ),
  );
});
