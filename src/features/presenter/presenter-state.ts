import type { ServiceSnapshot } from '../../domain/service';
export type PresenterState = {
  sessionId: string;
  sequence: number;
  snapshot: ServiceSnapshot;
  index: number;
  blackout: boolean;
  backgroundPaused: boolean;
  standalone: { paused: boolean; volume: number; time: number; seekSequence: number };
};
export type PresenterCommand =
  | {
      type:
        | 'next'
        | 'previous'
        | 'blackout'
        | 'restore'
        | 'play'
        | 'pause'
        | 'pause-background'
        | 'resume-background';
    }
  | { type: 'jump'; index: number }
  | { type: 'volume'; value: number }
  | { type: 'seek'; time: number };
export function initialPresenterState(
  sessionId: string,
  snapshot: ServiceSnapshot,
): PresenterState {
  return {
    sessionId,
    sequence: 0,
    snapshot,
    index: 0,
    blackout: true,
    backgroundPaused: false,
    standalone: { paused: true, volume: 1, time: 0, seekSequence: 0 },
  };
}
export function applyPresenterCommand(
  state: PresenterState,
  command: PresenterCommand,
): PresenterState {
  const sequence = state.sequence + 1;
  if (!Number.isSafeInteger(sequence)) return state;
  switch (command.type) {
    case 'next':
    case 'previous':
    case 'jump': {
      const requested =
        command.type === 'jump' ? command.index : state.index + (command.type === 'next' ? 1 : -1);
      if (!Number.isInteger(requested)) return state;
      const index = Math.max(0, Math.min(state.snapshot.slides.length - 1, requested));
      if (index === state.index) return state;
      return {
        ...state,
        sequence,
        index,
        standalone: { ...state.standalone, paused: true, time: 0, seekSequence: sequence },
      };
    }
    case 'pause-background':
      return { ...state, sequence, backgroundPaused: true };
    case 'resume-background':
      return { ...state, sequence, backgroundPaused: false };
    case 'blackout':
      return {
        ...state,
        sequence,
        blackout: true,
        standalone: { ...state.standalone, paused: true },
      };
    case 'restore':
      return { ...state, sequence, blackout: false };
    case 'play':
      return state.blackout || !state.snapshot.slides[state.index].standaloneVideoId
        ? state
        : { ...state, sequence, standalone: { ...state.standalone, paused: false } };
    case 'pause':
      return { ...state, sequence, standalone: { ...state.standalone, paused: true } };
    case 'volume':
      return !Number.isFinite(command.value)
        ? state
        : {
            ...state,
            sequence,
            standalone: { ...state.standalone, volume: Math.max(0, Math.min(1, command.value)) },
          };
    case 'seek':
      return !Number.isFinite(command.time)
        ? state
        : {
            ...state,
            sequence,
            standalone: {
              ...state.standalone,
              time: Math.max(0, Math.min(86400, command.time)),
              seekSequence: sequence,
            },
          };
  }
}
export function backgroundIdentity(state: PresenterState): string {
  const section = state.snapshot.sections.find(
    (part) => state.index >= part.startIndex && state.index < part.startIndex + part.slideCount,
  )!;
  const background = state.snapshot.slides[state.index].background;
  return section.id + ':' + (background.kind === 'solid' ? 'solid' : background.mediaId);
}
export function isPresenterInput(target: EventTarget | null): boolean {
  return !!(
    target &&
    'closest' in target &&
    typeof target.closest === 'function' &&
    target.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
    )
  );
}
