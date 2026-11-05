import { expect, it } from 'vitest';
import { createEditorState, reduceEditor } from '../../../src/features/decks/editor/editor-reducer';
import { pushSnapshot, snapshot } from '../../../src/features/decks/editor/history';
import { deckFixture } from '../../support/deck-fixture';
import { validateDeck } from '../../../src/domain/slide-schema';
it('records a whole pointer gesture as one undo entry and restores it with redo', () => {
  const original = createEditorState(deckFixture()),
    id = original.selectedElementId!;
  let state = reduceEditor(original, { type: 'begin-gesture' });
  for (let step = 0; step < 3; step++)
    state = reduceEditor(state, { type: 'move', id, delta: { x: 10, y: 1 } });
  state = reduceEditor(state, { type: 'end-gesture' });
  expect(state.document.slides[0].elements[0]).toMatchObject({ x: 126, y: 303 });
  expect(state.past).toHaveLength(1);
  expect(original.past).toHaveLength(0);
  const undone = reduceEditor(state, { type: 'undo' });
  expect(undone.document).toEqual(original.document);
  expect(reduceEditor(undone, { type: 'redo' }).document).toEqual(state.document);
});
it('groups a text edit without truncating or interpreting its words', () => {
  const original = createEditorState(deckFixture()),
    id = original.selectedElementId!;
  let state = reduceEditor(original, { type: 'begin-gesture' });
  for (const text of ['主', '主よ', '主よ 🙏\n<script>literal</script>'])
    state = reduceEditor(state, { type: 'update-text', id, text });
  state = reduceEditor(state, { type: 'end-gesture' });
  expect(state.past).toHaveLength(1);
  expect(state.document.slides[0].elements[0]).toMatchObject({
    text: '主よ 🙏\n<script>literal</script>',
  });
  expect(reduceEditor(state, { type: 'undo' }).document).toEqual(original.document);
});
it('cancels an interrupted gesture without adding history and does not record a text edit undone natively', () => {
  const original = createEditorState(deckFixture()),
    id = original.selectedElementId!;
  let state = reduceEditor(original, { type: 'begin-gesture' });
  state = reduceEditor(state, { type: 'move', id, delta: { x: 100, y: 100 } });
  state = reduceEditor(state, { type: 'cancel-gesture' });
  expect(state.document).toEqual(original.document);
  expect(state.past).toHaveLength(0);
  expect(state.gesture).toBeNull();
  state = reduceEditor(state, { type: 'begin-gesture' });
  state = reduceEditor(state, { type: 'update-text', id, text: 'Changed' });
  state = reduceEditor(state, {
    type: 'update-text',
    id,
    text: 'Enter your lyrics here\nOne line at a time',
  });
  state = reduceEditor(state, { type: 'end-gesture' });
  expect(state.past).toHaveLength(0);
  expect(state.version).toBe(original.version);
});
it('does not reuse a saved version identity after undo and a different edit', () => {
  let state = createEditorState(deckFixture());
  const id = state.selectedElementId!;
  state = reduceEditor(state, { type: 'move', id, delta: { x: 1, y: 0 } });
  const savedVersion = state.version;
  state = reduceEditor(state, { type: 'undo' });
  state = reduceEditor(state, { type: 'move', id, delta: { x: 10, y: 0 } });
  expect(state.version).not.toBe(savedVersion);
  expect(state.future).toHaveLength(0);
  const count = state.past.length;
  state = reduceEditor(state, { type: 'select', elementId: null });
  expect(state.past).toHaveLength(count);
});
it('duplicates with fresh identities, reorders and deletes slides without changing original content', () => {
  const original = createEditorState(deckFixture());
  let state = reduceEditor(original, { type: 'duplicate-slide', id: original.selectedSlideId });
  expect(state.document.slides).toHaveLength(2);
  const copy = state.document.slides[1];
  expect(copy.id).not.toBe(original.selectedSlideId);
  expect(copy.elements[0].id).not.toBe(original.selectedElementId);
  expect(copy.elements[0]).toMatchObject({ text: 'Enter your lyrics here\nOne line at a time' });
  state = reduceEditor(state, { type: 'reorder-slide', id: copy.id, toIndex: 0 });
  expect(state.document.slides[0].id).toBe(copy.id);
  state = reduceEditor(state, { type: 'delete-slide', id: copy.id });
  expect(state.document).toEqual(original.document);
  expect(
    reduceEditor(state, { type: 'delete-slide', id: original.selectedSlideId }).document.slides,
  ).toHaveLength(1);
});
it('keeps field labels when layers move and supports adding/removing freeform text', () => {
  let state = createEditorState(deckFixture('scripture'));
  const reference = state.document.slides[0].elements[1];
  state = reduceEditor(state, { type: 'reorder-layer', id: reference.id, direction: 'front' });
  const result = validateDeck(state.document);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.value.slides[0].elements.at(-1)).toMatchObject({
      id: reference.id,
      label: 'Reference',
      text: 'Reference',
    });
  state = reduceEditor(state, { type: 'add-text' });
  expect(state.document.slides[0].elements).toHaveLength(4);
  const added = state.selectedElementId!;
  state = reduceEditor(state, { type: 'delete-element', id: added });
  expect(state.document.slides[0].elements).toHaveLength(3);
});
it('bounds undo memory by entry count and serialized size', () => {
  const first = { ...snapshot(createEditorState(deckFixture())), bytes: 60 },
    second = { ...first, version: 1 };
  expect(pushSnapshot([first], second, 50, 100).map((entry) => entry.version)).toEqual([1]);
  expect(pushSnapshot([first], second, 1, 1000).map((entry) => entry.version)).toEqual([1]);
});
