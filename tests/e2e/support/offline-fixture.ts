import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { sep } from 'node:path';
import { songServiceFixture } from './song-service-fixture';
import { mediaFixture, mediaPath, stillPath } from './media-fixture';
import { personalId } from './team-fixture';
import { createTemplate } from '../../../src/features/decks/templates';
import type { ServiceSnapshot } from '../../../src/domain/service';
export async function prepareOfflineFixture(page: Page) {
  const services = await songServiceFixture(page),
    media = await mediaFixture(page);
  await page.goto(mediaPath);
  await page.getByLabel('Choose media file', { exact: true }).setInputFiles({
    name: 'S08 actual still.png',
    mimeType: 'image/png',
    buffer: await readFile(stillPath),
  });
  await page.getByRole('radio', { name: 'Workspace cloud · images only', exact: true }).check();
  await page.getByRole('button', { name: 'Import media', exact: true }).click();
  await expect(page.getByText('Media imported.', { exact: true })).toBeVisible();
  const clipPath = '.superpowers/test-fixtures/flower.mp4';
  let clip: Buffer;
  try {
    clip = await readFile(clipPath);
  } catch {
    const response = await fetch('https://developer.mozilla.org/shared-assets/videos/flower.mp4');
    if (!response.ok) throw new Error('Official MDN clip unavailable');
    clip = Buffer.from(await response.arrayBuffer());
    await mkdir('.superpowers/test-fixtures', { recursive: true });
    await writeFile(clipPath, clip);
  }
  await page
    .getByLabel('Choose media file', { exact: true })
    .setInputFiles({ name: 'S08 actual clip.mp4', mimeType: 'video/mp4', buffer: clip });
  await page.getByRole('radio', { name: 'This laptop', exact: true }).check();
  await page.getByRole('button', { name: 'Import media', exact: true }).click();
  await expect
    .poll(() => media.assets.size, {
      timeout: 35000,
      message:
        'Wait for native video validation and local registration; decoder stages allow 30 seconds.',
    })
    .toBe(2)
    .catch(async (error) => {
      await writeFile(
        '.superpowers/sdd/2026-10-29-praisepoint-usability/video-import-diagnostic.json',
        JSON.stringify(
          {
            url: page.url(),
            assets: media.assets.size,
            body: await page.locator('body').innerText(),
          },
          null,
          2,
        ),
      );
      throw error;
    });
  const [image, video] = [...media.assets.values()],
    serviceId = crypto.randomUUID(),
    slides = ['Image verse', 'Moving verse', 'Standalone clip'].map((text) => {
      const slide = createTemplate('lyrics');
      if (slide.elements[0].kind === 'text') slide.elements[0].text = text;
      return slide;
    });
  slides[0].background = { kind: 'image', mediaId: image.id };
  slides[1].background = { kind: 'video', mediaId: video.id };
  slides[2].standaloneVideoId = video.id;
  const snapshot: ServiceSnapshot = {
    schemaVersion: 1,
    serviceId,
    workspaceId: personalId,
    title: 'Offline Sunday (test)',
    sourceRevision: '8'.repeat(64),
    slides,
    media: [image, video],
    sections: slides.map((_, index) => ({
      id: crypto.randomUUID(),
      deckId: crypto.randomUUID(),
      label: 'Part ' + (index + 1),
      startIndex: index,
      slideCount: 1,
      sourceSongId: null,
    })),
  };
  services.plans.set(serviceId, {
    id: serviceId,
    workspaceId: personalId,
    title: snapshot.title,
    date: null,
    revision: 1,
    items: snapshot.sections.map((section, position) => ({
      id: section.id,
      deckId: section.deckId,
      label: section.label,
      position,
    })),
  });
  await page.route('**/rest/v1/rpc/build_service_snapshot', (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto('/app/w/' + personalId + '/services/' + serviceId);
  await page.getByRole('button', { name: 'Review service slides', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare for offline', exact: true }).click();
  await expect(page.getByText('Service prepared on this laptop.', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  return { snapshot, clipBytes: clip.length, services, media };
}
export async function removeBrowserFixture(directory: string, root: string) {
  if (
    !directory.startsWith(root + sep) ||
    !directory.split(sep).at(-1)?.startsWith('offline-browser-')
  )
    throw new Error('Unsafe test profile cleanup target');
  await rm(directory, { recursive: true, force: true, maxRetries: 3 });
}
