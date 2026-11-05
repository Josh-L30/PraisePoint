import { expect, it } from 'vitest';
import { validateDeck } from '../../../src/domain/slide-schema';
import { createTemplate } from '../../../src/features/decks/templates';
import { deckFixture } from '../../support/deck-fixture';
import type { TextElement } from '../../../src/domain/slide';
const categories = ['lyrics', 'scripture', 'sermon', 'announcement', 'welcome-closing'] as const;
it.each(categories)('provides an editable %s template inside the safe area', (category) => {
  const slide = createTemplate(category);
  expect(slide.elements.length).toBeGreaterThan(0);
  for (const element of slide.elements) {
    expect(element.x).toBeGreaterThanOrEqual(96);
    expect(element.y).toBeGreaterThanOrEqual(96);
    expect(element.x + element.width).toBeLessThanOrEqual(1824);
    expect(element.y + element.height).toBeLessThanOrEqual(984);
  }
  expect(validateDeck(deckFixture(category)).ok).toBe(true);
});
it('preserves line endings, non-Latin text, emoji and angle brackets exactly', () => {
  const doc = deckFixture(),
    text = 'Panginoon 🙏\r\n主よ\n<script>text only</script>';
  (doc.slides[0].elements[0] as TextElement).text = text;
  const result = validateDeck(doc);
  expect(result.ok).toBe(true);
  if (result.ok) expect((result.value.slides[0].elements[0] as TextElement).text).toBe(text);
});
it('rejects unknown schemas, duplicate IDs and unsupported presentation geometry', () => {
  const doc = deckFixture();
  expect(validateDeck({ ...doc, schemaVersion: 2 }).ok).toBe(false);
  expect(validateDeck({ ...doc, width: 1280 }).ok).toBe(false);
  expect(validateDeck({ ...doc, slides: [doc.slides[0], doc.slides[0]] }).ok).toBe(false);
  for (const value of [NaN, Infinity, -1, 0]) {
    const broken = structuredClone(doc);
    broken.slides[0].elements[0].width = value;
    expect(validateDeck(broken).ok).toBe(false);
  }
});
it('rejects unbounded text, slides, elements, payloads, foreign keys and arbitrary CSS', () => {
  const doc = deckFixture();
  const broken = structuredClone(doc);
  (broken.slides[0].elements[0] as TextElement).text = 'x'.repeat(20001);
  expect(validateDeck(broken).ok).toBe(false);
  expect(
    validateDeck({ ...doc, slides: Array.from({ length: 201 }, () => createTemplate('lyrics')) })
      .ok,
  ).toBe(false);
  expect(validateDeck({ ...doc, surprise: 'untrusted' }).ok).toBe(false);
  expect(validateDeck({ ...doc, workspaceId: 'foreign' }).ok).toBe(false);
  const styled = structuredClone(doc);
  (styled.slides[0].elements[0] as TextElement).color = 'url(https://example.invalid)';
  expect(validateDeck(styled).ok).toBe(false);
  const many = structuredClone(doc);
  many.slides[0].elements = Array.from({ length: 101 }, () => ({
    ...doc.slides[0].elements[0],
    id: crypto.randomUUID(),
  }));
  expect(validateDeck(many).ok).toBe(false);
  const huge = structuredClone(doc);
  huge.slides = Array.from({ length: 120 }, () => {
    const slide = createTemplate('lyrics');
    (slide.elements[0] as TextElement).text = 'x'.repeat(20000);
    return slide;
  });
  expect(validateDeck(huge).ok).toBe(false);
});
it('rejects simultaneous standalone/background video and normalizes layer order without mutating input', () => {
  const doc = deckFixture(),
    slide = doc.slides[0];
  slide.elements.push({ ...slide.elements[0], id: crypto.randomUUID(), z: 0 });
  slide.elements[0].z = 10;
  const result = validateDeck(doc);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.slides[0].elements.map((e) => e.z)).toEqual([0, 10]);
  expect(slide.elements[0].z).toBe(10);
  slide.background = { kind: 'video', mediaId: crypto.randomUUID() };
  slide.standaloneVideoId = crypto.randomUUID();
  expect(validateDeck(doc).ok).toBe(false);
});
it('treats UUID casing consistently and rejects two spellings of the same identifier', () => {
  const doc = deckFixture();
  doc.id = 'abcdefab-1234-4234-8234-abcdefabcdef'.toUpperCase();
  const parsed = validateDeck(doc);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.value.id).toBe(doc.id.toLowerCase());
  doc.slides[0].elements[0].id = doc.slides[0].id.toUpperCase();
  expect(validateDeck(doc).ok).toBe(false);
});
