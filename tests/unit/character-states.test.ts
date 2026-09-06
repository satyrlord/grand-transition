import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import contract from '../../src/assets/characters/state-contract.json';
import shippedSelection from '../../src/assets/characters/character-manifest.json';
import shippedStates from '../../src/assets/characters/states/state-manifest.json';
// @ts-expect-error The asset tools are native ECMAScript modules.
import { measurePackageBytes, validateStateManifest } from '../../tools/validate-character-states.mjs';
// @ts-expect-error The asset tools are native ECMAScript modules.
import { buildCharacterStates } from '../../tools/build-character-states.mjs';

function fixture() {
  const selection = {
    assets: contract.characterIds.map((id) => ({ id, ownerId: id, skinId: 'default' })),
  };
  const assets = selection.assets.flatMap((skin) =>
    contract.states.filter((state) => state.id !== 'selection').map((state) => {
      const id = `${skin.id}--${state.id}`;
      return {
        id, ownerType: 'character', ownerId: skin.ownerId, skinId: skin.skinId,
        stateId: state.id, poseId: state.id, expressionId: state.id,
        sourceDescription: 'Original test fixture.', licenseIdentifier: 'LicenseRef-Test',
        source: { path: `states/${skin.id}/${state.id}.png`, width: 2048, height: 2048, format: 'png', bytes: 100, sha256: 'a'.repeat(64) },
        focalPoint: { x: 0.5, y: 0.32 },
        crop: { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' },
        variants: [320, 640, 960].flatMap((width) => ['avif', 'webp'].map((format) => ({
          path: `states/variants/${id}-${width}x${width}.${format}`,
          width, height: width, format, bytes: 100, sha256: 'b'.repeat(64),
        }))),
      };
    }),
  );
  return {
    selection,
    manifest: {
      schemaVersion: 1, assets,
      packages: selection.assets.map((skin) => ({
        ownerId: skin.ownerId, skinId: skin.skinId,
        states: contract.states.map((state) => ({
          stateId: state.id, durationMs: state.durationMs, loop: state.loop,
          assetId: state.id === 'selection' ? skin.id : `${skin.id}--${state.id}`,
        })),
      })),
    },
  };
}

describe('complete character state contract', () => {
  test('package budget includes both scene layers, all states, fallback format, and foundation portraits', () => {
    const variants = (width: number, avif: number, webp: number) => [
      { width, format: 'avif', bytes: avif }, { width, format: 'webp', bytes: webp },
    ];
    const selection = { assets: [
      { id: 'slice', ownerId: 'slice', skinId: 'default', variants: variants(960, 10, 20) },
      { id: 'foundation', ownerId: 'foundation', skinId: 'default', variants: variants(960, 90, 200) },
    ] };
    const manifest = { assets: [
      { id: 'slice-idle', ownerId: 'slice', skinId: 'default', variants: variants(960, 30, 40) },
    ] };
    const scenes = { assets: [
      { id: 'back', ownerId: 'studio', variants: variants(1920, 100, 150) },
      { id: 'front', ownerId: 'studio', variants: variants(1920, 40, 50) },
    ] };
    expect(measurePackageBytes(manifest, selection, scenes)).toBe(600);
    selection.assets[1]!.variants = variants(960, 1, 1);
    expect(measurePackageBytes(manifest, selection, scenes)).toBe(320);
  });
  test('accepts all nine mappings for each of the four slice characters', () => {
    const { manifest, selection } = fixture();
    expect(validateStateManifest(manifest, selection)).toBe(manifest);
  });

  test('rejects each missing named state, including the baseline selection mapping', () => {
    for (const state of contract.states) {
      const { manifest, selection } = fixture();
      manifest.packages[0]!.states = manifest.packages[0]!.states.filter((record) => record.stateId !== state.id);
      expect(() => validateStateManifest(manifest, selection)).toThrow(/all nine states/u);
    }
  });

  test('does not accept repeated selection images as different poses or expressions', () => {
    const { manifest, selection } = fixture();
    for (const asset of manifest.assets) {
      asset.poseId = 'selection';
      asset.expressionId = 'selection';
    }
    expect(() => validateStateManifest(manifest, selection)).toThrow(/six poses and five expressions/u);
  });

  test('rejects duplicate packages and assets and cross-character state mappings', () => {
    const first = fixture();
    first.manifest.packages[1] = first.manifest.packages[0]!;
    expect(() => validateStateManifest(first.manifest, first.selection)).toThrow(/duplicate skin/u);
    const second = fixture();
    second.manifest.assets[1] = second.manifest.assets[0]!;
    expect(() => validateStateManifest(second.manifest, second.selection)).toThrow(/unique/u);
    const third = fixture();
    third.manifest.packages[0]!.states[0]!.assetId = third.manifest.packages[1]!.states[0]!.assetId;
    expect(() => validateStateManifest(third.manifest, third.selection)).toThrow(/incorrect asset mapping/u);
  });

  test('rejects absent skins and does not silently drop a slice character', () => {
    const { manifest, selection } = fixture();
    selection.assets.pop();
    expect(() => validateStateManifest(manifest, selection)).toThrow(/Every slice character/u);
  });

  test('rejects altered timing and loop contracts', () => {
    const first = fixture();
    first.manifest.packages[0]!.states[0]!.durationMs = 9000;
    expect(() => validateStateManifest(first.manifest, first.selection)).toThrow(/motion timing/u);
    const second = fixture();
    second.manifest.packages[0]!.states[1]!.loop = true;
    expect(() => validateStateManifest(second.manifest, second.selection)).toThrow(/loop mode/u);
  });

  test('rejects missing licenses, path traversal, wrong hashes, and altered geometry', () => {
    const first = fixture();
    first.manifest.assets[0]!.licenseIdentifier = '';
    expect(() => validateStateManifest(first.manifest, first.selection)).toThrow(/license/u);
    const second = fixture();
    second.manifest.assets[0]!.source.path = '../outside.png';
    expect(() => validateStateManifest(second.manifest, second.selection)).toThrow(/invalid source/u);
    const third = fixture();
    third.manifest.assets[0]!.source.sha256 = 'not-a-hash';
    expect(() => validateStateManifest(third.manifest, third.selection)).toThrow(/hash/u);
    const fourth = fixture();
    fourth.manifest.assets[0]!.focalPoint.x = 0.51;
    expect(() => validateStateManifest(fourth.manifest, fourth.selection)).toThrow(/focal point/u);
  });

  test('rejects missing formats, duplicate variants, and excessive bytes', () => {
    const first = fixture();
    first.manifest.assets[0]!.variants.pop();
    expect(() => validateStateManifest(first.manifest, first.selection)).toThrow(/six runtime/u);
    const second = fixture();
    second.manifest.assets[0]!.variants[1] = second.manifest.assets[0]!.variants[0]!;
    expect(() => validateStateManifest(second.manifest, second.selection)).toThrow(/duplicate/u);
    const third = fixture();
    third.manifest.assets[0]!.variants[0]!.bytes = 250 * 1024 + 1;
    expect(() => validateStateManifest(third.manifest, third.selection)).toThrow(/byte budget/u);
  });

  test('missing source art fails preflight without changing any output', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-state-preflight-'));
    try {
      await writeFile(path.join(root, 'character-manifest.json'), JSON.stringify(fixture().selection));
      await writeFile(path.join(root, 'existing-output.txt'), 'preserved');
      const before = await readdir(root);
      await expect(buildCharacterStates({ characterRoot: root })).rejects.toThrow(/ENOENT/u);
      expect(await readdir(root)).toEqual(before);
      expect(await readFile(path.join(root, 'existing-output.txt'), 'utf8')).toBe('preserved');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('Sharp reproduces a complete shipped nine-state package from unchanged masters', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-state-rebuild-'));
    const skin = shippedSelection.assets.find(({ id }) => id === 'red-folded-chairman')!;
    try {
      await writeFile(path.join(root, 'character-manifest.json'), JSON.stringify({ ...shippedSelection, assets: [skin] }));
      for (const state of contract.states.filter(({ id }) => id !== 'selection')) {
        const relative = `states/${skin.id}/${state.id}.png`;
        await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
        await copyFile(path.resolve('src/assets/characters', relative), path.join(root, relative));
      }
      const rebuilt = await buildCharacterStates({ characterRoot: root });
      expect(rebuilt.packages).toEqual(shippedStates.packages.filter(({ ownerId, skinId }) => ownerId === skin.ownerId && skinId === skin.skinId));
      expect(rebuilt.assets).toEqual(shippedStates.assets.filter(({ ownerId, skinId }) => ownerId === skin.ownerId && skinId === skin.skinId));
    } finally {
      if (path.dirname(root) === os.tmpdir()) await rm(root, { recursive: true, force: true });
    }
  }, 180_000);
});
