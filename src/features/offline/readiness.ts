import type { PreparedManifest, Readiness } from '../../domain/prepared-service';
import { failure, type Result } from '../../domain/result';
import { decodeMedia, type DecodedMedia } from '../media/decode-media';
import { getPreparedRecord, readPreparedAsset } from './prepared-store';
import { currentContentStamp } from './content-changes';
import { verifyAppShell } from './runtime-client';
export async function verifyPresentationFont(): Promise<Result<void>> {
  try {
    const faces = await document.fonts.load('72px Figtree');
    return faces.some(
      (face) => face.family.replaceAll('"', '') === 'Figtree' && face.status === 'loaded',
    ) && document.fonts.check('72px Figtree')
      ? { ok: true, value: undefined }
      : failure(
          'UNSUPPORTED',
          'Figtree is missing. Reconnect and reopen the app before preparing.',
        );
  } catch {
    return failure('UNSUPPORTED', 'The presentation font could not be loaded.');
  }
}
export type ReadinessDependencies = {
  shell(): Promise<Result<{ appBuild: string }>>;
  font(): Promise<Result<void>>;
  decode(file: File): Promise<Result<Pick<DecodedMedia, 'kind' | 'mime'>>>;
};
export function createReadinessService(
  profileId: string,
  dependencies: ReadinessDependencies = {
    shell: verifyAppShell,
    font: verifyPresentationFont,
    decode: decodeMedia,
  },
) {
  async function checkReadiness(packageId: string): Promise<Readiness> {
    try {
      const saved = await getPreparedRecord(profileId, packageId);
      if (!saved.ok)
        return {
          state:
            saved.error.code === 'NOT_FOUND' || saved.error.code === 'FORBIDDEN'
              ? 'missing'
              : 'failed',
          issues: [saved.error.message],
        };
      const shell = await dependencies.shell();
      if (!shell.ok) return { state: 'failed', issues: [shell.error.message] };
      const font = await dependencies.font();
      if (!font.ok) return { state: 'failed', issues: [font.error.message] };
      for (const asset of saved.value.manifest.snapshot.media) {
        const bytes = await readPreparedAsset(profileId, asset);
        if (!bytes.ok) return { state: 'failed', issues: [bytes.error.message] };
        const decoded = await dependencies.decode(
          new File([bytes.value], asset.originalName, { type: asset.mime }),
        );
        if (!decoded.ok)
          return { state: 'failed', issues: [asset.originalName + ': ' + decoded.error.message] };
        if (decoded.value.kind !== asset.kind || decoded.value.mime !== asset.mime)
          return { state: 'failed', issues: ['A prepared file has a different decoded type.'] };
      }
      if (saved.value.cloudStale)
        return {
          state: 'stale',
          issues: [
            'A newer saved service was found online. Prepare it again or explicitly present this saved version.',
          ],
        };
      if (saved.value.contentStamp !== currentContentStamp(profileId))
        return {
          state: 'stale',
          issues: [
            'Local content was saved after this copy was prepared. Recheck online or explicitly present the saved version.',
          ],
        };
      return { state: 'ready', packageId, verifiedAt: new Date().toISOString() };
    } catch {
      return {
        state: 'failed',
        issues: [
          'The complete service could not be verified on this laptop. Reconnect and prepare it again.',
        ],
      };
    }
  }
  async function openPrepared(
    packageId: string,
    allowSavedVersion = false,
  ): Promise<Result<PreparedManifest>> {
    const status = await checkReadiness(packageId);
    if (status.state !== 'ready' && !(allowSavedVersion && status.state === 'stale'))
      return failure(
        status.state === 'stale' ? 'CONFLICT' : 'STORAGE_UNAVAILABLE',
        status.issues.join(' '),
      );
    const saved = await getPreparedRecord(profileId, packageId);
    return saved.ok ? { ok: true, value: saved.value.manifest } : saved;
  }
  return { checkReadiness, openPrepared };
}
