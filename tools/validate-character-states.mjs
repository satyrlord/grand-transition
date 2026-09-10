import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import contract from '../src/assets/characters/state-contract.json' with { type: 'json' };
import { CHARACTER_BYTE_BUDGETS } from './build-character-assets.mjs';
import { stateFormats, statePackages, stateWidths } from './build-character-states.mjs';
import { inspectAlpha, inspectRaster } from './validate-character-assets.mjs';
import { hasNativeAlphaProvenance } from './asset-pixels.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const requireFact = (condition, message) => { if (!condition) throw new Error(message); };
const crop = { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' };
const sameFields = (actual, expected) => isRecord(actual) &&
  Object.keys(actual).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, value]) => actual[key] === value);

/** Structural checks run before image decoding, including every required mapping. */
export function validateStateManifest(manifest, selectionManifest) {
  requireFact(isRecord(manifest) && manifest.schemaVersion === 1 && Array.isArray(manifest.packages) && Array.isArray(manifest.assets),
    'Character state manifest must declare schemaVersion 1, packages, and assets.');
  const skins = statePackages(selectionManifest);
  requireFact(contract.characterIds.every((id) => skins.some((skin) => skin.ownerId === id)), 'Every slice character needs a selection portrait.');
  requireFact(manifest.packages.length === skins.length, 'Character state package inventory must match every slice skin.');
  const expectedStates = contract.states.filter(({ id }) => id !== 'selection');
  requireFact(manifest.assets.length === skins.length * expectedStates.length, 'Character state master inventory is incomplete or contains extra assets.');
  const assets = new Map();
  for (const asset of manifest.assets) {
    requireFact(isRecord(asset) && typeof asset.id === 'string' && !assets.has(asset.id), 'Character state asset IDs must be present and unique.');
    assets.set(asset.id, asset);
  }
  const seenPackages = new Set();
  const usedAssets = new Set();
  for (const group of manifest.packages) {
    requireFact(isRecord(group), 'Character state package must be an object.');
    const skin = skins.find((item) => item.ownerId === group.ownerId && item.skinId === group.skinId);
    requireFact(skin && !seenPackages.has(skin.id), 'Character state package has an unknown or duplicate skin.');
    seenPackages.add(skin.id);
    requireFact(Array.isArray(group.states) && group.states.length === contract.states.length, `${skin.id}: all nine states are required.`);
    const poses = new Set(['selection']);
    const expressions = new Set(['selection']);
    for (const state of contract.states) {
      const records = group.states.filter((item) => isRecord(item) && item.stateId === state.id);
      requireFact(records.length === 1, `${skin.id}: missing or duplicate ${state.id} mapping.`);
      const record = records[0];
      requireFact(record.durationMs === state.durationMs && record.loop === state.loop, `${skin.id}/${state.id}: incorrect motion timing or loop mode.`);
      const assetId = state.id === 'selection' ? skin.id : `${skin.id}--${state.id}`;
      requireFact(record.assetId === assetId, `${skin.id}/${state.id}: incorrect asset mapping.`);
      if (state.id === 'selection') continue;
      const asset = assets.get(assetId);
      requireFact(asset && asset.ownerType === 'character' && asset.ownerId === skin.ownerId && asset.skinId === skin.skinId && asset.stateId === state.id,
        `${assetId}: missing asset or incorrect ownership.`);
      usedAssets.add(assetId);
      requireFact(identifier(asset.poseId) && identifier(asset.expressionId), `${assetId}: pose and expression identifiers are required.`);
      poses.add(asset.poseId);
      expressions.add(asset.expressionId);
      requireFact(typeof asset.sourceDescription === 'string' && asset.sourceDescription.trim() && typeof asset.licenseIdentifier === 'string' && asset.licenseIdentifier.trim(),
        `${assetId}: source description and license are required.`);
      requireFact(sameFields(asset.focalPoint, { x: 0.5, y: 0.32 }) && sameFields(asset.crop, crop), `${assetId}: incorrect focal point or crop.`);
      const source = asset.source;
      requireFact(isRecord(source) && source.path === `states/${skin.id}/${state.id}.png` && source.format === 'png' && source.width === 2048 && source.height === 2048 &&
        hash(source.sha256) && Number.isInteger(source.bytes) && source.bytes > 0, `${assetId}: invalid source path, dimensions, bytes, or hash.`);
      requireFact(Array.isArray(asset.variants) && asset.variants.length === 6, `${assetId}: all six runtime variants are required.`);
      for (const width of stateWidths) {
        for (const format of stateFormats) {
          const variants = asset.variants.filter((variant) => isRecord(variant) && variant.width === width && variant.format === format);
          requireFact(variants.length === 1, `${assetId}: missing or duplicate ${width}px ${format}.`);
          const variant = variants[0];
          requireFact(variant.path === `states/variants/${assetId}-${width}x${width}.${format}` && variant.height === width && hash(variant.sha256) &&
            Number.isInteger(variant.bytes) && variant.bytes > 0 && variant.bytes <= CHARACTER_BYTE_BUDGETS[format], `${assetId}: invalid variant path, dimensions, hash, or byte budget.`);
        }
      }
    }
    requireFact(poses.size >= 6 && expressions.size >= 5, `${skin.id}: at least six poses and five expressions are required.`);
  }
  requireFact(usedAssets.size === assets.size, 'Character state manifest contains an unreferenced asset.');
  return manifest;
}

