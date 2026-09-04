import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const SCENE_MASTER_NAMES = Object.freeze([
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
export const SCENE_BYTE_BUDGETS = Object.freeze({
  avif: 350 * 1024,
  webp: 500 * 1024,
});

const SOURCE_DESCRIPTION =
  'Original flat cel-shaded editorial-cartoon scene art created for Grand Transition.';
const LICENSE_IDENTIFIER = 'LicenseRef-Grand-Transition-Original';
const SHARED_SAFE_RECTANGLES = Object.freeze({
  protectedTopBand: Object.freeze({ x: 0.125, y: 0, width: 0.75, height: 0.18 }),
  centralInteraction: Object.freeze({ x: 0.32, y: 0.18, width: 0.36, height: 0.76 }),
  lowerLeftAction: Object.freeze({ x: 0.125, y: 0.66, width: 0.115, height: 0.28 }),
  lowerRightAction: Object.freeze({ x: 0.76, y: 0.66, width: 0.115, height: 0.28 }),
});
const CHARACTER_FOCAL_RECTANGLES = Object.freeze({
  leftGesture: Object.freeze({ x: 0.22, y: 0.18, width: 0.1, height: 0.18 }),
  rightGesture: Object.freeze({ x: 0.68, y: 0.18, width: 0.1, height: 0.18 }),
  leftTorsoAndProp: Object.freeze({ x: 0.14, y: 0.46, width: 0.12, height: 0.2 }),
  rightTorsoAndProp: Object.freeze({ x: 0.74, y: 0.46, width: 0.12, height: 0.2 }),
});
const LEFT_DESK = Object.freeze({ x: 0.26, y: 0.56, width: 0.06, height: 0.16 });
const RIGHT_DESK = Object.freeze({ x: 0.68, y: 0.56, width: 0.06, height: 0.16 });
const TRANSITION_MODERATOR = Object.freeze({ x: 0.26, y: 0.36, width: 0.06, height: 0.16 });
const MODERN_MODERATOR = Object.freeze({ x: 0.68, y: 0.36, width: 0.06, height: 0.16 });
const CROP = Object.freeze({
  core: Object.freeze({ x: 0.125, y: 0, width: 0.75, height: 1 }),
  strategy: 'symmetric-horizontal-bleed-to-four-by-three-core',
});

sharp.cache(false);
sharp.concurrency(1);

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function sceneIdentity(fileName) {
  const id = path.basename(fileName, '.png');
  const isForeground = id.endsWith('-desks');
  const ownerId = isForeground ? id.slice(0, -'-desks'.length) : id;
  const modern = ownerId === 'modern-debate-studio';
  return { id, isForeground, ownerId, modern };
}

function focalContract(identity) {
  return {
    focalPoint: identity.isForeground
      ? { x: 0.5, y: 0.64 }
      : { x: identity.modern ? 0.71 : 0.29, y: 0.44 },
    focalRectangles: {
      ...CHARACTER_FOCAL_RECTANGLES,
      moderatorFace: identity.isForeground
        ? null
        : identity.modern
          ? MODERN_MODERATOR
          : TRANSITION_MODERATOR,
      leftDeskTopAndProps: identity.isForeground ? LEFT_DESK : null,
      rightDeskTopAndProps: identity.isForeground ? RIGHT_DESK : null,
    },
  };
}

async function assertMasterSet(sceneRoot) {
  const entries = await readdir(sceneRoot, { withFileTypes: true });
  const actual = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.png')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const expected = [...SCENE_MASTER_NAMES].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Scene master set must contain exactly: ${expected.join(', ')}. Found: ${actual.join(', ') || 'none'}.`,
    );
  }
}

