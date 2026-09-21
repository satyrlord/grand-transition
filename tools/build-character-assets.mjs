import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import baseline from './character-replacement-baseline.json' with { type: 'json' };
import portraitLayout from '../src/assets/characters/portrait-layout.json' with { type: 'json' };
import { hasNativeAlphaProvenance } from './asset-pixels.mjs';

export const CHARACTER_MASTER_NAMES = Object.freeze(
  [...new Set([...baseline.assets.map(({ file }) => file),
    ...Object.keys(portraitLayout.portraits).map((id) => `${id}.png`),
  ])].toSorted((left, right) => left.localeCompare(right, 'en')),
);
export const CHARACTER_VARIANT_SIZES = Object.freeze([128, 256, 320, 640, 960]);
export const CHARACTER_VARIANT_FORMATS = Object.freeze(['avif', 'webp']);
export const CHARACTER_BYTE_BUDGETS = Object.freeze({ avif: 250 * 1024, webp: 350 * 1024 });

const SOURCE_DESCRIPTION =
  'Original flat cel-shaded editorial-cartoon character art created for Grand Transition.';
const LICENSE_IDENTIFIER = 'LicenseRef-Grand-Transition-Original';
const QUALITY = Object.freeze({ avif: 70, webp: 78 });

const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const assetId = (fileName) => path.parse(fileName).name;
const ownerId = (id) => id.split('--', 1)[0];
const skinId = (id) => id.includes('--') ? id.slice(id.indexOf('--') + 2) : 'default';

export async function readCharacterLayout(characterRoot, masterNames = CHARACTER_MASTER_NAMES) {
  const layout = JSON.parse(await readFile(path.join(characterRoot, 'portrait-layout.json'), 'utf8'));
  const ids = masterNames.map(assetId);
  if (layout.schemaVersion !== 1 || !layout.portraits || Array.isArray(layout.portraits) ||
    Object.keys(layout.portraits).length !== ids.length || Object.keys(layout.portraits).some((id) => !ids.includes(id))) {
    throw new Error('Portrait layout must contain the exact source inventory.');
  }
  for (const id of ids) {
    const entry = layout.portraits[id];
    if (!entry || !['left', 'right'].includes(entry.facing) || !/^[a-f0-9]{64}$/u.test(entry.sourceSha256)) {
      throw new Error(`${id}: missing or invalid reviewed facing metadata.`);
    }
  }
  return layout.portraits;
}

export async function encodeVariant(input, width, format) {
  return (await encodeVariantWithMetadata(input, width, format)).output;
}

export async function encodeVariantWithMetadata(input, width, format) {
  let pipeline = sharp(input).resize(width, width, { fit: 'contain', kernel: sharp.kernel.lanczos3 });
  const nativeAlpha = hasNativeAlphaProvenance(input);
  if (nativeAlpha) {
    const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (x !== 0 && y !== 0 && x !== info.width - 1 && y !== info.height - 1) continue;
        const offset = (y * info.width + x) * 4 + 3;
        if (data[offset] > 8) throw new Error('Native character resize reaches the outer border. Increase the source safe margin.');
        data[offset] = 0;
      }
    }
    pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  }
  let lossless = format === 'avif' && nativeAlpha && width <= 256;
  let output = format === 'avif'
    ? await pipeline.clone().avif({ effort: 8, quality: lossless ? 100 : QUALITY.avif, lossless }).toBuffer()
    : await pipeline.webp({ alphaQuality: 100, effort: 6, quality: QUALITY.webp, smartSubsample: true }).toBuffer();
  if (format === 'avif' && nativeAlpha && !lossless) {
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const borderChanged = data.some((alpha, index) => {
      if (index % 4 !== 3 || alpha === 0) return false;
      const pixel = (index - 3) / 4;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      return x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1;
    });
    if (borderChanged) {
      lossless = true;
      output = await pipeline.avif({ effort: 8, quality: 100, lossless: true }).toBuffer();
    }
  }
  return { output, quality: lossless ? 100 : QUALITY[format], ...(lossless ? { lossless: true } : {}) };
}

async function readMaster(characterRoot, fileName) {
  const filePath = path.join(characterRoot, fileName);
  const input = await readFile(filePath);
  const metadata = await sharp(input).metadata();
  if (metadata.format !== 'png' || metadata.width !== 2048 || metadata.height !== 2048 || !metadata.hasAlpha) {
    throw new Error(`${fileName}: character master must be a transparent 2048x2048 PNG.`);
  }
  return { input, filePath };
}

