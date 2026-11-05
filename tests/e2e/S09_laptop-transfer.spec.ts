import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { prepareOfflineFixture, removeBrowserFixture } from './support/offline-fixture';
import { songServiceFixture } from './support/song-service-fixture';
import { mediaFixture, mediaPath, stillPath } from './support/media-fixture';
import { personalId } from './support/team-fixture';
import type { ServiceSnapshot } from '../../src/domain/service';
test.setTimeout(150000);
test('metadata moves between isolated laptops; missing originals block preparation until verified relink, then restart offline', async () => {
  const root = resolve('.superpowers/sdd/2026-10-29-praisepoint-usability'),
    directory = await mkdtemp(join(root, 'offline-browser-')),
    baseURL = 'http://127.0.0.1:4173',
    options = { headless: true, baseURL, viewport: { width: 1440, height: 900 } };
  let laptopA: BrowserContext | null = null,
    laptopB: BrowserContext | null = null;
  try {
    laptopA = await chromium.launchPersistentContext(join(directory, 'laptop-a'), options);
    const first = laptopA.pages()[0],
      { snapshot } = await prepareOfflineFixture(first);
    const downloading = first.waitForEvent('download');
    await first.getByRole('button', { name: 'Download service metadata', exact: true }).click();
    const download = await downloading,
      metadataPath = join(directory, 'gather-service-metadata.json');
    await download.saveAs(metadataPath);
    const bundle = JSON.parse(await readFile(metadataPath, 'utf8')) as {
      format: string;
      version: number;
      snapshot: ServiceSnapshot;
    };
    expect(Object.keys(bundle).sort()).toEqual(['format', 'snapshot', 'version']);
    expect(bundle.snapshot).toEqual(snapshot);
    await laptopA.close();
    laptopA = null;
    laptopB = await chromium.launchPersistentContext(join(directory, 'laptop-b'), options);
    const second = laptopB.pages()[0],
      services = await songServiceFixture(second),
      media = await mediaFixture(second);
    let imported: ServiceSnapshot | null = null;
    await second.route('**/rest/v1/rpc/import_service_metadata', async (route) => {
      const { p_bundle, p_destination_workspace_id } = route.request().postDataJSON() as {
        p_bundle: typeof bundle;
        p_destination_workspace_id: string;
      };
      expect(p_bundle).toEqual(bundle);
      expect(p_destination_workspace_id).toBe(personalId);
      const source = p_bundle.snapshot,
        mapping = new Map(source.media.map((asset) => [asset.id, crypto.randomUUID()]));
      const copy = structuredClone(source);
      copy.serviceId = crypto.randomUUID();
      copy.workspaceId = personalId;
      copy.sourceRevision = '9'.repeat(64);
      copy.media = copy.media.map((asset) => ({
        ...asset,
        id: mapping.get(asset.id)!,
        workspaceId: personalId,
        location: 'local',
      }));
      copy.sections = copy.sections.map((part) => ({
        ...part,
        id: crypto.randomUUID(),
        deckId: crypto.randomUUID(),
        sourceSongId: null,
      }));
      copy.slides = copy.slides.map((slide) => ({
        ...slide,
        id: crypto.randomUUID(),
        background:
          slide.background.kind === 'solid'
            ? slide.background
            : { ...slide.background, mediaId: mapping.get(slide.background.mediaId)! },
        ...(slide.standaloneVideoId
          ? { standaloneVideoId: mapping.get(slide.standaloneVideoId)! }
          : {}),
        elements: slide.elements.map((element) => ({
          ...element,
          id: crypto.randomUUID(),
          ...(element.kind === 'image' ? { mediaId: mapping.get(element.mediaId)! } : {}),
        })),
      }));
      imported = copy;
      for (const asset of copy.media) media.assets.set(asset.id, asset);
      services.plans.set(copy.serviceId, {
        id: copy.serviceId,
        workspaceId: personalId,
        title: copy.title,
        date: null,
        revision: 1,
        items: copy.sections.map((part, position) => ({
          id: part.id,
          deckId: part.deckId,
          label: part.label,
          position,
        })),
      });
      await route.fulfill({
        json: { serviceId: copy.serviceId, missingMediaIds: copy.media.map((asset) => asset.id) },
      });
    });
    await second.route('**/rest/v1/rpc/build_service_snapshot', (route) =>
      route.fulfill({ json: imported }),
    );
    await second.goto('/app/w/' + personalId + '/services');
    await second.getByRole('button', { name: 'Import service metadata', exact: true }).click();
    await second.getByLabel('Service metadata file', { exact: true }).setInputFiles(metadataPath);
    await expect(second.getByRole('heading', { name: snapshot.title, exact: true })).toBeVisible();
    expect(media.assets.size).toBe(0);
    await second.getByRole('button', { name: 'Import independent service', exact: true }).click();
    await expect(second.getByText('Independent service imported.', { exact: true })).toBeVisible();
    expect(media.assets.size).toBe(2);
    await second.getByRole('link', { name: 'Open imported service', exact: true }).click();
    await second.getByRole('button', { name: 'Review service slides', exact: true }).click();
    await second.getByRole('button', { name: 'Prepare for offline', exact: true }).click();
    await expect(second.getByRole('alert')).toBeVisible({ timeout: 20000 });
    await expect(second.getByText('Service prepared on this laptop.', { exact: true })).toHaveCount(
      0,
    );
    await second.goto(mediaPath);
    const image = second.locator('article.media-row').filter({
      has: second.getByRole('heading', { name: snapshot.media[0].originalName, exact: true }),
    });
    const { Image } = await import('imagescript'),
      wrong = new Image(4, 4);
    wrong.fill(0xff0000ff);
    await image.getByLabel('Reselect exact original', { exact: true }).setInputFiles({
      name: snapshot.media[0].originalName,
      mimeType: 'image/png',
      buffer: Buffer.from(await wrong.encode()),
    });
    await expect(second.getByRole('alert')).toContainText('exact original');
    await image.getByLabel('Reselect exact original', { exact: true }).setInputFiles({
      name: snapshot.media[0].originalName,
      mimeType: 'image/png',
      buffer: await readFile(stillPath),
    });
    await expect(
      second.getByText('Original file verified on this laptop.', { exact: true }),
    ).toBeVisible();
    const video = second.locator('article.media-row').filter({
      has: second.getByRole('heading', { name: snapshot.media[1].originalName, exact: true }),
    });
    await video.getByLabel('Reselect exact original', { exact: true }).setInputFiles({
      name: snapshot.media[1].originalName,
      mimeType: 'video/mp4',
      buffer: await readFile('.superpowers/test-fixtures/flower.mp4'),
    });
    await expect(video.getByLabel('Reselect exact original', { exact: true })).toBeEnabled();
    await expect(
      second.getByText('Original file verified on this laptop.', { exact: true }),
    ).toBeVisible();
    const copied = imported as ServiceSnapshot | null;
    if (!copied) throw new Error('No imported snapshot');
    await second.goto('/app/w/' + personalId + '/services/' + copied.serviceId);
    await second.getByRole('button', { name: 'Review service slides', exact: true }).click();
    await second.getByRole('button', { name: 'Prepare for offline', exact: true }).click();
    await expect(second.getByText('Service prepared on this laptop.', { exact: true })).toBeVisible(
      { timeout: 20000 },
    );
    await second.screenshot({ path: 'docs/evidence/S09-transfer-prepared.png', fullPage: true });
    await laptopB.close();
    laptopB = null;
    laptopB = await chromium.launchPersistentContext(join(directory, 'laptop-b'), options);
    await laptopB.setOffline(true);
    const offline = laptopB.pages()[0],
      cloud: string[] = [];
    laptopB.on('request', (request) => {
      if (/supabase\.co|accounts\.google|oauth2\.google/.test(request.url()))
        cloud.push(request.url());
    });
    await offline.goto('/offline');
    await offline.getByRole('button', { name: 'Verify prepared copy', exact: true }).click();
    await expect(offline.getByText('Ready offline', { exact: true })).toBeVisible({
      timeout: 20000,
    });
    await offline.getByRole('link', { name: 'Open prepared service', exact: true }).click();
    const opening = laptopB.waitForEvent('page');
    await offline.getByRole('button', { name: 'Open projector', exact: true }).click();
    const audience = await opening;
    await offline.getByRole('button', { name: 'Send current slide', exact: true }).click();
    await expect(audience.locator('.slide-stage img')).toHaveJSProperty('naturalWidth', 32);
    await offline.getByRole('button', { name: 'Next slide', exact: true }).click();
    await expect
      .poll(() =>
        audience
          .locator('video[data-media-role="background"]')
          .evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBeGreaterThan(0.2);
    expect(cloud).toEqual([]);
    await writeFile(
      'docs/evidence/S09-laptop-transfer.json',
      JSON.stringify(
        {
          isolatedPersistentProfiles: 2,
          sourceMetadataDownloaded: true,
          mediaBytesIncluded: false,
          missingFilesBlockedPreparation: true,
          wrongOriginalRejected: true,
          exactOriginalsVerified: 2,
          targetFullBrowserRestartDisconnected: true,
          cloudRequestsAfterRestart: cloud.length,
          imageDecoded: true,
          backgroundPlayed: true,
          physicalSecondLaptop: false,
        },
        null,
        2,
      ),
    );
    await audience.close();
  } finally {
    await laptopA?.close();
    await laptopB?.close();
    await removeBrowserFixture(directory, root);
  }
});
