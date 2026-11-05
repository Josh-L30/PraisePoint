import { z } from 'zod';
import type { ServiceSnapshot } from '../../domain/service';
import type { Result } from '../../domain/result';
import { slideSchema } from '../../domain/slide-schema';
import { mediaAssetSchema } from '../../../supabase/functions/_shared/media-contract';
import { contentId as id, contentTitle as title, invalidContent } from '../songs/content-api';
const section = z
  .object({
    id,
    deckId: id,
    label: title,
    startIndex: z.number().int().min(0),
    slideCount: z.number().int().positive(),
    sourceSongId: id.nullable(),
  })
  .strict();
const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    serviceId: id,
    workspaceId: id,
    sourceRevision: z.string().regex(/^[0-9a-f]{64}$/),
    title,
    slides: z.array(slideSchema).min(1).max(2000),
    media: z.array(mediaAssetSchema).max(202000),
    sections: z.array(section).min(1).max(100),
  })
  .strict();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const entry of Object.values(value)) freeze(entry);
  }
  return value;
}
export function validateServiceSnapshot(
  input: unknown,
  serviceId: string,
): Result<ServiceSnapshot> {
  const parsed = snapshotSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.serviceId !== serviceId.toLowerCase() ||
    new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > 16 * 1024 * 1024
  )
    return invalidContent();
  const snapshot = parsed.data,
    ids = new Set<string>(),
    sectionIds = new Set<string>();
  let next = 0;
  for (const part of snapshot.sections) {
    if (sectionIds.has(part.id) || part.startIndex !== next) return invalidContent();
    sectionIds.add(part.id);
    next += part.slideCount;
  }
  if (next !== snapshot.slides.length) return invalidContent();
  for (const slide of snapshot.slides)
    for (const entry of [slide, ...slide.elements]) {
      if (ids.has(entry.id)) return invalidContent();
      ids.add(entry.id);
    }
  const media = new Map(snapshot.media.map((asset) => [asset.id, asset]));
  if (
    media.size !== snapshot.media.length ||
    snapshot.media.some((asset) => asset.workspaceId !== snapshot.workspaceId)
  )
    return invalidContent();
  const referenced = new Set<string>();
  function reference(mediaId: string, kind: 'image' | 'video'): boolean {
    const asset = media.get(mediaId);
    referenced.add(mediaId);
    return !!asset && asset.kind === kind;
  }
  for (const slide of snapshot.slides) {
    if (
      slide.background.kind !== 'solid' &&
      !reference(slide.background.mediaId, slide.background.kind)
    )
      return invalidContent();
    if (slide.standaloneVideoId && !reference(slide.standaloneVideoId, 'video'))
      return invalidContent();
    for (const element of slide.elements)
      if (element.kind === 'image' && !reference(element.mediaId, 'image')) return invalidContent();
  }
  if (referenced.size !== media.size) return invalidContent();
  return { ok: true, value: freeze(snapshot) };
}
