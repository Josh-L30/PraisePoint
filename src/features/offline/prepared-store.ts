import { z } from 'zod';
import type { MediaDescriptor } from '../../domain/media';
import type { PreparedManifest, PreparedRecord } from '../../domain/prepared-service';
import { failure, type Result } from '../../domain/result';
import { openBrowserDB } from '../../lib/browser-db';
import { readDeviceSession } from '../../lib/device-session';
import { hashMedia } from '../media/local-media-store';
import { validateServiceSnapshot } from '../services/snapshot-validation';
import { currentContentStamp } from './content-changes';
const schema = z
  .object({
    schemaVersion: z.literal(1),
    packageId: z.uuid(),
    profileId: z.uuid(),
    workspaceId: z.uuid(),
    rendererVersion: z.literal(1),
    appBuild: z.string().min(1).max(128),
    sourceRevision: z.string().regex(/^[0-9a-f]{64}$/),
    preparedAt: z.iso.datetime({ offset: true }),
    assetIds: z.array(z.uuid()).max(202000),
    snapshot: z.unknown(),
  })
  .strict();
const unavailable = () =>
  failure(
    'STORAGE_UNAVAILABLE',
    'This laptop could not save or reopen the complete service. Keep originals, free device space and retry; the previous complete copy is retained.',
  );
const denied = () =>
  failure('FORBIDDEN', 'The device profile changed, signed out or could not be verified.');
