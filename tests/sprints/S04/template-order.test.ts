import { expect, it } from 'vitest';
import { deckFixture } from '../../support/deck-fixture';
import { validateDeck } from '../../../src/domain/slide-schema';
it('keeps default Scripture field order even when UUIDs sort in reverse', () => {
  const document = deckFixture('scripture');
  document.slides[0].elements.forEach((element, index) => {
    element.id = 'a5000000-0000-4000-8000-00000000000' + (3 - index);
  });
  const result = validateDeck(document);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(
      result.value.slides[0].elements.map((element) =>
        element.kind === 'text' ? element.text : '',
      ),
    ).toEqual(['Enter the passage here', 'Reference', 'Translation']);
});
it('keeps a text box label with its content after its layer changes', () => {
  const document = deckFixture('scripture');
  const elements = document.slides[0]
    .elements as ((typeof document.slides)[0]['elements'][number] & { label?: string })[];
  elements[0].label = 'Passage';
  elements[1].label = 'Reference';
  elements[2].label = 'Translation';
  elements[1].z = 10;
  const result = validateDeck(document);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(
      result.value.slides[0].elements.find((element) => element.id === elements[1].id),
    ).toMatchObject({ label: 'Reference', text: 'Reference', z: 10 });
});
