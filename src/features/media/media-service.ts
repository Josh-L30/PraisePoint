import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  mediaAssetSchema,
  mediaId,
  type MediaAsset,
} from '../../../supabase/functions/_shared/media-contract';
import { failure, type Result } from '../../domain/result';
import type { ResolvedMedia } from '../../domain/media';
import { supabase } from '../../lib/supabase';
import { readDeviceSession } from '../../lib/device-session';
import { decodeMedia } from './decode-media';
import { hashMedia, readLocalMedia, writeLocalMedia, removeLocalMedia } from './local-media-store';
import { createMediaUrl } from './media-urls';
import { contentError } from '../songs/content-api';
const unavailable = () =>
  failure(
    'NETWORK',
    'This media operation could not be confirmed. Keep the original and refresh before retrying.',
  );
const invalid = () =>
  failure(
    'VALIDATION',
    'The media details could not be verified. Refresh the library or reselect the original file.',
  );
const denied = () =>
  failure(
    'FORBIDDEN',
    'Your profile changed or signed out. Reopen the library with your current profile.',
  );
const usageSchema = z
  .object({
    workspaceUsed: z.number().int().nonnegative(),
    workspaceReserved: z.number().int().nonnegative(),
    workspaceLimit: z.literal(52428800),
    applicationUsed: z.number().int().nonnegative(),
    applicationReserved: z.number().int().nonnegative(),
    applicationLimit: z.literal(524288000),
  })
  .strict()
  .refine(
    (value) =>
      value.workspaceUsed + value.workspaceReserved <= value.workspaceLimit &&
      value.applicationUsed + value.applicationReserved <= value.applicationLimit,
  );
const managementSchema = z
  .array(
    z
      .object({
        asset: mediaAssetSchema,
        state: z.enum(['uploading', 'aborting', 'deleting']),
        createdBy: mediaId,
        expiresAt: z.iso.datetime({ offset: true }).nullable(),
      })
      .strict(),
  )
  .max(25);
