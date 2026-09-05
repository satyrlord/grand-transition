import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
// @ts-expect-error The production image tool is a native ECMAScript module.
import * as sceneBuilder from '../../tools/build-scene-assets.mjs';

const { buildSceneAssets, SCENE_BYTE_BUDGETS, SCENE_MASTER_NAMES } = sceneBuilder;

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-build-test-'));
  roots.push(root);
  return root;
}

async function writeMaster(root: string, fileName: string, width = 1920, height = 1080) {
  const foreground = fileName.includes('-desks');
  if (!foreground) {
    await sharp({
      create: { width, height, channels: 3, background: { r: 18, g: 35, b: 52 } },
    })
      .png()
      .toFile(path.join(root, fileName));
    return;
  }
  const pixels = Buffer.alloc(width * height * 4);
  const left = Math.floor(width * 0.26);
  const right = Math.floor(width * 0.68);
  const top = Math.floor(height * 0.56);
  for (let y = top; y < height; y += 1) {
    for (const start of [left, right]) {
      for (let x = start; x < Math.min(width, start + Math.floor(width * 0.06)); x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 120;
        pixels[offset + 1] = 52;
        pixels[offset + 2] = 28;
        pixels[offset + 3] = y === top || x === start ? 128 : 255;
      }
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(root, fileName));
}

async function writeMasterSet(root: string) {
  await mkdir(root, { recursive: true });
  await Promise.all(SCENE_MASTER_NAMES.map((fileName: string) => writeMaster(root, fileName)));
}

describe('scene asset build', () => {
  test('builds deterministic budgeted variants and a complete manifest', async () => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await writeMasterSet(root);
    const first = await buildSceneAssets({ sceneRoot: root });
    const firstManifestText = await readFile(path.join(root, 'scene-manifest.json'), 'utf8');
    const firstVariants = await readdir(path.join(root, 'variants'));
    const firstBytes = await Promise.all(
      firstVariants.map((fileName) => readFile(path.join(root, 'variants', fileName))),
    );

    const second = await buildSceneAssets({ sceneRoot: root });
    const secondManifestText = await readFile(path.join(root, 'scene-manifest.json'), 'utf8');
    const secondVariants = await readdir(path.join(root, 'variants'));
    const secondBytes = await Promise.all(
      secondVariants.map((fileName) => readFile(path.join(root, 'variants', fileName))),
    );

    expect(second).toEqual(first);
    expect(secondManifestText).toBe(firstManifestText);
    expect(secondVariants).toEqual(firstVariants);
    expect(secondBytes).toEqual(firstBytes);
    expect(first.schemaVersion).toBe(1);
    expect(first.assets).toHaveLength(8);
    expect(firstVariants).toHaveLength(48);

    for (const asset of first.assets) {
      expect(asset.ownerType).toBe('scene');
      expect(asset.licenseIdentifier).toBe('LicenseRef-Grand-Transition-Original');
      expect(asset.source.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(asset.crop.core).toEqual({ x: 0.125, y: 0, width: 0.75, height: 1 });
      expect(Object.keys(asset.sharedSafeRectangles)).toHaveLength(4);
      expect(asset.variants).toHaveLength(6);
      for (const variant of asset.variants) {
        expect(variant.bytes).toBeLessThanOrEqual(
          SCENE_BYTE_BUDGETS[variant.format as 'avif' | 'webp'],
        );
        expect(variant.sha256).toMatch(/^[a-f0-9]{64}$/u);
        const metadata = await sharp(path.join(root, variant.path)).metadata();
        expect(metadata).toMatchObject({
          width: variant.width,
          height: variant.height,
          format: variant.format === 'avif' ? 'heif' : variant.format,
        });
      }
    }
  }, 120_000);

  test('fails before it writes variants when a master has invalid dimensions', async () => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await writeMasterSet(root);
    await writeMaster(root, SCENE_MASTER_NAMES[0]!, 1280, 720);
    await expect(buildSceneAssets({ sceneRoot: root })).rejects.toThrow('1920x1080');
    await expect(readdir(path.join(root, 'variants'))).rejects.toThrow();
  });

  test('rejects an incomplete master set', async () => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await mkdir(root, { recursive: true });
    await writeMaster(root, SCENE_MASTER_NAMES[0]!);
    await expect(buildSceneAssets({ sceneRoot: root })).rejects.toThrow(
      'must contain exactly',
    );
  });
});
