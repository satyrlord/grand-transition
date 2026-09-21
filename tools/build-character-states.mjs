import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
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

export function selectedStatePackageIds(only, packages) {
  if (only === undefined) return null;
  const ids = new Set(packages.map(({ id }) => id));
  if (!Array.isArray(only) || only.length === 0 || only.some((id) => !ids.has(id)) ||
    new Set(only).size !== only.length) {
    throw new Error('Selected state package IDs must be a non-empty list of distinct known skin IDs.');
  }
  return new Set(only);
}

async function verifiedCachedStatePackages(characterRoot, packages, selected) {
  const manifest = JSON.parse(await readFile(path.join(characterRoot, 'states/state-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.packages) || !Array.isArray(manifest.assets) ||
    manifest.packages.length !== packages.length || manifest.assets.length !== contract.expectedStateMasterCount) {
    throw new Error('Selective state builds require a complete existing state manifest.');
  }
  const cache = new Map();
  for (const skin of packages) {
    if (selected.has(skin.id)) continue;
    const group = manifest.packages.find((entry) => entry.ownerId === skin.ownerId && entry.skinId === skin.skinId);
    const assets = manifest.assets.filter((asset) => asset.ownerId === skin.ownerId && asset.skinId === skin.skinId);
    if (!group || !Array.isArray(group.states) || group.states.length !== contract.states.length ||
      assets.length !== contract.stateMasterIds.length) {
      throw new Error(`Cached state package "${skin.id}" is incomplete.`);
    }
    for (const asset of assets) {
      if (!contract.stateMasterIds.includes(asset.stateId) || asset.id !== `${skin.id}--${asset.stateId}` ||
        asset.source?.path !== `states/${skin.id}/${asset.stateId}.png` ||
        asset.source.width !== 2048 || asset.source.height !== 2048 || asset.source.format !== 'png') {
        throw new Error(`Cached state asset "${asset.id}" has invalid source metadata.`);
      }
      const source = await readFile(path.join(characterRoot, asset.source.path));
      const sourceMetadata = await sharp(source).metadata();
      if (source.length !== asset.source.bytes || sha256(source) !== asset.source.sha256 ||
        sourceMetadata.width !== 2048 || sourceMetadata.height !== 2048 ||
        sourceMetadata.format !== 'png' || !sourceMetadata.hasAlpha) {
        throw new Error(`Cached state source "${asset.source.path}" changed or is invalid; select it for rebuilding.`);
      }
      if (!Array.isArray(asset.variants) || asset.variants.length !== stateWidths.length * stateFormats.length) {
        throw new Error(`Cached state asset "${asset.id}" has an invalid variant inventory.`);
      }
      for (const width of stateWidths) {
        for (const format of stateFormats) {
          const expectedPath = `states/variants/${asset.id}-${width}x${width}.${format}`;
          const variants = asset.variants.filter((variant) => variant.path === expectedPath);
          if (variants.length !== 1) throw new Error(`Cached state variant "${expectedPath}" is missing or duplicated.`);
          const variant = variants[0];
          const output = await readFile(path.join(characterRoot, expectedPath));
          let metadata;
          try {
            metadata = await sharp(output).metadata();
          } catch (error) {
            throw new Error(`Cached state variant "${expectedPath}" failed metadata, byte, hash, dimension, or format validation.`, { cause: error });
          }
          if (variant.width !== width || variant.height !== width || variant.format !== format ||
            variant.bytes !== output.length || output.length > CHARACTER_BYTE_BUDGETS[format] ||
            variant.sha256 !== sha256(output) || metadata.width !== width || metadata.height !== width ||
            metadata.format !== (format === 'avif' ? 'heif' : 'webp') ||
            (format === 'avif' && metadata.compression !== 'av1')) {
            throw new Error(`Cached state variant "${expectedPath}" failed metadata, byte, hash, dimension, or format validation.`);
          }
        }
      }
    }
    cache.set(skin.id, { group, assets });
  }
  return cache;
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

export async function buildCharacterStates({ characterRoot = path.resolve('src/assets/characters'), only } = {}) {
  const root = path.resolve(characterRoot);
  const selectionManifest = JSON.parse(await readFile(path.join(root, 'character-manifest.json'), 'utf8'));
  const packages = statePackages(selectionManifest);
  const selected = selectedStatePackageIds(only, packages);
  const cached = selected ? await verifiedCachedStatePackages(root, packages, selected) : new Map();
  const preparedPackages = [];
  // Complete preflight before any output changes. Selection reuses its approved baseline.
  for (const skin of packages) {
    if (!cached.has(skin.id)) preparedPackages.push(await prepareCharacterStatePackage(root, skin));
  }
  const work = await mkdtemp(path.join(root, '.character-states-build-'));
  try {
    const variantsRoot = path.join(work, 'variants');
    await mkdir(variantsRoot);
    const builtPackages = [];
    for (const skin of packages) {
      const reused = cached.get(skin.id);
      if (reused) {
        for (const asset of reused.assets) {
          for (const variant of asset.variants) {
            await copyFile(path.join(root, variant.path), path.join(variantsRoot, path.basename(variant.path)));
          }
        }
        builtPackages.push({ manifestPackage: reused.group, assets: reused.assets });
        continue;
      }
      const prepared = preparedPackages.find(({ skin: item }) => item.id === skin.id);
      if (!prepared) throw new Error(`${skin.id}: prepared state package is missing.`);
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
  const args = process.argv.slice(2);
  const characterRoot = args[0] && !args[0].startsWith('--') ? path.resolve(args.shift()) : undefined;
  const validOptions = args.length === 0 || (args.length === 2 && args[0] === '--only');
  const only = args.length === 0 ? undefined : args[1]?.split(',');
  Promise.resolve().then(() => {
    if (!validOptions) throw new Error('Use build-character-states.mjs [character-root] [--only id1,id2].');
    return buildCharacterStates({ characterRoot, only });
  }).then((manifest) => {
    process.stdout.write(`Built ${manifest.packages.length} character state packages and ${manifest.assets.length} state masters.\n`);
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
