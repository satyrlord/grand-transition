import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import contract from '../src/assets/characters/state-contract.json' with { type: 'json' };
import { CHARACTER_BYTE_BUDGETS, encodeVariant, mapWithConcurrency } from './build-character-assets.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const stateWidths = Object.freeze([320, 640, 960]);
export const stateFormats = Object.freeze(['avif', 'webp']);

/** Derive skins from the selection manifest, never from a separate skin list. */
export function statePackages(selectionManifest) {
  if (!selectionManifest || !Array.isArray(selectionManifest.assets)) {
    throw new Error('Character selection manifest must declare an asset inventory.');
  }
  if (!Array.isArray(contract.selectionArtFallbackSkinIds) ||
      contract.selectionArtFallbackSkinIds.length !== 2 ||
      new Set(contract.selectionArtFallbackSkinIds).size !== 2) {
    throw new Error('Character state contract must declare exactly two unique selection-art fallbacks.');
  }
  const relevant = selectionManifest.assets.filter((asset) => contract.characterIds.includes(asset.ownerId));
  for (const characterId of contract.characterIds) {
    if (!relevant.some((asset) => asset.ownerId === characterId)) {
      throw new Error(`${characterId}: selection portrait is missing from the final character state inventory.`);
    }
  }
  for (const fallbackId of contract.selectionArtFallbackSkinIds) {
    if (!relevant.some((asset) => asset.id === fallbackId)) {
      throw new Error(`${fallbackId}: declared selection-art fallback is missing.`);
    }
  }
  const packages = relevant.filter(
    (asset) => !contract.selectionArtFallbackSkinIds.includes(asset.id),
  );
  if (packages.length !== contract.expectedPackageCount) {
    throw new Error(
      `Final character state inventory requires exactly ${contract.expectedPackageCount} state packages; found ${packages.length}.`,
    );
  }
  return packages;
}

export function stateAssetId(skinId, stateId, availableStateIds) {
  if (stateId === 'selection') return skinId;
  const reusedStateId = contract.stateAssetReuse[stateId];
  if (reusedStateId === 'selection') return skinId;
  if (reusedStateId && availableStateIds.has(reusedStateId)) {
    return `${skinId}--${reusedStateId}`;
  }
  if (contract.stateMasterIds.includes(stateId) && availableStateIds.has(stateId)) {
    return `${skinId}--${stateId}`;
  }
  throw new Error(`${skinId}/${stateId}: required state master is missing and has no available declared reuse.`);
}

export async function prepareCharacterStatePackage(characterRoot, skin) {
  const stateRoot = path.join(characterRoot, 'states', skin.id);
  const expectedFiles = contract.stateMasterIds.map((stateId) => `${stateId}.png`).toSorted();
  const actualFiles = (await readdir(stateRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .toSorted();
  if (actualFiles.length !== expectedFiles.length || actualFiles.some((file, index) => file !== expectedFiles[index])) {
    throw new Error(`${skin.id}: state master inventory must contain exactly ${expectedFiles.join(', ')}.`);
  }
  const sources = [];
  const availableStateIds = new Set();
  for (const stateId of contract.stateMasterIds) {
    const state = contract.states.find(({ id }) => id === stateId);
    if (!state) throw new Error(`${skin.id}/${stateId}: state master is absent from the timing contract.`);
    const relativePath = `states/${skin.id}/${state.id}.png`;
    const input = await readFile(path.join(characterRoot, relativePath));
    const metadata = await sharp(input).metadata();
    if (metadata.format !== 'png' || metadata.width !== 2048 || metadata.height !== 2048 || !metadata.hasAlpha) {
      throw new Error(`${relativePath}: state master must be a transparent 2048x2048 PNG.`);
    }
    availableStateIds.add(state.id);
    sources.push({ skin, state, relativePath, input });
  }
  for (const state of contract.states) stateAssetId(skin.id, state.id, availableStateIds);
  return { skin, sources, availableStateIds };
}

export async function buildCharacterStatePackage(prepared, variantsRoot) {
  const { skin, sources, availableStateIds } = prepared;
  const assets = await mapWithConcurrency(sources, 3, async ({ state, relativePath, input }) => {
    const id = `${skin.id}--${state.id}`;
    const variants = [];
    for (const width of stateWidths) {
      for (const format of stateFormats) {
        const output = await encodeVariant(input, width, format);
        if (output.length > CHARACTER_BYTE_BUDGETS[format]) throw new Error(`${id}: ${format} exceeds its byte budget.`);
        const file = `${id}-${width}x${width}.${format}`;
        await writeFile(path.join(variantsRoot, file), output);
        variants.push({ path: `states/variants/${file}`, width, height: width, format, bytes: output.length, sha256: sha256(output) });
      }
    }
    return {
      id, ownerType: 'character', ownerId: skin.ownerId, skinId: skin.skinId,
      stateId: state.id, poseId: state.id, expressionId: state.id,
      sourceDescription: 'Original flat cel-shaded editorial-cartoon character state created for Grand Transition.',
      licenseIdentifier: 'LicenseRef-Grand-Transition-Original',
      source: { path: relativePath, width: 2048, height: 2048, format: 'png', bytes: input.length, sha256: sha256(input) },
      focalPoint: { x: 0.5, y: 0.32 },
      crop: { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' },
      variants,
    };
  });
  return {
    manifestPackage: {
      ownerId: skin.ownerId,
      skinId: skin.skinId,
      states: contract.states.map((state) => ({
        stateId: state.id,
        assetId: stateAssetId(skin.id, state.id, availableStateIds),
        durationMs: state.durationMs,
        loop: state.loop,
      })),
    },
    assets,
  };
}

export async function buildCharacterStates({ characterRoot = path.resolve('src/assets/characters') } = {}) {
  const root = path.resolve(characterRoot);
  const selectionManifest = JSON.parse(await readFile(path.join(root, 'character-manifest.json'), 'utf8'));
  const packages = statePackages(selectionManifest);
  const preparedPackages = [];
  // Complete preflight before any output changes. Selection reuses its approved baseline.
  for (const skin of packages) {
    preparedPackages.push(await prepareCharacterStatePackage(root, skin));
  }
  const work = await mkdtemp(path.join(root, '.character-states-build-'));
  try {
    const variantsRoot = path.join(work, 'variants');
    await mkdir(variantsRoot);
    const builtPackages = [];
    for (const prepared of preparedPackages) {
      builtPackages.push(await buildCharacterStatePackage(prepared, variantsRoot));
    }
    const manifest = {
      schemaVersion: 1,
      packages: builtPackages.map(({ manifestPackage }) => manifestPackage),
      assets: builtPackages.flatMap(({ assets }) => assets),
    };
    await writeFile(path.join(work, 'state-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const outputRoot = path.resolve(root, 'states');
    if (!outputRoot.startsWith(`${root}${path.sep}`)) throw new Error('State output must remain inside the character root.');
    await mkdir(outputRoot, { recursive: true });
    await rm(path.join(outputRoot, 'variants'), { recursive: true, force: true });
    await rename(variantsRoot, path.join(outputRoot, 'variants'));
    await rename(path.join(work, 'state-manifest.json'), path.join(outputRoot, 'state-manifest.json'));
    return manifest;
  } finally {
    // work comes from mkdtemp directly inside the verified root.
    if (path.dirname(work) === root) await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildCharacterStates().then((manifest) => {
    process.stdout.write(`Built ${manifest.packages.length} character state packages and ${manifest.assets.length} state masters.\n`);
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
