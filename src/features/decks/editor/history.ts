import type { DeckDocument } from '../../../domain/deck';
import { LIMITS } from '../../../domain/limits';
export type EditorSnapshot = {
  document: DeckDocument;
  selectedSlideId: string;
  selectedElementId: string | null;
  version: number;
};
export type HistoryEntry = EditorSnapshot & { bytes: number };
export function snapshot(state: EditorSnapshot): HistoryEntry {
  return {
    document: state.document,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    version: state.version,
    bytes: new TextEncoder().encode(JSON.stringify(state.document)).byteLength,
  };
}
export function pushSnapshot(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  maxEntries: number = LIMITS.editorHistoryEntries,
  maxBytes: number = LIMITS.editorHistoryBytes,
): HistoryEntry[] {
  const result = [...entries, entry];
  let bytes = result.reduce((total, current) => total + current.bytes, 0);
  while (result.length > maxEntries || bytes > maxBytes) bytes -= result.shift()!.bytes;
  return result;
}