async function assertMasterSet(characterRoot, masterNames) {
  const actual = (await readdir(characterRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .toSorted((left, right) => left.localeCompare(right, 'en'));
  const missing = masterNames.filter((fileName) => !actual.includes(fileName));
  if (missing.length > 0) {
    throw new Error(`Character master set is missing: ${missing.join(', ')}.`);
  }
}

export function selectedCharacterAssetIds(only, masterNames = CHARACTER_MASTER_NAMES) {
  if (only === undefined) return null;
  const ids = new Set(masterNames.map(assetId));
  if (!Array.isArray(only) || only.length === 0 || only.some((id) => !ids.has(id)) ||
    new Set(only).size !== only.length) {
    throw new Error('Selected character IDs must be a non-empty list of distinct known asset IDs.');
  }
  return new Set(only);
}

async function verifiedCachedAssets(characterRoot, masters, selected, layout) {
  const manifest = JSON.parse(await readFile(path.join(characterRoot, 'character-manifest.json'), 'utf8'));
  const expectedIds = masters.map(({ id }) => id);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets) ||
    manifest.assets.length !== expectedIds.length ||
    new Set(manifest.assets.map((asset) => asset?.id)).size !== expectedIds.length ||
    manifest.assets.some((asset) => !expectedIds.includes(asset?.id))) {
    throw new Error('Selective character builds require a complete existing character manifest.');
  }
  const cache = new Map();
  for (const master of masters) {
    if (selected.has(master.id)) continue;
    const asset = manifest.assets.find((entry) => entry.id === master.id);
    if (asset.ownerType !== 'character' || asset.ownerId !== ownerId(master.id) ||
      asset.skinId !== skinId(master.id) || asset.facing !== layout[master.id].facing ||
      asset.stateId !== 'selection' || asset.poseId !== 'selection' || asset.expressionId !== 'selection' ||
      asset.source?.path !== master.fileName || asset.source.width !== 2048 ||
      asset.source.height !== 2048 || asset.source.format !== 'png' ||
      asset.source.bytes !== master.input.length || asset.source.sha256 !== sha256(master.input)) {
      throw new Error(`Cached character source "${master.id}" changed or has invalid metadata; select it for rebuilding.`);
    }
    const expected = CHARACTER_VARIANT_SIZES.flatMap((width) =>
      CHARACTER_VARIANT_FORMATS.map((format) => ({
        path: `variants/${master.id}-${width}x${width}.${format}`,
        width,
        height: width,
        format,
      })));
    if (!Array.isArray(asset.variants) || asset.variants.length !== expected.length ||
      new Set(asset.variants.map((variant) => variant?.path)).size !== expected.length) {
      throw new Error(`Cached character "${master.id}" has an invalid variant inventory.`);
    }
    for (const requirement of expected) {
      const variant = asset.variants.find((entry) => entry?.path === requirement.path);
      if (!variant || variant.width !== requirement.width || variant.height !== requirement.height ||
        variant.format !== requirement.format || !Number.isInteger(variant.bytes) ||
        variant.bytes <= 0 || variant.bytes > CHARACTER_BYTE_BUDGETS[requirement.format] ||
        !/^[a-f0-9]{64}$/u.test(variant.sha256)) {
        throw new Error(`Cached character variant "${requirement.path}" has invalid metadata.`);
      }
      const output = await readFile(path.join(characterRoot, requirement.path));
      let metadata;
      try {
        metadata = await sharp(output).metadata();
      } catch (error) {
        throw new Error(`Cached character variant "${requirement.path}" failed byte, hash, dimension, or format validation.`, { cause: error });
      }
      if (output.length !== variant.bytes || sha256(output) !== variant.sha256 ||
        metadata.width !== requirement.width || metadata.height !== requirement.height ||
        metadata.format !== (requirement.format === 'avif' ? 'heif' : 'webp') ||
        (requirement.format === 'avif' && metadata.compression !== 'av1')) {
        throw new Error(`Cached character variant "${requirement.path}" failed byte, hash, dimension, or format validation.`);
      }
    }
    cache.set(master.id, asset);
  }
  return cache;
}

