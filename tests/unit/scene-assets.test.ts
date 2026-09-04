import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  resolveSceneAsset,
  sceneAssetManifest,
  sceneAssetFallbacks,
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
    expect(sceneAssetManifest).toHaveLength(4);
    const variants = sceneAssetManifest.flatMap((asset) => [
      ...asset.avif.variants,
      ...asset.webp.variants,
    ]);
    expect(variants).toHaveLength(24);

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
      expect(transitionBack.focalPoint).toEqual({ x: 0.29, y: 0.44 });
      expect(transitionBack.focalRectangles.moderatorFace).toEqual({
        x: 0.26,
        y: 0.36,
        width: 0.06,
        height: 0.16,
      });
    }
  });

  test('throws for a missing scene asset ID', () => {
    expect(() => resolveSceneAsset('missing-scene-asset')).toThrow(
      'Scene asset "missing-scene-asset" is missing from the manifest.',
    );
  });

  test('keeps the interim foundation scene as a typed WebP-only fallback', () => {
    expect(sceneAssetFallbacks).toHaveLength(1);
    const fallback = resolveSceneAsset('catalog-foundation-neutral-scene');
    expect(fallback).toEqual(sceneAssetFallbacks[0]);
    expect(fallback).toMatchObject({
      kind: 'fallback',
      width: 1672,
      height: 941,
      sizes: '100vw',
      avif: null,
      webp: {
        format: 'webp',
        variants: [
          expect.objectContaining({ width: 1672, height: 941, format: 'webp' }),
        ],
      },
    });
    expect('focalPoint' in fallback).toBe(false);
    expect('focalRectangles' in fallback).toBe(false);
    expect('sharedSafeRectangles' in fallback).toBe(false);
    expect('crop' in fallback).toBe(false);
    expect(Object.isFrozen(fallback)).toBe(true);
    expect(Object.isFrozen(fallback.webp.variants)).toBe(true);
  });
});