export function measurePackageBytes(manifest, selection, sceneManifest) {
  const variantBytes = (asset, width, format) => {
    const variant = asset.variants.find((item) => item.width === width && item.format === format);
    requireFact(variant && Number.isInteger(variant.bytes) && variant.bytes > 0,
      asset.id + ': missing largest ' + format + ' variant byte size.');
    return variant.bytes;
  };
  return Math.max(...stateFormats.map((format) => {
    const scenes = new Map();
    for (const asset of sceneManifest.assets) {
      scenes.set(asset.ownerId, (scenes.get(asset.ownerId) ?? 0) + variantBytes(asset, 1920, format));
    }
    const packages = selection.assets.map((baseline) =>
      variantBytes(baseline, 960, format) +
      manifest.assets.filter((asset) => asset.ownerId === baseline.ownerId && asset.skinId === baseline.skinId)
        .reduce((sum, asset) => sum + variantBytes(asset, 960, format), 0));
    return Math.max(...scenes.values()) + 2 * Math.max(...packages);
  }));
}

export async function validateStateAsset(root, asset) {
  const variantFiles = [];
  let nativeAlpha = false;
  for (const raster of [asset.source, ...asset.variants]) {
    const context = `${asset.id}: ${raster.path}`;
    const { input } = await inspectRaster(path.join(root, raster.path), raster.format, raster.width, raster.height, context);
    requireFact(input.length === raster.bytes && sha256(input) === raster.sha256, `${context}: bytes or hash do not match the file.`);
    if (raster === asset.source) nativeAlpha = hasNativeAlphaProvenance(input);
    await inspectAlpha(input, context, { nativeAlpha });
    if (raster !== asset.source) variantFiles.push(path.basename(raster.path));
  }
  return variantFiles;
}

export async function validateCharacterStates({ characterRoot = path.resolve('src/assets/characters'), sceneRoot = path.resolve('src/assets/scenes') } = {}) {
  const root = path.resolve(characterRoot);
  const selection = JSON.parse(await readFile(path.join(root, 'character-manifest.json'), 'utf8'));
  const manifest = validateStateManifest(JSON.parse(await readFile(path.join(root, 'states/state-manifest.json'), 'utf8')), selection);
  const expectedFiles = new Set();
  for (const asset of manifest.assets) {
    for (const file of await validateStateAsset(root, asset)) expectedFiles.add(file);
  }
  const actualFiles = await readdir(path.join(root, 'states/variants'));
  requireFact(actualFiles.length === expectedFiles.size && actualFiles.every((file) => expectedFiles.has(file)), 'State runtime directory contains missing or extra files.');
  const sceneManifest = JSON.parse(await readFile(path.join(sceneRoot, 'scene-manifest.json'), 'utf8'));
  const worstBytes = measurePackageBytes(manifest, selection, sceneManifest);
  requireFact(worstBytes <= 3 * 1024 * 1024, `Selected scene and two character packages exceed 3 MiB: ${worstBytes} bytes.`);
  return { packages: manifest.packages.length, assets: manifest.assets.length, worstPackageBytes: worstBytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateCharacterStates().then((result) => process.stdout.write(`Character state validation passed: ${JSON.stringify(result)}.\n`)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
