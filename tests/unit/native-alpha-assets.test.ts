import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { expect, test } from 'vitest';
// @ts-expect-error Production validators are native ECMAScript modules.
import { inspectAlpha as inspectCharacter } from '../../tools/validate-character-assets.mjs';
// @ts-expect-error Production validators are native ECMAScript modules.
import { inspectAlpha as inspectScene } from '../../tools/validate-scene-assets.mjs';
// @ts-expect-error Production helpers are native ECMAScript modules.
import { hasNativeAlphaProvenance } from '../../tools/asset-pixels.mjs';
// @ts-expect-error Production validators are native ECMAScript modules.
import { validateStateAsset } from '../../tools/validate-character-states.mjs';
// @ts-expect-error Production builders are native ECMAScript modules.
import { encodeVariant, encodeVariantWithMetadata } from '../../tools/build-character-assets.mjs';

const execFileAsync = promisify(execFile);
const script = path.resolve('.github/skills/repair-scene-composition/scripts/green-chroma-key.mjs');

test('shipped native Local Baron portrait satisfies production border and contour checks', async () => {
  const input = await readFile(path.resolve('src/assets/characters/county-baron--municipal-patron.png'));
  expect(hasNativeAlphaProvenance(input)).toBe(true);
  await expect(inspectCharacter(input, 'shipped Local Baron', { nativeAlpha: true })).resolves.toBeUndefined();
});

test.each(['avif', 'webp'])('small native %s encoding keeps the outer border transparent', async (format) => {
  const input = await readFile(path.resolve('src/assets/characters/county-baron--municipal-patron.png'));
  const output = await encodeVariant(input, 128, format);
  await expect(inspectCharacter(output, `128px ${format}`, { nativeAlpha: true })).resolves.toBeUndefined();
});

test('native Prophet AVIF encoding prevents compression from restoring border haze', async () => {
  const input = await readFile(path.resolve('src/assets/characters/algorithmic-prophet.png'));
  expect(hasNativeAlphaProvenance(input)).toBe(true);
  const encoded = await encodeVariantWithMetadata(input, 320, 'avif');
  expect(encoded.quality).toBe(100);
  expect(encoded.lossless).toBe(true);
  expect(encoded.output.length).toBeLessThanOrEqual(250 * 1024);
  await expect(inspectCharacter(encoded.output, '320px Prophet AVIF', { nativeAlpha: true })).resolves.toBeUndefined();
}, 30_000);

async function fixture(interior = 250, edge = 128, green = false): Promise<Buffer> {
  const pixels = Buffer.alloc(100 * 100 * 4);
  for (let y = 2; y < 98; y += 1) {
    for (let x = 25; x < 75; x += 1) {
      const offset = (y * 100 + x) * 4;
      pixels.set(green ? [0, 255, 0] : [100, 80, 60], offset);
      pixels[offset + 3] = x === 25 || x === 74 ? edge : interior;
    }
  }
  return sharp(pixels, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
}

async function invalidTopologyFixture(kind: 'border' | 'detached' | 'haze'): Promise<Buffer> {
  const decoded = await sharp(await fixture()).raw().toBuffer({ resolveWithObject: true });
  const setAlpha = (x: number, y: number, alpha: number) => {
    decoded.data[(y * decoded.info.width + x) * 4 + 3] = alpha;
  };
  if (kind === 'detached') {
    for (let y = 2; y < 98; y += 1) {
      setAlpha(25, y, 250);
      setAlpha(74, y, 250);
    }
    setAlpha(10, 50, 128);
  } else if (kind === 'border') {
    setAlpha(50, 0, 128);
  } else {
    for (let y = 20; y < 50; y += 1) {
      for (let x = 5; x < 16; x += 1) setAlpha(x, y, 1);
    }
  }
  return sharp(decoded.data, {
    raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
  }).png().toBuffer();
}

test.each([250, 253, 254, 255])('native character and foreground alpha accepts %s interiors and green materials', async (interior) => {
  const input = await fixture(interior, 128, true);
  await expect(inspectCharacter(input, 'native', { nativeAlpha: true })).resolves.toBeUndefined();
  await expect(inspectScene(input, true, 'native', { nativeAlpha: true })).resolves.toBeUndefined();
  await expect(inspectCharacter(input, 'legacy')).rejects.toThrow();
  await expect(inspectScene(input, true, 'legacy')).rejects.toThrow(/chroma-green/u);
  await expect(inspectScene(input, false, 'back', { nativeAlpha: true })).rejects.toThrow(/fully opaque/u);
});

test.each([[249, 128], [250, 250], [0, 0], [128, 250]])('rejects native empty, translucent, or edgeless art (%s, %s)', async (interior, edge) => {
  const input = await fixture(interior, edge);
  await expect(inspectCharacter(input, 'native', { nativeAlpha: true })).rejects.toThrow();
  await expect(inspectScene(input, true, 'native', { nativeAlpha: true })).rejects.toThrow();
});

test.each(['detached', 'border', 'haze'] as const)(
  'rejects native %s alpha outside the immediate silhouette contour',
  async (kind) => {
    const input = await invalidTopologyFixture(kind);
    await expect(inspectCharacter(input, 'native', { nativeAlpha: true })).rejects.toThrow();
    await expect(inspectScene(input, true, 'native', { nativeAlpha: true })).rejects.toThrow();
  },
);

test('native adoption rejects detached alpha before stamping workflow metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-native-alpha-invalid-'));
  try {
    const file = path.join(root, 'detached.png');
    await writeFile(file, await invalidTopologyFixture('detached'));
    await execFileAsync(process.execPath, [script, 'provenance', file, '--source', 'Synthetic native-alpha test fixture.']);
    await expect(execFileAsync(process.execPath, [script, 'adopt-native', file])).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('native adoption preserves decoded pixels and records provenance without green-key claims', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-native-alpha-'));
  try {
    const file = path.join(root, 'native.png');
    const input = await fixture(250, 128, true);
    await sharp(input).toFile(file);
    await execFileAsync(process.execPath, [script, 'provenance', file, '--source', 'Synthetic native-alpha test fixture.']);
    await execFileAsync(process.execPath, [script, 'adopt-native', file]);
    const stamped = await readFile(file);
    expect(hasNativeAlphaProvenance(stamped)).toBe(true);
    expect(hasNativeAlphaProvenance(input)).toBe(false);
    expect(await sharp(stamped).raw().toBuffer()).toEqual(await sharp(input).raw().toBuffer());
    expect(stamped.includes(Buffer.from('native-alpha-v1'))).toBe(true);
    expect(stamped.includes(Buffer.from('generated-alpha-v1'))).toBe(true);
    for (const key of ['Chroma Key', 'Chroma Adoption', 'Alpha Matte', 'Foreground Reconstruction']) {
      expect(stamped.includes(Buffer.from(key))).toBe(false);
    }
    await expect(execFileAsync(process.execPath, [script, 'validate', root])).resolves.toBeDefined();
    const variant = await sharp(input).webp({ lossless: true }).toBuffer();
    await writeFile(path.join(root, 'state.webp'), variant);
    const record = (bytes: Buffer, rasterPath: string, format: string) => ({
      path: rasterPath, format, width: 100, height: 100, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    const asset = {
      id: 'native-state', source: record(stamped, 'native.png', 'png'),
      variants: [record(variant, 'state.webp', 'webp')],
    };
    await expect(validateStateAsset(root, asset)).resolves.toEqual(['state.webp']);
    await writeFile(file, input);
    asset.source = record(input, 'native.png', 'png');
    await expect(validateStateAsset(root, asset)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
