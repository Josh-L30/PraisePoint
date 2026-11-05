import { test, expect } from '@playwright/test';
import { deckFixture, deckId, libraryPath } from './support/deck-fixture';
test('scaled pointer move/resize each undo as one gesture and preserve cloud geometry', async ({
  page,
}) => {
  const state = await deckFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(libraryPath + '/' + deckId);
  await page.getByRole('spinbutton', { name: 'Box width' }).fill('800');
  const box = page.getByRole('button', { name: 'Move text box', exact: true });
  await box.scrollIntoViewIfNeeded();
  const rect = await box.boundingBox();
  if (!rect) throw new Error('Selection box missing');
  const scale = await page
    .locator('.editor-canvas .slide-stage')
    .evaluate((element) => element.getBoundingClientRect().width / 1920);
  const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120 * scale, start.y + 60 * scale, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('spinbutton', { name: 'X position' })).toHaveValue('216');
  await expect(page.getByRole('spinbutton', { name: 'Y position' })).toHaveValue('360');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'X position' })).toHaveValue('96');
  await expect(page.getByRole('spinbutton', { name: 'Box width' })).toHaveValue('800');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const handle = page.getByRole('button', { name: 'Resize width and height' });
  await handle.scrollIntoViewIfNeeded();
  const grip = await handle.boundingBox();
  if (!grip) throw new Error('Resize handle missing');
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip.x + grip.width / 2 + 100 * scale,
    grip.y + grip.height / 2 + 40 * scale,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByRole('spinbutton', { name: 'Box width' })).toHaveValue('900');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Box width' })).toHaveValue('800');
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByText('Saved · revision 2', { exact: true })).toBeVisible();
  const saved = state.documents.get(deckId)!.document.slides[0].elements[0];
  expect(saved).toMatchObject({ width: 800, height: 480 });
  expect(saved.y).toBeCloseTo(360, 3);
  expect(saved.x).toBeCloseTo(216, 3);
  await page.screenshot({ path: 'docs/evidence/S04-freeform-editor.png', fullPage: true });
});
test('keyboard controls, persistent field labels, layers and slide ordering work at constrained desktop width', async ({
  page,
}) => {
  const state = await deckFixture(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(libraryPath + '/' + deckId);
  await page.getByRole('button', { name: 'Select Lyrics' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByRole('spinbutton', { name: 'X position' })).toHaveValue('97');
  await expect(page.getByRole('spinbutton', { name: 'Y position' })).toHaveValue('310');
  const lyrics = page.getByRole('textbox', { name: 'Lyrics', exact: true });
  await lyrics.fill('Keep all these words');
  await lyrics.press('ArrowRight');
  await lyrics.press('Shift+ArrowDown');
  await expect(page.getByRole('spinbutton', { name: 'X position' })).toHaveValue('97');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByRole('textbox', { name: 'Layer name' }).fill('Service note');
  await page
    .getByRole('textbox', { name: 'Service note', exact: true })
    .fill('Our church prepares together');
  await page.getByRole('button', { name: 'Send to back' }).click();
  await page.getByRole('button', { name: 'Choose layout', exact: true }).click();
  await page.getByRole('button', { name: 'Sermon', exact: true }).click();
  const sermon = page.getByRole('button', { name: 'Slide 2: Sermon', exact: true });
  await page.locator('.slide-rail').scrollIntoViewIfNeeded();
  await sermon.dragTo(page.getByRole('button', { name: 'Slide 1: Lyrics', exact: true }));
  await expect(page.getByRole('button', { name: 'Slide 1: Sermon', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByText('Saved · revision 2', { exact: true })).toBeVisible();
  const saved = state.documents.get(deckId)!.document;
  expect(saved.slides.map((slide) => slide.category)).toEqual(['sermon', 'lyrics']);
  expect(
    saved.slides[1].elements.find((element) => element.label === 'Service note'),
  ).toMatchObject({ text: 'Our church prepares together' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('Escape cancels a captured drag and long words remain intact with an overflow warning', async ({
  page,
}) => {
  const state = await deckFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(libraryPath + '/' + deckId);
  await page.getByRole('spinbutton', { name: 'Box width' }).fill('800');
  const box = page.getByRole('button', { name: 'Move text box', exact: true });
  await box.scrollIntoViewIfNeeded();
  const rect = await box.boundingBox();
  if (!rect) throw new Error('Selection missing');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 25, rect.y + rect.height / 2 + 15, { steps: 4 });
  await expect(page.getByRole('spinbutton', { name: 'X position' })).not.toHaveValue('96');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByRole('spinbutton', { name: 'X position' })).toHaveValue('96');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Box width' })).toHaveValue('1728');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const words = 'W'.repeat(300);
  await page.getByRole('textbox', { name: 'Lyrics', exact: true }).fill(words);
  await expect(page.locator('.editor-canvas .slide-overflow-warning')).toBeVisible();
  await page.getByRole('button', { name: 'Save presentation', exact: true }).click();
  await expect(page.getByText('Saved · revision 2', { exact: true })).toBeVisible();
  expect(state.documents.get(deckId)?.document.slides[0].elements[0]).toMatchObject({
    text: words,
    x: 96,
    y: 300,
  });
});
