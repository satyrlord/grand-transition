import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import manifest from '../../src/assets/brand/brand-manifest.json' with { type: 'json' };
import {
  buildBrandAssets,
  validateBrandAssets,
  validateBrandManifest,
} from '../../tools/brand-assets.ts';

test('brand validation rejects missing ownership, license, files, altered geometry, and budgets', () => {
  expect(validateBrandManifest(manifest)).toBe(manifest);
  const mutations = [
    (value: typeof manifest) => {
      value.assets[0]!.licenseIdentifier = '';
    },
    (value: typeof manifest) => {
      value.assets[0]!.ownerId = 'other';
    },
    (value: typeof manifest) => {
      value.assets[0]!.crop.width = 0.9;
    },
    (value: typeof manifest) => {
      value.assets[0]!.source.sha256 = 'invalid';
    },
    (value: typeof manifest) => {
      value.assets[0]!.variants.pop();
    },
    (value: typeof manifest) => {
      value.assets[0]!.variants[0]!.path = '../outside.avif';
    },
    (value: typeof manifest) => {
      value.assets[0]!.variants[0]!.bytes = 301 * 1024;
    },
    (value: typeof manifest) => {
      value.assets[1]!.id = value.assets[0]!.id;
    },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(manifest);
    mutate(value);
    expect(() => validateBrandManifest(value)).toThrow();
  }
});

test('Sharp reproduces the shipped brand package and rejects changed source bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-brand-'));
  try {
    for (const asset of manifest.assets) {
      await copyFile(
        path.resolve('src/assets/brand', asset.source.path),
        path.join(root, asset.source.path),
      );
    }
    const rebuilt = await buildBrandAssets(root);
    // WebP output is the same on each platform. AVIF output depends on the
    // platform and the CPU, so an AVIF variant keeps its format and dimensions,
    // a byte size in 10 percent, and almost the same pixels. A quality change
    // moves the byte size, and a geometry change moves the pixels.
    expect(withoutAvifBytes(rebuilt)).toEqual(withoutAvifBytes(manifest));
    for (const [assetIndex, asset] of manifest.assets.entries()) {
      for (const [variantIndex, variant] of asset.variants.entries()) {
        if (variant.format !== 'avif') continue;
        const rebuiltBytes = rebuilt.assets[assetIndex]!.variants[variantIndex]!.bytes;
        expect(Math.abs(rebuiltBytes - variant.bytes) / variant.bytes).toBeLessThanOrEqual(0.1);
        expect(
          await meanAbsoluteDifference(
            path.join(root, variant.path),
            path.resolve('src/assets/brand', variant.path),
          ),
        ).toBeLessThanOrEqual(2.5);
      }
    }
    expect(await validateBrandAssets(root)).toEqual(rebuilt);
    const file = manifest.assets[0]!.variants.find((variant) => variant.format === 'webp')!.path;
    expect(await readFile(path.join(root, file))).toEqual(
      await readFile(path.resolve('src/assets/brand', file)),
    );
    await copyFile(
      path.join(root, manifest.assets[1]!.source.path),
      path.join(root, manifest.assets[0]!.source.path),
    );
    await expect(validateBrandAssets(root)).rejects.toThrow(/hash or byte size mismatch/u);
  } finally {
    if (path.dirname(root) === os.tmpdir()) await rm(root, { recursive: true, force: true });
  }
}, 120_000);

type VariantFacts = { format: string; bytes: number; sha256: string };

function withoutAvifBytes(value: { assets: readonly { variants: readonly VariantFacts[] }[] }) {
  return value.assets.map((asset) => ({
    ...asset,
    variants: asset.variants.map((variant) =>
      variant.format === 'avif' ? { ...variant, bytes: 0, sha256: '' } : variant,
    ),
  }));
}

async function meanAbsoluteDifference(first: string, second: string): Promise<number> {
  const [a, b] = await Promise.all(
    [first, second].map((file) => sharp(file).ensureAlpha().raw().toBuffer()),
  );
  expect(a!.length).toBe(b!.length);
  let total = 0;
  for (let index = 0; index < a!.length; index += 1) total += Math.abs(a![index]! - b![index]!);
  return total / a!.length;
}
