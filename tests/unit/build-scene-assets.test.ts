import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

async function writeMaster(root: string, fileName: string, width = 3840, height = width * 9 / 16) {
  const foreground = fileName.includes('-desks') || fileName.includes('-foreground');
  if (!foreground) {
    await sharp({
      create: { width, height, channels: 3, background: { r: 18, g: 35, b: 52 } },
    })
      .png()
      .toFile(path.join(root, fileName));
    return;
  }
  const pixels = Buffer.alloc(width * height * 4);
  const finalForeground = fileName.includes('-foreground');
  const left = Math.ceil(width * (finalForeground ? 0.13 : 0.26));
  const right = Math.ceil(width * (finalForeground ? 0.69 : 0.68));
  const top = Math.floor(height * (finalForeground ? 0.54 : 0.56));
  const bottom = height;
  const objectWidth = Math.floor(width * (finalForeground ? 0.18 : 0.06));
  for (let y = top; y < bottom; y += 1) {
    for (const start of [left, right]) {
      for (let x = start; x < Math.min(width, start + objectWidth); x += 1) {
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
  test('builds a complete package and selectively rebuilds with a verified cache', async () => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await writeMasterSet(root);
    const first = await buildSceneAssets({ sceneRoot: root });
    const firstManifestText = await readFile(path.join(root, 'scene-manifest.json'), 'utf8');
    const firstVariants = await readdir(path.join(root, 'variants'));
    const firstBytes = await Promise.all(
      firstVariants.map((fileName) => readFile(path.join(root, 'variants', fileName))),
    );

    const only = ['county-council-ballroom'];
    const cachedId = 'county-council-ballroom-foreground';
    const manifestPath = path.join(root, 'scene-manifest.json');
    for (const defect of ['source hash', 'variant hash', 'variant width', 'variant path',
      'variant quality', 'missing variant', 'duplicate asset']) {
      const changed = JSON.parse(firstManifestText);
      const cached = changed.assets.find((asset: { id: string }) => asset.id === cachedId);
      if (defect === 'source hash') cached.source.sha256 = '0'.repeat(64);
      if (defect === 'variant hash') cached.variants[0].sha256 = '0'.repeat(64);
      if (defect === 'variant width') cached.variants[0].width = 1;
      if (defect === 'variant path') cached.variants[0].path = '../outside.avif';
      if (defect === 'variant quality') cached.variants[0].quality = 1;
      if (defect === 'missing variant') cached.variants.pop();
      if (defect === 'duplicate asset') changed.assets[0] = changed.assets[1];
      const changedText = JSON.stringify(changed);
      await writeFile(manifestPath, changedText);
      await expect(buildSceneAssets({ sceneRoot: root, only }), defect).rejects.toThrow();
      expect(await readFile(manifestPath, 'utf8')).toBe(changedText);
    }
    await writeFile(manifestPath, firstManifestText);
    const cachedAsset = first.assets.find((asset: { id: string }) => asset.id === cachedId);
    const cachedPath = path.join(root, cachedAsset.variants[0].path);
    const cachedBytes = await readFile(cachedPath);
    await writeFile(cachedPath, Buffer.concat([cachedBytes, Buffer.from([0])]));
    await expect(buildSceneAssets({ sceneRoot: root, only })).rejects.toThrow('failed byte');
    expect(await readFile(manifestPath, 'utf8')).toBe(firstManifestText);
    await rm(cachedPath);
    await expect(buildSceneAssets({ sceneRoot: root, only })).rejects.toThrow();
    await writeFile(cachedPath, cachedBytes);

    const selectedAsset = first.assets.find((asset: { id: string }) =>
      asset.id === only[0])!;
    const selectedPath = path.join(root, selectedAsset.variants[0].path);
    await writeFile(selectedPath, Buffer.from('replace this selected cache'));
    const second = await buildSceneAssets({ sceneRoot: root, only });
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
    expect(first.assets).toHaveLength(13);
    expect(firstVariants).toHaveLength(130);

    expect(
      first.assets
        .filter((asset: { layerRole: string }) => asset.layerRole === 'foreground')
        .map(({ id, ownerId, source }: { id: string; ownerId: string; source: { path: string } }) => ({
          id,
          ownerId,
          sourcePath: source.path,
        })),
    ).toEqual([
      { id: 'county-council-ballroom-foreground', ownerId: 'county-council-ballroom', sourcePath: 'county-council-ballroom-foreground.png' },
      { id: 'midnight-call-in-studio-foreground', ownerId: 'midnight-call-in-studio', sourcePath: 'midnight-call-in-studio-foreground.png' },
      { id: 'palace-press-hall-foreground', ownerId: 'palace-press-hall', sourcePath: 'palace-press-hall-foreground.png' },
      { id: 'influencer-campaign-livestream-foreground', ownerId: 'influencer-campaign-livestream', sourcePath: 'influencer-campaign-livestream-foreground.png' },
      { id: 'modern-debate-studio-desks', ownerId: 'modern-debate-studio', sourcePath: 'modern-debate-studio-desks.png' },
      { id: 'transition-era-television-studio-desks', ownerId: 'transition-era-television-studio', sourcePath: 'transition-era-television-studio-desks.png' },
    ]);
    expect(first.assets.filter((asset: { layerRole: string }) => asset.layerRole === 'back')).toHaveLength(7);

    for (const asset of first.assets) {
      expect(asset.ownerType).toBe('scene');
      expect(asset.licenseIdentifier).toBe('LicenseRef-Grand-Transition-Original');
      expect(asset.source.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(asset.crop.core).toEqual({ x: 0.125, y: 0, width: 0.75, height: 1 });
      expect(Object.keys(asset.sharedSafeRectangles)).toHaveLength(4);
      expect(asset.variants).toHaveLength(10);
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
    // One full encode and one selected layer use the production codec effort.
  }, 1_200_000);

  test.each([[], ['unknown-scene'], ['county-council-ballroom', 'county-council-ballroom']])(
    'rejects invalid selected asset IDs %j before reading masters', async (...only) => {
      await expect(buildSceneAssets({ sceneRoot: path.join(await fixtureRoot(), 'missing'), only }))
        .rejects.toThrow('distinct known asset IDs');
    });

  test('requires an existing manifest for selective rebuilding', async () => {
    const root = await fixtureRoot();
    await writeMasterSet(root);
    await expect(buildSceneAssets({ sceneRoot: root, only: ['county-council-ballroom'] }))
      .rejects.toThrow('scene-manifest.json');
    await expect(readdir(path.join(root, 'variants'))).rejects.toThrow();
  });

  test('fails before it writes variants when a master has invalid dimensions', async () => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await writeMasterSet(root);
    await writeMaster(root, SCENE_MASTER_NAMES[0]!, 1280, 720);
    await expect(buildSceneAssets({ sceneRoot: root })).rejects.toThrow('3840x2160');
    await expect(readdir(path.join(root, 'variants'))).rejects.toThrow();
  });

  test.each(['modern-debate-studio', 'county-council-ballroom', 'midnight-call-in-studio',
    'palace-press-hall', 'influencer-campaign-livestream'])(
    'rejects a 1080p %s master before replacing runtime variants', async (sceneId) => {
    const root = path.join(await fixtureRoot(), 'scenes');
    await writeMasterSet(root);
    await writeMaster(root, `${sceneId}.png`, 1920, 1080);
    await expect(buildSceneAssets({ sceneRoot: root })).rejects.toThrow('3840x2160');
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