export async function mapWithConcurrency(values, concurrency, work) {
  const results = Array.from({ length: values.length });
  let nextIndex = 0;
  const failures = [];
  async function worker() {
    while (nextIndex < values.length && failures.length === 0) {
      const index = nextIndex;
      nextIndex += 1;
      try { results[index] = await work(values[index]); }
      catch (error) { failures.push(error); }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  if (failures.length > 0) throw failures[0];
  return results;
}

export async function buildCharacterAssets({
  characterRoot = path.resolve('src', 'assets', 'characters'),
  masterNames = CHARACTER_MASTER_NAMES,
  only,
} = {}) {
  const selected = selectedCharacterAssetIds(only, masterNames);
  const resolvedRoot = path.resolve(characterRoot);
  await assertMasterSet(resolvedRoot, masterNames);
  const layout = await readCharacterLayout(resolvedRoot, masterNames);
  const masters = await Promise.all(masterNames.map(async (fileName) => {
    const id = assetId(fileName);
    const { input } = await readMaster(resolvedRoot, fileName);
    if (layout[id].sourceSha256 !== sha256(input)) throw new Error(`${id}: source changed after the facing review.`);
    return { fileName, id, input };
  }));
  const cached = selected ? await verifiedCachedAssets(resolvedRoot, masters, selected, layout) : new Map();
  const temporaryRoot = await mkdtemp(
    path.join(resolvedRoot, '.character-assets-build-'),
  );
  const temporaryVariants = path.join(temporaryRoot, 'variants');
  await mkdir(temporaryVariants, { recursive: true });
  try {
    const assets = await mapWithConcurrency(
      masters,
      3,
      async ({ fileName, id, input }) => {
      const cachedAsset = cached.get(id);
      if (cachedAsset) {
        await Promise.all(cachedAsset.variants.map((variant) =>
          copyFile(path.join(resolvedRoot, variant.path), path.join(temporaryRoot, variant.path))));
        return cachedAsset;
      }
      const variants = await Promise.all(
        CHARACTER_VARIANT_SIZES.flatMap((width) =>
          CHARACTER_VARIANT_FORMATS.map(async (format) => {
          const { output, quality, lossless } = await encodeVariantWithMetadata(input, width, format);
          if (output.length > CHARACTER_BYTE_BUDGETS[format]) {
            throw new Error(`${id} ${width}px ${format} exceeds its byte budget.`);
          }
          const variantName = `${id}-${width}x${width}.${format}`;
          await writeFile(path.join(temporaryVariants, variantName), output);
          return {
            path: `variants/${variantName}`,
            width,
            height: width,
            format,
            quality,
            ...(lossless ? { lossless: true } : {}),
            bytes: output.length,
            sha256: sha256(output),
          };
          }),
        ),
      );
      return {
        id,
        ownerType: 'character',
        ownerId: ownerId(id),
        skinId: skinId(id),
        facing: layout[id].facing,
        stateId: 'selection',
        poseId: 'selection',
        expressionId: 'selection',
        sourceDescription: SOURCE_DESCRIPTION,
        licenseIdentifier: LICENSE_IDENTIFIER,
        source: {
          path: fileName,
          width: 2048,
          height: 2048,
          format: 'png',
          bytes: input.length,
          sha256: sha256(input),
        },
        focalPoint: { x: 0.5, y: 0.32 },
        crop: { x: 0, y: 0, width: 1, height: 1, strategy: 'full-body-safe-margin-v1' },
        variants,
      };
      },
    );
    const manifest = { schemaVersion: 1, assets };
    await writeFile(path.join(temporaryRoot, 'character-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await rm(path.join(resolvedRoot, 'variants'), { force: true, recursive: true });
    await rename(temporaryVariants, path.join(resolvedRoot, 'variants'));
    await rename(path.join(temporaryRoot, 'character-manifest.json'), path.join(resolvedRoot, 'character-manifest.json'));
    return manifest;
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const characterRoot = args[0] && !args[0].startsWith('--') ? path.resolve(args.shift()) : undefined;
  const validOptions = args.length === 0 || (args.length === 2 && args[0] === '--only');
  const only = args.length === 0 ? undefined : args[1]?.split(',');
  Promise.resolve().then(() => {
    if (!validOptions) throw new Error('Use build-character-assets.mjs [character-root] [--only id1,id2].');
    return buildCharacterAssets({ characterRoot, only });
  })
    .then((manifest) => process.stdout.write(`Built ${manifest.assets.length} character masters and ${manifest.assets.length * CHARACTER_VARIANT_SIZES.length * CHARACTER_VARIANT_FORMATS.length} variants.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
