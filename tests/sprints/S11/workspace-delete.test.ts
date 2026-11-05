// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { createMediaHandler } from '../../../supabase/functions/_shared/media-handler';
const workspace = 'a6000000-0000-4000-8000-000000000001',
  cloudId = 'a6000000-0000-4000-8000-000000000020',
  localId = 'a6000000-0000-4000-8000-000000000021',
  objectKey = workspace + '/' + cloudId + '/' + 'a'.repeat(64) + '.png',
  ok = (value: unknown) => ({ ok: true, value });
function fixture() {
  const events: string[] = [],
    backend = {
      workspaceDeletion: {
        begin: vi.fn(async () => {
          events.push('begin');
          return ok(null);
        }),
        batch: vi.fn(async () => {
          events.push('batch');
          return ok([
            { id: cloudId, location: 'cloud', objectKey },
            { id: localId, location: 'local', objectKey: null },
          ]);
        }),
        finish: vi.fn(async () => {
          events.push('finish-workspace');
          return ok(true);
        }),
      },
      remove: vi.fn(async (key: string) => {
        events.push('remove:' + key);
        return ok(null);
      }),
      finishDelete: vi.fn(async (id: string) => {
        events.push('finish-media:' + id);
        return ok(null);
      }),
    };
  const run = createMediaHandler({ backend: async () => ok(backend) as never, decode: vi.fn() });
  const request = () =>
    new Request('https://example.invalid/media-upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer synthetic-token',
        Origin: 'http://127.0.0.1:5173',
        'Content-Type': 'application/json',
        'x-media-action': 'delete-workspace',
      },
      body: JSON.stringify({ workspaceId: workspace, expectedName: 'CCF test' }),
    });
  return { backend, events, run, request };
}
it('allows only the two exact owned Firebase origins for hosted media requests', async () => {
  const run = createMediaHandler({ backend: vi.fn(), decode: vi.fn() });
  for (const origin of [
    'https://gather-ccf-presentations.web.app',
    'https://gather-ccf-presentations.firebaseapp.com',
  ]) {
    const response = await run(
      new Request('https://example.invalid/media-upload', {
        method: 'OPTIONS',
        headers: { Origin: origin },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  }
  const bad = await run(
    new Request('https://example.invalid/media-upload', {
      method: 'OPTIONS',
      headers: { Origin: 'https://gather-ccf-presentations.web.app.attacker.invalid' },
    }),
  );
  expect(bad.status).toBe(403);
  expect(bad.headers.get('access-control-allow-origin')).toBeNull();
});
it('authorizes/freeze first, removes cloud bytes before metadata/quota, and finalizes workspace last', async () => {
  const f = fixture(),
    response = await f.run(f.request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(ok({ complete: true }));
  expect(f.events).toEqual([
    'begin',
    'batch',
    'remove:' + objectKey,
    'finish-media:' + cloudId,
    'finish-media:' + localId,
    'finish-workspace',
  ]);
  expect(f.backend.workspaceDeletion.begin).toHaveBeenCalledWith(workspace, 'CCF test');
});
it('does not free media or finish the workspace when cloud object removal is unconfirmed', async () => {
  const f = fixture();
  f.backend.remove.mockResolvedValue({
    ok: false,
    error: { code: 'NETWORK', message: 'Storage removal is not confirmed.' },
  } as never);
  expect((await f.run(f.request())).status).toBe(503);
  expect(f.backend.finishDelete).not.toHaveBeenCalled();
  expect(f.backend.workspaceDeletion.finish).not.toHaveBeenCalled();
});
it('refuses an unauthorized owner or pending upload before touching contents', async () => {
  const f = fixture();
  f.backend.workspaceDeletion.begin.mockResolvedValue({
    ok: false,
    error: { code: 'CONFLICT', message: 'Finish or reclaim unfinished image uploads.' },
  } as never);
  expect((await f.run(f.request())).status).toBe(409);
  expect(f.backend.workspaceDeletion.batch).not.toHaveBeenCalled();
  expect(f.backend.remove).not.toHaveBeenCalled();
});
it('rejects a foreign storage key before removing any item in a returned batch', async () => {
  const f = fixture();
  f.backend.workspaceDeletion.batch.mockResolvedValue(
    ok([
      { id: cloudId, location: 'cloud', objectKey: 'another-workspace/' + cloudId + '/bad.png' },
    ]),
  );
  expect((await f.run(f.request())).status).toBe(503);
  expect(f.backend.remove).not.toHaveBeenCalled();
});
it('reports a resumable partial batch without claiming the entire workspace is gone', async () => {
  const f = fixture();
  f.backend.workspaceDeletion.finish.mockResolvedValue(ok(false));
  const response = await f.run(f.request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(ok({ complete: false }));
});
it('can authorize and freeze before browser cleanup without deleting cloud bytes yet', async () => {
  const f = fixture(),
    request = f.request();
  request.headers.set('x-media-action', 'begin-delete-workspace');
  const response = await f.run(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(ok({ complete: false }));
  expect(f.events).toEqual(['begin']);
});
