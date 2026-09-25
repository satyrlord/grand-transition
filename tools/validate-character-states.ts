import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import contract from '../src/assets/characters/state-contract.json' with { type: 'json' };
import {
  CHARACTER_BYTE_BUDGETS,
  type CharacterAsset,
  type CharacterManifest,
} from './build-character-assets.ts';
import {
  stateFormats,
  statePackages,
  stateWidths,
  type StateManifest,
} from './build-character-states.ts';
import { inspectAlpha, inspectRaster } from './validate-character-assets.ts';
import { hasNativeAlphaProvenance } from './asset-pixels.ts';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown) =>
  typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
function requireFact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const crop = { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' };
const stateAssetReuse: Readonly<Record<string, string | undefined>> = contract.stateAssetReuse;
type SizedAsset = {
  id: string;
  ownerId: string;
  skinId?: string;
  variants: readonly { format: string; width: number; bytes: number }[];
};
type RasterRecord = {
  path: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
};
const sameFields = (actual: unknown, expected: Record<string, unknown>) =>
  isRecord(actual) &&
  Object.keys(actual).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, value]) => actual[key] === value);

/** Structural checks run before image decoding, including every required mapping. */
export function validateStateManifest(
  input: unknown,
  selectionManifest: { assets?: unknown },
): StateManifest {
  requireFact(
    isRecord(input) &&
      input.schemaVersion === 1 &&
      Array.isArray(input.packages) &&
      Array.isArray(input.assets),
    'Character state manifest must declare schemaVersion 1, packages, and assets.',
  );
  // The checks below prove each field that the typed manifest declares.
  const manifest = input as StateManifest;
  const skins = statePackages(selectionManifest);
  requireFact(
    manifest.packages.length === contract.expectedPackageCount,
    `Character state package inventory must contain exactly ${contract.expectedPackageCount} packages.`,
  );
  const assets = new Map<string, CharacterAsset>();
  for (const asset of manifest.assets) {
    requireFact(
      isRecord(asset) && typeof asset.id === 'string' && !assets.has(asset.id),
      'Character state asset IDs must be present and unique.',
    );
    assets.set(asset.id, asset);
  }
  requireFact(
    manifest.assets.length === contract.expectedStateMasterCount,
    `Character state manifest must contain exactly ${contract.expectedStateMasterCount} state masters.`,
  );
  const seenPackages = new Set<string>();
  const usedAssets = new Set<string>();
  for (const group of manifest.packages) {
    requireFact(isRecord(group), 'Character state package must be an object.');
    const skin = skins.find(
      (item) => item.ownerId === group.ownerId && item.skinId === group.skinId,
    );
    requireFact(
      skin && !seenPackages.has(skin.id),
      'Character state package has an unknown or duplicate skin.',
    );
    seenPackages.add(skin.id);
    requireFact(
      Array.isArray(group.states) && group.states.length === contract.states.length,
      `${skin.id}: all nine states are required.`,
    );
    const poses = new Set(['selection']);
    const expressions = new Set(['selection']);
    for (const state of contract.states) {
      const records = group.states.filter((item) => isRecord(item) && item.stateId === state.id);
      requireFact(records.length === 1, `${skin.id}: missing or duplicate ${state.id} mapping.`);
      const record = records[0]!;
      requireFact(
        record.durationMs === state.durationMs && record.loop === state.loop,
        `${skin.id}/${state.id}: incorrect motion timing or loop mode.`,
      );
      const reusedStateId = stateAssetReuse[state.id];
      const expectedAssetId =
        state.id === 'selection' || reusedStateId === 'selection'
          ? skin.id
          : reusedStateId
            ? `${skin.id}--${reusedStateId}`
            : `${skin.id}--${state.id}`;
      requireFact(
        record.assetId === expectedAssetId,
        `${skin.id}/${state.id}: incorrect asset mapping.`,
      );
      if (record.assetId === skin.id) continue;
      const assetId = record.assetId;
      const expectedAssetStateId = reusedStateId ?? state.id;
      const asset = assets.get(assetId);
      requireFact(
        asset &&
          asset.ownerType === 'character' &&
          asset.ownerId === skin.ownerId &&
          asset.skinId === skin.skinId &&
          asset.stateId === expectedAssetStateId,
        `${assetId}: missing asset or incorrect ownership.`,
      );
      usedAssets.add(assetId);
      requireFact(
        identifier(asset.poseId) && identifier(asset.expressionId),
        `${assetId}: pose and expression identifiers are required.`,
      );
      poses.add(asset.poseId);
      expressions.add(asset.expressionId);
      requireFact(
        typeof asset.sourceDescription === 'string' &&
          asset.sourceDescription.trim() &&
          typeof asset.licenseIdentifier === 'string' &&
          asset.licenseIdentifier.trim(),
        `${assetId}: source description and license are required.`,
      );
      requireFact(
        sameFields(asset.focalPoint, { x: 0.5, y: 0.32 }) && sameFields(asset.crop, crop),
        `${assetId}: incorrect focal point or crop.`,
      );
      const source = asset.source;
      requireFact(
        isRecord(source) &&
          source.path === `states/${skin.id}/${asset.stateId}.png` &&
          source.format === 'png' &&
          source.width === 2048 &&
          source.height === 2048 &&
          hash(source.sha256) &&
          Number.isInteger(source.bytes) &&
          source.bytes > 0,
        `${assetId}: invalid source path, dimensions, bytes, or hash.`,
      );
      requireFact(
        Array.isArray(asset.variants) && asset.variants.length === 6,
        `${assetId}: all six runtime variants are required.`,
      );
      for (const width of stateWidths) {
        for (const format of stateFormats) {
          const variants = asset.variants.filter(
            (variant) => isRecord(variant) && variant.width === width && variant.format === format,
          );
          requireFact(
            variants.length === 1,
            `${assetId}: missing or duplicate ${width}px ${format}.`,
          );
          const variant = variants[0]!;
          requireFact(
            variant.path === `states/variants/${assetId}-${width}x${width}.${format}` &&
              variant.height === width &&
              hash(variant.sha256) &&
              Number.isInteger(variant.bytes) &&
              variant.bytes > 0 &&
              variant.bytes <= CHARACTER_BYTE_BUDGETS[format],
            `${assetId}: invalid variant path, dimensions, hash, or byte budget.`,
          );
        }
      }
    }
    requireFact(
      poses.size >= 6 && expressions.size >= 5,
      `${skin.id}: at least six poses and five expressions are required.`,
    );
  }
  requireFact(
    usedAssets.size === assets.size,
    'Character state manifest contains an unreferenced asset.',
  );
  return manifest;
}