async function inspectMaster(filePath, identity) {
  const input = await readFile(filePath);
  const metadata = await sharp(input).metadata();
  if (metadata.format !== 'png' || metadata.width !== 1920 || metadata.height !== 1080) {
    throw new Error(`${filePath} must be a 1920x1080 PNG master.`);
  }
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${filePath} did not decode as RGBA.`);
  let transparentCount = 0;
  let partialAlphaCount = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3];
    if (alpha === 0) transparentCount += 1;
    else if (alpha < 255) partialAlphaCount += 1;
  }
  const cornerOffsets = [
    3,
    (metadata.width - 1) * 4 + 3,
    (metadata.height - 1) * metadata.width * 4 + 3,
    (metadata.width * metadata.height - 1) * 4 + 3,
  ];
  if (identity.isForeground) {
    if (transparentCount === 0 || partialAlphaCount === 0) {
      throw new Error(`${filePath} must contain transparent pixels and partial-alpha edges.`);
    }
    if (cornerOffsets.some((offset) => data[offset] !== 0)) {
      throw new Error(`${filePath} must have transparent outer corners.`);
    }
  } else if (transparentCount !== 0 || partialAlphaCount !== 0) {
    throw new Error(`${filePath} must be fully opaque.`);
  }
  return { input, sourceSha256: sha256(input), bytes: input.length };
}

const FORMAT_SETTINGS = Object.freeze({
  avif: Object.freeze({ qualities: [70, 66, 62, 58, 54, 50], effort: 6 }),
  webp: Object.freeze({ qualities: [86, 82, 78, 74, 70, 66], effort: 6 }),
});

async function encodeWithinBudget(input, size, format) {
  const settings = FORMAT_SETTINGS[format];
  for (const quality of settings.qualities) {
    let image = sharp(input).resize({
      width: size.width,
      height: size.height,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    });
    image =
      format === 'avif'
        ? image.avif({ quality, effort: settings.effort, chromaSubsampling: '4:4:4' })
        : image.webp({
            quality,
            effort: settings.effort,
            alphaQuality: 100,
            smartSubsample: false,
          });
    const output = await image.toBuffer();
    if (output.length <= SCENE_BYTE_BUDGETS[format]) return { output, quality };
  }
  throw new Error(
    `${format.toUpperCase()} ${size.width}x${size.height} exceeds its ${SCENE_BYTE_BUDGETS[format]}-byte budget at all approved quality levels.`,
  );
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function installOutputs(sceneRoot, stagingRoot, manifestText) {
  const variantsPath = path.join(sceneRoot, 'variants');
  const manifestPath = path.join(sceneRoot, 'scene-manifest.json');
  const nonce = `${process.pid}-${Date.now()}`;
  const variantsBackup = `${variantsPath}.backup-${nonce}`;
  const manifestBackup = `${manifestPath}.backup-${nonce}`;
  const stagedManifest = path.join(stagingRoot, 'scene-manifest.json');
  await writeFile(stagedManifest, manifestText);
  const hadVariants = await pathExists(variantsPath);
  const hadManifest = await pathExists(manifestPath);
  try {
    if (hadVariants) await rename(variantsPath, variantsBackup);
    if (hadManifest) await rename(manifestPath, manifestBackup);
    await rename(path.join(stagingRoot, 'variants'), variantsPath);
    await rename(stagedManifest, manifestPath);
    await Promise.all([
      hadVariants ? rm(variantsBackup, { recursive: true, force: true }) : undefined,
      hadManifest ? rm(manifestBackup, { force: true }) : undefined,
    ]);
  } catch (error) {
    await rm(variantsPath, { recursive: true, force: true });
    await rm(manifestPath, { force: true });
    if (hadVariants && (await pathExists(variantsBackup))) await rename(variantsBackup, variantsPath);
    if (hadManifest && (await pathExists(manifestBackup))) await rename(manifestBackup, manifestPath);
    throw error;
  }
}

export async function buildSceneAssets({ sceneRoot = path.resolve('src', 'assets', 'scenes') } = {}) {
  const resolvedRoot = path.resolve(sceneRoot);
  await assertMasterSet(resolvedRoot);

  const masters = [];
  for (const fileName of SCENE_MASTER_NAMES) {
    const identity = sceneIdentity(fileName);
    const inspected = await inspectMaster(path.join(resolvedRoot, fileName), identity);
    masters.push({ fileName, identity, ...inspected });
  }

  const stagingRoot = await mkdtemp(path.join(resolvedRoot, '.scene-build-'));
  const variantsRoot = path.join(stagingRoot, 'variants');
  await mkdir(variantsRoot);
  try {
    const assets = [];
    for (const master of masters) {
      const variants = [];
      for (const size of SCENE_VARIANT_SIZES) {
        for (const format of ['avif', 'webp']) {
          const { output, quality } = await encodeWithinBudget(master.input, size, format);
          const outputName = `${master.identity.id}-${size.width}x${size.height}.${format}`;
          await writeFile(path.join(variantsRoot, outputName), output);
          variants.push({
            path: `variants/${outputName}`,
            width: size.width,
            height: size.height,
            bytes: output.length,
            format,
            quality,
            sha256: sha256(output),
          });
        }
      }
      const focal = focalContract(master.identity);
      assets.push({
        id: master.identity.id,
        ownerType: 'scene',
        ownerId: master.identity.ownerId,
        layerRole: master.identity.isForeground ? 'foreground' : 'back',
        sourceDescription: SOURCE_DESCRIPTION,
        licenseIdentifier: LICENSE_IDENTIFIER,
        source: {
          path: master.fileName,
          sha256: master.sourceSha256,
          width: 1920,
          height: 1080,
          bytes: master.bytes,
          format: 'png',
        },
        ...focal,
        sharedSafeRectangles: SHARED_SAFE_RECTANGLES,
        crop: CROP,
        variants,
      });
    }
    const manifest = { schemaVersion: 1, assets };
    const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    await installOutputs(resolvedRoot, stagingRoot, manifestText);
    return manifest;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const sceneRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  buildSceneAssets({ sceneRoot })
    .then((manifest) => process.stdout.write(`Built ${manifest.assets.length} scene masters.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
