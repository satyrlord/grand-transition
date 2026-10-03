import { expect, test } from 'vitest';
import {
  characterFramingOffset,
  measureCharacterFramingBounds,
} from '../../src/visual/character-framing.ts';

test('protects upper anatomy and only the facing-side inner prop window', () => {
  const pixels = new Uint8ClampedArray(100 * 100 * 4);
  const mark = (x: number, y: number, alpha = 255) => {
    pixels[(y * 100 + x) * 4 + 3] = alpha;
  };
  mark(3, 20);
  mark(90, 40);
  mark(1, 40);
  mark(99, 55);
  mark(0, 15, 127);
  expect(measureCharacterFramingBounds(pixels, 100, 100, 'right')).toEqual({
    left: 0.03,
    right: 0.91,
  });
  expect(measureCharacterFramingBounds(pixels, 100, 100, 'left')).toEqual({
    left: 0.01,
    right: 0.04,
  });
});

test('does not invent a protected subject from transparent pixels', () => {
  expect(measureCharacterFramingBounds(new Uint8ClampedArray(400), 10, 10, 'right')).toBeNull();
});

test('fits mirrored poses equally without reversing the screen-space translation', () => {
  const bounds = { left: 0.1, right: 0.3 };
  const viewport = { left: 0, right: 500 };
  expect(characterFramingOffset(bounds, false, { left: -40, width: 200 }, viewport)).toBeCloseTo(
    23.8,
  );
  expect(characterFramingOffset(bounds, true, { left: 340, width: 200 }, viewport)).toBeCloseTo(
    -23.8,
  );
});

test('keeps the original placement when the protected pose and motion already fit', () => {
  expect(
    characterFramingOffset(
      { left: 0.2, right: 0.6 },
      false,
      { left: 100, width: 200 },
      { left: 0, right: 500 },
    ),
  ).toBe(0);
});
