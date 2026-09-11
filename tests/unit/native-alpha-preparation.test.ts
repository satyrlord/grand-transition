import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { expect, test } from 'vitest';
// @ts-expect-error The image preparation policy is a native ECMAScript module.
import * as nativeAlpha from '../../.github/skills/generate-scene-openai/scripts/native-alpha.mjs';

interface Inspection {
  width: number;
  height: number;
  hasAlpha: boolean;
  valid: boolean;
  issues: string[];
  topology: Record<string, number>;
}

const { inspectNativeAlpha, prepareNativeAlpha } = nativeAlpha as {
  inspectNativeAlpha: (bytes: Buffer) => Promise<Inspection>;
  prepareNativeAlpha: (bytes: Buffer) => Promise<{
    output: Buffer;
    record: {
      method: string;
      sourceSha256: string;
      outputSha256: string;
      width: number;
      height: number;
      clearedAlphaOnePixels: number;
      before: Inspection;
      after: Inspection;
    };
  }>;
};

const width = 32;
const height = 32;
const alphaOffset = (x: number, y: number) => (y * width + x) * 4 + 3;
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function fixture() {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = x * 7;
      pixels[offset + 1] = y * 7;
      pixels[offset + 2] = (x + y) * 3;
      if (x >= 10 && x <= 21 && y >= 10 && y <= 21) pixels[offset + 3] = 250;
      else if (x >= 9 && x <= 22 && y >= 9 && y <= 22) pixels[offset + 3] = 100;
    }
  }
  return pixels;
}

const encode = (pixels: Buffer) => sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
const decode = (bytes: Buffer) => sharp(bytes).ensureAlpha().raw().toBuffer();

test('clears only alpha 1 beyond the Chebyshev contour and preserves all RGB and other alpha bytes', async () => {
  const pixels = fixture();
  pixels[alphaOffset(6, 6)] = 1; // Four diagonal pixels from the interior.
  pixels[alphaOffset(5, 5)] = 1; // Five diagonal pixels from the interior.
  pixels[alphaOffset(0, 0)] = 1;
  pixels[alphaOffset(9, 9)] = 2;
  pixels[alphaOffset(9, 10)] = 249;
  pixels[alphaOffset(10, 10)] = 255;
  const source = await encode(pixels);
  const beforeBytes = await decode(source);
  const { output, record } = await prepareNativeAlpha(source);
  const expected = Buffer.from(beforeBytes);
  expected[alphaOffset(5, 5)] = 0;
  expected[alphaOffset(0, 0)] = 0;
  expect(await decode(output)).toEqual(expected);
  expect(await decode(source)).toEqual(beforeBytes);
  expect(record).toMatchObject({
    method: 'clear-detached-alpha-one-v1', width, height,
    sourceSha256: hash(source), outputSha256: hash(output), clearedAlphaOnePixels: 2,
    before: { valid: false, topology: { detachedAlphaOnePixels: 2, nontransparentBorderPixels: 1 } },
    after: { valid: true, topology: { detachedAlphaOnePixels: 0, nontransparentBorderPixels: 0 } },
  });
});

test('returns the exact original buffer and hashes when no cleanup is needed', async () => {
  const source = await encode(fixture());
  const result = await prepareNativeAlpha(source);
  expect(result.output).toBe(source);
  expect(result.record.sourceSha256).toBe(result.record.outputSha256);
  expect(result.record.clearedAlphaOnePixels).toBe(0);
  expect(result.record.before).toEqual(result.record.after);
});

test.each(['border', 'haze'] as const)('rejects alpha-2 %s without modifying the source', async (kind) => {
  const pixels = fixture();
  if (kind === 'border') pixels[alphaOffset(0, 0)] = 2;
  else for (let x = 1; x <= 8; x += 1) pixels[alphaOffset(x, 3)] = 2;
  pixels[alphaOffset(2, 2)] = 1;
  const source = await encode(pixels);
  const original = Buffer.from(source);
  const report = await inspectNativeAlpha(source);
  expect(report.valid).toBe(false);
  expect(report.topology.detachedStrongerAlphaPixels).toBe(kind === 'border' ? 1 : 8);
  await expect(prepareNativeAlpha(source)).rejects.toThrow(kind === 'border' ? 'outer border' : '90%');
  expect(source).toEqual(original);
});

test('preserves detached stronger alpha that remains inside the existing aggregate tolerance', async () => {
  const pixels = fixture();
  pixels[alphaOffset(3, 3)] = 2;
  const source = await encode(pixels);
  const result = await prepareNativeAlpha(source);
  expect(result.output).toBe(source);
  expect(result.record.after.topology.detachedStrongerAlphaPixels).toBe(1);
  expect(result.record.after.valid).toBe(true);
});

test('rejects a nontransparent border even when it is within the valid contour distance', async () => {
  const pixels = fixture();
  pixels[alphaOffset(2, 10)] = 250;
  pixels[alphaOffset(0, 10)] = 1;
  await expect(prepareNativeAlpha(await encode(pixels))).rejects.toThrow('outer border');
});

test('reports and rejects an image with no original alpha channel', async () => {
  const source = await sharp(await encode(fixture())).removeAlpha().png().toBuffer();
  expect(await inspectNativeAlpha(source)).toMatchObject({ width, height, hasAlpha: false, valid: false });
  await expect(prepareNativeAlpha(source)).rejects.toThrow('alpha channel');
});

test('rejects a partial-alpha majority even when every edge pixel is close to an interior pixel', async () => {
  const pixels = fixture();
  for (let y = 10; y <= 21; y += 1) {
    for (let x = 10; x <= 21; x += 1) {
      pixels[alphaOffset(x, y)] = x % 3 === 0 && y % 3 === 0 ? 250 : 100;
    }
  }
  const source = await encode(pixels);
  const report = await inspectNativeAlpha(source);
  expect(report.topology.contourRatio).toBe(1);
  expect(report.topology.nearOpaquePixels).toBeGreaterThan(0);
  await expect(prepareNativeAlpha(source)).rejects.toThrow('At least 50%');
});

test.each(['transparent', 'opaque', 'hard-edge', 'translucent'] as const)(
  'rejects missing native topology in a %s candidate', async (kind) => {
    const pixels = fixture();
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const offset = pixel * 4 + 3;
      if (kind === 'transparent') pixels[offset] = 0;
      if (kind === 'opaque') pixels[offset] = 255;
      if (kind === 'hard-edge' && pixels[offset] > 0) pixels[offset] = 255;
      if (kind === 'translucent' && pixels[offset] > 0) pixels[offset] = 100;
    }
    const source = await encode(pixels);
    expect((await inspectNativeAlpha(source)).valid).toBe(false);
    await expect(prepareNativeAlpha(source)).rejects.toThrow('Native-alpha preparation failed');
  },
);
