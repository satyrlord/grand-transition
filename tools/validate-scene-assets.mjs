import { isVisibleChromaGreen } from './asset-pixels.mjs';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';

export const SCENE_MASTER_NAMES = Object.freeze([
  'county-council-ballroom.png',
  'midnight-call-in-studio.png',
  'palace-press-hall.png',
  'influencer-campaign-livestream.png',
  'modern-debate-studio.png',
  'modern-debate-studio-desks.png',
  'transition-era-television-studio.png',
  'transition-era-television-studio-desks.png',
]);
export const SCENE_VARIANT_SIZES = Object.freeze([
  Object.freeze({ width: 640, height: 360 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1920, height: 1080 }),
]);
export const SCENE_VARIANT_FORMATS = Object.freeze(['avif', 'webp']);
export const SCENE_BYTE_BUDGETS = Object.freeze({
  avif: 350 * 1024,
  webp: 500 * 1024,
});
export const REQUIRED_CROP_STRATEGY =
  'symmetric-horizontal-bleed-to-four-by-three-core';

const REQUIRED_CHARACTER_FOCAL_RECTANGLES = Object.freeze({
  leftGesture: Object.freeze({ x: 0.22, y: 0.18, width: 0.1, height: 0.18 }),
  rightGesture: Object.freeze({ x: 0.68, y: 0.18, width: 0.1, height: 0.18 }),
  leftTorsoAndProp: Object.freeze({ x: 0.14, y: 0.46, width: 0.12, height: 0.2 }),
  rightTorsoAndProp: Object.freeze({ x: 0.74, y: 0.46, width: 0.12, height: 0.2 }),
});
const REQUIRED_SAFE_RECTANGLES = Object.freeze({
  protectedTopBand: Object.freeze({ x: 0.125, y: 0, width: 0.75, height: 0.18 }),
  centralInteraction: Object.freeze({ x: 0.32, y: 0.18, width: 0.36, height: 0.76 }),
  lowerLeftAction: Object.freeze({ x: 0.125, y: 0.66, width: 0.115, height: 0.28 }),
  lowerRightAction: Object.freeze({ x: 0.76, y: 0.66, width: 0.115, height: 0.28 }),
});
const REQUIRED_CROP_CORE = Object.freeze({ x: 0.125, y: 0, width: 0.75, height: 1 });
const LEFT_DESK_FOCAL_RECTANGLE = Object.freeze({
  x: 0.26,
  y: 0.56,
  width: 0.06,
  height: 0.16,
});
const RIGHT_DESK_FOCAL_RECTANGLE = Object.freeze({
  x: 0.68,
  y: 0.56,
  width: 0.06,
  height: 0.16,
});

const expectedSceneIds = new Set(
  SCENE_MASTER_NAMES.map((fileName) => path.basename(fileName, '.png')),
);
const expectedVariantKeys = new Set(
  SCENE_VARIANT_SIZES.flatMap(({ width, height }) =>
    SCENE_VARIANT_FORMATS.map((format) => `${width}x${height}:${format}`),
  ),
);
const expectedSafeRectangleNames = [
  'protectedTopBand',
  'centralInteraction',
  'lowerLeftAction',
  'lowerRightAction',
];
const expectedFocalRectangleNames = [
  'leftGesture',
  'rightGesture',
  'leftTorsoAndProp',
  'rightTorsoAndProp',
  'moderatorFace',
  'leftDeskTopAndProps',
  'rightDeskTopAndProps',
];
const hashPattern = /^[a-f0-9]{64}$/u;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value, context) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context} must be a non-empty string.`);
  }
  return value;
}

function requiredNumber(value, context) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context} must be a finite number.`);
  }
  return value;
}

function requiredInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${context} must be a non-negative integer.`);
  }
  return value;
}

function requiredHash(value, context) {
  if (typeof value !== 'string' || !hashPattern.test(value)) {
    throw new Error(`${context} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function validateRatio(value, context) {
  const ratio = requiredNumber(value, context);
  if (ratio < 0 || ratio > 1) {
    throw new Error(`${context} must be between 0 and 1.`);
  }
  return ratio;
}

function validateRectangle(value, context) {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  const x = validateRatio(value.x, `${context}.x`);
  const y = validateRatio(value.y, `${context}.y`);
  const width = validateRatio(value.width, `${context}.width`);
  const height = validateRatio(value.height, `${context}.height`);
  if (width === 0 || height === 0) {
    throw new Error(`${context} must have a positive width and height.`);
  }
  if (x + width > 1 || y + height > 1) {
    throw new Error(`${context} must stay inside the normalized canvas.`);
  }
  return { x, y, width, height };
}

