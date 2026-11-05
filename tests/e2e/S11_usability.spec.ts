import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { teamFixture, churchId, personalId } from './support/team-fixture';
import { deckFixture, libraryPath } from './support/deck-fixture';
import { songServiceFixture } from './support/song-service-fixture';
import { mediaFixture, mediaPath, stillPath } from './support/media-fixture';
import { installWorstCaseToggle } from './support/worst-case-toggle';

test.setTimeout(60000);
test('PraisePoint login and compact sidebar fit laptop and narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible({
    timeout: 15000,
  });
  await expect
    .poll(() =>
      page
        .locator('.ccf-brand-mark')
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(
    await page.locator('.auth-layout').evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(1060);
  await page.screenshot({ path: 'docs/evidence/S11-login-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/S11-login-mobile.png', fullPage: true });
  await teamFixture(page, { longName: true });
  await page.goto('/app');
  const measurements = [];
  for (const [width, height] of [
    [1366, 768],
    [1024, 600],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    measurements.push(
      await page.locator('#workspace-navigation').evaluate((el) => ({
        height: el.clientHeight,
        scrollHeight: el.scrollHeight,
        transition: getComputedStyle(document.querySelector('.workspace-shell')!)
          .transitionProperty,
        transitionDuration: getComputedStyle(document.querySelector('.workspace-shell')!)
          .transitionDuration,
      })),
    );
    expect(measurements.at(-1)!.scrollHeight).toBeLessThanOrEqual(measurements.at(-1)!.height);
    expect(measurements.at(-1)!.transitionDuration).toBe('0s');
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: 'docs/evidence/S11-sidebar-expanded.png' });
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeHidden();
  expect(
    await page
      .locator('.workspace-shell')
      .evaluate((el) => getComputedStyle(el).transitionProperty),
  ).not.toContain('grid-template-columns');
  await page.screenshot({ path: 'docs/evidence/S11-sidebar-collapsed.png' });
  await writeFile(
    'docs/evidence/S11-layout.json',
    JSON.stringify({ fixture: true, laptopSidebar: measurements }, null, 2),
  );
});

