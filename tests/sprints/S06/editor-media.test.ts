// @vitest-environment node
import { expect, it } from 'vitest';
import { createEditorState, reduceEditor } from '../../../src/features/decks/editor/editor-reducer';
import { createTemplate } from '../../../src/features/decks/templates';
import type { MediaDescriptor } from '../../../src/domain/media';
const ws = 'a6000000-0000-4000-8000-000000000001',
  id = 'a6000000-0000-4000-8000-000000000020';
const image: MediaDescriptor = {
  id,
  workspaceId: ws,
  kind: 'image',
  location: 'cloud',
  mime: 'image/png',
  bytes: 123,
  sha256: 'a'.repeat(64),
  revision: 1,
  originalName: 'Still.png',
};
const video: MediaDescriptor = { ...image, kind: 'video', location: 'local', mime: 'video/mp4' };
function state() {
  return createEditorState({
    schemaVersion: 1,
    id: ws,
    workspaceId: ws,
    title: 'Sunday',
    width: 1920,
    height: 1080,
    slides: [createTemplate('lyrics')],
  });
}
it('adds a selected image that can be resized and undone', () => {
  const before = state(),
    added = reduceEditor(before, { type: 'add-image', asset: image });
  expect(added.document.slides[0].elements).toHaveLength(2);
  const element = added.document.slides[0].elements[1];
  expect(element.kind).toBe('image');
  expect(added.selectedElementId).toBe(element.id);
  const resized = reduceEditor(added, {
    type: 'resize',
    id: element.id,
    delta: { width: 100, height: 50 },
  });
  expect(resized.document.slides[0].elements[1].width).toBe(element.width + 100);
  expect(reduceEditor(added, { type: 'undo' }).document).toEqual(before.document);
});
it('rejects foreign assets and a video inserted as an image', () => {
  const before = state();
  expect(reduceEditor(before, { type: 'add-image', asset: { ...image, workspaceId: id } })).toBe(
    before,
  );
  expect(reduceEditor(before, { type: 'add-image', asset: video })).toBe(before);
});
it('keeps standalone and background video mutually exclusive', () => {
  const clip = reduceEditor(state(), { type: 'set-standalone-video', asset: video });
  expect(clip.document.slides[0].standaloneVideoId).toBe(id);
  const background = reduceEditor(clip, { type: 'set-media-background', asset: video });
  expect(background.document.slides[0].standaloneVideoId).toBeUndefined();
  expect(background.document.slides[0].background).toEqual({ kind: 'video', mediaId: id });
  const again = reduceEditor(background, { type: 'set-standalone-video', asset: video });
  expect(again.document.slides[0].background.kind).toBe('solid');
});
