export type CharacterFacing = 'left' | 'right';

export type CharacterFramingBounds = Readonly<{ left: number; right: number }>;

/** Protect heads and raised hands, plus the authored inner prop window. */
export function measureCharacterFramingBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  facing: CharacterFacing,
): CharacterFramingBounds | null {
  let left = width;
  let right = 0;
  for (let y = 0; y < height * 0.46; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inner = facing === 'right' ? x >= width * 0.34 : x < width * 0.66;
      if (y >= height * 0.3 && !inner) continue;
      if (pixels[(y * width + x) * 4 + 3]! < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
    }
  }
  return left < right ? { left: left / width, right: right / width } : null;
}

/** Return the smallest translation that reserves space for the existing motion. */
export function characterFramingOffset(
  bounds: CharacterFramingBounds,
  mirrored: boolean,
  frame: Readonly<{ left: number; width: number }>,
  viewport: Readonly<{ left: number; right: number }>,
): number {
  const left = mirrored ? 1 - bounds.right : bounds.left;
  const right = mirrored ? 1 - bounds.left : bounds.right;
  const reserve = frame.width * 0.014 + 1;
  const minimum = viewport.left + reserve - (frame.left + left * frame.width);
  const maximum = viewport.right - reserve - (frame.left + right * frame.width);
  if (minimum > maximum) return (minimum + maximum) / 2;
  return Math.max(minimum, Math.min(0, maximum));
}