function validatePoint(value, context) {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return {
    x: validateRatio(value.x, `${context}.x`),
    y: validateRatio(value.y, `${context}.y`),
  };
}

function expectedLayer(id) {
  const isForeground = id.endsWith('-desks');
  return {
    isForeground,
    layerRole: isForeground ? 'foreground' : 'back',
    ownerId: isForeground ? id.slice(0, -'-desks'.length) : id,
  };
}

function expectedGeometry(id, identity) {
  const modern = identity.ownerId === 'modern-debate-studio';
  const hasModerator = modern || identity.ownerId === 'transition-era-television-studio';
  return {
    focalPoint: identity.isForeground
      ? { x: 0.5, y: 0.64 }
      : hasModerator ? { x: 0.5, y: 0.43 } : { x: 0.5, y: 0.5 },
    focalRectangles: {
      ...REQUIRED_CHARACTER_FOCAL_RECTANGLES,
      moderatorFace: identity.isForeground || !hasModerator
        ? null
        : {
            x: 0.46,
            y: 0.35,
            width: 0.08,
            height: 0.14,
          },
      leftDeskTopAndProps: identity.isForeground
        ? LEFT_DESK_FOCAL_RECTANGLE
        : null,
      rightDeskTopAndProps: identity.isForeground
        ? RIGHT_DESK_FOCAL_RECTANGLE
        : null,
    },
    sharedSafeRectangles: REQUIRED_SAFE_RECTANGLES,
    cropCore: REQUIRED_CROP_CORE,
  };
}

function assertExactGeometry(actual, expected, context) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `${context} must match the approved scene geometry: ${JSON.stringify(expected)}.`,
    );
  }
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

async function readJson(filePath) {
  let input;
  try {
    input = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Scene manifest is missing: ${filePath}.`, { cause: error });
  }
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Scene manifest is not valid JSON: ${filePath}.`, {
      cause: error,
    });
  }
}

async function assertFile(filePath, context) {
  let fileStats;
  try {
    fileStats = await lstat(filePath);
  } catch (error) {
    throw new Error(`${context} is missing: ${filePath}.`, { cause: error });
  }
  if (!fileStats.isFile()) {
    throw new Error(`${context} is not a regular file: ${filePath}.`);
  }
}

async function inspectRaster(filePath, format, width, height, context) {
  const input = await readFile(filePath);
  let metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch (error) {
    throw new Error(`${context} could not be decoded: ${filePath}.`, {
      cause: error,
    });
  }

  const expectedMediaType = `image/${format}`;
  const decodedFormat =
    format === 'avif' ? metadata.format === 'heif' : metadata.format === format;
  if (
    !decodedFormat ||
    metadata.mediaType !== expectedMediaType ||
    metadata.width !== width ||
    metadata.height !== height
  ) {
    throw new Error(
      `${context} must decode as ${format} at exactly ${width}x${height}; ` +
        `found ${metadata.mediaType ?? metadata.format ?? 'unknown'} ` +
        `${metadata.width ?? 'unknown'}x${metadata.height ?? 'unknown'}.`,
    );
  }
  return { input, metadata };
}

async function inspectAlpha(input, isForeground, context) {
  let decoded;
  try {
    decoded = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new Error(`${context} alpha channel could not be decoded.`, {
      cause: error,
    });
  }
  if (decoded.info.channels !== 4) {
    throw new Error(`${context} did not decode as RGBA.`);
  }

  let transparentCount = 0;
  let partialAlphaCount = 0;
  for (let offset = 3; offset < decoded.data.length; offset += 4) {
    const alpha = decoded.data[offset];
    if (isVisibleChromaGreen(decoded.data, offset - 3)) {
      throw new Error(`${context} retains visible chroma-green pixels.`);
    }
    if (alpha === 0) transparentCount += 1;
    else if (alpha < 255) partialAlphaCount += 1;
  }

  if (!isForeground) {
    if (transparentCount !== 0 || partialAlphaCount !== 0) {
      throw new Error(`${context} back layer must be fully opaque.`);
    }
    return;
  }

  const { width, height } = decoded.info;
  const cornerOffsets = [
    3,
    (width - 1) * 4 + 3,
    (height - 1) * width * 4 + 3,
    (width * height - 1) * 4 + 3,
  ];
  if (transparentCount === 0 || partialAlphaCount === 0) {
    throw new Error(
      `${context} foreground must contain transparent pixels and partial-alpha edges.`,
    );
  }
  if (cornerOffsets.some((offset) => decoded.data[offset] !== 0)) {
    throw new Error(`${context} foreground must have transparent outer corners.`);
  }
}

