import { z } from 'zod';
export const mediaId = z.uuid().transform((value) => value.toLowerCase());
export const mediaAssetSchema = z
  .object({
    id: mediaId,
    workspaceId: mediaId,
    kind: z.enum(['image', 'video']),
    mime: z.string(),
    bytes: z
      .number()
      .int()
      .min(1)
      .max(128 * 1024 * 1024),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    revision: z.number().int().min(1).max(2147483647),
    location: z.enum(['cloud', 'local']),
    originalName: z
      .string()
      .min(1)
      .max(255)
      .refine((value) => !!value.trim()),
  })
  .strict()
  .refine((asset) =>
    asset.kind === 'image'
      ? ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mime) &&
        asset.bytes <= 5 * 1024 * 1024
      : asset.location === 'local' && ['video/mp4', 'video/webm'].includes(asset.mime),
  );
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'CAPACITY'
  | 'NOT_FOUND'
  | 'UNSUPPORTED'
  | 'STORAGE_UNAVAILABLE'
  | 'NETWORK';
export type MediaResult<T> =
  { ok: true; value: T } | { ok: false; error: { code: MediaErrorCode; message: string } };
export type PendingUpload = {
  status: 'pending';
  reservationId: string;
  objectKey: string;
  expiresAt: string;
};
export type Reservation = PendingUpload | { status: 'active'; media: MediaAsset };
export type WriteClaim =
  { status: 'claimed' } | { status: 'busy' } | { status: 'active'; media: MediaAsset };
export type AbortedUpload =
  | { status: 'busy' }
  | { status: 'aborting'; reservationId: string; objectKey: string }
  | { status: 'active'; media: MediaAsset }
  | { status: 'missing' };
export const workspaceDeletionItemSchema = z
  .object({
    id: mediaId,
    location: z.enum(['cloud', 'local']),
    objectKey: z.string().min(1).max(512).nullable(),
  })
  .strict()
  .refine((item) =>
    item.location === 'cloud' ? item.objectKey !== null : item.objectKey === null,
  );
export type WorkspaceDeletionItem = z.infer<typeof workspaceDeletionItemSchema>;
export type MediaBackend = {
  workspaceDeletion?: {
    begin(workspaceId: string, expectedName: string): Promise<MediaResult<null>>;
    batch(workspaceId: string): Promise<MediaResult<WorkspaceDeletionItem[]>>;
    finish(workspaceId: string): Promise<MediaResult<boolean>>;
  };
  reserve(asset: MediaAsset, sourceId: string | null): Promise<MediaResult<Reservation>>;
  claim(id: string): Promise<MediaResult<WriteClaim>>;
  finalize(
    id: string,
    sha: string,
    width: number,
    height: number,
  ): Promise<MediaResult<MediaAsset>>;
  abort(id: string, writerClaimed?: boolean): Promise<MediaResult<AbortedUpload>>;
  release(id: string): Promise<MediaResult<null>>;
  upload(key: string, bytes: Uint8Array, mime: string): Promise<MediaResult<null>>;
  download(asset: MediaAsset): Promise<MediaResult<Uint8Array>>;
  remove(key: string): Promise<MediaResult<null>>;
  readAsset(id: string): Promise<MediaResult<MediaAsset>>;
  beginDelete(
    id: string,
  ): Promise<MediaResult<{ id: string; location: 'cloud' | 'local'; objectKey: string | null }>>;
  finishDelete(id: string): Promise<MediaResult<null>>;
  expired(): Promise<MediaResult<{ reservationId: string; objectKey: string }[]>>;
};
export function cloudMediaKey(asset: MediaAsset): string {
  return (
    asset.workspaceId +
    '/' +
    asset.id +
    '/' +
    asset.sha256 +
    ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[asset.mime] ?? '')
  );
}
