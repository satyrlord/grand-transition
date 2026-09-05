import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  characterAssetManifest,
  characterImageSizes,
  resolveCharacterAsset,
} from '../../src/app/character-assets';

describe('character asset resolver', () => {
  test('keeps every character variant outside the JavaScript bundle', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src', 'app', 'character-assets.ts'),
      'utf8',
    );
    expect(source.match(/query: '\?url&no-inline'/gu)).toHaveLength(2);
    expect(source).not.toMatch(/query: '\?url'/gu);
    const gameContentSource = await readFile(
      path.resolve(process.cwd(), 'src', 'game-content.ts'),
      'utf8',
    );
    expect(gameContentSource).not.toMatch(
      /import\.meta\.glob\([^)]*assets\/characters\/\*\.png/su,
    );
    expect(gameContentSource).toContain(
      "from 'virtual:character-portrait-fallbacks'",
    );
  });

  test('maps the fixed inventory to responsive AVIF and WebP sources', () => {
    expect(characterAssetManifest).toHaveLength(27);
    expect(characterImageSizes).toBe('(max-width: 1100px) 320px, 640px');
    for (const asset of characterAssetManifest) {
      expect(asset.width).toBe(2048);
      expect(asset.height).toBe(2048);
      expect(asset.avif.variants).toHaveLength(5);
      expect(asset.webp.variants).toHaveLength(5);
      expect(asset.avif.srcSet).toMatch(/128w/u);
      expect(asset.avif.srcSet).toMatch(/960w/u);
      expect(asset.webp.srcSet).toMatch(/128w/u);
      expect(asset.webp.srcSet).toMatch(/960w/u);
      expect(asset.url).toMatch(/\.webp(?:\?|$)/u);
      expect(Object.isFrozen(asset)).toBe(true);
      expect(Object.isFrozen(asset.avif)).toBe(true);
    }
  });

  test('resolves default and alternate skins by fixed asset ID', () => {
    expect(resolveCharacterAsset('red-folded-chairman')).toMatchObject({
      ownerId: 'red-folded-chairman',
      skinId: 'default',
      stateId: 'selection',
    });
    expect(
      resolveCharacterAsset('red-folded-chairman--alternate'),
    ).toMatchObject({
      ownerId: 'red-folded-chairman',
      skinId: 'alternate',
    });
  });

  test('throws for a missing character asset ID', () => {
    expect(() => resolveCharacterAsset('missing-character')).toThrow(
      'Character asset "missing-character" is missing from the manifest.',
    );
  });
});
