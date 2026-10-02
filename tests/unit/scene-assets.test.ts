import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  resolveSceneAsset,
  sceneAssetManifest,
  sceneImageSizes,
  readSceneManifestAssets,
} from '../../src/app/scene-assets.ts';
import manifest from '../../src/assets/scenes/scene-manifest.json';
import { gameCatalog } from '../../src/game-content.ts';

describe('scene asset resolver', () => {
  test.each([1280, 1536])(
    'accepts a native %s foreground and rejects upscaled variants',
    (width) => {
      const candidate = structuredClone(manifest);
      const foreground = candidate.assets.find(({ layerRole }) => layerRole === 'foreground')!;
      foreground.source.width = width;
      foreground.source.height = (width * 9) / 16;
      foreground.variants = foreground.variants.filter((variant) => variant.width <= width);
      if (width === 1536) {
        foreground.variants.push(
          ...foreground.variants
            .filter((variant) => variant.width === 1280)
            .map((variant) => ({
              ...variant,
              width,
              height: (width * 9) / 16,
              path: variant.path.replace('1280x720', '1536x864'),
            })),
        );
      }
      expect(
        readSceneManifestAssets(candidate).find(({ id }) => id === foreground.id)?.source.width,
      ).toBe(width);
      foreground.variants[0].width = 1920;
      foreground.variants[0].height = 1080;
      expect(() => readSceneManifestAssets(candidate)).toThrow(/unsupported dimensions/u);
    },
  );

  test('keeps backgrounds at 4K and rejects undersized foregrounds', () => {
    for (const layerRole of ['back', 'foreground']) {
      const candidate = structuredClone(manifest);
      const layer = candidate.assets.find((asset) => asset.layerRole === layerRole)!;
      layer.source.width = 1024;
      layer.source.height = 576;
      expect(() => readSceneManifestAssets(candidate)).toThrow(/invalid PNG source dimensions/u);
    }
  });
  test('ships regenerated studio layers from native 4K Flare sources without upscaling', async () => {
    const root = path.resolve('src/assets/scenes');
    const expected = [
      ['modern-debate-studio', 'a8fee11bc16cde5e6ab321d66fc317aa1df2297022132be7d2952d9c7045d667'],
      [
        'modern-debate-studio-desks',
        'bc6e11b259d99fe763e362c1c956fc3cb79fe5a6583a68892155822e7d599901',
      ],
      [
        'transition-era-television-studio-desks',
        '687e4920f87819df31e2203ee1f14afef27ddb8849dd34187364fffeff9f081a',
      ],
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

  test('ships the approved reference-guided native 4K background with truthful provenance', async () => {
    const root = path.resolve('src/assets/scenes');
    const bytes = await readFile(path.join(root, 'transition-era-television-studio.png'));
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe('b122f8e78cceb02b68f0d34a2cefbfed5bd301c72a675209d0156053ca055547');
    const manifest = JSON.parse(await readFile(path.join(root, 'scene-manifest.json'), 'utf8'));
    const scene = manifest.assets.find(
      (asset: { id: string }) => asset.id === 'transition-era-television-studio',
    );
    expect(scene.source).toMatchObject({ sha256: hash, width: 3840, height: 2160 });
    expect(scene.sourceDescription).toContain('OpenAI API, gpt-image-2.5-flare');
    expect(scene.sourceDescription).toContain('native 3840x2160');
    expect(scene.sourceDescription).toContain('editorial-cartoon');
    expect(scene.sourceDescription).toContain('Reference-guided original studio design');
    expect(scene.sourceDescription).toContain(
      'no pixel preparation, resizing, repositioning, or upscaling',
    );
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
    expect(hash).toBe('06627decbda6a9f16010b28990ef4f60d4bfbf83089b828f675fb9183497b8a8');
    const manifest = JSON.parse(await readFile(path.join(root, 'scene-manifest.json'), 'utf8'));
    const scene = manifest.assets.find(
      (asset: { id: string }) => asset.id === 'civic-cypher-boxing-ring',
    );
    expect(scene).toMatchObject({
      ownerId: 'civic-cypher-boxing-ring',
      layerRole: 'back',
      source: { sha256: hash, width: 3840, height: 2160 },
    });
    expect(scene.sourceDescription).toContain('gpt-image-2.5-flare');
    expect(scene.sourceDescription).toContain('text-only');
    expect(scene.sourceDescription).toContain('reference-edited once');
    expect(scene.sourceDescription).toContain('packed camera-facing crowd in shadow');
    expect(scene.sourceDescription).not.toContain('microphone');
    expect(scene.sourceDescription).toContain('No upscaling');
    expect(
      manifest.assets.some((asset: { id: string }) =>
        asset.id.startsWith('civic-cypher-boxing-ring-'),
      ),
    ).toBe(false);
  });

  test('ships Grand Hotel Romania as a native 4K background with no foreground or moderator', async () => {
    const bytes = await readFile(path.resolve('src/assets/scenes/grand-hotel-romania.png'));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const layers = manifest.assets.filter(({ ownerId }) => ownerId === 'grand-hotel-romania');
    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({
      id: 'grand-hotel-romania',
      layerRole: 'back',
      source: { sha256: hash, width: 3840, height: 2160 },
      focalRectangles: {
        moderatorFace: null,
        leftDeskTopAndProps: null,
        rightDeskTopAndProps: null,
      },
    });
    expect(layers[0]!.sourceDescription).toBe(
      'OpenAI Images API gpt-image-2.5-flare edit, high quality, native 3840x2160 opaque PNG; one reference edit of the earlier hotel background that moves background guests out of the protected regions; metadata registration only.',
    );
    expect(layers[0]!.variants).toHaveLength(10);
    expect(resolveSceneAsset('grand-hotel-romania').layerRole).toBe('back');
  });

  test('maps every manifest layer to AVIF-first and WebP fallback srcsets', () => {
    expect(sceneAssetManifest).toHaveLength(14);
    const variants = sceneAssetManifest.flatMap((asset) => [
      ...asset.avif.variants,
      ...asset.webp.variants,
    ]);
    expect(variants).toHaveLength(136);

    for (const asset of sceneAssetManifest) {
      expect(asset.width).toBe(
        asset.id === 'influencer-campaign-livestream-foreground' ? 1680 : 3840,
      );
      expect(asset.height).toBe((asset.width * 9) / 16);
      expect(asset.url).toBe(asset.webp.fallbackUrl);
      expect(asset.avif.srcSet).toMatch(/640w/u);
      expect(asset.avif.srcSet).toMatch(/1280w/u);
      expect(asset.avif.srcSet).toContain(asset.width === 1680 ? '1680w' : '1920w');
      expect(asset.webp.srcSet).toMatch(/640w/u);
      expect(asset.webp.srcSet).toMatch(/1280w/u);
      expect(asset.webp.srcSet).toContain(asset.width === 1680 ? '1680w' : '1920w');
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

  test('serves every scene layer through its native source size without upscaling', () => {
    for (const asset of sceneAssetManifest) {
      for (const source of [asset.avif, asset.webp]) {
        expect(source.variants.map((variant) => variant.width)).toEqual(
          asset.width === 1680 ? [640, 1280, 1680] : [640, 1280, 1920, 2560, 3840],
        );
        expect(source.fallbackUrl).toContain(`${asset.width}x${asset.height}`);
      }
    }
  });

  test('exposes the shared responsive image sizing contract', () => {
    expect(sceneImageSizes).toBe('(max-aspect-ratio: 4/3) 134vw, 100vw');
    const transitionBack = resolveSceneAsset('transition-era-television-studio');
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
    for (const id of [
      'county-council-ballroom',
      'midnight-call-in-studio',
      'palace-press-hall',
      'influencer-campaign-livestream',
    ]) {
      const back = resolveSceneAsset(id);
      const foreground = resolveSceneAsset(`${id}-foreground`);
      for (const asset of [back, foreground]) {
        expect(asset.ownerId).toBe(id);
        expect(asset.kind).toBe('manifest');
        expect(asset.focalRectangles.moderatorFace).toBeNull();
        expect(asset.avif.variants).toHaveLength(asset.width === 1680 ? 3 : 5);
        expect(asset.webp.variants).toHaveLength(asset.width === 1680 ? 3 : 5);
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
        effectIds: ['crowd-bounce'],
      },
      'grand-hotel-romania': {
        layers: ['grand-hotel-romania'],
        animationId: 'grand-hotel-lobby-still',
        effectIds: [],
      },
    } as const;

    for (const scene of gameCatalog.scenes) {
      expect(scene.backgroundLayers.map(({ media }) => media.assetId)).toEqual(
        expected[scene.id as keyof typeof expected].layers,
      );
      expect(scene.animationId).toBe(expected[scene.id as keyof typeof expected].animationId);
      expect(scene.effectIds).toEqual(expected[scene.id as keyof typeof expected].effectIds);
    }
    expect(new Set(gameCatalog.scenes.map(({ animationId }) => animationId)).size).toBe(8);
    expect(new Set(gameCatalog.scenes.flatMap(({ effectIds }) => effectIds)).size).toBe(13);
  });
});
