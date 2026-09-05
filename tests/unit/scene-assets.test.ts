import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  resolveSceneAsset,
  sceneAssetManifest,
  sceneImageSizes,
} from '../../src/app/scene-assets';

describe('scene asset resolver', () => {
  test('keeps every scene variant outside the initial JavaScript bundle', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src', 'app', 'scene-assets.ts'),
      'utf8',
    );

    expect(source.match(/query: '\?url&no-inline'/gu)).toHaveLength(2);
    expect(source).not.toMatch(/query: '\?url'/gu);
  });

  test('maps every manifest layer to AVIF-first and WebP fallback srcsets', () => {
    expect(sceneAssetManifest).toHaveLength(8);
    const variants = sceneAssetManifest.flatMap((asset) => [
      ...asset.avif.variants,
      ...asset.webp.variants,
    ]);
    expect(variants).toHaveLength(48);

    for (const asset of sceneAssetManifest) {
      expect(asset.width).toBe(1920);
      expect(asset.height).toBe(1080);
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
      const asset = resolveSceneAsset(id);
      expect(asset.ownerId).toBe(id);
      expect(asset.kind).toBe('manifest');
      expect(asset.focalRectangles.moderatorFace).toBeNull();
      expect(asset.avif.variants).toHaveLength(3);
      expect(asset.webp.variants).toHaveLength(3);
      expect(asset.url).toContain(id);
      expect(asset.url).not.toContain('title-proscenium');
    }
    expect(() => resolveSceneAsset('catalog-foundation-neutral-scene')).toThrow();
  });
});
