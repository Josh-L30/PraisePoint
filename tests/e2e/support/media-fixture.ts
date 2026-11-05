import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { MediaDescriptor } from '../../../src/domain/media';
import { personalId } from './team-fixture';
// Controlled API responses exercise UI only. The PNG bytes decode in real Chromium;
// docs/evidence/S06-live-media.json separately records the real Supabase integration.
export async function mediaFixture(page: Page) {
  const png = await readFile(new URL('../../fixtures/media/still.png', import.meta.url)),
    sha = createHash('sha256').update(png).digest('hex');
  const state = {
    assets: new Map<string, MediaDescriptor>(),
    uploadIds: [] as string[],
    failNextUpload: false,
  };
  const row = (asset: MediaDescriptor) => ({
    id: asset.id,
    workspace_id: asset.workspaceId,
    kind: asset.kind,
    location: asset.location,
    mime: asset.mime,
    bytes: asset.bytes,
    sha256: asset.sha256,
    revision: asset.revision,
    original_name: asset.originalName,
  });
  await page.route('**/rest/v1/media_assets*', (route) => {
    const url = new URL(route.request().url()),
      id = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (id) {
      const asset = state.assets.get(id);
      return route.fulfill(
        asset ? { json: row(asset) } : { status: 406, json: { code: 'PGRST116' } },
      );
    }
    return route.fulfill({
      json: [...state.assets.values()].filter((asset) => asset.workspaceId === personalId).map(row),
    });
  });
  await page.route('**/rest/v1/rpc/register_local_media', (route) => {
    const { p_asset } = route.request().postDataJSON();
    state.assets.set(p_asset.id, p_asset);
    return route.fulfill({ json: p_asset });
  });
  await page.route('**/rest/v1/rpc/confirm_local_media_geometry', (route) => {
    const { p_media_id } = route.request().postDataJSON();
    return route.fulfill({ json: state.assets.get(p_media_id) });
  });
  await page.route('**/rest/v1/rpc/get_media_usage', (route) =>
    route.fulfill({
      json: {
        workspaceUsed: [...state.assets.values()]
          .filter((asset) => asset.location === 'cloud')
          .reduce((total, asset) => total + asset.bytes, 0),
        workspaceReserved: 0,
        workspaceLimit: 52428800,
        applicationUsed: [...state.assets.values()]
          .filter((asset) => asset.location === 'cloud')
          .reduce((total, asset) => total + asset.bytes, 0),
        applicationReserved: 0,
        applicationLimit: 524288000,
      },
    }),
  );
  await page.route('**/rest/v1/rpc/get_media_management', (route) => route.fulfill({ json: [] }));
  await page.route('**/functions/v1/media-upload', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'authorization,apikey,x-client-info,content-type,x-media-action,x-media-id,x-workspace-id,x-file-size,x-file-sha256,x-file-name',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
        },
      });
      return;
    }
    const headers = route.request().headers(),
      action = headers['x-media-action'] ?? 'upload';
    if (action === 'delete') {
      state.assets.delete(route.request().postDataJSON().mediaId);
      await route.fulfill({ json: { ok: true, value: null } });
      return;
    }
    const id = headers['x-media-id'];
    state.uploadIds.push(id);
    if (state.failNextUpload) {
      state.failNextUpload = false;
      await route.fulfill({
        status: 503,
        json: {
          ok: false,
          error: {
            code: 'NETWORK',
            message: 'Upload could not be confirmed. Keep the original and retry.',
          },
        },
      });
      return;
    }
    const body = route.request().postDataBuffer();
    if (
      !body?.equals(png) ||
      headers['x-file-sha256'] !== sha ||
      Number(headers['x-file-size']) !== png.length
    ) {
      await route.fulfill({
        status: 400,
        json: {
          ok: false,
          error: { code: 'VALIDATION', message: 'The uploaded fixture bytes differ.' },
        },
      });
      return;
    }
    const asset: MediaDescriptor = {
      id,
      workspaceId: personalId,
      kind: 'image',
      location: 'cloud',
      mime: 'image/png',
      bytes: png.length,
      sha256: sha,
      revision: 1,
      originalName: decodeURIComponent(headers['x-file-name']),
    };
    state.assets.set(id, asset);
    await route.fulfill({ json: { ok: true, value: asset } });
  });
  await page.route('**/storage/v1/object/**', (route) =>
    route.fulfill({ body: png, contentType: 'image/png' }),
  );
  return state;
}
export const stillPath = new URL('../../fixtures/media/still.png', import.meta.url);
export const mediaPath = '/app/w/' + personalId + '/media';
