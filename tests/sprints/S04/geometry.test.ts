import { expect, it } from 'vitest';
import {
  toLogicalPoint,
  moveElement,
  resizeElement,
  alignElement,
  alignmentGuides,
} from '../../../src/features/decks/editor/geometry';
const rect = { x: 100, y: 100, width: 200, height: 100 };
it('maps pointer coordinates through scale and letterbox offsets', () => {
  expect(
    toLogicalPoint({ clientX: 150, clientY: 230 }, { left: 50, top: 30, width: 960, height: 540 }),
  ).toEqual({ x: 200, y: 400 });
  expect(
    toLogicalPoint({ clientX: 0, clientY: 0 }, { left: 0, top: 0, width: 0, height: 0 }),
  ).toBeNull();
  expect(
    toLogicalPoint({ clientX: NaN, clientY: 0 }, { left: 0, top: 0, width: 1920, height: 1080 }),
  ).toBeNull();
});
it('clamps movement at stage bounds without changing the source size or object', () => {
  expect(moveElement(rect, { x: 5000, y: -5000 })).toEqual({ ...rect, x: 1720, y: 0 });
  expect(rect).toEqual({ x: 100, y: 100, width: 200, height: 100 });
  expect(moveElement(rect, { x: 1, y: 10 })).toEqual({ ...rect, x: 101, y: 110 });
  expect(moveElement({ ...rect, id: 'element metadata' } as typeof rect, { x: 1, y: 0 })).toEqual({
    ...rect,
    x: 101,
  });
});
it('keeps resizing positive, bounded and anchored to the same top-left corner', () => {
  expect(resizeElement(rect, { width: -200, height: -500 })).toEqual({
    ...rect,
    width: 1,
    height: 1,
  });
  expect(resizeElement(rect, { width: 5000, height: 5000 })).toEqual({
    ...rect,
    width: 1820,
    height: 980,
  });
  expect(() => resizeElement({ ...rect, width: NaN }, { width: 10, height: 10 })).toThrow(
    RangeError,
  );
});
it('aligns against the stage and exposes safe-area/center guides', () => {
  expect(alignElement(rect, 'center').x).toBe(860);
  expect(alignElement(rect, 'right').x).toBe(1720);
  expect(alignElement(rect, 'middle').y).toBe(490);
  expect(alignElement(rect, 'bottom').y).toBe(980);
  expect(alignmentGuides({ ...rect, x: 860, y: 96 })).toEqual(
    expect.arrayContaining([
      { axis: 'x', value: 960 },
      { axis: 'y', value: 96 },
    ]),
  );
});
