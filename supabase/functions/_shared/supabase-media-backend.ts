import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cloudMediaKey,
  mediaAssetSchema,
  mediaId,
  workspaceDeletionItemSchema,
  type MediaBackend,
  type MediaErrorCode,
  type MediaResult,
} from './media-contract.ts';
const ok = <T>(value: T): MediaResult<T> => ({ ok: true, value });
const fail = (code: MediaErrorCode, message: string): MediaResult<never> => ({
  ok: false,
  error: { code, message },
});
export function mediaBackendError(error: unknown): MediaResult<never> {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case '28000':
    case 'PGRST301':
      return fail('UNAUTHENTICATED', 'Sign in with Google again to continue.');
    case '42501':
    case 'PGRST116':
      return fail('FORBIDDEN', 'This media is unavailable or you no longer have permission.');
    case '40001':
    case '23505':
      return fail(
        'CONFLICT',
        'This media operation has changed. Refresh the library before retrying.',
      );
    case '23503':
      return fail(
        'CONFLICT',
        'This media is still referenced. Remove its presentation or pending copy references first.',
      );
    case '55000':
      return fail(
        'CONFLICT',
        'Finish or reclaim unfinished image uploads before deleting this workspace. Wait for active upload leases to expire before reclaiming.',
      );
    case '55006':
      return fail(
        'CONFLICT',
        'This workspace is being deleted. Its owner can resume deletion from Church workspace.',
      );
    case 'P0011':
      return fail(
        'STORAGE_UNAVAILABLE',
        'Some workspace files or storage charges remain. Resume deletion or contact the maintainer before considering cleanup complete.',
      );
    case '53000':
    case '53100':
      return fail('CAPACITY', 'The free storage capacity is full. Ask the owner to free space.');
    case 'P0001':
      return fail(
        'CAPACITY',
        'The upload limit has been reached. Keep the original and try again later.',
      );
    case '22023':
    case '22003':
      return fail(
        'VALIDATION',
        'The file details or decoded dimensions are invalid. Choose the original file.',
      );
    case '0A000':
      return fail('UNSUPPORTED', 'This media type or operation is unavailable.');
    default:
      return fail(
        'NETWORK',
        'The media operation could not be confirmed. Keep the original and refresh before retrying.',
      );
  }
}
type ActorClient = {
  auth: {
    getUser(token: string): Promise<{
      data: {
        user: {
          id: string;
          email_confirmed_at?: string | null;
          app_metadata: Record<string, unknown>;
        } | null;
      };
      error: unknown;
    }>;
  };
};
export async function verifyMediaActor(
  client: ActorClient,
  authorization: string,
): Promise<MediaResult<null>> {
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return fail('UNAUTHENTICATED', 'Sign in with Google to continue.');
  try {
    const { data, error } = await client.auth.getUser(match[1]);
    if (
      error ||
      !data.user ||
      !data.user.email_confirmed_at ||
      data.user.app_metadata.provider !== 'google'
    )
      return fail('UNAUTHENTICATED', 'Sign in with your verified Google account to continue.');
    return ok(null);
  } catch {
    return fail('UNAUTHENTICATED', 'Your Google session could not be verified. Sign in again.');
  }
}
const pending = z
  .object({
    status: z.literal('pending'),
    reservationId: mediaId,
    objectKey: z.string().min(1).max(512),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const active = z.object({ status: z.literal('active'), media: mediaAssetSchema }).strict();
const reservation = z.discriminatedUnion('status', [pending, active]);
const claim = z.discriminatedUnion('status', [
  z.object({ status: z.literal('claimed') }).strict(),
  z.object({ status: z.literal('busy') }).strict(),
  active,
]);
const aborted = z.discriminatedUnion('status', [
  z.object({ status: z.literal('busy') }).strict(),
  z
    .object({
      status: z.literal('aborting'),
      reservationId: mediaId,
      objectKey: z.string().min(1).max(512),
    })
    .strict(),
  active,
  z.object({ status: z.literal('missing') }).strict(),
]);
const deleting = z
  .object({
    id: mediaId,
    location: z.enum(['cloud', 'local']),
    objectKey: z.string().min(1).max(512).nullable(),
  })
  .strict()
  .refine((row) => (row.location === 'cloud' ? row.objectKey !== null : row.objectKey === null));
const expired = z
  .array(z.object({ reservationId: mediaId, objectKey: z.string().min(1).max(512) }).strict())
  .max(20);
const empty = z.null();
const bucket = 'gather-images';
/** User-scoped authorization and server-only object operations stay on separate clients. */
export function createSupabaseMediaBackend(
  user: SupabaseClient,
  admin: SupabaseClient,
): MediaBackend {
  async function rpc<T>(
    client: SupabaseClient,
    name: string,
    args: Record<string, unknown>,
    schema: z.ZodType<T>,
  ): Promise<MediaResult<T>> {
    try {
      const { data, error } = await client.rpc(name, args);
      if (error) return mediaBackendError(error);
      const parsed = schema.safeParse(data);
      return parsed.success
        ? ok(parsed.data)
        : fail('NETWORK', 'The media response could not be verified. Refresh before retrying.');
    } catch (error) {
      return mediaBackendError(error);
    }
  }
  return {
    workspaceDeletion: {
      begin: (workspaceId, expectedName) =>
        rpc(
          user,
          'begin_workspace_deletion',
          { p_workspace_id: workspaceId, p_expected_name: expectedName },
          empty,
        ),
      batch: (workspaceId) =>
        rpc(
          user,
          'workspace_deletion_batch',
          { p_workspace_id: workspaceId },
          workspaceDeletionItemSchema.array().max(25),
        ),
      finish: (workspaceId) =>
        rpc(user, 'finish_workspace_deletion', { p_workspace_id: workspaceId }, z.boolean()),
    },
    reserve: (asset, sourceId) =>
      rpc(
        user,
        'reserve_image_upload',
        { p_asset: asset, p_source_media_id: sourceId },
        reservation,
      ),
    claim: (id) => rpc(admin, 'media_begin_write', { p_reservation_id: id }, claim),
    finalize: (id, sha, width, height) =>
      rpc(
        admin,
        'media_finalize_upload',
        { p_reservation_id: id, p_sha256: sha, p_width: width, p_height: height },
        mediaAssetSchema,
      ),
    abort: (id, writerClaimed = false) =>
      rpc(
        admin,
        'media_abort_upload',
        { p_reservation_id: id, p_writer_claimed: writerClaimed },
        aborted,
      ),
    release: (id) => rpc(admin, 'media_release_upload', { p_reservation_id: id }, empty),
    beginDelete: (id) => rpc(user, 'begin_media_delete', { p_media_id: id }, deleting),
    finishDelete: (id) => rpc(admin, 'media_finish_delete', { p_media_id: id }, empty),
    expired: () => rpc(admin, 'media_expired_uploads', {}, expired),
    async readAsset(id) {
      try {
        const { data, error } = await user
          .from('media_assets')
          .select('id,workspace_id,kind,location,mime,bytes,sha256,revision,original_name')
          .eq('id', id)
          .eq('state', 'active')
          .single();
        if (error) return mediaBackendError(error);
        const parsed = mediaAssetSchema.safeParse(
          data
            ? {
                id: data.id,
                workspaceId: data.workspace_id,
                kind: data.kind,
                location: data.location,
                mime: data.mime,
                bytes: data.bytes,
                sha256: data.sha256,
                revision: data.revision,
                originalName: data.original_name,
              }
            : null,
        );
        return parsed.success
          ? ok(parsed.data)
          : fail('NETWORK', 'The media response could not be verified.');
      } catch (error) {
        return mediaBackendError(error);
      }
    },
    async upload(key, bytes, mime) {
      try {
        const { error } = await admin.storage
          .from(bucket)
          .upload(key, new Uint8Array(bytes).buffer, {
            contentType: mime,
            upsert: false,
            cacheControl: '3600',
          });
        return error ? mediaBackendError(error) : ok(null);
      } catch (error) {
        return mediaBackendError(error);
      }
    },
    async download(asset) {
      if (asset.location !== 'cloud' || asset.kind !== 'image')
        return fail('UNSUPPORTED', 'Videos remain on the laptop.');
      try {
        const { data, error } = await admin.storage.from(bucket).download(cloudMediaKey(asset));
        if (error) return mediaBackendError(error);
        if (!data || data.size !== asset.bytes || data.size > 5 * 1024 * 1024)
          return fail('VALIDATION', 'The stored image has an unexpected size.');
        return ok(new Uint8Array(await data.arrayBuffer()));
      } catch (error) {
        return mediaBackendError(error);
      }
    },
    async remove(key) {
      try {
        const { error } = await admin.storage.from(bucket).remove([key]);
        return error ? mediaBackendError(error) : ok(null);
      } catch (error) {
        return mediaBackendError(error);
      }
    },
  };
}
