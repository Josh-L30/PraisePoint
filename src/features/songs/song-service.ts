import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Song } from '../../domain/song';
import type { Result } from '../../domain/result';
import { supabase } from '../../lib/supabase';
import {
  contentId as id,
  contentRevision as revision,
  contentTitle as title,
  contentError,
  invalidContent,
} from './content-api';
import { splitLyrics } from './split-lyrics';
export const songSchema = z
  .object({
    id,
    workspaceId: id,
    title,
    lyrics: z
      .string()
      .min(1)
      .max(200000)
      .refine((value) => !!value.trim()),
    author: z.string().max(500).nullable(),
    source: z.string().max(2000).nullable(),
    usageNotes: z.string().max(2000).nullable(),
    revision,
  })
  .strict();
export type SongSummary = Pick<Song, 'id' | 'workspaceId' | 'title' | 'author' | 'revision'>;
export type SongService = {
  list(
    workspaceId: string,
    search?: string,
    page?: number,
  ): Promise<Result<{ items: SongSummary[]; hasMore: boolean }>>;
  getSong(id: string): Promise<Result<Song>>;
  saveSong(song: Song, expectedRevision: number): Promise<Result<Song>>;
  deleteSong(id: string): Promise<Result<void>>;
};
export function createSongService(client: SupabaseClient | null): SongService {
  function parse(data: unknown, expectedId: string, workspace?: string): Result<Song> {
    const value = songSchema.safeParse(data);
    return value.success &&
      value.data.revision > 0 &&
      value.data.id === expectedId.toLowerCase() &&
      (!workspace || value.data.workspaceId === workspace.toLowerCase())
      ? { ok: true, value: value.data }
      : invalidContent();
  }
  return {
    async list(workspaceId, search = '', page = 0) {
      if (
        !id.safeParse(workspaceId).success ||
        search.length > 120 ||
        !Number.isInteger(page) ||
        page < 0 ||
        page > 100000
      )
        return invalidContent();
      if (!client) return contentError(null);
      try {
        let query = client
          .from('songs')
          .select('id,workspace_id,title,author,revision')
          .eq('workspace_id', workspaceId);
        if (search.trim())
          query = query.ilike('title', '%' + search.trim().replace(/[\\%_]/g, '\\$&') + '%');
        const { data, error } = await query
          .order('title')
          .order('id')
          .range(page * 24, page * 24 + 24);
        if (error) return contentError(error);
        const parsed = z
          .array(
            z
              .object({
                id,
                workspace_id: id,
                title,
                author: z.string().max(500).nullable(),
                revision: revision.min(1),
              })
              .strict(),
          )
          .max(25)
          .safeParse(data);
        if (
          !parsed.success ||
          parsed.data.some((s) => s.workspace_id !== workspaceId.toLowerCase())
        )
          return invalidContent();
        return {
          ok: true,
          value: {
            items: parsed.data.slice(0, 24).map((s) => ({
              id: s.id,
              workspaceId: s.workspace_id,
              title: s.title,
              author: s.author,
              revision: s.revision,
            })),
            hasMore: parsed.data.length > 24,
          },
        };
      } catch {
        return contentError(null);
      }
    },
    async getSong(songId) {
      if (!id.safeParse(songId).success) return invalidContent();
      if (!client) return contentError(null);
      try {
        const { data, error } = await client
          .from('songs')
          .select('id,workspace_id,title,lyrics,author,source,usage_notes,revision')
          .eq('id', songId)
          .single();
        if (error) return contentError(error);
        if (!data) return invalidContent();
        return parse(
          {
            id: data.id,
            workspaceId: data.workspace_id,
            title: data.title,
            lyrics: data.lyrics,
            author: data.author,
            source: data.source,
            usageNotes: data.usage_notes,
            revision: data.revision,
          },
          songId,
        );
      } catch {
        return contentError(null);
      }
    },
    async saveSong(song, expectedRevision) {
      const parsed = songSchema.safeParse(song);
      if (!parsed.success || !revision.safeParse(expectedRevision).success) return invalidContent();
      try {
        const chunks = splitLyrics(parsed.data.lyrics, 4);
        if (chunks.length > 200 || chunks.some((s) => s.text.length > 20000))
          return invalidContent();
      } catch {
        return invalidContent();
      }
      if (!client) return contentError(null);
      try {
        const { data, error } = await client.rpc('save_song', {
          p_song: parsed.data,
          p_expected_revision: expectedRevision,
        });
        if (error) return contentError(error);
        const result = parse(data, song.id, song.workspaceId);
        return result.ok && result.value.revision !== expectedRevision + 1
          ? invalidContent()
          : result;
      } catch {
        return contentError(null);
      }
    },
    async deleteSong(songId) {
      if (!id.safeParse(songId).success) return invalidContent();
      if (!client) return contentError(null);
      try {
        const { error } = await client.rpc('delete_song', { p_id: songId });
        return error ? contentError(error) : { ok: true, value: undefined };
      } catch {
        return contentError(null);
      }
    },
  };
}
export const songService = createSongService(supabase);
