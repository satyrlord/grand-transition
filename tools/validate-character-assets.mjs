import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import baseline from './character-replacement-baseline.json' with { type: 'json' };
import {
  CHARACTER_BYTE_BUDGETS,
  CHARACTER_MASTER_NAMES,
  CHARACTER_VARIANT_FORMATS,
  CHARACTER_VARIANT_SIZES,
} from './build-character-assets.mjs';

const hashPattern = /^[0-9a-f]{64}$/u;
const baselineHashByFile = new Map(baseline.assets.map(({ file, sha256 }) => [file, sha256]));
const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function requireString(value, context) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${context} must be a non-empty string.`);
  return value;
}

function requireHash(value, context) {
  if (typeof value !== 'string' || !hashPattern.test(value)) throw new Error(`${context} must be a lowercase SHA-256 hash.`);
  return value;
}

function requireInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${context} must be a non-negative integer.`);
  return value;
}

async function assertRegularFile(filePath, context) {
  const stats = await lstat(filePath).catch((error) => {
    throw new Error(`${context} is missing: ${filePath}.`, { cause: error });
  });
  if (!stats.isFile()) throw new Error(`${context} is not a regular file: ${filePath}.`);
}

async function inspectRaster(filePath, expectedFormat, expectedWidth, expectedHeight, context) {
  await assertRegularFile(filePath, context);
  const input = await readFile(filePath);
  const metadata = await sharp(input).metadata();
  const decodedFormat = expectedFormat === 'avif' ? metadata.format === 'heif' : metadata.format === expectedFormat;
  if (!decodedFormat || metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(`${context} must decode as ${expectedFormat} at ${expectedWidth}x${expectedHeight}.`);
  }
  return { input, metadata };
}

