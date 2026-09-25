import {
  hasNativeAlphaProvenance,
  isVisibleChromaGreen,
  measureNativeAlphaTopology,
  NATIVE_ALPHA_MAX_CONTOUR_DISTANCE,
  NATIVE_ALPHA_MIN_CONTOUR_RATIO,
  NATIVE_ALPHA_MIN_OPACITY,
} from './asset-pixels.ts';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';
import replacementBaseline from './scene-replacement-baseline.json' with { type: 'json' };

export const SCENE_MASTER_NAMES = Object.freeze([
  'civic-cypher-boxing-ring.png',
  'county-council-ballroom.png',
  'county-council-ballroom-foreground.png',
  'midnight-call-in-studio.png',
  'midnight-call-in-studio-foreground.png',
  'palace-press-hall.png',
  'palace-press-hall-foreground.png',
  'influencer-campaign-livestream.png',
  'influencer-campaign-livestream-foreground.png',
  'modern-debate-studio.png',
  'modern-debate-studio-desks.png',
  'transition-era-television-studio.png',
  'transition-era-television-studio-desks.png',
]);
import { sceneMasterSize, sceneVariantSizes, SCENE_BYTE_BUDGETS } from './scene-resolution.ts';
export { SCENE_VARIANT_SIZES, SCENE_BYTE_BUDGETS } from './scene-resolution.ts';
type SceneFormat = 'avif' | 'webp';
type NormalizedRect = Readonly<{ x: number; y: number; width: number; height: number }>;
type AlphaOptions = Readonly<{
  nativeAlpha?: boolean;
  transparentRectangles?: readonly Readonly<{ name: string; rectangle: NormalizedRect }>[];
  occlusionRectangles?: readonly (NormalizedRect & Readonly<{ name: string }>)[];
}>;
type AssetRecord = ReturnType<typeof validateAssetShape> & {
  manifestAsset: { source: { width: number; height: number; bytes: number; sha256: string } };
};
export const SCENE_VARIANT_FORMATS: readonly SceneFormat[] = Object.freeze(['avif', 'webp']);
const isSceneFormat = (value: unknown): value is SceneFormat =>
  value === 'avif' || value === 'webp';
export const REQUIRED_CROP_STRATEGY = 'symmetric-horizontal-bleed-to-four-by-three-core';

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
const REQUIRED_FOREGROUND_CLEAR_RECTANGLES = Object.freeze(
  (['centralInteraction'] as const).map((name) =>
    Object.freeze({ name, rectangle: REQUIRED_SAFE_RECTANGLES[name] }),
  ),
);
const REQUIRED_FOREGROUND_OCCLUSION_RECTANGLES = Object.freeze([
  Object.freeze({ name: 'leftDeskFront', x: 0.18, y: 0.74, width: 0.04, height: 0.18 }),
  Object.freeze({ name: 'rightDeskFront', x: 0.78, y: 0.74, width: 0.04, height: 0.18 }),
]);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context} must be a non-empty string.`);
  }
  return value;
}

function requiredNumber(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context} must be a finite number.`);
  }
  return value;
}

function requiredInteger(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${context} must be a non-negative integer.`);
  }
  return value;
}

function requiredHash(value: unknown, context: string): string {
  if (typeof value !== 'string' || !hashPattern.test(value)) {
    throw new Error(`${context} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function validateRatio(value: unknown, context: string): number {
  const ratio = requiredNumber(value, context);
  if (ratio < 0 || ratio > 1) {
    throw new Error(`${context} must be between 0 and 1.`);
  }
  return ratio;
}

function validateRectangle(value: unknown, context: string): NormalizedRect {
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

function validatePoint(value: unknown, context: string) {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return {
    x: validateRatio(value.x, `${context}.x`),
    y: validateRatio(value.y, `${context}.y`),
  };
}

function expectedLayer(id: string) {
  const suffix = ['-desks', '-foreground'].find((candidate) => id.endsWith(candidate));
  const isForeground = suffix !== undefined;
  return {
    isForeground,
    layerRole: isForeground ? 'foreground' : 'back',
    ownerId: suffix ? id.slice(0, -suffix.length) : id,
  };
}

function expectedGeometry(identity: ReturnType<typeof expectedLayer>) {
  const modern = identity.ownerId === 'modern-debate-studio';
  const hasModerator = modern || identity.ownerId === 'transition-era-television-studio';
  return {
    focalPoint: identity.isForeground
      ? { x: 0.5, y: 0.64 }
      : hasModerator
        ? { x: 0.5, y: 0.43 }
        : { x: 0.5, y: 0.5 },
    focalRectangles: {
      ...REQUIRED_CHARACTER_FOCAL_RECTANGLES,
      moderatorFace:
        identity.isForeground || !hasModerator
          ? null
          : {
              x: 0.46,
              y: 0.35,
              width: 0.08,
              height: 0.14,
            },
      leftDeskTopAndProps: identity.isForeground ? LEFT_DESK_FOCAL_RECTANGLE : null,
      rightDeskTopAndProps: identity.isForeground ? RIGHT_DESK_FOCAL_RECTANGLE : null,
    },
    sharedSafeRectangles: REQUIRED_SAFE_RECTANGLES,
    cropCore: REQUIRED_CROP_CORE,
  };
}

function assertExactGeometry(actual: unknown, expected: unknown, context: string): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(
      `${context} must match the approved scene geometry: ${JSON.stringify(expected)}.`,
    );
  }
}