async function listVariantFiles(variantsRoot) {
  await assertFileOrDirectory(variantsRoot);
  const files = [];
  async function walk(directory, relativeDirectory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      } else {
        throw new Error(
          `Scene variant entry is not a regular file or directory: ${entryPath}.`,
        );
      }
    }
  }
  await walk(variantsRoot, 'variants');
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

async function assertFileOrDirectory(entryPath) {
  let entryStats;
  try {
    entryStats = await lstat(entryPath);
  } catch (error) {
    throw new Error(`Scene variants directory is missing: ${entryPath}.`, {
      cause: error,
    });
  }
  if (!entryStats.isDirectory()) {
    throw new Error(`Scene variants path is not a directory: ${entryPath}.`);
  }
}

async function assertMasterSet(sceneRoot) {
  const entries = await readdir(sceneRoot, { withFileTypes: true });
  const actual = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const expected = [...SCENE_MASTER_NAMES].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Scene master set must contain exactly: ${expected.join(', ')}. ` +
        `Found: ${actual.join(', ') || 'none'}.`,
    );
  }
}

function assertDeclaredPathIsUnique(declaredPaths, relativePath, context) {
  if (declaredPaths.has(relativePath)) {
    throw new Error(`${context} uses duplicate asset path "${relativePath}".`);
  }
  declaredPaths.add(relativePath);
}

function validateRectangles(value, names, context, nullable) {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  const nullableNames = new Set([
    'moderatorFace',
    'leftDeskTopAndProps',
    'rightDeskTopAndProps',
  ]);
  for (const name of names) {
    if (!(name in value)) {
      throw new Error(`${context} is missing required rectangle "${name}".`);
    }
    if (nullable && value[name] === null) {
      if (!nullableNames.has(name)) {
        throw new Error(`${context}.${name} must be a rectangle.`);
      }
      continue;
    }
    validateRectangle(value[name], `${context}.${name}`);
  }
}

function validateAssetShape(asset, index, declaredPaths) {
  const context = `Scene manifest asset ${index}`;
  if (!isRecord(asset)) throw new Error(`${context} must be an object.`);
  const id = requiredString(asset.id, `${context} is missing an ID`);
  if (!expectedSceneIds.has(id)) {
    throw new Error(`Scene manifest contains unsupported scene asset ID "${id}".`);
  }
  if (asset.ownerType !== 'scene') {
    throw new Error(`Scene asset "${id}" must have ownerType scene.`);
  }
  const identity = expectedLayer(id);
  if (asset.ownerId !== identity.ownerId) {
    throw new Error(
      `Scene asset "${id}" must have ownerId "${identity.ownerId}".`,
    );
  }
  if (asset.layerRole !== identity.layerRole) {
    throw new Error(
      `Scene asset "${id}" must have layerRole "${identity.layerRole}".`,
    );
  }
  requiredString(asset.sourceDescription, `Scene asset "${id}" sourceDescription`);
  requiredString(asset.licenseIdentifier, `Scene asset "${id}" licenseIdentifier`);

  if (!isRecord(asset.source)) {
    throw new Error(`Scene asset "${id}" is missing its source.`);
  }
  const sourcePath = requiredString(
    asset.source.path,
    `Scene asset "${id}" source.path`,
  );
  const expectedSourcePath = `${id}.png`;
  if (sourcePath !== expectedSourcePath) {
    throw new Error(
      `Scene asset "${id}" source.path must be "${expectedSourcePath}".`,
    );
  }
  assertDeclaredPathIsUnique(declaredPaths, sourcePath, `Scene asset "${id}" source`);
  if (asset.source.format !== 'png') {
    throw new Error(`Scene asset "${id}" source must use PNG format.`);
  }
  if (asset.source.width !== 1920 || asset.source.height !== 1080) {
    throw new Error(`Scene asset "${id}" source must be exactly 1920x1080.`);
  }
  requiredInteger(asset.source.bytes, `Scene asset "${id}" source.bytes`);
  requiredHash(asset.source.sha256, `Scene asset "${id}" source.sha256`);

  validatePoint(asset.focalPoint, `Scene asset "${id}" focalPoint`);
  validateRectangles(
    asset.focalRectangles,
    expectedFocalRectangleNames,
    `Scene asset "${id}" focalRectangles`,
    true,
  );
  const focalRectangles = asset.focalRectangles;
  if (identity.isForeground && focalRectangles.moderatorFace !== null) {
    throw new Error(`Scene asset "${id}" foreground moderatorFace must be null.`);
  }
  if (!identity.isForeground && ['modern-debate-studio', 'transition-era-television-studio'].includes(identity.ownerId) && focalRectangles.moderatorFace === null) {
    throw new Error(`Scene asset "${id}" back moderatorFace is required.`);
  }
  for (const name of ['leftDeskTopAndProps', 'rightDeskTopAndProps']) {
    const value = focalRectangles[name];
    if (identity.isForeground && value === null) {
      throw new Error(`Scene asset "${id}" foreground ${name} is required.`);
    }
    if (!identity.isForeground && value !== null) {
      throw new Error(`Scene asset "${id}" back ${name} must be null.`);
    }
  }

  validateRectangles(
    asset.sharedSafeRectangles,
    expectedSafeRectangleNames,
    `Scene asset "${id}" sharedSafeRectangles`,
    false,
  );
  if (!isRecord(asset.crop)) {
    throw new Error(`Scene asset "${id}" is missing its crop.`);
  }
  validateRectangle(asset.crop.core, `Scene asset "${id}" crop.core`);
  if (asset.crop.strategy !== REQUIRED_CROP_STRATEGY) {
    throw new Error(
      `Scene asset "${id}" crop.strategy must be "${REQUIRED_CROP_STRATEGY}".`,
    );
  }

  const geometry = expectedGeometry(id, identity);
  assertExactGeometry(
    asset.focalPoint,
    geometry.focalPoint,
    `Scene asset "${id}" focalPoint`,
  );
  assertExactGeometry(
    asset.focalRectangles,
    geometry.focalRectangles,
    `Scene asset "${id}" focalRectangles`,
  );
  assertExactGeometry(
    asset.sharedSafeRectangles,
    geometry.sharedSafeRectangles,
    `Scene asset "${id}" sharedSafeRectangles`,
  );
  assertExactGeometry(
    asset.crop.core,
    geometry.cropCore,
    `Scene asset "${id}" crop.core`,
  );

  if (!Array.isArray(asset.variants)) {
    throw new Error(`Scene asset "${id}" is missing its variants.`);
  }
  const seenVariantKeys = new Set();
  const variants = [];
  for (const [variantIndex, rawVariant] of asset.variants.entries()) {
    const context = `Scene asset "${id}" variant ${variantIndex}`;
    if (!isRecord(rawVariant)) throw new Error(`${context} must be an object.`);
    const variantPath = requiredString(rawVariant.path, `${context}.path`);
    if (declaredPaths.has(variantPath)) {
      throw new Error(`${context} uses duplicate asset path "${variantPath}".`);
    }
    const format = rawVariant.format;
    if (!SCENE_VARIANT_FORMATS.includes(format)) {
      throw new Error(`${context} has unsupported format "${String(format)}".`);
    }
    const width = requiredInteger(rawVariant.width, `${context}.width`);
    const height = requiredInteger(rawVariant.height, `${context}.height`);
    const size = SCENE_VARIANT_SIZES.find(
      (candidate) => candidate.width === width && candidate.height === height,
    );
    if (!size) {
      throw new Error(
        `${context} has unsupported dimensions ${width}x${height}; ` +
          'expected 640x360, 1280x720, or 1920x1080.',
      );
    }
    const key = `${width}x${height}:${format}`;
    if (seenVariantKeys.has(key)) {
      throw new Error(`${context} duplicates variant ${key}.`);
    }
    seenVariantKeys.add(key);
    const expectedPath = `variants/${id}-${width}x${height}.${format}`;
    if (variantPath !== expectedPath) {
      throw new Error(
        `${context}.path must be "${expectedPath}" for its ID, size, and format.`,
      );
    }
    assertDeclaredPathIsUnique(declaredPaths, variantPath, context);
    const bytes = requiredInteger(rawVariant.bytes, `${context}.bytes`);
    if (bytes > SCENE_BYTE_BUDGETS[format]) {
      throw new Error(
        `${context} exceeds the ${format.toUpperCase()} byte budget of ` +
          `${SCENE_BYTE_BUDGETS[format]}.`,
      );
    }
    requiredString(rawVariant.sha256, `${context}.sha256`);
    requiredHash(rawVariant.sha256, `${context}.sha256`);
    const quality = requiredNumber(rawVariant.quality, `${context}.quality`);
    if (quality < 1 || quality > 100) {
      throw new Error(`${context}.quality must be between 1 and 100.`);
    }
    variants.push({
      context,
      format,
      height,
      id,
      path: variantPath,
      rawVariant,
      width,
    });
  }

  const missingVariantKeys = [...expectedVariantKeys].filter(
    (key) => !seenVariantKeys.has(key),
  );
  if (missingVariantKeys.length > 0) {
    throw new Error(
      `Scene asset "${id}" is missing variants: ${missingVariantKeys.join(', ')}.`,
    );
  }
  if (variants.length !== expectedVariantKeys.size) {
    throw new Error(
      `Scene asset "${id}" must declare exactly ${expectedVariantKeys.size} variants.`,
    );
  }
  return { id, identity, sourcePath, variants };
}

async function validateAssetFiles(sceneRoot, assetRecords) {
  const declaredVariantPaths = new Set(
    assetRecords.flatMap((asset) => asset.variants.map((variant) => variant.path)),
  );
  const actualVariantPaths = new Set(
    await listVariantFiles(path.join(sceneRoot, 'variants')),
  );
  for (const declaredPath of declaredVariantPaths) {
    if (!actualVariantPaths.has(declaredPath)) {
      throw new Error(`Declared scene variant file is missing: ${declaredPath}.`);
    }
  }
  for (const actualPath of actualVariantPaths) {
    if (!declaredVariantPaths.has(actualPath)) {
      throw new Error(`Extra scene variant file is not declared: ${actualPath}.`);
    }
  }

  for (const asset of assetRecords) {
    const sourcePath = path.join(sceneRoot, asset.sourcePath);
    await assertFile(sourcePath, `Scene asset "${asset.id}" source file`);
    const source = await inspectRaster(
      sourcePath,
      'png',
      1920,
      1080,
      `Scene asset "${asset.id}" source`,
    );
    const sourceRecord = asset.manifestAsset.source;
    if (sourceRecord.bytes !== source.input.length) {
      throw new Error(
        `Scene asset "${asset.id}" source byte count does not match the file.`,
      );
    }
    if (sourceRecord.sha256 !== sha256(source.input)) {
      throw new Error(
        `Scene asset "${asset.id}" source SHA-256 does not match the file.`,
      );
    }
    await inspectAlpha(source.input, asset.identity.isForeground, `Scene asset "${asset.id}" source`);

    for (const variant of asset.variants) {
      const variantPath = path.join(sceneRoot, variant.path);
      await assertFile(variantPath, `${variant.context} file`);
      const inspected = await inspectRaster(
        variantPath,
        variant.format,
        variant.width,
        variant.height,
        variant.context,
      );
      if (variant.rawVariant.bytes !== inspected.input.length) {
        throw new Error(`${variant.context} byte count does not match the file.`);
      }
      if (variant.rawVariant.sha256 !== sha256(inspected.input)) {
        throw new Error(`${variant.context} SHA-256 does not match the file.`);
      }
      await inspectAlpha(
        inspected.input,
        asset.identity.isForeground,
        variant.context,
      );
    }
  }
}

export async function validateSceneAssets({
  sceneRoot = path.resolve('src', 'assets', 'scenes'),
} = {}) {
  const resolvedRoot = path.resolve(sceneRoot);
  await assertMasterSet(resolvedRoot);
  const manifest = await readJson(path.join(resolvedRoot, 'scene-manifest.json'));
  if (!isRecord(manifest) || manifest.schemaVersion !== 1) {
    throw new Error('Scene manifest must declare schemaVersion 1.');
  }
  if (!Array.isArray(manifest.assets)) {
    throw new Error('Scene manifest must declare an assets array.');
  }
  if (manifest.assets.length !== SCENE_MASTER_NAMES.length) {
    throw new Error(
      `Scene manifest must contain exactly ${SCENE_MASTER_NAMES.length} assets.`,
    );
  }

  const ids = new Set();
  const declaredPaths = new Set();
  const assetRecords = [];
  for (const [index, asset] of manifest.assets.entries()) {
    const id = isRecord(asset) ? asset.id : undefined;
    if (typeof id === 'string' && ids.has(id)) {
      throw new Error(`Duplicate scene asset ID "${id}".`);
    }
    const record = validateAssetShape(asset, index, declaredPaths);
    ids.add(record.id);
    assetRecords.push({
      ...record,
      manifestAsset: asset,
    });
  }
  const missingIds = [...expectedSceneIds].filter((id) => !ids.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Scene manifest is missing scene asset IDs: ${missingIds.join(', ')}.`);
  }

  await validateAssetFiles(resolvedRoot, assetRecords);
  return manifest;
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const sceneRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  validateSceneAssets({ sceneRoot })
    .then((manifest) =>
      process.stdout.write(
        `Scene asset validation passed: ${manifest.assets.length} scene assets, ` +
          `${manifest.assets.length * SCENE_VARIANT_SIZES.length * SCENE_VARIANT_FORMATS.length} variants.\n`,
      ),
    )
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
