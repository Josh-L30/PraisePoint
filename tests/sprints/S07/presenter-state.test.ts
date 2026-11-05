// @vitest-environment node
import { expect, it } from 'vitest';
import { createTemplate } from '../../../src/features/decks/templates';
import type { ServiceSnapshot } from '../../../src/domain/service';
import {
  initialPresenterState,
  applyPresenterCommand,
  backgroundIdentity,
  isPresenterInput,
} from '../../../src/features/presenter/presenter-state';
const session = 'a7000000-0000-4000-8000-000000000001',
  media = 'a7000000-0000-4000-8000-000000000002';
function snapshot(): ServiceSnapshot {
  return {
    schemaVersion: 1,
    serviceId: crypto.randomUUID(),
    workspaceId: crypto.randomUUID(),
    title: 'Sunday',
    sourceRevision: 'a'.repeat(64),
    slides: [0, 1, 2].map(() => ({
      ...createTemplate('lyrics'),
      background: { kind: 'video', mediaId: media },
    })),
    media: [],
    sections: [
      {
        id: crypto.randomUUID(),
        deckId: crypto.randomUUID(),
        label: 'First song',
        startIndex: 0,
        slideCount: 2,
        sourceSongId: null,
      },
      {
        id: crypto.randomUUID(),
        deckId: crypto.randomUUID(),
        label: 'Next song',
        startIndex: 2,
        slideCount: 1,
        sourceSongId: null,
      },
    ],
  };
}
it('starts black and never advances without a bounded manual command', () => {
  let state = initialPresenterState(session, snapshot());
  expect(state.blackout).toBe(true);
  expect(state.index).toBe(0);
  expect(applyPresenterCommand(state, { type: 'previous' })).toBe(state);
  state = applyPresenterCommand(state, { type: 'jump', index: 99 });
  expect(state.index).toBe(2);
  expect(applyPresenterCommand(state, { type: 'next' })).toBe(state);
  expect(applyPresenterCommand(state, { type: 'jump', index: NaN })).toBe(state);
  expect(applyPresenterCommand(state, { type: 'jump', index: 0 }).index).toBe(0);
});
it('keeps one background within a song and replaces it at the next section', () => {
  const state = initialPresenterState(session, snapshot()),
    second = applyPresenterCommand(state, { type: 'next' }),
    third = applyPresenterCommand(second, { type: 'next' });
  expect(backgroundIdentity(state)).toBe(backgroundIdentity(second));
  expect(backgroundIdentity(third)).not.toBe(backgroundIdentity(second));
  expect(state.index).toBe(0);
});
it('blackout pauses a standalone clip and restore cannot restart it', () => {
  const doc = snapshot();
  doc.slides[0].standaloneVideoId = media;
  let state = initialPresenterState(session, doc);
  state = applyPresenterCommand(state, { type: 'play' });
  expect(state.standalone.paused).toBe(true);
  state = applyPresenterCommand(state, { type: 'restore' });
  state = applyPresenterCommand(state, { type: 'play' });
  expect(state.standalone.paused).toBe(false);
  state = applyPresenterCommand(state, { type: 'blackout' });
  expect(state.standalone.paused).toBe(true);
  state = applyPresenterCommand(state, { type: 'restore' });
  expect(state.standalone.paused).toBe(true);
  state = applyPresenterCommand(state, { type: 'next' });
  expect(state.standalone.time).toBe(0);
  expect(state.standalone.paused).toBe(true);
});
it('records repeated restart intent and clamps volume and seek without NaN', () => {
  let state = initialPresenterState(session, snapshot());
  state = applyPresenterCommand(state, { type: 'seek', time: 0 });
  const first = state.standalone.seekSequence;
  state = applyPresenterCommand(state, { type: 'seek', time: 0 });
  expect(state.standalone.seekSequence).toBeGreaterThan(first);
  expect(applyPresenterCommand(state, { type: 'volume', value: 5 }).standalone.volume).toBe(1);
  expect(applyPresenterCommand(state, { type: 'volume', value: NaN })).toBe(state);
  expect(applyPresenterCommand(state, { type: 'seek', time: -5 }).standalone.time).toBe(0);
});
it('ignores shortcuts in editable fields and contenteditable descendants', () => {
  expect(isPresenterInput({ closest: () => ({}) } as never)).toBe(true);
  expect(isPresenterInput({ closest: () => null } as never)).toBe(false);
  expect(isPresenterInput(null)).toBe(false);
});