export function measurePackageBytes(
  manifest: { assets: readonly SizedAsset[] },
  selection: { assets: readonly SizedAsset[] },
  sceneManifest: { assets: readonly SizedAsset[] },
): number {
  const variantBytes = (asset: SizedAsset, format: string): number => {
    const variant = asset.variants
      .filter((item) => item.format === format)
      .reduce<SizedAsset['variants'][number] | undefined>(
        (largest, item) => (!largest || item.width > largest.width ? item : largest),
        undefined,
      );
    requireFact(
      variant && Number.isInteger(variant.bytes) && variant.bytes > 0,
      asset.id + ': missing largest ' + format + ' variant byte size.',
    );
    return variant.bytes;
  };
  return Math.max(
    ...stateFormats.map((format) => {
      const scenes = new Map<string, number>();
      for (const asset of sceneManifest.assets) {
        scenes.set(asset.ownerId, (scenes.get(asset.ownerId) ?? 0) + variantBytes(asset, format));
      }
      const packages = selection.assets.map(
        (baseline) =>
          variantBytes(baseline, format) +
          manifest.assets
            .filter(
              (asset) => asset.ownerId === baseline.ownerId && asset.skinId === baseline.skinId,
            )
            .reduce((sum, asset) => sum + variantBytes(asset, format), 0),
      );
      return Math.max(...scenes.values()) + 2 * Math.max(...packages);
    }),
  );
}

export async function validateStateAsset(
  root: string,
  asset: { id: string; source: RasterRecord; variants: readonly RasterRecord[] },
): Promise<string[]> {
  const variantFiles: string[] = [];
  let nativeAlpha = false;
  for (const raster of [asset.source, ...asset.variants]) {
    const context = `${asset.id}: ${raster.path}`;
    const { input } = await inspectRaster(
      path.join(root, raster.path),
      raster.format,
      raster.width,
      raster.height,
      context,
    );
    requireFact(
      input.length === raster.bytes && sha256(input) === raster.sha256,
      `${context}: bytes or hash do not match the file.`,
    );
    if (raster === asset.source) nativeAlpha = hasNativeAlphaProvenance(input);
    await inspectAlpha(input, context, { nativeAlpha });
    if (raster !== asset.source) variantFiles.push(path.basename(raster.path));
  }
  return variantFiles;
}

export async function validateCharacterStates({
  characterRoot = path.resolve('src/assets/characters'),
  sceneRoot = path.resolve('src/assets/scenes'),
}: { characterRoot?: string; sceneRoot?: string } = {}) {
  const root = path.resolve(characterRoot);
  const selection = JSON.parse(
    await readFile(path.join(root, 'character-manifest.json'), 'utf8'),
  ) as CharacterManifest;
  const manifest = validateStateManifest(
    JSON.parse(await readFile(path.join(root, 'states/state-manifest.json'), 'utf8')),
    selection,
  );
  const expectedFiles = new Set<string>();
  for (const asset of manifest.assets) {
    for (const file of await validateStateAsset(root, asset)) expectedFiles.add(file);
  }
  const actualFiles = await readdir(path.join(root, 'states/variants'));
  requireFact(
    actualFiles.length === expectedFiles.size &&
      actualFiles.every((file) => expectedFiles.has(file)),
    'State runtime directory contains missing or extra files.',
  );
  const expectedMasters = new Set(manifest.assets.map(({ source }) => source.path));
  const actualMasters = new Set<string>();
  for (const skin of statePackages(selection)) {
    const stateRoot = path.join(root, 'states', skin.id);
    for (const entry of await readdir(stateRoot, { withFileTypes: true })) {
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.png') {
        actualMasters.add(`states/${skin.id}/${entry.name}`);
      }
    }
  }
  requireFact(
    actualMasters.size === expectedMasters.size &&
      [...actualMasters].every((file) => expectedMasters.has(file)),
    'State master directories contain missing or extra PNG files.',
  );
  const sceneManifest = JSON.parse(
    await readFile(path.join(sceneRoot, 'scene-manifest.json'), 'utf8'),
  );
  const worstBytes = measurePackageBytes(manifest, selection, sceneManifest);
  requireFact(
    worstBytes <= 3 * 1024 * 1024,
    `Selected scene and two character packages exceed 3 MiB: ${worstBytes} bytes.`,
  );
  return {
    packages: manifest.packages.length,
    assets: manifest.assets.length,
    worstPackageBytes: worstBytes,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateCharacterStates()
    .then((result) =>
      process.stdout.write(`Character state validation passed: ${JSON.stringify(result)}.\n`),
    )
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
