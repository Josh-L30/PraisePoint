import type { SavedDeck } from '../domain/deck';
// Memory only: protects same-tab auth recovery; closing/reloading still requires the unsaved-work warning.
const drafts = new Map<string,SavedDeck>();
const key = (profileId: string,deckId: string) => profileId + ':' + deckId;
export function rememberDraft(profileId: string,draft: SavedDeck) { drafts.set(key(profileId,draft.document.id),draft); }
export function readDraft(profileId: string,deckId: string) { const value = drafts.get(key(profileId,deckId)); return value ? structuredClone(value) : null; }
export function forgetDraft(profileId: string,deckId?: string) {
  if (deckId) drafts.delete(key(profileId,deckId));
  else for (const entry of drafts.keys()) if (entry.startsWith(profileId + ':')) drafts.delete(entry);
}
