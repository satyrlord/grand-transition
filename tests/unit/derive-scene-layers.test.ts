import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
// @ts-expect-error The production image tool is a native ECMAScript module.
import { deriveSceneLayers } from '../../tools/derive-scene-layers.mjs';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-derive-test-'));
  roots.push(root);
  return root;
}

function fillRect(
  pixels: Buffer,
  width: number,
  rect: { x: number; y: number; width: number; height: number },
  color: [number, number, number],
): void {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * width + x) * 3;
      pixels.set(color, offset);
    }
  }
}

async function writeRgb(filePath: string, width: number, height: number, pixels: Buffer) {
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(filePath);
}

async function makePair(
  root: string,
  options: { left?: boolean; right?: boolean; outside?: boolean } = {},
) {
  const width = 160;
  const height = 90;
  const deskless = Buffer.alloc(width * height * 3, 24);
  const composite = Buffer.from(deskless);
  if (options.left ?? true) {
    fillRect(composite, width, { x: 41, y: 51, width: 9, height: 39 }, [210, 30, 40]);
  }
  if (options.right ?? true) {
    fillRect(composite, width, { x: 110, y: 51, width: 9, height: 39 }, [30, 70, 220]);
  }
  if (options.outside) {
    fillRect(composite, width, { x: 78, y: 40, width: 3, height: 3 }, [250, 250, 250]);
  }
  const compositePath = path.join(root, 'composite.png');
  const desklessPath = path.join(root, 'deskless.png');
  await Promise.all([
    writeRgb(compositePath, width, height, composite),
    writeRgb(desklessPath, width, height, deskless),
  ]);
  return { compositePath, desklessPath };
}

function outputs(root: string, suffix = '') {
  return {
    backOutputPath: path.join(root, `back${suffix}.png`),
    foregroundOutputPath: path.join(root, `foreground${suffix}.png`),
    reportOutputPath: path.join(root, `report${suffix}.json`),
  };
}

async function rgbAt(filePath: string, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(filePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 3)];
}

async function normalizedRgbAt(filePath: string, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(filePath)
    .resize({ width: 1920, height: 1080, fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 3)];
}

describe('scene layer derivation', () => {
  test('derives exact back and green-foreground pixels and reports stable hashes', async () => {
    const root = await fixtureRoot();
    const pair = await makePair(root);
    const firstOutputs = outputs(root, '-first');
    const secondOutputs = outputs(root, '-second');
    const first = await deriveSceneLayers({ ...pair, ...firstOutputs });
    const second = await deriveSceneLayers({ ...pair, ...secondOutputs });

    expect(first).toEqual(second);
    expect(first.inputDimensions).toEqual({ width: 160, height: 90 });
    expect(first.outsideChangeCount).toBe(0);
    expect(first.maskPixelCount).toBeGreaterThan(0);
    expect(first.sideMaskBounds.left).not.toBeNull();
    expect(first.sideMaskBounds.right).not.toBeNull();
    expect(await readFile(firstOutputs.backOutputPath)).toEqual(
      await readFile(secondOutputs.backOutputPath),
    );
    expect(await readFile(firstOutputs.foregroundOutputPath)).toEqual(
      await readFile(secondOutputs.foregroundOutputPath),
    );

    expect(await rgbAt(firstOutputs.backOutputPath, 540, 800)).toEqual([24, 24, 24]);
    expect(await rgbAt(firstOutputs.backOutputPath, 960, 800)).toEqual([24, 24, 24]);
    expect(await rgbAt(firstOutputs.foregroundOutputPath, 540, 800)).toEqual([210, 30, 40]);
    expect(await rgbAt(firstOutputs.foregroundOutputPath, 960, 800)).toEqual([0, 255, 0]);
    expect(first.hashes.backSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.parse(await readFile(firstOutputs.reportOutputPath, 'utf8'))).toEqual(first);
  }, 30_000);

  test('rejects a missing side component', async () => {
    const root = await fixtureRoot();
    const pair = await makePair(root, { right: false });
    await expect(deriveSceneLayers({ ...pair, ...outputs(root) })).rejects.toThrow(
      'right desk component is missing',
    );
  });

  test('reports but excludes generative changes outside the extraction zones', async () => {
    const root = await fixtureRoot();
    const pair = await makePair(root, { outside: true });
    const result = await deriveSceneLayers({ ...pair, ...outputs(root) });

    expect(result.outsideChangeCount).toBeGreaterThan(0);
    expect(await rgbAt(outputs(root).backOutputPath, 960, 480)).toEqual(
      await normalizedRgbAt(pair.compositePath, 960, 480),
    );
  });

  test('rejects an output path that would overwrite an input or another output', async () => {
    const root = await fixtureRoot();
    const pair = await makePair(root);
    const originalComposite = await readFile(pair.compositePath);

    await expect(
      deriveSceneLayers({
        ...pair,
        ...outputs(root),
        backOutputPath: pair.compositePath,
      }),
    ).rejects.toThrow(/paths must be distinct/iu);
    expect(await readFile(pair.compositePath)).toEqual(originalComposite);

    const sharedOutput = path.join(root, 'shared-output.png');
    await expect(
      deriveSceneLayers({
        ...pair,
        ...outputs(root),
        backOutputPath: sharedOutput,
        foregroundOutputPath: sharedOutput,
      }),
    ).rejects.toThrow(/paths must be distinct/iu);
  });

  test('normalizes a one-pixel aspect drift and rejects larger drift or mismatched dimensions', async () => {
    const root = await fixtureRoot();
    const invalid = Buffer.alloc(100 * 100 * 3, 20);
    const invalidPath = path.join(root, 'invalid.png');
    const invalidDesklessPath = path.join(root, 'invalid-deskless.png');
    await Promise.all([
      writeRgb(invalidPath, 100, 100, invalid),
      writeRgb(invalidDesklessPath, 100, 100, invalid),
    ]);
    await expect(
      deriveSceneLayers({
        compositePath: invalidPath,
        desklessPath: invalidDesklessPath,
        ...outputs(root),
      }),
    ).rejects.toThrow('16:9 within one source pixel');

    const almostWide = Buffer.alloc(160 * 89 * 3, 24);
    const almostWidePath = path.join(root, 'almost-wide.png');
    const almostWideDesklessPath = path.join(root, 'almost-wide-deskless.png');
    await Promise.all([
      writeRgb(almostWidePath, 160, 89, almostWide),
      writeRgb(almostWideDesklessPath, 160, 89, almostWide),
    ]);
    await expect(
      deriveSceneLayers({
        compositePath: almostWidePath,
        desklessPath: almostWideDesklessPath,
        ...outputs(root, '-almost-wide'),
      }),
    ).rejects.toThrow('left desk component is missing');

    const pair = await makePair(root);
    const otherPath = path.join(root, 'other.png');
    await writeRgb(otherPath, 320, 180, Buffer.alloc(320 * 180 * 3, 24));
    await expect(
      deriveSceneLayers({ ...pair, desklessPath: otherPath, ...outputs(root) }),
    ).rejects.toThrow('identical dimensions');
  });
});
