import type { Slide } from './slide';
export type DeckDocument = { schemaVersion: 1; id: string; workspaceId: string; title: string; width: 1920; height: 1080; slides: Slide[] };
export type SavedDeck = { document: DeckDocument; revision: number };
