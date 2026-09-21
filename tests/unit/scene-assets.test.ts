import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  resolveSceneAsset,
  sceneAssetManifest,
  sceneImageSizes,
} from '../../src/app/scene-assets';
import { sampleContent } from '../../src/game-content';

describe('scene asset resolver', () => {
  test('ships regenerated studio layers from native 4K Flare sources without upscaling', async () => {
    const root = path.resolve('src/assets/scenes');
    const expected = [
      ['modern-debate-studio', '6ec7559a6d9be4418666ed4e7367f4f3d7206af4ceb89f709834d9822c830c20'],
      ['modern-debate-studio-desks', 'bc6e11b259d99fe763e362c1c956fc3cb79fe5a6583a68892155822e7d599901'],
      ['transition-era-television-studio-desks', '687e4920f87819df31e2203ee1f14afef27ddb8849dd34187364fffeff9f081a'],
    ] as const;
    const manifest = JSON.parse(await readFile(path.join(root, 'scene-manifest.json'), 'utf8'));

    for (const [id, expectedHash] of expected) {
      const bytes = await readFile(path.join(root, `${id}.png`));
      const hash = createHash('sha256').update(bytes).digest('hex');
      const scene = manifest.assets.find((asset: { id: string }) => asset.id === id);
      expect(hash).toBe(expectedHash);
      expect(scene.source).toMatchObject({ sha256: hash, width: 3840, height: 2160 });
      expect(scene.sourceDescription).toContain('gpt-image-2.5-flare');
      expect(scene.sourceDescription).toContain('native 3840x2160');
      expect(scene.sourceDescription).toContain('No upscaling');
      expect(scene.sourceDescription).not.toContain('upscaled from');
    }
  });

  test('ships the selected native 4K OpenAI background instead of the previous upscale', async () => {
    const root = path.resolve('src/assets/scenes');
    const bytes = await readFile(path.join(root, 'transition-era-television-studio.png'));
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe('76368f93b5a8391c2ad3614ba4b87804b4bb95a0ebfd5e7a177601c644f62442');
    const manifest = JSON.parse(await readFile(path.join(root, 'scene-manifest.json'), 'utf8'));
    const scene = manifest.assets.find((asset: { id: string }) => asset.id === 'transition-era-television-studio');
    expect(scene.source).toMatchObject({ sha256: hash, width: 3840, height: 2160 });
    expect(scene.sourceDescription).toContain('OpenAI API, gpt-image-2.5-sunburst');
    expect(scene.sourceDescription).toContain('native 3840x2160');
    expect(scene.sourceDescription).toContain('editorial-cartoon');
    expect(scene.sourceDescription).toContain('shifted down 72 pixels');
    expect(scene.sourceDescription).not.toContain('anime');
    expect(scene.sourceDescription).not.toContain('upscaled from');
    expect(scene.variants).toHaveLength(10);
  });

  test('keeps every scene variant outside the initial JavaScript bundle', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src', 'app', 'scene-assets.ts'),
      'utf8',
    );

    expect(source.match(/query: '\?url&no-inline'/gu)).toHaveLength(2);
    expect(source).not.toMatch(/query: '\?url'/gu);
  });

  test('ships the approved one-layer civic cypher source and no foreground', async () => {
    const root = path.resolve('src/assets/scenes');
    const bytes = await readFile(path.join(root, 'civic-cypher-boxing-ring.png'));
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe('1b377bdfc260c715909486744e6b5acdd71b755b288bd2d3f83e017c557f5db1');
    const manifest = JSON.parse(await readFile(path.join(root, 'scene-manifest.json'), 'utf8'));
    const scene = manifest.assets.find((asset: { id: string }) =>
      asset.id === 'civic-cypher-boxing-ring');
    expect(scene).toMatchObject({
      ownerId: 'civic-cypher-boxing-ring',
      layerRole: 'back',
      source: { sha256: hash, width: 3840, height: 2160 },
    });
    expect(scene.sourceDescription).toContain('gpt-image-2.5-flare');
    expect(scene.sourceDescription).toContain('text-only');
    expect(scene.sourceDescription).toContain('reference-edited');
    expect(scene.sourceDescription).toContain('composited at fixed clear positions');
    expect(scene.sourceDescription).toContain('No upscaling');
    expect(manifest.assets.some((asset: { id: string }) =>
      asset.id.startsWith('civic-cypher-boxing-ring-'))).toBe(false);
  });

  test('maps every manifest layer to AVIF-first and WebP fallback srcsets', () => {
    expect(sceneAssetManifest).toHaveLength(13);
    const variants = sceneAssetManifest.flatMap((asset) => [
      ...asset.avif.variants,
      ...asset.webp.variants,
    ]);
    expect(variants).toHaveLength(130);

    for (const asset of sceneAssetManifest) {
      expect(asset.width).toBe(3840);
      expect(asset.height).toBe(asset.width * 9 / 16);
      expect(asset.url).toBe(asset.webp.fallbackUrl);
      expect(asset.avif.srcSet).toMatch(/640w/u);
      expect(asset.avif.srcSet).toMatch(/1280w/u);
      expect(asset.avif.srcSet).toMatch(/1920w/u);
      expect(asset.webp.srcSet).toMatch(/640w/u);
      expect(asset.webp.srcSet).toMatch(/1280w/u);
      expect(asset.webp.srcSet).toMatch(/1920w/u);
      expect(asset.avif.srcSet).not.toMatch(/\.png/u);
      expect(asset.webp.srcSet).not.toMatch(/\.png/u);
      expect(asset.crop.core).toEqual({
        x: 0.125,
        y: 0,
        width: 0.75,
        height: 1,
      });
      expect(asset.sharedSafeRectangles.centralInteraction).toEqual({
        x: 0.32,
        y: 0.18,
        width: 0.36,
        height: 0.76,
      });
      expect(Object.isFrozen(asset)).toBe(true);
      expect(Object.isFrozen(asset.avif)).toBe(true);
      expect(Object.isFrozen(asset.focalRectangles)).toBe(true);
    }
  });

  test('serves every scene layer at every size through 4K', () => {
    for (const asset of sceneAssetManifest) {
      for (const source of [asset.avif, asset.webp]) {
        expect(source.variants.map((variant) => variant.width)).toEqual([
          640, 1280, 1920, 2560, 3840,
        ]);
        expect(source.fallbackUrl).toContain('3840x2160');
      }
    }
  });

  test('exposes the shared responsive image sizing contract', () => {
    expect(sceneImageSizes).toBe('(max-aspect-ratio: 4/3) 134vw, 100vw');
    const transitionBack = resolveSceneAsset(
      'transition-era-television-studio',
    );
    expect(transitionBack.kind).toBe('manifest');
    if (transitionBack.kind === 'manifest') {
      expect(transitionBack.focalPoint).toEqual({ x: 0.5, y: 0.43 });
      expect(transitionBack.focalRectangles.moderatorFace).toEqual({
        x: 0.46,
        y: 0.35,
        width: 0.08,
        height: 0.14,
      });
    }
  });

  test('throws for a missing scene asset ID', () => {
    expect(() => resolveSceneAsset('missing-scene-asset')).toThrow(
      'Scene asset "missing-scene-asset" is missing from the manifest.',
    );
  });

  test('each foundation scene resolves its own complete package without title artwork', () => {
    for (const id of ['county-council-ballroom', 'midnight-call-in-studio', 'palace-press-hall', 'influencer-campaign-livestream']) {
      const back = resolveSceneAsset(id);
      const foreground = resolveSceneAsset(`${id}-foreground`);
      for (const asset of [back, foreground]) {
        expect(asset.ownerId).toBe(id);
        expect(asset.kind).toBe('manifest');
        expect(asset.focalRectangles.moderatorFace).toBeNull();
        expect(asset.avif.variants).toHaveLength(5);
        expect(asset.webp.variants).toHaveLength(5);
        expect(asset.url).toContain(id);
        expect(asset.url).not.toContain('title-proscenium');
      }
      expect(back.layerRole).toBe('back');
      expect(foreground.layerRole).toBe('foreground');
    }
    expect(() => resolveSceneAsset('catalog-foundation-neutral-scene')).toThrow();
  });

  test('maps every final scene to distinct layers, motion, and effects', () => {
    const expected = {
      'transition-era-television-studio': {
        layers: ['transition-era-television-studio', 'transition-era-television-studio-desks'],
        animationId: 'transition-era-studio-lights',
        effectIds: ['studio-light-flicker', 'crt-roll'],
      },
      'modern-debate-studio': {
        layers: ['modern-debate-studio', 'modern-debate-studio-desks'],
        animationId: 'modern-debate-light-lines',
        effectIds: ['led-light-sweep', 'floor-reflection-pulse'],
      },
      'county-council-ballroom': {
        layers: ['county-council-ballroom', 'county-council-ballroom-foreground'],
        animationId: 'county-ballroom-chandelier-glint',
        effectIds: ['chandelier-glint', 'equipment-status-pulse'],
      },
      'midnight-call-in-studio': {
        layers: ['midnight-call-in-studio', 'midnight-call-in-studio-foreground'],
        animationId: 'midnight-ticker-crawl',
        effectIds: ['ticker-crawl', 'call-line-pulse'],
      },
      'palace-press-hall': {
        layers: ['palace-press-hall', 'palace-press-hall-foreground'],
        animationId: 'palace-press-light-sweep',
        effectIds: ['press-light-sweep', 'camera-ready-pulse'],
      },
      'influencer-campaign-livestream': {
        layers: ['influencer-campaign-livestream', 'influencer-campaign-livestream-foreground'],
        animationId: 'livestream-reaction-rise',
        effectIds: ['reaction-rise', 'donation-alert-pulse'],
      },
      'civic-cypher-boxing-ring': {
        layers: ['civic-cypher-boxing-ring'],
        animationId: 'civic-cypher-crowd-bounce',
        effectIds: ['crowd-bounce', 'microphone-swing'],
      },
    } as const;

    for (const scene of sampleContent.scenes) {
      expect(scene.backgroundLayers.map(({ media }) => media.assetId)).toEqual(
        expected[scene.id as keyof typeof expected].layers,
      );
      expect(scene.animationId).toBe(expected[scene.id as keyof typeof expected].animationId);
      expect(scene.effectIds).toEqual(expected[scene.id as keyof typeof expected].effectIds);
    }
    expect(new Set(sampleContent.scenes.map(({ animationId }) => animationId)).size).toBe(7);
    expect(new Set(sampleContent.scenes.flatMap(({ effectIds }) => effectIds)).size).toBe(14);
  });
});
