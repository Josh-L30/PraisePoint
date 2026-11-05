import { test, expect, chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { deckFixture, libraryPath } from './support/deck-fixture';
import { teamFixture, churchId } from './support/team-fixture';
import { createTemplate } from '../../src/features/decks/templates';
import { installWorstCaseToggle, type QaMode } from './support/worst-case-toggle';
test.setTimeout(90000);
test('test-only data toggle exercises schema limits, scripts, empty/one/page states and supported reflow', async ({
  page,
}) => {
  const state = await deckFixture(page, false),
    options = { longName: false };
  await teamFixture(page, options);
  const names = [
    'Sunday worship with Aleksandra Wiśniewska-Kowalczyk and volunteers',
    '主よ、私たちの礼拝を導いてください 🙏',
    'MaranathaCelebration'.repeat(7).slice(0, 120),
    'J',
  ];
  function select(mode: QaMode) {
    options.longName = mode === 'Worst case';
    state.documents.clear();
    const amount = mode === 'Empty' ? 0 : mode === 'One' ? 1 : mode === 'Worst case' ? 25 : 3;
    for (let i = 0; i < amount; i++) {
      const id = crypto.randomUUID();
      state.documents.set(id, {
        revision: 1,
        document: {
          schemaVersion: 1,
          id,
          workspaceId: churchId,
          title: mode === 'Worst case' ? names[i % names.length] : 'Sunday part ' + (i + 1),
          width: 1920,
          height: 1080,
          slides: [createTemplate('lyrics')],
        },
      });
    }
  }
  select('Demo data');
  await installWorstCaseToggle(page, select);
  await page.goto('/app/w/' + churchId + '/decks');
  await expect(page.locator('.deck-card')).toHaveCount(3);
  await page.screenshot({ path: 'docs/evidence/S10-demo-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Worst case', exact: true }).click();
  await expect(page.locator('.deck-card')).toHaveCount(24);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  expect(
    await page
      .locator('.main-panel')
      .evaluate((element) => getComputedStyle(element).backdropFilter),
  ).toBe('none');
  expect(
    await page
      .locator('.main-panel')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe('rgb(241, 250, 247)');
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-transparency', value: 'reduce' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ],
  });
  expect(
    await page
      .getByRole('button', { name: 'New presentation', exact: true })
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.screenshot({ path: 'docs/evidence/S10-opaque-fallback.png', fullPage: true });
  const sizes = [];
  for (const width of [1920, 1440, 1024, 720, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    sizes.push(result);
    expect.soft(result.scroll, 'horizontal overflow at ' + width).toBeLessThanOrEqual(width + 1);
    if (width === 1440 || width === 320) {
      await page.screenshot({ path: 'docs/evidence/S10-worst-' + width + '.png', fullPage: true });
      await page.screenshot({ path: 'docs/evidence/S10-viewport-' + width + '.png' });
    }
  }
  await page.getByRole('button', { name: 'Empty', exact: true }).click();
  await expect(page.locator('.deck-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'One', exact: true }).click();
  await expect(page.locator('.deck-card')).toHaveCount(1);
  await writeFile(
    'docs/evidence/S10-reflow.json',
    JSON.stringify(
      {
        schemaBoundTitle: 120,
        paginatedRecords: 24,
        emptyAndOne: true,
        sizes,
        zoomEquivalentCssWidth: 720,
        physicalPhone: false,
      },
      null,
      2,
    ),
  );
});
test('coarse-pointer browsing keeps inputs and menu targets usable', async () => {
  const browser = await chromium.launch(),
    context = await browser.newContext({
      viewport: { width: 320, height: 740 },
      hasTouch: true,
      isMobile: true,
      baseURL: test.info().project.use.baseURL,
    });
  try {
    const page = await context.newPage();
    await teamFixture(page);
    await page.goto('/app/w/' + churchId + '/team');
    const email = page.getByRole('textbox', { name: 'Volunteer email' });
    await expect(email).toBeVisible();
    const inputSize = await email.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
      menu = page.getByRole('button', { name: 'Open navigation', exact: true }),
      bounds = await menu.boundingBox();
    expect.soft(inputSize, 'coarse input text must avoid focus zoom').toBeGreaterThanOrEqual(16);
    expect.soft(bounds?.width ?? 0, 'mobile menu hit width').toBeGreaterThanOrEqual(44);
    expect.soft(bounds?.height ?? 0, 'mobile menu hit height').toBeGreaterThanOrEqual(44);
    await menu.tap();
    await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await writeFile(
      'docs/evidence/S10-touch-emulation.json',
      JSON.stringify(
        { inputSize, menu: bounds, drawerKeyboard: true, physicalPhone: false },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
function luminance(r: number, g: number, b: number) {
  return [r, g, b]
    .map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
test('primary action text retains contrast on the composited glass surface', async ({ page }) => {
  await deckFixture(page, false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(libraryPath);
  const action = page.getByRole('button', { name: 'New presentation', exact: true });
  await expect(action).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const bounds = await action.boundingBox();
  if (!bounds) throw new Error('Missing primary action');
  const { Image } = await import('imagescript'),
    shot = await Image.decode(await page.screenshot()),
    pixel = shot.getPixelAt(Math.floor(bounds.x + 10), Math.floor(bounds.y + bounds.height / 2)),
    rgb = [pixel >>> 24, (pixel >>> 16) & 255, (pixel >>> 8) & 255],
    ratio = 1.05 / (luminance(rgb[0], rgb[1], rgb[2]) + 0.05);
  await writeFile(
    'docs/evidence/S10-contrast.json',
    JSON.stringify(
      {
        primaryBackgroundSample: rgb,
        whiteTextRatio: ratio,
        minimum: 4.5,
        method: 'Actual screenshot background pixel beside the label; normal-size white text',
      },
      null,
      2,
    ),
  );
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});
