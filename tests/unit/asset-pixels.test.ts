import { expect, test } from 'vitest';
// @ts-expect-error The shared image policy is a native ECMAScript module.
import * as pixels from '../../tools/asset-pixels.mjs';

const { isVisibleChromaGreen } = pixels as {
  isVisibleChromaGreen: (data: Uint8Array, offset: number) => boolean;
};

test('permits only the bounded alpha fringe for chroma-coded RGB', () => {
  expect(isVisibleChromaGreen(Uint8Array.of(0, 255, 0, 0), 0)).toBe(false);
  expect(isVisibleChromaGreen(Uint8Array.of(80, 180, 80, 16), 0)).toBe(false);
  expect(isVisibleChromaGreen(Uint8Array.of(80, 180, 80, 17), 0)).toBe(true);
  expect(isVisibleChromaGreen(Uint8Array.of(81, 180, 80, 255), 0)).toBe(false);
  expect(isVisibleChromaGreen(Uint8Array.of(80, 179, 80, 255), 0)).toBe(false);
  expect(isVisibleChromaGreen(Uint8Array.of(80, 180, 81, 255), 0)).toBe(false);
});