export function validatePreparedManifest(input: unknown): Result<PreparedManifest> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return failure(
      'UNSUPPORTED',
      'This prepared copy has an unsupported or damaged format. Prepare it again with this app.',
    );
  const value = parsed.data,
    raw = value.snapshot;
  if (!raw || typeof raw !== 'object' || !('serviceId' in raw) || typeof raw.serviceId !== 'string')
    return unavailable();
  const snapshot = validateServiceSnapshot(raw, raw.serviceId);
  if (
    !snapshot.ok ||
    value.workspaceId !== snapshot.value.workspaceId ||
    value.sourceRevision !== snapshot.value.sourceRevision ||
    value.assetIds.length !== snapshot.value.media.length ||
    value.assetIds.some((id, index) => id !== snapshot.value.media[index].id)
  )
    return unavailable();
  return { ok: true, value: { ...value, snapshot: snapshot.value } };
}
export function preparedAssetKey(asset: MediaDescriptor): string {
  return asset.sha256 + ':' + asset.bytes + ':' + asset.mime;
}
const digest = (manifest: PreparedManifest) =>
  hashMedia(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
async function current(profileId: string) {
  const marker = await readDeviceSession();
  return marker?.profileId === profileId && !marker.signedOut;
}
export async function promotePrepared(
  input: PreparedManifest,
  files: Map<string, Blob>,
  expectedStamp: string,
): Promise<Result<PreparedManifest>> {
  const parsed = validatePreparedManifest(input);
  if (!parsed.ok) return parsed;
  const manifest = parsed.value;
  try {
    if (!(await current(manifest.profileId))) return denied();
    const unique = new Map(
      manifest.snapshot.media.map((asset) => [preparedAssetKey(asset), asset]),
    );
    if (files.size !== unique.size)
      return failure(
        'VALIDATION',
        'Every required media file must be present before saving this copy.',
      );
    for (const [key, asset] of unique) {
      const blob = files.get(key);
      if (
        !blob ||
        blob.size !== asset.bytes ||
        blob.type !== asset.mime ||
        (await hashMedia(blob)) !== asset.sha256
      )
        return failure(
          'VALIDATION',
          'A required file is missing, incomplete or has a different hash.',
        );
    }
    const manifestHash = await digest(manifest),
      db = await openBrowserDB();
    try {
      const tx = db.transaction(['meta', 'preparedServices', 'preparedAssets'], 'readwrite');
      try {
        const marker = await tx.objectStore('meta').get('session');
        if (marker?.profileId !== manifest.profileId || marker.signedOut) {
          tx.abort();
          await tx.done.catch(() => {});
          return denied();
        }
        const packages = tx.objectStore('preparedServices'),
          assets = tx.objectStore('preparedAssets'),
          previous = await packages
            .index('by-service')
            .get([manifest.profileId, manifest.snapshot.serviceId]),
          collision = await packages.get([manifest.profileId, manifest.packageId]);
        if (collision && collision.serviceId !== manifest.snapshot.serviceId)
          throw new Error('Package identity already belongs to another service.');
        const oldKeys = new Set(previous?.manifest.snapshot.media.map(preparedAssetKey) ?? []),
          nextKeys = new Set(unique.keys());
        for (const key of new Set([...oldKeys, ...nextKeys])) {
          const existing = await assets.get([manifest.profileId, key]),
            count =
              (existing?.refCount ?? 0) + (nextKeys.has(key) ? 1 : 0) - (oldKeys.has(key) ? 1 : 0);
          if (
            count < 0 ||
            (existing && (!Number.isInteger(existing.refCount) || existing.refCount < 1))
          )
            throw new Error('Invalid file references.');
          if (count === 0) await assets.delete([manifest.profileId, key]);
          else {
            const blob = files.get(key) ?? existing?.blob;
            if (!blob) throw new Error('Missing complete file.');
            await assets.put({ profileId: manifest.profileId, key, blob, refCount: count });
          }
        }
        if (currentContentStamp(manifest.profileId) !== expectedStamp) {
          tx.abort();
          await tx.done.catch(() => {});
          return failure(
            'CONFLICT',
            'Content changed while preparing. Review the service and prepare again.',
          );
        }
        if (previous && previous.packageId !== manifest.packageId)
          await packages.delete([manifest.profileId, previous.packageId]);
        await packages.put({
          profileId: manifest.profileId,
          packageId: manifest.packageId,
          serviceId: manifest.snapshot.serviceId,
          manifest,
          manifestHash,
          contentStamp: expectedStamp,
        });
        await tx.done;
        return { ok: true, value: manifest };
      } catch {
        try {
          tx.abort();
        } catch {
          /* Already aborted. */
        }
        await tx.done.catch(() => {});
        return unavailable();
      }
    } finally {
      db.close();
    }
  } catch {
    return unavailable();
  }
}
export async function getPreparedRecord(
  profileId: string,
  packageId: string,
): Promise<Result<PreparedRecord>> {
  try {
    if (!(await current(profileId))) return denied();
    const db = await openBrowserDB();
    let record: PreparedRecord | undefined;
    try {
      record = await db.get('preparedServices', [profileId, packageId]);
    } finally {
      db.close();
    }
    if (!record) return failure('NOT_FOUND', 'This service has not been prepared on this laptop.');
    const parsed = validatePreparedManifest(record.manifest);
    if (!parsed.ok) return parsed;
    if (
      record.profileId !== profileId ||
      parsed.value.profileId !== profileId ||
      record.packageId !== packageId ||
      parsed.value.packageId !== packageId ||
      record.serviceId !== parsed.value.snapshot.serviceId ||
      record.manifestHash !== (await digest(parsed.value))
    )
      return failure('VALIDATION', 'The saved service is damaged. Prepare it again online.');
    if (!(await current(profileId))) return denied();
    return { ok: true, value: { ...record, manifest: parsed.value } };
  } catch {
    return unavailable();
  }
}
export async function listPrepared(profileId: string): Promise<Result<PreparedRecord[]>> {
  try {
    if (!(await current(profileId))) return denied();
    const db = await openBrowserDB();
    try {
      const rows = await db.getAllFromIndex('preparedServices', 'by-profile', profileId);
      return {
        ok: true,
        value: rows
          .filter((row) => validatePreparedManifest(row.manifest).ok)
          .sort((a, b) => b.manifest.preparedAt.localeCompare(a.manifest.preparedAt)),
      };
    } finally {
      db.close();
    }
  } catch {
    return unavailable();
  }
}
export async function readPreparedAsset(
  profileId: string,
  asset: MediaDescriptor,
): Promise<Result<Blob>> {
  try {
    if (!(await current(profileId))) return denied();
    const db = await openBrowserDB();
    let file;
    try {
      file = await db.get('preparedAssets', [profileId, preparedAssetKey(asset)]);
    } finally {
      db.close();
    }
    if (
      !file ||
      file.refCount < 1 ||
      file.blob.size !== asset.bytes ||
      file.blob.type !== asset.mime ||
      (await hashMedia(file.blob)) !== asset.sha256
    )
      return failure(
        'VALIDATION',
        'A prepared file is missing or damaged. Reconnect and prepare this service again.',
      );
    if (!(await current(profileId))) return denied();
    return { ok: true, value: file.blob };
  } catch {
    return unavailable();
  }
}
export async function deletePrepared(profileId: string, packageId: string): Promise<Result<void>> {
  try {
    if (!(await current(profileId))) return denied();
    const db = await openBrowserDB();
    try {
      const tx = db.transaction(['meta', 'preparedServices', 'preparedAssets'], 'readwrite');
      try {
        const marker = await tx.objectStore('meta').get('session');
        if (marker?.profileId !== profileId || marker.signedOut)
          throw new Error('Profile changed.');
        const packages = tx.objectStore('preparedServices'),
          assets = tx.objectStore('preparedAssets'),
          record = await packages.get([profileId, packageId]);
        if (record) {
          for (const key of new Set(record.manifest.snapshot.media.map(preparedAssetKey))) {
            const asset = await assets.get([profileId, key]);
            if (asset) {
              if (asset.refCount <= 1) await assets.delete([profileId, key]);
              else await assets.put({ ...asset, refCount: asset.refCount - 1 });
            }
          }
          await packages.delete([profileId, packageId]);
        }
        await tx.done;
        return { ok: true, value: undefined };
      } catch {
        try {
          tx.abort();
        } catch {
          /* Already aborted. */
        }
        await tx.done.catch(() => {});
        return unavailable();
      }
    } finally {
      db.close();
    }
  } catch {
    return unavailable();
  }
}
