import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect, test } from 'vitest';
import manifest from '../../src/assets/brand/brand-manifest.json' with { type: 'json' };
// @ts-expect-error The asset tools are native ECMAScript modules.
import { buildBrandAssets, validateBrandAssets, validateBrandManifest } from '../../tools/brand-assets.mjs';

test('brand validation rejects missing ownership, license, files, altered geometry, and budgets', () => {
  expect(validateBrandManifest(manifest)).toBe(manifest);
  const mutations = [
    (value: typeof manifest) => { value.assets[0]!.licenseIdentifier = ''; },
    (value: typeof manifest) => { value.assets[0]!.ownerId = 'other'; },
    (value: typeof manifest) => { value.assets[0]!.crop.width = 0.9; },
    (value: typeof manifest) => { value.assets[0]!.source.sha256 = 'invalid'; },
    (value: typeof manifest) => { value.assets[0]!.variants.pop(); },
    (value: typeof manifest) => { value.assets[0]!.variants[0]!.path = '../outside.avif'; },
    (value: typeof manifest) => { value.assets[0]!.variants[0]!.bytes = 301 * 1024; },
    (value: typeof manifest) => { value.assets[1]!.id = value.assets[0]!.id; },
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
      await copyFile(path.resolve('src/assets/brand', asset.source.path), path.join(root, asset.source.path));
    }
    const rebuilt = await buildBrandAssets(root);
    expect(rebuilt).toEqual(manifest);
    expect(await validateBrandAssets(root)).toEqual(manifest);
    const file = manifest.assets[0]!.variants[0]!.path;
    expect(await readFile(path.join(root, file))).toEqual(await readFile(path.resolve('src/assets/brand', file)));
    await copyFile(path.join(root, manifest.assets[1]!.source.path), path.join(root, manifest.assets[0]!.source.path));
    await expect(validateBrandAssets(root)).rejects.toThrow(/hash or byte size mismatch/u);
  } finally {
    if (path.dirname(root) === os.tmpdir()) await rm(root, { recursive: true, force: true });
  }
}, 120_000);
