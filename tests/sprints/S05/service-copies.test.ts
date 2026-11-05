import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSongService } from '../../../src/features/songs/song-service';
import { createServiceService } from '../../../src/features/services/service-service';
import { createTemplate } from '../../../src/features/decks/templates';
const ws = 'a5000000-0000-4000-8000-000000000001',
  sid = 'a5000000-0000-4000-8000-000000000010',
  pid = 'a5000000-0000-4000-8000-000000000020';
const song = {
  id: sid,
  workspaceId: ws,
  title: 'Our song',
  lyrics: 'Verse\n\nChorus',
  author: null,
  source: null,
  usageNotes: null,
  revision: 1,
};
const plan = {
  id: pid,
  workspaceId: ws,
  title: 'Sunday',
  date: '2026-11-01',
  revision: 1,
  items: [],
};
function client(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}
it('saves song masters explicitly with their revision and preserves the caller draft', async () => {
  const mock = client({ ...song, revision: 2 }),
    service = createSongService(mock.client);
  expect(await service.saveSong(song, 1)).toEqual({ ok: true, value: { ...song, revision: 2 } });
  expect(mock.rpc).toHaveBeenCalledWith('save_song', { p_song: song, p_expected_revision: 1 });
  expect(song.revision).toBe(1);
});
it('refuses unchanged response revisions and malformed songs before writing', async () => {
  const mock = client(song),
    service = createSongService(mock.client);
  expect((await service.saveSong(song, 1)).ok).toBe(false);
  mock.rpc.mockClear();
  expect((await service.saveSong({ ...song, lyrics: '   ' }, 1)).ok).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('keeps a conflicting draft and does not retry an overwrite', async () => {
  const mock = client(null, { code: '40001' }),
    service = createSongService(mock.client);
  const result = await service.saveSong(song, 1);
  expect(result.ok ? null : result.error.code).toBe('CONFLICT');
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(song.lyrics).toBe('Verse\n\nChorus');
});
it('adds a reviewed song as a server-owned atomic copy', async () => {
  const mock = client('a5000000-0000-4000-8000-000000000030'),
    service = createServiceService(mock.client);
  expect(
    (await service.addSongToService(sid, pid, { songRevision: 1, serviceRevision: 1 })).ok,
  ).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith('add_song_to_service', {
    p_song_id: sid,
    p_service_id: pid,
    p_expected_song_revision: 1,
    p_expected_service_revision: 1,
  });
});
it('saves ordered stable items without mutating IDs and rejects duplicates', async () => {
  const item = { id: sid, deckId: sid, label: 'Song', position: 0 },
    draft = { ...plan, items: [item] },
    mock = client({ ...draft, revision: 2 });
  const service = createServiceService(mock.client);
  expect((await service.saveService(draft, 1)).ok).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith('save_service_plan', {
    p_plan: draft,
    p_expected_revision: 1,
  });
  mock.rpc.mockClear();
  expect(
    (await service.saveService({ ...draft, items: [item, { ...item, position: 1 }] }, 1)).ok,
  ).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('rejects foreign and malformed service responses', async () => {
  const mock = client({ ...plan, workspaceId: sid, revision: 2 }),
    service = createServiceService(mock.client);
  expect((await service.saveService(plan, 1)).ok).toBe(false);
  expect((await service.saveService({ ...plan, date: '2026-02-30' }, 1)).ok).toBe(false);
});
it('rejects unverified and empty snapshots', async () => {
  const mock = client({
    schemaVersion: 1,
    serviceId: pid,
    workspaceId: ws,
    sourceRevision: 'invented',
    title: 'Sunday',
    slides: [],
    media: [],
    sections: [],
  });
  expect((await createServiceService(mock.client).buildServiceSnapshot(pid)).ok).toBe(false);
});
it('validates section coverage and freezes an independent snapshot', async () => {
  const slide = createTemplate('lyrics'),
    snapshot = {
      schemaVersion: 1,
      serviceId: pid,
      workspaceId: ws,
      sourceRevision: 'a'.repeat(64),
      title: 'Sunday',
      slides: [slide],
      media: [],
      sections: [
        { id: sid, deckId: sid, label: 'Song', startIndex: 0, slideCount: 1, sourceSongId: sid },
      ],
    };
  const mock = client(snapshot),
    service = createServiceService(mock.client),
    result = await service.buildServiceSnapshot(pid);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('snapshot missing');
  expect(Object.isFrozen(result.value.slides[0].elements)).toBe(true);
  expect(() => {
    result.value.slides[0].elements.length = 0;
  }).toThrow();
  expect(slide.elements.length).toBe(1);
  mock.rpc.mockResolvedValue({
    data: { ...snapshot, sections: [{ ...snapshot.sections[0], startIndex: 1 }] },
    error: null,
  });
  expect((await service.buildServiceSnapshot(pid)).ok).toBe(false);
  mock.rpc.mockResolvedValue({
    data: {
      ...snapshot,
      slides: [slide, slide],
      sections: [{ ...snapshot.sections[0], slideCount: 2 }],
    },
    error: null,
  });
  expect((await service.buildServiceSnapshot(pid)).ok).toBe(false);
});