test('song breaks import independently, canvas text edits, and preview enters fullscreen', async ({
  page,
}) => {
  const state = await songServiceFixture(page);
  const id = crypto.randomUUID(),
    lyrics = 'Panginoon, salamat\nSa iyong pag-ibig\n\n主よ、感謝します';
  state.songs.set(id, {
    id,
    workspaceId: personalId,
    title: 'Sunday song 🙏',
    lyrics,
    author: '',
    source: '',
    usageNotes: '',
    revision: 1,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(libraryPath);
  await page.getByRole('button', { name: 'New presentation', exact: true }).click();
  await page.getByRole('button', { name: 'Lyrics', exact: true }).click();
  await page.getByRole('button', { name: 'Select Lyrics', exact: true }).dblclick();
  const inline = page.getByRole('textbox', { name: 'Edit slide text', exact: true });
  await expect(inline).toBeVisible();
  await inline.fill('Direct text editing');
  await inline.press('Home');
  await inline.press('Control+Shift+ArrowRight');
  expect(
    await inline.evaluate((el: HTMLTextAreaElement) => el.selectionEnd > el.selectionStart),
  ).toBe(true);
  await inline.press('Delete');
  await expect(inline).not.toHaveValue('Direct text editing');
  await inline.fill('Direct text editing');
  await inline.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Lyrics', exact: true })).toHaveValue(
    'Direct text editing',
  );
  await expect(page.getByRole('button', { name: 'Move text box', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import from Song library', exact: true }).click();
  await page.getByRole('button', { name: 'Review Sunday song 🙏', exact: true }).click();
  await page.getByRole('button', { name: 'Review slide breaks', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Slide 1 words' })).toHaveValue(
    'Panginoon, salamat\nSa iyong pag-ibig',
  );
  await expect(page.getByRole('textbox', { name: 'Slide 2 words' })).toHaveValue(
    '主よ、感謝します',
  );
  await page.screenshot({ path: 'docs/evidence/S11-song-break-review.png' });
  await page.getByRole('button', { name: 'Add lyric slides to presentation' }).click();
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByText('Saved · revision 2', { exact: true })).toBeVisible();
  const saved = [...state.documents.values()][0];
  expect(saved.document.slides).toHaveLength(3);
  expect(state.songs.get(id)?.lyrics).toBe(lyrics);
  expect(
    saved.document.slides
      .slice(1)
      .map((s) => s.elements[0])
      .map((e) => (e.kind === 'text' ? e.text : '')),
  ).toEqual(lyrics.split('\n\n'));
  await page.getByRole('button', { name: 'Full-window preview', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Presentation preview' }).getByTestId('slide-stage'),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const viewport = await page.locator('.full-slide-preview .slide-viewport').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    innerWidth,
    innerHeight,
  }));
  expect(viewport.width).toBe(viewport.innerWidth);
  expect(viewport.height).toBe(viewport.innerHeight);
  await page.screenshot({ path: 'docs/evidence/S11-fullscreen-preview.png' });
  await page.getByRole('link', { name: 'Back to editor' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
});

test('icon file picker and centered media confirmation preserve cancel and remove on confirm (API fixture)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await deckFixture(page, false);
  const media = await mediaFixture(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(mediaPath);
  await page.getByLabel('Choose media file', { exact: true }).setInputFiles({
    name: 'Sunday still.png',
    mimeType: 'image/png',
    buffer: await readFile(stillPath),
  });
  await page.getByRole('radio', { name: 'Workspace cloud · images only', exact: true }).check();
  await page.getByRole('button', { name: 'Import media', exact: true }).click();
  await expect(page.getByText('Media imported.', { exact: true })).toBeVisible();
  expect(
    await page
      .locator('input[type=file]')
      .first()
      .evaluate((el) => getComputedStyle(el).clipPath),
  ).toBe('inset(50%)');
  await page.getByRole('button', { name: 'Delete media', exact: true }).click();
  const modal = page.getByRole('alertdialog', { name: 'Confirm Deletion' });
  await expect(modal).toBeVisible();
  await expect
    .poll(() =>
      modal.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          Math.abs(r.x + r.width / 2 - innerWidth / 2) +
          Math.abs(r.y + r.height / 2 - innerHeight / 2)
        );
      }),
    )
    .toBeLessThan(2);
  expect(await modal.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.keyboard.press('Tab');
  await expect(modal.getByRole('button', { name: 'Confirm media deletion' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.screenshot({ path: 'docs/evidence/S11-media-confirmation.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Delete media', exact: true })).toBeFocused();
  expect(media.assets.size).toBe(1);
  await page.getByRole('button', { name: 'Delete media', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm media deletion' }).click();
  await expect.poll(() => media.assets.size).toBe(0);
});

test('church owner types exact name, can cancel, and can resume a failed deletion (API fixture)', async ({
  page,
}) => {
  const state = await teamFixture(page);
  let calls = 0;
  await page.route('**/functions/v1/media-upload', (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'authorization,apikey,x-client-info,content-type,x-media-action',
        },
      });
    calls++;
    if (calls === 1)
      return route.fulfill({
        status: 503,
        json: {
          ok: false,
          error: { code: 'NETWORK', message: 'Cleanup paused. Resume deletion.' },
        },
      });
    if (route.request().headers()['x-media-action'] === 'begin-delete-workspace')
      return route.fulfill({ json: { ok: true, value: { complete: false } } });
    state.joined = false;
    return route.fulfill({ json: { ok: true, value: { complete: true } } });
  });
  await page.goto('/app/w/' + churchId + '/team');
  await page.getByRole('button', { name: 'Delete church workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete workspace', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Type workspace name' }).fill('wrong');
  await expect(page.getByRole('button', { name: 'Delete workspace', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Delete church workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Type workspace name' }).fill('CCF team (test)');
  await page.screenshot({ path: 'docs/evidence/S11-workspace-confirmation.png' });
  await page.getByRole('button', { name: 'Delete workspace', exact: true }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText('Cleanup paused');
  await page.getByRole('button', { name: 'Delete workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(calls).toBe(3);
  expect(state.joined).toBe(false);
});

test('service import spacing and song picker handle realistic long, empty and non-Latin data', async ({
  page,
}) => {
  const state = await songServiceFixture(page),
    songId = crypto.randomUUID();
  await installWorstCaseToggle(page, (mode) => {
    state.songs.clear();
    if (mode !== 'Empty')
      state.songs.set(songId, {
        id: songId,
        workspaceId: personalId,
        title:
          mode === 'Worst case'
            ? 'Panginoon, sa bawat panahon — 主の恵みを歌います 🙏 · Sunday evening worship'
            : 'Sunday worship',
        lyrics: 'One line',
        author: '',
        source: '',
        usageNotes: '',
        revision: 1,
      });
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app/w/' + personalId + '/services');
  await expect(page.getByRole('heading', { name: 'Start with your next service.' })).toBeVisible();
  const gap = await page.evaluate(() => {
    const a = document.querySelector('.transfer-entry')!.getBoundingClientRect(),
      b = document.querySelector('.library-empty')!.getBoundingClientRect();
    return b.top - a.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(24);
  await page.getByRole('button', { name: 'Worst case', exact: true }).click();
  await page.goto(libraryPath);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: 'New presentation', exact: true }).click();
  await page.getByRole('button', { name: 'Lyrics', exact: true }).click();
  await page.getByRole('button', { name: 'Import from Song library', exact: true }).click();
  await expect(page.getByRole('button', { name: /Review Panginoon/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/S11-song-worst-case.png' });
  await page.getByRole('button', { name: 'Cancel import' }).click();
});