export type MediaUsage = z.infer<typeof usageSchema>;
export type MediaManagement = z.infer<typeof managementSchema>[number];
const responseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: z.unknown() }).strict(),
  z
    .object({
      ok: z.literal(false),
      error: z
        .object({
          code: z.enum([
            'UNAUTHENTICATED',
            'FORBIDDEN',
            'VALIDATION',
            'CONFLICT',
            'CAPACITY',
            'NOT_FOUND',
            'UNSUPPORTED',
            'STORAGE_UNAVAILABLE',
            'NETWORK',
          ]),
          message: z.string().min(1).max(1000),
        })
        .strict(),
    })
    .strict(),
]);
function fromRow(row: Record<string, unknown>) {
  return mediaAssetSchema.safeParse({
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    location: row.location,
    mime: row.mime,
    bytes: row.bytes,
    sha256: row.sha256,
    revision: row.revision,
    originalName: row.original_name,
  });
}
function same(a: MediaAsset, b: MediaAsset) {
  return (
    ['id', 'workspaceId', 'kind', 'location', 'mime', 'bytes', 'sha256', 'revision'] as const
  ).every((key) => a[key] === b[key]);
}
export function createMediaService(
  profileId: string,
  client: SupabaseClient | null = supabase,
  bindClient: (token: string) => SupabaseClient = (token) =>
    createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: 'Bearer ' + token } },
    }),
) {
  const attempts = new WeakMap<File, Map<string, MediaAsset>>();
  const resolutions = new Map<string, Promise<Result<Blob>>>();
  async function current() {
    try {
      const marker = await readDeviceSession();
      return marker?.profileId === profileId && !marker.signedOut;
    } catch {
      return false;
    }
  }
  async function scope(): Promise<Result<SupabaseClient>> {
    if (!client || !(await current())) return denied();
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session || data.session.user.id !== profileId || !(await current()))
        return denied();
      return { ok: true, value: bindClient(data.session.access_token) };
    } catch {
      return unavailable();
    }
  }
  async function finish<T>(result: Result<T>): Promise<Result<T>> {
    return (await current()) ? result : denied();
  }
  async function read(bound: SupabaseClient, id: string): Promise<Result<MediaAsset>> {
    if (!mediaId.safeParse(id).success) return invalid();
    try {
      const { data, error } = await bound
        .from('media_assets')
        .select('id,workspace_id,kind,location,mime,bytes,sha256,revision,original_name')
        .eq('id', id)
        .eq('state', 'active')
        .single();
      if (error) return contentError(error);
      const parsed = data && fromRow(data);
      return parsed?.success && parsed.data.id === id.toLowerCase()
        ? { ok: true, value: parsed.data }
        : invalid();
    } catch {
      return unavailable();
    }
  }
  async function invoke(
    bound: SupabaseClient,
    headers: Record<string, string>,
    body: File | Record<string, unknown>,
  ): Promise<Result<unknown>> {
    try {
      const { data, error } = await bound.functions.invoke('media-upload', { headers, body });
      // Only the endpoint's bounded Result contract is displayed; provider errors are never shown.
      let payload: unknown = data;
      if (error) {
        if (error.context instanceof Response) {
          try {
            payload = await error.context.json();
          } catch {
            return unavailable();
          }
        } else return unavailable();
      }
      const parsed = responseSchema.safeParse(payload);
      return parsed.success ? parsed.data : unavailable();
    } catch {
      return unavailable();
    }
  }
  function assetFor(
    file: File,
    workspaceId: string,
    location: 'cloud' | 'local',
    decoded: { kind: 'image' | 'video'; sha256: string },
  ): MediaAsset {
    let byWorkspace = attempts.get(file);
    if (!byWorkspace) {
      byWorkspace = new Map();
      attempts.set(file, byWorkspace);
    }
    const key = workspaceId + location,
      previous = byWorkspace.get(key);
    if (previous) return previous;
    const asset: MediaAsset = {
      id: crypto.randomUUID(),
      workspaceId: workspaceId.toLowerCase(),
      kind: decoded.kind,
      location,
      mime: file.type,
      bytes: file.size,
      sha256: decoded.sha256,
      revision: 1,
      originalName: file.name,
    };
    byWorkspace.set(key, asset);
    return asset;
  }
  async function bytesFor(bound: SupabaseClient, asset: MediaAsset): Promise<Result<Blob>> {
    const cached = await readLocalMedia(profileId, asset.id);
    if (cached.ok && same(cached.value.descriptor, asset))
      return { ok: true, value: cached.value.blob };
    if (asset.location === 'local') return cached.ok ? invalid() : cached;
    try {
      const extension = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[
        asset.mime
      ];
      if (!extension) return invalid();
      const { data, error } = await bound.storage
        .from('gather-images')
        .download(asset.workspaceId + '/' + asset.id + '/' + asset.sha256 + extension);
      if (error) return unavailable();
      if (
        !data ||
        data.size !== asset.bytes ||
        data.type !== asset.mime ||
        (await hashMedia(data)) !== asset.sha256
      )
        return invalid();
      return { ok: true, value: data };
    } catch {
      return unavailable();
    }
  }
  return {
    async list(
      workspaceId: string,
      page = 0,
    ): Promise<Result<{ items: MediaAsset[]; hasMore: boolean }>> {
      if (
        !mediaId.safeParse(workspaceId).success ||
        !Number.isInteger(page) ||
        page < 0 ||
        page > 100000
      )
        return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      try {
        const { data, error } = await bound.value
          .from('media_assets')
          .select('id,workspace_id,kind,location,mime,bytes,sha256,revision,original_name')
          .eq('workspace_id', workspaceId)
          .eq('state', 'active')
          .order('created_at', { ascending: false })
          .order('id')
          .range(page * 24, page * 24 + 24);
        if (error) return finish(contentError(error));
        if (!Array.isArray(data) || data.length > 25) return invalid();
        const parsed = data.map(fromRow);
        if (
          parsed.some(
            (item) => !item.success || item.data.workspaceId !== workspaceId.toLowerCase(),
          )
        )
          return invalid();
        return finish({
          ok: true,
          value: {
            items: parsed.slice(0, 24).map((item) => {
              if (!item.success) throw new Error('Unverified media');
              return item.data;
            }),
            hasMore: data.length > 24,
          },
        });
      } catch {
        return unavailable();
      }
    },
    async uploadImage(file: File, workspaceId: string): Promise<Result<MediaAsset>> {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
        return failure(
          'UNSUPPORTED',
          'Only still images are uploaded. Import videos as local files.',
        );
      if (!mediaId.safeParse(workspaceId).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      const decoded = await decodeMedia(file);
      if (!decoded.ok) return decoded;
      if (!(await current())) return denied();
      const asset = assetFor(file, workspaceId, 'cloud', decoded.value);
      const result = await invoke(
        bound.value,
        {
          'Content-Type': asset.mime,
          'x-media-id': asset.id,
          'x-workspace-id': asset.workspaceId,
          'x-file-size': String(asset.bytes),
          'x-file-sha256': asset.sha256,
          'x-file-name': encodeURIComponent(asset.originalName),
        },
        file,
      );
      if (!result.ok) return finish(result);
      const parsed = mediaAssetSchema.safeParse(result.value);
      if (!parsed.success || !same(parsed.data, asset)) return invalid();
      return finish({ ok: true, value: parsed.data });
    },
    async importLocalMedia(file: File, workspaceId: string): Promise<Result<MediaAsset>> {
      if (!mediaId.safeParse(workspaceId).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      const decoded = await decodeMedia(file);
      if (!decoded.ok) return decoded;
      const asset = assetFor(file, workspaceId, 'local', decoded.value),
        stored = await writeLocalMedia(profileId, asset, file);
      if (!stored.ok) return stored;
      if (!(await current())) return denied();
      try {
        const { data, error } = await bound.value.rpc('register_local_media', {
          p_asset: asset,
          p_width: decoded.value.width,
          p_height: decoded.value.height,
          p_duration: decoded.value.duration,
          p_source_media_id: null,
        });
        if (error) return finish(contentError(error));
        const parsed = mediaAssetSchema.safeParse(data);
        return parsed.success && same(parsed.data, asset)
          ? finish({ ok: true, value: parsed.data })
          : invalid();
      } catch {
        return unavailable();
      }
    },
    async resolveMedia(id: string): Promise<Result<ResolvedMedia>> {
      let pending = resolutions.get(id);
      if (!pending) {
        pending = (async () => {
          try {
            const bound = await scope();
            if (!bound.ok) return bound;
            const asset = await read(bound.value, id);
            return asset.ok ? bytesFor(bound.value, asset.value) : asset;
          } catch {
            return unavailable();
          }
        })();
        resolutions.set(id, pending);
        const active = pending;
        void pending.then(
          () => {
            if (resolutions.get(id) === active) resolutions.delete(id);
          },
          () => {
            if (resolutions.get(id) === active) resolutions.delete(id);
          },
        );
      }
      const bytes = await pending;
      if (!bytes.ok) return finish(bytes);
      if (!(await current())) return denied();
      return { ok: true, value: createMediaUrl(profileId, id, bytes.value) };
    },
    async verifyMedia(id: string): Promise<Result<MediaAsset>> {
      const bound = await scope();
      if (!bound.ok) return bound;
      const asset = await read(bound.value, id);
      if (!asset.ok) return finish(asset);
      const bytes = await bytesFor(bound.value, asset.value);
      if (!bytes.ok) return finish(bytes);
      const decoded = await decodeMedia(
        new File([bytes.value], asset.value.originalName, { type: asset.value.mime }),
      );
      if (!decoded.ok) return decoded;
      if (decoded.value.sha256 !== asset.value.sha256) return invalid();
      const cached = await writeLocalMedia(profileId, asset.value, bytes.value);
      return cached.ok ? finish(asset) : cached;
    },
    async relinkMedia(id: string, file: File): Promise<Result<MediaAsset>> {
      const bound = await scope();
      if (!bound.ok) return bound;
      const asset = await read(bound.value, id);
      if (!asset.ok) return finish(asset);
      const decoded = await decodeMedia(file);
      if (!decoded.ok) return decoded;
      if (
        decoded.value.sha256 !== asset.value.sha256 ||
        file.size !== asset.value.bytes ||
        file.type !== asset.value.mime
      )
        return failure(
          'VALIDATION',
          'Choose the exact original file. A different file must be imported as new media.',
        );
      if (!(await current())) return denied();
      if (asset.value.location === 'local') {
        try {
          const { data, error } = await bound.value.rpc('confirm_local_media_geometry', {
            p_media_id: id,
            p_width: decoded.value.width,
            p_height: decoded.value.height,
            p_duration: decoded.value.duration,
          });
          if (error) return finish(contentError(error));
          const confirmed = mediaAssetSchema.safeParse(data);
          if (!confirmed.success || !same(confirmed.data, asset.value)) return invalid();
        } catch {
          return unavailable();
        }
      }
      const cached = await writeLocalMedia(profileId, asset.value, file);
      return cached.ok ? finish(asset) : cached;
    },
    async copyMedia(id: string, destinationWorkspaceId: string): Promise<Result<MediaAsset>> {
      if (!mediaId.safeParse(destinationWorkspaceId).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      const source = await read(bound.value, id);
      if (!source.ok) return finish(source);
      const asset = {
        ...source.value,
        id: crypto.randomUUID(),
        workspaceId: destinationWorkspaceId.toLowerCase(),
        revision: 1,
      };
      if (asset.location === 'cloud') {
        const result = await invoke(
          bound.value,
          { 'x-media-action': 'copy' },
          { mediaId: id, destinationWorkspaceId: asset.workspaceId, newMediaId: asset.id },
        );
        if (!result.ok) return finish(result);
        const parsed = mediaAssetSchema.safeParse(result.value);
        return parsed.success && same(parsed.data, asset)
          ? finish({ ok: true, value: parsed.data })
          : invalid();
      }
      const bytes = await bytesFor(bound.value, source.value);
      if (!bytes.ok) return finish(bytes);
      const decoded = await decodeMedia(
        new File([bytes.value], asset.originalName, { type: asset.mime }),
      );
      if (!decoded.ok) return decoded;
      const cached = await writeLocalMedia(profileId, asset, bytes.value);
      if (!cached.ok) return cached;
      if (!(await current())) return denied();
      try {
        const { data, error } = await bound.value.rpc('register_local_media', {
          p_asset: asset,
          p_width: decoded.value.width,
          p_height: decoded.value.height,
          p_duration: decoded.value.duration,
          p_source_media_id: id,
        });
        if (error) return finish(contentError(error));
        const parsed = mediaAssetSchema.safeParse(data);
        return parsed.success && same(parsed.data, asset)
          ? finish({ ok: true, value: parsed.data })
          : invalid();
      } catch {
        return unavailable();
      }
    },
    async deleteMedia(id: string): Promise<Result<void>> {
      if (!mediaId.safeParse(id).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      const result = await invoke(bound.value, { 'x-media-action': 'delete' }, { mediaId: id });
      if (!result.ok) return finish(result);
      if (result.value !== null) return invalid();
      const removed = await removeLocalMedia(profileId, id);
      return removed.ok ? finish({ ok: true, value: undefined }) : removed;
    },
    async retryImage(asset: MediaAsset, file: File): Promise<Result<MediaAsset>> {
      const parsedAsset = mediaAssetSchema.safeParse(asset);
      if (!parsedAsset.success || asset.location !== 'cloud' || asset.kind !== 'image')
        return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      const decoded = await decodeMedia(file);
      if (!decoded.ok) return decoded;
      if (
        decoded.value.sha256 !== asset.sha256 ||
        file.size !== asset.bytes ||
        file.type !== asset.mime
      )
        return failure('VALIDATION', 'Choose the exact original image for this unfinished upload.');
      if (!(await current())) return denied();
      const result = await invoke(
        bound.value,
        {
          'Content-Type': asset.mime,
          'x-media-id': asset.id,
          'x-workspace-id': asset.workspaceId,
          'x-file-size': String(asset.bytes),
          'x-file-sha256': asset.sha256,
          'x-file-name': encodeURIComponent(asset.originalName),
        },
        file,
      );
      if (!result.ok) return finish(result);
      const parsed = mediaAssetSchema.safeParse(result.value);
      return parsed.success && same(parsed.data, asset)
        ? finish({ ok: true, value: parsed.data })
        : invalid();
    },
    async getUsage(workspaceId: string): Promise<Result<MediaUsage>> {
      if (!mediaId.safeParse(workspaceId).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      try {
        const { data, error } = await bound.value.rpc('get_media_usage', {
          p_workspace_id: workspaceId,
        });
        if (error) return finish(contentError(error));
        const parsed = usageSchema.safeParse(data);
        return parsed.success ? finish({ ok: true, value: parsed.data }) : invalid();
      } catch {
        return unavailable();
      }
    },
    async getManagement(workspaceId: string): Promise<Result<MediaManagement[]>> {
      if (!mediaId.safeParse(workspaceId).success) return invalid();
      const bound = await scope();
      if (!bound.ok) return bound;
      try {
        const { data, error } = await bound.value.rpc('get_media_management', {
          p_workspace_id: workspaceId,
        });
        if (error) return finish(contentError(error));
        const parsed = managementSchema.safeParse(data);
        return parsed.success &&
          parsed.data.every((item) => item.asset.workspaceId === workspaceId.toLowerCase())
          ? finish({ ok: true, value: parsed.data })
          : invalid();
      } catch {
        return unavailable();
      }
    },
    async cleanupUploads(): Promise<Result<{ reclaimed: number }>> {
      const bound = await scope();
      if (!bound.ok) return bound;
      const result = await invoke(bound.value, { 'x-media-action': 'cleanup' }, {});
      if (!result.ok) return finish(result);
      const parsed = z
        .object({ reclaimed: z.number().int().min(0).max(20) })
        .strict()
        .safeParse(result.value);
      return parsed.success ? finish({ ok: true, value: parsed.data }) : invalid();
    },
  };
}
export type MediaService = ReturnType<typeof createMediaService>;
