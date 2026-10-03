import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import contract from '../../src/assets/characters/state-contract.json';
import shippedSelection from '../../src/assets/characters/character-manifest.json';
import {
  measurePackageBytes,
  validateStateManifest,
} from '../../tools/validate-character-states.ts';
import {
  buildCharacterStatePackage,
  buildCharacterStates,
  cachedStatePackageInventory,
  prepareCharacterStatePackage,
  selectedStatePackageIds,
  stateAssetId,
  statePackages,
  type StateManifest,
} from '../../tools/build-character-states.ts';

type SelectionEntry = Readonly<{ id: string; ownerId: string; skinId: string }>;

function fixture() {
  const selection = {
    assets: shippedSelection.assets.map(({ id, ownerId, skinId }) => ({ id, ownerId, skinId })),
  };
  const requiredPackages = statePackages(selection) as SelectionEntry[];
  const assets = requiredPackages.flatMap((skin) =>
    contract.stateMasterIds.map((stateId) => {
      const id = `${skin.id}--${stateId}`;
      return {
        id,
        ownerType: 'character',
        ownerId: skin.ownerId,
        skinId: skin.skinId,
        stateId,
        poseId: stateId,
        expressionId: stateId,
        sourceDescription: 'Original test fixture.',
        licenseIdentifier: 'LicenseRef-Test',
        source: {
          path: `states/${skin.id}/${stateId}.png`,
          width: 2048,
          height: 2048,
          format: 'png',
          bytes: 100,
          sha256: 'a'.repeat(64),
        },
        focalPoint: { x: 0.5, y: 0.32 },
        crop: { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' },
        variants: [320, 640, 960].flatMap((width) =>
          ['avif', 'webp'].map((format) => ({
            path: `states/variants/${id}-${width}x${width}.${format}`,
            width,
            height: width,
            format,
            bytes: 100,
            sha256: 'b'.repeat(64),
          })),
        ),
      };
    }),
  );
  return {
    selection,
    manifest: {
      schemaVersion: 1,
      assets,
      packages: requiredPackages.map((skin) => ({
        ownerId: skin.ownerId,
        skinId: skin.skinId,
        states: contract.states.map((state) => ({
          stateId: state.id,
          durationMs: state.durationMs,
          loop: state.loop,
          assetId:
            state.id === 'selection' ||
            contract.stateAssetReuse[state.id as keyof typeof contract.stateAssetReuse] ===
              'selection'
              ? skin.id
              : `${skin.id}--${contract.stateAssetReuse[state.id as keyof typeof contract.stateAssetReuse] ?? state.id}`,
        })),
      })),
    },
  };
}

describe('complete character state contract', () => {
  test('selects distinct known state packages for targeted builds', () => {
    const packages = statePackages(fixture().selection) as SelectionEntry[];
    const first = packages[0]!.id;
    expect(selectedStatePackageIds(undefined, packages)).toBeNull();
    expect([...selectedStatePackageIds([first], packages)!]).toEqual([first]);
    expect(() => selectedStatePackageIds([], packages)).toThrow(/non-empty/u);
    expect(() => selectedStatePackageIds([first, first], packages)).toThrow(/distinct/u);
    expect(() => selectedStatePackageIds(['missing'], packages)).toThrow(/known/u);
  });

  test('requires all 30 selection skins to have state packages across the 19 characters', () => {
    const { manifest, selection } = fixture();
    expect(contract.characterIds).toHaveLength(19);
    expect(statePackages(selection).map(({ id }) => id)).toEqual(
      selection.assets.map(({ id }) => id),
    );
    expect(statePackages(selection)).toHaveLength(30);
    expect(manifest.packages).toHaveLength(30);
    expect(manifest.packages.every(({ states }) => states.length === 9)).toBe(true);
    expect(contract.stateMasterIds).toEqual([
      'thinking',
      'delivery',
      'light-hit',
      'heavy-hit',
      'weakness',
    ]);
    expect(contract.expectedStateMasterCount).toBe(150);
    expect(manifest.assets).toHaveLength(150);

    const minimumMasters = new Set(['thinking', 'delivery', 'light-hit', 'heavy-hit', 'weakness']);
    expect(stateAssetId('fixture', 'idle', minimumMasters)).toBe('fixture');
    expect(stateAssetId('fixture', 'idle', new Set([...minimumMasters, 'idle']))).toBe('fixture');
    expect(stateAssetId('fixture', 'comeback', minimumMasters)).toBe('fixture--delivery');
    expect(stateAssetId('fixture', 'grammar-mistake', minimumMasters)).toBe('fixture--weakness');
    expect(() => stateAssetId('fixture', 'thinking', new Set())).toThrow(/required state master/u);
  });

  test('adds a selected new state package while preserving every cached package', () => {
    const { manifest, selection } = fixture();
    const selected = new Set(['reluctant-theorem']);
    manifest.packages = manifest.packages.filter(({ ownerId }) => ownerId !== 'reluctant-theorem');
    manifest.assets = manifest.assets.filter(({ ownerId }) => ownerId !== 'reluctant-theorem');
    const packages = statePackages(selection);
    const cached = cachedStatePackageInventory(manifest as StateManifest, packages, selected);
    expect(cached.size).toBe(29);
    for (const group of manifest.packages) {
      const skin = packages.find(
        (entry) => entry.ownerId === group.ownerId && entry.skinId === group.skinId,
      )!;
      expect(cached.get(skin.id)!.group).toBe(group);
      expect(cached.get(skin.id)!.assets).toEqual(
        manifest.assets.filter(
          (asset) => asset.ownerId === group.ownerId && asset.skinId === group.skinId,
        ),
      );
    }
    expect(() =>
      cachedStatePackageInventory(manifest as StateManifest, packages, new Set(['county-baron'])),
    ).toThrow(/reluctant-theorem.*incomplete/u);
  });

  test('rejects missing unselected packages and altered cached state mappings', () => {
    const first = fixture();
    first.manifest.packages = first.manifest.packages.filter(
      ({ ownerId, skinId }) => ownerId !== 'county-baron' || skinId !== 'default',
    );
    first.manifest.assets = first.manifest.assets.filter(
      ({ ownerId, skinId }) => ownerId !== 'county-baron' || skinId !== 'default',
    );
    const selected = new Set(['county-baron--municipal-patron']);
    expect(() =>
      cachedStatePackageInventory(
        first.manifest as StateManifest,
        statePackages(first.selection),
        selected,
      ),
    ).toThrow(/county-baron.*incomplete/u);

    const second = fixture();
    second.manifest.packages[0]!.states[0]!.assetId = 'wrong-selection';
    expect(() =>
      cachedStatePackageInventory(
        second.manifest as StateManifest,
        statePackages(second.selection),
        selected,
      ),
    ).toThrow(/invalid state mappings/u);
    const third = fixture();
    third.manifest.packages[0]!.ownerId = 'unknown';
    expect(() =>
      cachedStatePackageInventory(
        third.manifest as StateManifest,
        statePackages(third.selection),
        selected,
      ),
    ).toThrow(/unknown packages/u);
  });

  test('package budget includes both scene layers, all states, fallback format, and foundation portraits', () => {
    const variants = (width: number, avif: number, webp: number) => [
      { width, format: 'avif', bytes: avif },
      { width, format: 'webp', bytes: webp },
    ];
    const selection = {
      assets: [
        { id: 'slice', ownerId: 'slice', skinId: 'default', variants: variants(960, 10, 20) },
        {
          id: 'foundation',
          ownerId: 'foundation',
          skinId: 'default',
          variants: variants(960, 90, 200),
        },
      ],
    };
    const manifest = {
      assets: [
        { id: 'slice-idle', ownerId: 'slice', skinId: 'default', variants: variants(960, 30, 40) },
      ],
    };
    const scenes = {
      assets: [
        { id: 'back', ownerId: 'studio', variants: variants(1920, 100, 150) },
        { id: 'front', ownerId: 'studio', variants: variants(1920, 40, 50) },
      ],
    };
    expect(measurePackageBytes(manifest, selection, scenes)).toBe(600);
    selection.assets[1]!.variants = variants(960, 1, 1);
    expect(measurePackageBytes(manifest, selection, scenes)).toBe(320);
  });
  test('accepts all nine mappings backed by exactly five masters per package', () => {
    const { manifest, selection } = fixture();
    expect(validateStateManifest(manifest, selection)).toBe(manifest);
  });

  test('package budget counts the largest scene sizes in both runtime formats', () => {
    const variants = (width: number, avif: number, webp: number) => [
      { width, format: 'avif', bytes: avif },
      { width, format: 'webp', bytes: webp },
    ];
    const selection = {
      assets: [
        {
          id: 'skin',
          ownerId: 'character',
          skinId: 'default',
          variants: variants(960, 200_000, 200_000),
        },
      ],
    };
    const manifest = {
      assets: Array.from({ length: 5 }, (_, index) => ({
        id: `state-${index}`,
        ownerId: 'character',
        skinId: 'default',
        variants: variants(960, 200_000, 200_000),
      })),
    };
    const scenes = {
      assets: [
        { id: 'foundation', ownerId: 'foundation', variants: variants(1920, 100_000, 200_000) },
        ...['back', 'front'].map((id) => ({
          id,
          ownerId: 'studio',
          variants: [...variants(3840, 350_000, 500_000), ...variants(1920, 100, 100)],
        })),
      ],
    };
    expect(measurePackageBytes(manifest, selection, scenes)).toBe(3_400_000);
    expect(measurePackageBytes(manifest, selection, scenes)).toBeGreaterThan(3 * 1024 * 1024);
  });

  test('requires the declared state-to-asset reuse while preserving pose diversity', () => {
    const { manifest, selection } = fixture();
    const group = manifest.packages[0]!;
    const skinId = selection.assets.find(
      ({ ownerId, skinId }) => ownerId === group.ownerId && skinId === group.skinId,
    )!.id;
    expect(validateStateManifest(manifest, selection)).toBe(manifest);

    group.states.find(({ stateId }) => stateId === 'idle')!.assetId = `${skinId}--idle`;
    expect(() => validateStateManifest(manifest, selection)).toThrow(/incorrect asset mapping/u);
    group.states.find(({ stateId }) => stateId === 'idle')!.assetId = skinId;
    group.states.find(({ stateId }) => stateId === 'light-hit')!.assetId = `${skinId}--delivery`;
    expect(() => validateStateManifest(manifest, selection)).toThrow(/incorrect asset mapping/u);
  });

  test('rejects each missing named state, including the baseline selection mapping', () => {
    for (const state of contract.states) {
      const { manifest, selection } = fixture();
      manifest.packages[0]!.states = manifest.packages[0]!.states.filter(
        (record) => record.stateId !== state.id,
      );
      expect(() => validateStateManifest(manifest, selection)).toThrow(/all nine states/u);
    }
  });

  test('does not accept repeated selection images as different poses or expressions', () => {
    const { manifest, selection } = fixture();
    for (const asset of manifest.assets) {
      asset.poseId = 'selection';
      asset.expressionId = 'selection';
    }
    expect(() => validateStateManifest(manifest, selection)).toThrow(
      /six poses and five expressions/u,
    );
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
    expect(() => validateStateManifest(third.manifest, third.selection)).toThrow(
      /incorrect asset mapping/u,
    );
  });

  test('rejects missing required packages and selection-only Reluctant Theorem states', () => {
    const missingPackage = fixture();
    missingPackage.manifest.packages = missingPackage.manifest.packages.filter(
      ({ ownerId }) => ownerId !== 'reluctant-theorem',
    );
    expect(() => validateStateManifest(missingPackage.manifest, missingPackage.selection)).toThrow(
      /exactly 30 packages/u,
    );

    const missingCharacter = fixture();
    missingCharacter.selection.assets = missingCharacter.selection.assets.filter(
      ({ ownerId }) => ownerId !== 'reluctant-theorem',
    );
    expect(() =>
      validateStateManifest(missingCharacter.manifest, missingCharacter.selection),
    ).toThrow(/selection portrait is missing/u);

    const selectionOnly = fixture();
    for (const state of selectionOnly.manifest.packages.find(
      ({ ownerId }) => ownerId === 'reluctant-theorem',
    )!.states) {
      state.assetId = 'reluctant-theorem';
    }
    expect(() => validateStateManifest(selectionOnly.manifest, selectionOnly.selection)).toThrow(
      /reluctant-theorem\/thinking: incorrect asset mapping/u,
    );
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
    expect(() => validateStateManifest(second.manifest, second.selection)).toThrow(
      /invalid source/u,
    );
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
      await writeFile(
        path.join(root, 'character-manifest.json'),
        JSON.stringify(fixture().selection),
      );
      await writeFile(path.join(root, 'existing-output.txt'), 'preserved');
      const before = await readdir(root);
      await expect(buildCharacterStates({ characterRoot: root })).rejects.toThrow(/ENOENT/u);
      expect(await readdir(root)).toEqual(before);
      expect(await readFile(path.join(root, 'existing-output.txt'), 'utf8')).toBe('preserved');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('reproduces one minimum-source package with exact reuse mappings and bytes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-state-package-'));
    const skin = shippedSelection.assets.find(({ id }) => id === 'black-sea-captain')!;
    const requiredStates = ['thinking', 'delivery', 'light-hit', 'heavy-hit', 'weakness'] as const;
    try {
      const sourceRoot = path.join(root, 'states', skin.id);
      const firstVariants = path.join(root, 'first-variants');
      const secondVariants = path.join(root, 'second-variants');
      await Promise.all(
        [sourceRoot, firstVariants, secondVariants].map((directory) =>
          mkdir(directory, { recursive: true }),
        ),
      );
      for (const [index, stateId] of requiredStates.entries()) {
        const figure = Buffer.from(
          `<svg width="1024" height="1024"><ellipse cx="512" cy="520" rx="${250 + index}" ry="430" fill="#${index + 2}45678"/></svg>`,
        );
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([{ input: figure }])
          .png()
          .toFile(path.join(sourceRoot, `${stateId}.png`));
      }

      await sharp({
        create: {
          width: 2048,
          height: 2048,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toFile(path.join(sourceRoot, 'idle.png'));
      await expect(prepareCharacterStatePackage(root, skin)).rejects.toThrow(/exactly/u);
      await rm(path.join(sourceRoot, 'idle.png'));

      const thinkingPath = path.join(sourceRoot, 'thinking.png');
      const thinking = await readFile(thinkingPath);
      await writeFile(thinkingPath, await sharp(thinking).resize(960, 960).png().toBuffer());
      await expect(prepareCharacterStatePackage(root, skin)).rejects.toThrow(/at least 1024x1024/u);
      await writeFile(thinkingPath, thinking);

      const prepared = await prepareCharacterStatePackage(root, skin);
      const first = await buildCharacterStatePackage(prepared, firstVariants);
      expect(
        first.assets.every(({ source }) => source.width === 1024 && source.height === 1024),
      ).toBe(true);
      const second = await buildCharacterStatePackage(prepared, secondVariants);
      const manifestText = (built: typeof first) =>
        `${JSON.stringify(
          {
            schemaVersion: 1,
            packages: [built.manifestPackage],
            assets: built.assets,
          },
          null,
          2,
        )}\n`;
      expect(manifestText(second)).toBe(manifestText(first));

      const variantFiles = (await readdir(firstVariants)).toSorted();
      expect(variantFiles).toHaveLength(requiredStates.length * 3 * 2);
      expect(
        await Promise.all(
          variantFiles.map(async (file) =>
            (await readFile(path.join(secondVariants, file))).equals(
              await readFile(path.join(firstVariants, file)),
            ),
          ),
        ),
      ).toEqual(variantFiles.map(() => true));

      const mapping = new Map(
        first.manifestPackage.states.map(
          ({ stateId, assetId }: { stateId: string; assetId: string }) => [stateId, assetId],
        ),
      );
      expect(mapping.get('idle')).toBe(skin.id);
      expect(mapping.get('comeback')).toBe(`${skin.id}--delivery`);
      expect(mapping.get('grammar-mistake')).toBe(`${skin.id}--weakness`);

      const complete = fixture();
      const packageIndex = complete.manifest.packages.findIndex(
        ({ ownerId, skinId }) => ownerId === skin.ownerId && skinId === skin.skinId,
      );
      complete.manifest.packages[packageIndex] = first.manifestPackage;
      complete.manifest.assets = complete.manifest.assets.filter(
        ({ ownerId, skinId }) => ownerId !== skin.ownerId || skinId !== skin.skinId,
      );
      complete.manifest.assets.push(...first.assets);
      expect(validateStateManifest(complete.manifest, complete.selection)).toBe(complete.manifest);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 180_000);
});
