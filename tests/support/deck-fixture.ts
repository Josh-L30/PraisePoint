import type { DeckDocument } from '../../src/domain/deck';
import type { SlideCategory } from '../../src/domain/slide';
import { createTemplate } from '../../src/features/decks/templates';
export const deckId = '66666666-6666-4666-8666-666666666666';
export const workspaceId = '44444444-4444-4444-8444-444444444444';
export function deckFixture(category: SlideCategory = 'lyrics'): DeckDocument {
  return {
    schemaVersion: 1,
    id: deckId,
    workspaceId,
    title: 'Sunday worship',
    width: 1920,
    height: 1080,
    slides: [createTemplate(category)],
  };
}