async function inspectAlpha(input, context) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let opaque = 0;
  let partial = 0;
  let visible = 0;
  let chromaGreen = 0;
  let minimumY = info.height;
  let maximumY = -1;
  for (let pixelIndex = 0; pixelIndex < info.width * info.height; pixelIndex += 1) {
    const alpha = data[pixelIndex * 4 + 3];
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else partial += 1;
    if (alpha > 8) {
      visible += 1;
      const offset = pixelIndex * 4;
      if (
        alpha > 16 &&
        data[offset + 1] >= 180 &&
        data[offset] <= 80 &&
        data[offset + 2] <= 80
      ) {
        chromaGreen += 1;
      }
      const y = Math.floor(pixelIndex / info.width);
      minimumY = Math.min(minimumY, y);
      maximumY = Math.max(maximumY, y);
    }
  }
  const corners = [3, (info.width - 1) * 4 + 3, (info.height - 1) * info.width * 4 + 3, (info.width * info.height - 1) * 4 + 3];
  if (transparent === 0 || opaque === 0 || partial === 0 || corners.some((offset) => data[offset] !== 0)) {
    throw new Error(`${context} must have transparent corners, opaque content, and partial-alpha edges.`);
  }
  const visibleRatio = visible / (info.width * info.height);
  const heightRatio = (maximumY - minimumY + 1) / info.height;
  if (chromaGreen > 0) {
    throw new Error(
      `${context} retains ${chromaGreen} visible chroma-green pixel(s).`,
    );
  }
  if (visibleRatio < 0.12 || heightRatio < 0.92 || heightRatio > 0.99) {
    throw new Error(
      `${context} must keep a readable full-body silhouette inside the square canvas.`,
    );
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Character manifest is missing or invalid: ${filePath}.`, { cause: error });
  }
}

async function assertExactMasterSet(characterRoot) {
  const actual = (await readdir(characterRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .toSorted((left, right) => left.localeCompare(right, 'en'));
  const missing = CHARACTER_MASTER_NAMES.filter(
    (fileName) => !actual.includes(fileName),
  );
  if (missing.length > 0) {
    throw new Error(`Character master set is missing: ${missing.join(', ')}.`);
  }
  const retired = [
    'black-sea-captain--alternate.png',
    'presidential-sphinx.png',
  ].filter((fileName) => actual.includes(fileName));
  if (retired.length > 0) {
    throw new Error(`Character master set contains retired assets: ${retired.join(', ')}.`);
  }
}

async function listVariantFiles(variantsRoot) {
  const entries = await readdir(variantsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => `variants/${entry.name}`).toSorted((left, right) => left.localeCompare(right, 'en'));
}

export async function validateCharacterAssets({
  characterRoot = path.resolve('src', 'assets', 'characters'),
} = {}) {
  const root = path.resolve(characterRoot);
  await assertExactMasterSet(root);
  const manifest = await readJson(path.join(root, 'character-manifest.json'));
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error('Character manifest must declare schemaVersion 1 and an assets array.');
  }
  if (manifest.assets.length !== CHARACTER_MASTER_NAMES.length) {
    throw new Error(`Character manifest must contain exactly ${CHARACTER_MASTER_NAMES.length} assets.`);
  }
  const expectedIds = new Set(CHARACTER_MASTER_NAMES.map((file) => path.parse(file).name));
  const seenIds = new Set();
  const declaredVariants = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    const context = `Character manifest asset ${index}`;
    if (!isRecord(asset)) throw new Error(`${context} must be an object.`);
    const id = requireString(asset.id, `${context}.id`);
    if (!expectedIds.has(id)) throw new Error(`Character manifest contains unsupported asset ID "${id}".`);
    if (seenIds.has(id)) throw new Error(`Duplicate character asset ID "${id}".`);
    seenIds.add(id);
    if (asset.ownerType !== 'character') throw new Error(`Character asset "${id}" must have ownerType character.`);
    const expectedOwner = id.split('--', 1)[0];
    const expectedSkin = id.includes('--') ? id.slice(id.indexOf('--') + 2) : 'default';
    if (asset.ownerId !== expectedOwner || asset.skinId !== expectedSkin) throw new Error(`Character asset "${id}" has incorrect owner or skin metadata.`);
    if (asset.stateId !== 'selection' || asset.poseId !== 'selection' || asset.expressionId !== 'selection') {
      throw new Error(`Character asset "${id}" must map the baseline portrait to the selection state.`);
    }
    requireString(asset.sourceDescription, `Character asset "${id}" sourceDescription`);
    requireString(asset.licenseIdentifier, `Character asset "${id}" licenseIdentifier`);
    if (!isRecord(asset.source)) throw new Error(`Character asset "${id}" is missing its source.`);
    const sourcePath = requireString(asset.source.path, `Character asset "${id}" source.path`);
    if (sourcePath !== `${id}.png` || asset.source.format !== 'png' || asset.source.width !== 2048 || asset.source.height !== 2048) {
      throw new Error(`Character asset "${id}" must use its 2048x2048 PNG source.`);
    }
    const source = await inspectRaster(path.join(root, sourcePath), 'png', 2048, 2048, `Character asset "${id}" source`);
    const declaredSourceHash = requireHash(
      asset.source.sha256,
      `Character asset "${id}" source.sha256`,
    );
    if (baselineHashByFile.get(sourcePath) === declaredSourceHash) {
      throw new Error(`Character asset "${id}" still uses the replaced baseline source hash.`);
    }
    if (
      requireInteger(asset.source.bytes, `Character asset "${id}" source.bytes`) !==
        source.input.length ||
      declaredSourceHash !== sha256(source.input)
    ) {
      throw new Error(`Character asset "${id}" source bytes or SHA-256 do not match the file.`);
    }
    await inspectAlpha(source.input, `Character asset "${id}" source`);
    if (!Array.isArray(asset.variants) || asset.variants.length !== CHARACTER_VARIANT_SIZES.length * CHARACTER_VARIANT_FORMATS.length) {
      throw new Error(`Character asset "${id}" must declare every runtime variant.`);
    }
    const variantKeys = new Set();
    for (const [variantIndex, variant] of asset.variants.entries()) {
      const variantContext = `Character asset "${id}" variant ${variantIndex}`;
      if (!isRecord(variant)) throw new Error(`${variantContext} must be an object.`);
      const width = requireInteger(variant.width, `${variantContext}.width`);
      const height = requireInteger(variant.height, `${variantContext}.height`);
      const format = variant.format;
      if (!CHARACTER_VARIANT_SIZES.includes(width) || height !== width || !CHARACTER_VARIANT_FORMATS.includes(format)) {
        throw new Error(`${variantContext} has unsupported dimensions or format.`);
      }
      const key = `${width}:${format}`;
      if (variantKeys.has(key)) throw new Error(`${variantContext} duplicates ${key}.`);
      variantKeys.add(key);
      const expectedPath = `variants/${id}-${width}x${width}.${format}`;
      if (variant.path !== expectedPath || declaredVariants.has(expectedPath)) throw new Error(`${variantContext} has an incorrect or duplicate path.`);
      declaredVariants.add(expectedPath);
      const inspected = await inspectRaster(path.join(root, expectedPath), format, width, height, variantContext);
      if (requireInteger(variant.bytes, `${variantContext}.bytes`) !== inspected.input.length || requireHash(variant.sha256, `${variantContext}.sha256`) !== sha256(inspected.input)) {
        throw new Error(`${variantContext} bytes or SHA-256 do not match the file.`);
      }
      if (inspected.input.length > CHARACTER_BYTE_BUDGETS[format]) throw new Error(`${variantContext} exceeds its byte budget.`);
      await inspectAlpha(inspected.input, variantContext);
    }
  }
  const missingIds = [...expectedIds].filter((id) => !seenIds.has(id));
  if (missingIds.length > 0) throw new Error(`Character manifest is missing asset IDs: ${missingIds.join(', ')}.`);
  const actualVariants = await listVariantFiles(path.join(root, 'variants'));
  const expectedVariants = [...declaredVariants].toSorted((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(actualVariants) !== JSON.stringify(expectedVariants)) throw new Error('Character variant directory contains a missing or extra file.');
  return manifest;
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const characterRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  validateCharacterAssets({ characterRoot })
    .then((manifest) => process.stdout.write(`Character asset validation passed: ${manifest.assets.length} masters, ${manifest.assets.length * CHARACTER_VARIANT_SIZES.length * CHARACTER_VARIANT_FORMATS.length} variants.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
