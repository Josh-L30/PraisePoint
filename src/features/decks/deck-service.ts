import { noteLocalContentChange } from '../offline/content-changes';
import type { MediaService } from '../media/media-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeckDocument, SavedDeck } from '../../domain/deck';
import type { SlideCategory } from '../../domain/slide';
import { failure, type Result } from '../../domain/result';
import { z } from 'zod';
import { validateDeck, categories } from '../../domain/slide-schema';
import { createTemplate, templateNames } from './templates';
import { supabase } from '../../lib/supabase';
import { contentError } from '../songs/content-api';
export type DeckSummary = {
  id: string;
  workspaceId: string;
  title: string;
  revision: number;
  createdBy: string;
  updatedAt: string;
};
export type DeckService = {
  list(
    workspaceId: string,
    page?: number,
  ): Promise<Result<{ items: DeckSummary[]; hasMore: boolean }>>;
  createDeck(workspaceId: string, category: SlideCategory): Promise<Result<SavedDeck>>;
  getDeck(id: string): Promise<Result<SavedDeck>>;
  saveDeck(document: DeckDocument, expectedRevision: number): Promise<Result<SavedDeck>>;
  duplicateDeck(id: string, destinationWorkspaceId: string): Promise<Result<SavedDeck>>;
  saveCopy(document: DeckDocument, destinationWorkspaceId: string): Promise<Result<SavedDeck>>;
  deleteDeck(id: string): Promise<Result<void>>;
};
export function createDeckService(
  client: SupabaseClient | null,
  media?: Pick<MediaService, 'copyMedia'>,
): DeckService {
  const id = z.uuid(),
    revision = z.number().int().positive().max(2147483647),
    pageSize = 24;
  const summary = z
    .array(
      z
        .object({
          id,
          workspace_id: id,
          title: z.string().min(1).max(120),
          revision,
          created_by: id,
          updated_at: z.iso.datetime({ offset: true }),
        })
        .strict(),
    )
    .max(pageSize + 1);
  const invalid = () =>
    failure(
      'VALIDATION',
      'This presentation response could not be verified. Refresh before continuing.',
    );
  const unavailable = () =>
    failure('NETWORK', 'The administrator needs to connect Supabase first.');
  function serverError(error: unknown): Result<never> {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    switch (code) {
      case '40001':
        return failure(
          'CONFLICT',
          'Someone saved a newer revision. Your draft is still here. Reload their version or save your draft as a copy.',
        );
      case '23505':
        return failure(
          'CONFLICT',
          'This presentation already exists. Refresh your library before trying again.',
        );
      case '23503':
        return contentError(error);
      case '53000':
      case '53100':
        return failure(
          'CAPACITY',
          'The free application document capacity has been reached. Your draft is still here. Ask your owner to free space.',
        );
      case 'P0001':
        return failure(
          'CAPACITY',
          'The save limit has been reached. Keep your draft and try again in a minute.',
        );
      case '0A000':
        return failure(
          'UNSUPPORTED',
          'This presentation contains media that is not available in the destination workspace. Add or relink those files first.',
        );
      case '42501':
        return failure(
          'FORBIDDEN',
          'You no longer have access to change this presentation, or it is unavailable.',
        );
      case '28000':
      case 'PGRST301':
        return failure('UNAUTHENTICATED', 'Sign in with Google again to continue.');
      case 'PGRST116':
        return failure('NOT_FOUND', 'This presentation is unavailable. Return to your library.');
      case '22023':
      case '22003':
        return failure(
          'VALIDATION',
          'This presentation has invalid or oversized content. Your draft has not been discarded.',
        );
      default:
        return failure(
          'NETWORK',
          'This change could not be confirmed. Keep your draft, check your connection, and retry.',
        );
    }
  }
  function saved(
    data: unknown,
    expectedId?: string,
    expectedWorkspace?: string,
  ): Result<SavedDeck> {
    const envelope = z.object({ document: z.unknown(), revision }).strict().safeParse(data);
    if (!envelope.success) return invalid();
    const doc = validateDeck(envelope.data.document);
    if (!doc.ok) return doc;
    if (
      (expectedId && doc.value.id !== expectedId.toLowerCase()) ||
      (expectedWorkspace && doc.value.workspaceId !== expectedWorkspace.toLowerCase())
    )
      return invalid();
    return { ok: true, value: { document: doc.value, revision: envelope.data.revision } };
  }
  async function write(
    name: string,
    args: Record<string, unknown>,
    expectedId?: string,
    expectedWorkspace?: string,
  ): Promise<Result<SavedDeck>> {
    if (!client) return unavailable();
    try {
      const { data, error } = await client.rpc(name, args);
      if (!error) await noteLocalContentChange();
      return error ? serverError(error) : saved(data, expectedId, expectedWorkspace);
    } catch {
      return serverError(null);
    }
  }
  async function copy(
    sourceId: string,
    destination: string,
    draft: DeckDocument | null,
  ): Promise<Result<SavedDeck>> {
    if (!id.safeParse(sourceId).success || !id.safeParse(destination).success) return invalid();
    if (media && client) {
      try {
        const { data, error } = await client
          .from('decks')
          .select('document,revision')
          .eq('id', sourceId)
          .single();
        if (error) return serverError(error);
        const source = saved(data, sourceId);
        if (!source.ok) return source;
        if (source.value.document.workspaceId !== destination.toLowerCase()) {
          const document = draft ?? source.value.document,
            refs = new Set<string>();
          for (const slide of document.slides) {
            if (slide.background.kind !== 'solid') refs.add(slide.background.mediaId);
            if (slide.standaloneVideoId) refs.add(slide.standaloneVideoId);
            for (const element of slide.elements)
              if (element.kind === 'image') refs.add(element.mediaId);
          }
          if (refs.size) {
            const mapping: { sourceId: string; destinationId: string }[] = [];
            for (const mediaId of refs) {
              const copied = await media.copyMedia(mediaId, destination);
              if (!copied.ok)
                return {
                  ok: false,
                  error: {
                    ...copied.error,
                    message:
                      copied.error.message +
                      ' Any completed media copies remain in the destination library for review.',
                  },
                };
              if (
                !id.safeParse(copied.value.id).success ||
                copied.value.workspaceId !== destination.toLowerCase()
              )
                return invalid();
              mapping.push({ sourceId: mediaId, destinationId: copied.value.id });
            }
            const result = await write(
              'duplicate_slide_deck_with_media',
              {
                p_deck_id: sourceId,
                p_destination_workspace_id: destination,
                p_expected_revision: source.value.revision,
                p_media_map: mapping,
                p_draft: draft,
              },
              undefined,
              destination,
            );
            return result.ok &&
              (result.value.document.id === sourceId.toLowerCase() || result.value.revision !== 1)
              ? invalid()
              : result;
          }
        }
      } catch {
        return serverError(null);
      }
    }
    const result = await write(
      'duplicate_slide_deck',
      { p_deck_id: sourceId, p_destination_workspace_id: destination, p_draft: draft },
      undefined,
      destination,
    );
    return result.ok &&
      (result.value.document.id === sourceId.toLowerCase() || result.value.revision !== 1)
      ? invalid()
      : result;
  }
  return {
    async list(workspaceId, page = 0) {
      if (
        !id.safeParse(workspaceId).success ||
        !Number.isInteger(page) ||
        page < 0 ||
        page > 100000
      )
        return invalid();
      if (!client) return unavailable();
      try {
        const { data, error } = await client
          .from('decks')
          .select('id,workspace_id,title,revision,created_by,updated_at')
          .eq('workspace_id', workspaceId)
          .order('updated_at', { ascending: false })
          .order('id')
          .range(page * pageSize, page * pageSize + pageSize);
        if (error) return serverError(error);
        const parsed = summary.safeParse(data);
        if (!parsed.success || parsed.data.some((item) => item.workspace_id !== workspaceId))
          return invalid();
        return {
          ok: true,
          value: {
            hasMore: parsed.data.length > pageSize,
            items: parsed.data.slice(0, pageSize).map((item) => ({
              id: item.id,
              workspaceId: item.workspace_id,
              title: item.title,
              revision: item.revision,
              createdBy: item.created_by,
              updatedAt: item.updated_at,
            })),
          },
        };
      } catch {
        return serverError(null);
      }
    },
    async createDeck(workspaceId, category) {
      if (!id.safeParse(workspaceId).success || !categories.includes(category)) return invalid();
      const document: DeckDocument = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        workspaceId,
        title: templateNames[category] + ' presentation',
        width: 1920,
        height: 1080,
        slides: [createTemplate(category)],
      };
      const result = await write(
        'create_slide_deck',
        { p_workspace_id: workspaceId, p_document: document },
        document.id,
        workspaceId,
      );
      return result.ok && result.value.revision !== 1 ? invalid() : result;
    },
    async getDeck(deckId) {
      if (!id.safeParse(deckId).success) return invalid();
      if (!client) return unavailable();
      try {
        const { data, error } = await client
          .from('decks')
          .select('document,revision')
          .eq('id', deckId)
          .single();
        return error ? serverError(error) : saved(data, deckId);
      } catch {
        return serverError(null);
      }
    },
    async saveDeck(document, expectedRevision) {
      const parsed = validateDeck(document);
      if (!parsed.ok) return parsed;
      if (!revision.safeParse(expectedRevision).success)
        return failure(
          'VALIDATION',
          'Refresh to restore this presentation’s revision before saving.',
        );
      const result = await write(
        'save_slide_deck',
        { p_document: parsed.value, p_expected_revision: expectedRevision },
        document.id,
        document.workspaceId,
      );
      return result.ok && result.value.revision !== expectedRevision + 1 ? invalid() : result;
    },
    duplicateDeck: (deckId, destination) => copy(deckId, destination, null),
    async saveCopy(document, destination) {
      const parsed = validateDeck(document);
      return parsed.ok ? copy(document.id, destination, parsed.value) : parsed;
    },
    async deleteDeck(deckId) {
      if (!id.safeParse(deckId).success) return invalid();
      if (!client) return unavailable();
      try {
        const { error } = await client.rpc('delete_slide_deck', { p_deck_id: deckId });
        if (!error) await noteLocalContentChange();
        return error ? serverError(error) : { ok: true, value: undefined };
      } catch {
        return serverError(null);
      }
    },
  };
}
export const deckService = createDeckService(supabase);