function sha256(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

async function readJson(filePath: string): Promise<unknown> {
  let input: string;
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

async function assertFile(filePath: string, context: string): Promise<void> {
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

async function inspectRaster(
  filePath: string,
  format: string,
  width: number,
  height: number,
  context: string,
) {
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
  const decodedFormat = format === 'avif' ? metadata.format === 'heif' : metadata.format === format;
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

export async function inspectAlpha(
  input: Buffer,
  isForeground: boolean,
  context: string,
  { nativeAlpha = false, transparentRectangles = [], occlusionRectangles = [] }: AlphaOptions = {},
): Promise<void> {
  let decoded;
  try {
    decoded = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  let nearOpaqueCount = 0;
  let nativeEdgeCount = 0;
  for (let offset = 3; offset < decoded.data.length; offset += 4) {
    const alpha = decoded.data[offset];
    if (!nativeAlpha && isVisibleChromaGreen(decoded.data, offset - 3)) {
      throw new Error(`${context} retains visible chroma-green pixels.`);
    }
    if (alpha >= NATIVE_ALPHA_MIN_OPACITY) nearOpaqueCount += 1;
    if (alpha > 0 && alpha < NATIVE_ALPHA_MIN_OPACITY) nativeEdgeCount += 1;
    if (alpha === 0) transparentCount += 1;
    else if (alpha < 255) partialAlphaCount += 1;
  }

  if (!isForeground) {
    if (transparentCount !== 0 || partialAlphaCount !== 0) {
      throw new Error(`${context} back layer must be fully opaque.`);
    }
    return;
  }

  if (
    nativeAlpha &&
    (nativeEdgeCount === 0 || nearOpaqueCount / (decoded.data.length / 4 - transparentCount) < 0.5)
  ) {
    throw new Error(
      `${context} must contain predominantly near-opaque native content and partial-alpha edges below ${NATIVE_ALPHA_MIN_OPACITY}.`,
    );
  }
  if (nativeAlpha) {
    const topology = measureNativeAlphaTopology(
      decoded.data,
      decoded.info.width,
      decoded.info.height,
    );
    if (topology.nontransparentBorderPixels > 0) {
      throw new Error(`${context} must have a fully transparent outer border.`);
    }
    if (
      topology.contourPartialAlphaPixels / topology.partialAlphaPixels <
      NATIVE_ALPHA_MIN_CONTOUR_RATIO
    ) {
      throw new Error(
        `${context} must keep at least ${NATIVE_ALPHA_MIN_CONTOUR_RATIO * 100}% of partial alpha within ` +
          `${NATIVE_ALPHA_MAX_CONTOUR_DISTANCE} pixels of near-opaque content.`,
      );
    }
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
  for (const { name, rectangle } of transparentRectangles) {
    const left = Math.max(0, Math.ceil(rectangle.x * width - 0.5));
    const right = Math.min(width, Math.ceil((rectangle.x + rectangle.width) * width - 0.5));
    const top = Math.max(0, Math.ceil(rectangle.y * height - 0.5));
    const bottom = Math.min(height, Math.ceil((rectangle.y + rectangle.height) * height - 0.5));
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        if (decoded.data[(y * width + x) * 4 + 3] !== 0) {
          throw new Error(
            `${context} must keep shared safe rectangle "${name}" fully transparent; ` +
              `found visible alpha at ${x},${y}.`,
          );
        }
      }
    }
  }
  for (const rectangle of occlusionRectangles) {
    const left = Math.ceil(rectangle.x * width - 0.5);
    const right = Math.ceil((rectangle.x + rectangle.width) * width - 0.5);
    const top = Math.ceil(rectangle.y * height - 0.5);
    const bottom = Math.ceil((rectangle.y + rectangle.height) * height - 0.5);
    for (let y = top; y < bottom; y += 1) {
      let covered = 0;
      for (let x = left; x < right; x += 1) {
        if (decoded.data[(y * width + x) * 4 + 3] >= NATIVE_ALPHA_MIN_OPACITY) covered += 1;
      }
      if (covered / (right - left) < 0.9) {
        throw new Error(
          `${context} must cover at least 90% of each ${rectangle.name} row with near-opaque pixels; row ${y} is incomplete.`,
        );
      }
    }
  }
}

async function listVariantFiles(variantsRoot: string): Promise<string[]> {
  await assertFileOrDirectory(variantsRoot);
  const files: string[] = [];
  async function walk(directory: string, relativeDirectory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      } else {
        throw new Error(`Scene variant entry is not a regular file or directory: ${entryPath}.`);
      }
    }
  }
  await walk(variantsRoot, 'variants');
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

async function assertFileOrDirectory(entryPath: string): Promise<void> {
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

async function assertMasterSet(sceneRoot: string): Promise<void> {
  const entries = await readdir(sceneRoot, { withFileTypes: true });
  const actual = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const expected = [...SCENE_MASTER_NAMES].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Scene master set must contain exactly: ${expected.join(', ')}. ` +
        `Found: ${actual.join(', ') || 'none'}.`,
    );
  }
}

function assertDeclaredPathIsUnique(
  declaredPaths: Set<string>,
  relativePath: string,
  context: string,
): void {
  if (declaredPaths.has(relativePath)) {
    throw new Error(`${context} uses duplicate asset path "${relativePath}".`);
  }
  declaredPaths.add(relativePath);
}

function validateRectangles(
  value: unknown,
  names: readonly string[],
  context: string,
  nullable: boolean,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  const nullableNames = new Set(['moderatorFace', 'leftDeskTopAndProps', 'rightDeskTopAndProps']);
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

function validateAssetShape(asset: unknown, index: number, declaredPaths: Set<string>) {
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
    throw new Error(`Scene asset "${id}" must have ownerId "${identity.ownerId}".`);
  }
  if (asset.layerRole !== identity.layerRole) {
    throw new Error(`Scene asset "${id}" must have layerRole "${identity.layerRole}".`);
  }
  requiredString(asset.sourceDescription, `Scene asset "${id}" sourceDescription`);
  requiredString(asset.licenseIdentifier, `Scene asset "${id}" licenseIdentifier`);

  const source = asset.source;
  if (!isRecord(source)) {
    throw new Error(`Scene asset "${id}" is missing its source.`);
  }
  const sourcePath = requiredString(source.path, `Scene asset "${id}" source.path`);
  const expectedSourcePath = `${id}.png`;
  if (sourcePath !== expectedSourcePath) {
    throw new Error(`Scene asset "${id}" source.path must be "${expectedSourcePath}".`);
  }
  assertDeclaredPathIsUnique(declaredPaths, sourcePath, `Scene asset "${id}" source`);
  if (source.format !== 'png') {
    throw new Error(`Scene asset "${id}" source must use PNG format.`);
  }
  const masterSize = sceneMasterSize(id);
  const variantSizes = sceneVariantSizes(id);
  const expectedVariantKeys = new Set(
    variantSizes.flatMap(({ width, height }) =>
      SCENE_VARIANT_FORMATS.map((format) => `${width}x${height}:${format}`),
    ),
  );
  if (source.width !== masterSize.width || source.height !== masterSize.height) {
    throw new Error(
      `Scene asset "${id}" source must be exactly ${masterSize.width}x${masterSize.height}.`,
    );
  }
  requiredInteger(source.bytes, `Scene asset "${id}" source.bytes`);
  const sourceSha256 = requiredHash(source.sha256, `Scene asset "${id}" source.sha256`);
  if (
    replacementBaseline.assets.some(
      (entry) => entry.file === sourcePath && entry.sha256 === sourceSha256,
    )
  ) {
    throw new Error(`Scene asset "${id}" retains its replaced baseline source hash.`);
  }

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
  if (
    !identity.isForeground &&
    ['modern-debate-studio', 'transition-era-television-studio'].includes(identity.ownerId) &&
    focalRectangles.moderatorFace === null
  ) {
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
    throw new Error(`Scene asset "${id}" crop.strategy must be "${REQUIRED_CROP_STRATEGY}".`);
  }

  const geometry = expectedGeometry(identity);
  assertExactGeometry(asset.focalPoint, geometry.focalPoint, `Scene asset "${id}" focalPoint`);
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
  assertExactGeometry(asset.crop.core, geometry.cropCore, `Scene asset "${id}" crop.core`);

  if (!Array.isArray(asset.variants)) {
    throw new Error(`Scene asset "${id}" is missing its variants.`);
  }
  const seenVariantKeys = new Set<string>();
  const variants: {
    context: string;
    format: SceneFormat;
    height: number;
    id: string;
    path: string;
    rawVariant: Record<string, unknown>;
    width: number;
  }[] = [];
  for (const [variantIndex, rawVariant] of asset.variants.entries()) {
    const context = `Scene asset "${id}" variant ${variantIndex}`;
    if (!isRecord(rawVariant)) throw new Error(`${context} must be an object.`);
    const variantPath = requiredString(rawVariant.path, `${context}.path`);
    if (declaredPaths.has(variantPath)) {
      throw new Error(`${context} uses duplicate asset path "${variantPath}".`);
    }
    const format = rawVariant.format;
    if (!isSceneFormat(format)) {
      throw new Error(`${context} has unsupported format "${String(format)}".`);
    }
    const width = requiredInteger(rawVariant.width, `${context}.width`);
    const height = requiredInteger(rawVariant.height, `${context}.height`);
    const size = variantSizes.find(
      (candidate) => candidate.width === width && candidate.height === height,
    );
    if (!size) {
      throw new Error(
        `${context} has unsupported dimensions ${width}x${height}; ` +
          `expected ${variantSizes.map((size) => `${size.width}x${size.height}`).join(', ')}.`,
      );
    }
    const key = `${width}x${height}:${format}`;
    if (seenVariantKeys.has(key)) {
      throw new Error(`${context} duplicates variant ${key}.`);
    }
    seenVariantKeys.add(key);
    const expectedPath = `variants/${id}-${width}x${height}.${format}`;
    if (variantPath !== expectedPath) {
      throw new Error(`${context}.path must be "${expectedPath}" for its ID, size, and format.`);
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

  const missingVariantKeys = [...expectedVariantKeys].filter((key) => !seenVariantKeys.has(key));
  if (missingVariantKeys.length > 0) {
    throw new Error(`Scene asset "${id}" is missing variants: ${missingVariantKeys.join(', ')}.`);
  }
  if (variants.length !== expectedVariantKeys.size) {
    throw new Error(
      `Scene asset "${id}" must declare exactly ${expectedVariantKeys.size} variants.`,
    );
  }
  return { id, identity, sourcePath, variants };
}

async function validateAssetFiles(
  sceneRoot: string,
  assetRecords: readonly AssetRecord[],
): Promise<void> {
  const declaredVariantPaths = new Set(
    assetRecords.flatMap((asset) => asset.variants.map((variant) => variant.path)),
  );
  const actualVariantPaths = new Set(await listVariantFiles(path.join(sceneRoot, 'variants')));
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
      asset.manifestAsset.source.width,
      asset.manifestAsset.source.height,
      `Scene asset "${asset.id}" source`,
    );
    const sourceRecord = asset.manifestAsset.source;
    if (sourceRecord.bytes !== source.input.length) {
      throw new Error(`Scene asset "${asset.id}" source byte count does not match the file.`);
    }
    if (sourceRecord.sha256 !== sha256(source.input)) {
      throw new Error(`Scene asset "${asset.id}" source SHA-256 does not match the file.`);
    }
    const alphaOptions: AlphaOptions = {
      nativeAlpha: hasNativeAlphaProvenance(source.input),
      transparentRectangles: asset.id.endsWith('-foreground')
        ? REQUIRED_FOREGROUND_CLEAR_RECTANGLES
        : [],
      occlusionRectangles: asset.id.endsWith('-foreground')
        ? REQUIRED_FOREGROUND_OCCLUSION_RECTANGLES
        : [],
    };
    await inspectAlpha(
      source.input,
      asset.identity.isForeground,
      `Scene asset "${asset.id}" source`,
      alphaOptions,
    );

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
        alphaOptions,
      );
    }
  }
}

export async function validateSceneAssets({
  sceneRoot = path.resolve('src', 'assets', 'scenes'),
}: { sceneRoot?: string } = {}) {
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
    throw new Error(`Scene manifest must contain exactly ${SCENE_MASTER_NAMES.length} assets.`);
  }

  const ids = new Set<string>();
  const declaredPaths = new Set<string>();
  const assetRecords: AssetRecord[] = [];
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
  return manifest as { assets: { variants: unknown[] }[] };
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const sceneRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  validateSceneAssets({ sceneRoot })
    .then((manifest) =>
      process.stdout.write(
        `Scene asset validation passed: ${manifest.assets.length} scene assets, ` +
          `${manifest.assets.reduce((count, asset) => count + asset.variants.length, 0)} variants.\n`,
      ),
    )
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
