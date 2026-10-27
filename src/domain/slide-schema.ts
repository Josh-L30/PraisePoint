import type { DeckDocument } from './deck';
import { failure, type Result } from './result';
import { z } from 'zod';
import { LIMITS } from './limits';
export const categories = ['lyrics','scripture','sermon','announcement','welcome-closing'] as const;
const id = z.uuid().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).transform(value => value.toLowerCase()), color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const rect = { x: z.number().min(0).max(1920), y: z.number().min(0).max(1080), width: z.number().positive().max(1920), height: z.number().positive().max(1080) };
const common = { ...rect, id, z: z.number().int().min(0).max(10000), label: z.string().trim().min(1).max(LIMITS.nameCharacters).optional() };
const element = z.discriminatedUnion('kind',[
  z.object({ ...common, kind: z.literal('text'), text: z.string().max(LIMITS.textCharacters), fontFamily: z.literal('Figtree'), fontSize: z.number().min(8).max(300), color, align: z.enum(['left','center','right']) }).strict(),
  z.object({ ...common, kind: z.literal('image'), mediaId: id, fit: z.enum(['contain','cover']) }).strict(),
]);
const background = z.discriminatedUnion('kind',[
  z.object({ kind: z.literal('solid'), color }).strict(),
  z.object({ kind: z.literal('image'), mediaId: id }).strict(),
  z.object({ kind: z.literal('video'), mediaId: id }).strict(),
]);
export const slideSchema = z.object({ id, category: z.enum(categories), background, elements: z.array(element).max(LIMITS.elementsPerSlide), standaloneVideoId: id.optional() }).strict()
  .refine(slide => !(slide.standaloneVideoId && slide.background.kind==='video'),'Use one video at a time.');
const documentSchema = z.object({ schemaVersion: z.literal(1), id, workspaceId: id, title: z.string().trim().min(1).max(LIMITS.nameCharacters),
  width: z.literal(1920), height: z.literal(1080), slides: z.array(slideSchema).min(1).max(LIMITS.slidesPerDeck),
}).strict();
export function validateDeck(input: unknown): Result<DeckDocument> {
  try {
    const json = JSON.stringify(input);
    if (!json || new TextEncoder().encode(json).byteLength>LIMITS.documentBytes) return failure('VALIDATION','A presentation must be no larger than 2 MiB. Split it into smaller presentations.');
    const parsed = documentSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION','This presentation has invalid or unsupported content. Check slide sizes, text limits, colors and document version.');
    const seen = new Set<string>([parsed.data.id.toLowerCase()]);
    for (const slide of parsed.data.slides) {
      for (const current of [slide,...slide.elements]) {
        if (seen.has(current.id.toLowerCase())) return failure('VALIDATION','Each slide and element needs a unique identifier.');
        seen.add(current.id.toLowerCase());
      }
      slide.elements.sort((a,b) => a.z-b.z || a.id.localeCompare(b.id));
    }
    return { ok: true, value: parsed.data };
  } catch { return failure('VALIDATION','This presentation could not be read. No content was changed.'); }
}
