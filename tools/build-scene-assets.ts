import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const SOURCE_DESCRIPTION =
  'Original flat cel-shaded editorial-cartoon scene art created for Grand Transition.';
const FINAL_SCENE_SOURCE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries(
    [
      'county-council-ballroom',
      'midnight-call-in-studio',
      'palace-press-hall',
      'influencer-campaign-livestream',
    ].flatMap((id) => [
      [
        id,
        'Original flat cel-shaded editorial-cartoon scene generated with OpenAI gpt-image-2.5-flare at native 3840x2160. Text-only composite followed by reference edits for the deskless background. No upscaling.',
      ],
      [
        `${id}-foreground`,
        'Original flat cel-shaded editorial-cartoon desks from the same OpenAI gpt-image-2.5-flare native 3840x2160 opaque composite. Contour masks extract both desk groups, fitted to shared standing-desk coordinates; repository green-matte conversion supplies antialiased alpha. Native-alpha candidates were not used.',
      ],
    ]),
  ),
  'modern-debate-studio':
    'Original flat cel-shaded editorial-cartoon scene generated with OpenAI gpt-image-2.5-flare at native 3840x2160. A text-only composite was reference-edited to remove the standing desks and correct fictional moderator details while preserving the camera and set. The background was translated down 96 pixels without resampling, with top-edge continuation and lower-floor crop for moderator clearance. No upscaling.',
  'modern-debate-studio-desks':
    'Original flat cel-shaded editorial-cartoon desks reference-edited from the same OpenAI gpt-image-2.5-flare native 3840x2160 composite onto a green matte. The complete raster was translated down 161 pixels and each desk group was proportionally downsampled into codec-safe shared standing-desk coordinates. Repository green-matte conversion supplied antialiased alpha. No upscaling.',
  'transition-era-television-studio-desks':
    'Original flat cel-shaded editorial-cartoon desks generated text-only with OpenAI gpt-image-2.5-flare on a native 3840x2160 green-matte canvas. Complete tabletop and prop groups were proportionally downsampled and fitted into codec-safe shared standing-desk coordinates; only the lower front panels were vertically extended to the canvas edge. Repository green-matte conversion supplied antialiased alpha. No upscaling.',
});
const CIVIC_CYPHER_SOURCE_DESCRIPTION =
  'Original flat cel-shaded editorial-cartoon Romanian municipal boxing-ring cypher scene generated text-only with OpenAI gpt-image-2.5-flare at native 3840x2160, then reference-edited to clear the microphones. Original microphone artwork was contour-extracted, reduced, and composited at fixed clear positions with matching suspension cords. No upscaling.';
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
const MODERATOR = Object.freeze({ x: 0.46, y: 0.35, width: 0.08, height: 0.14 });
const CROP = Object.freeze({
  core: Object.freeze({ x: 0.125, y: 0, width: 0.75, height: 1 }),
  strategy: 'symmetric-horizontal-bleed-to-four-by-three-core',
});

export type SceneFormat = 'avif' | 'webp';
const SCENE_FORMATS: readonly SceneFormat[] = Object.freeze(['avif', 'webp']);
type SceneIdentity = ReturnType<typeof sceneIdentity>;
type SceneSize = Readonly<{ width: number; height: number }>;
export type SceneVariant = {
  path: string;
  width: number;
  height: number;
  bytes: number;
  format: SceneFormat;
  quality: number;
  sha256: string;
};
type SceneMaster = {
  fileName: string;
  identity: SceneIdentity;
  input: Buffer;
  sourceSha256: string;
  bytes: number;
};
type CachedVariant = SceneVariant & { output: Buffer };
type StoredSceneManifest = {
  schemaVersion: number;
  assets: {
    id: string;
    source?: {
      sha256: string;
      path: string;
      bytes: number;
      width: number;
      height: number;
      format: string;
    };
    variants: SceneVariant[];
  }[];
};

sharp.cache(false);
sharp.concurrency(1);

function sha256(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

function sceneIdentity(fileName: string) {
  const id = path.basename(fileName, '.png');
  const suffix = ['-desks', '-foreground'].find((candidate) => id.endsWith(candidate));
  const isForeground = suffix !== undefined;
  const ownerId = suffix ? id.slice(0, -suffix.length) : id;
  const modern = ownerId === 'modern-debate-studio';
  return { id, isForeground, ownerId, modern };
}

function focalContract(identity: SceneIdentity) {
  const hasModerator = ['modern-debate-studio', 'transition-era-television-studio'].includes(
    identity.ownerId,
  );
  return {
    focalPoint: identity.isForeground
      ? { x: 0.5, y: 0.64 }
      : hasModerator
        ? { x: 0.5, y: 0.43 }
        : { x: 0.5, y: 0.5 },
    focalRectangles: {
      ...CHARACTER_FOCAL_RECTANGLES,
      moderatorFace: identity.isForeground || !hasModerator ? null : MODERATOR,
      leftDeskTopAndProps: identity.isForeground ? LEFT_DESK : null,
      rightDeskTopAndProps: identity.isForeground ? RIGHT_DESK : null,
    },
  };
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
      `Scene master set must contain exactly: ${expected.join(', ')}. Found: ${actual.join(', ') || 'none'}.`,
    );
  }
}

async function inspectMaster(filePath: string, identity: SceneIdentity) {
  const input = await readFile(filePath);
  const metadata = await sharp(input).metadata();
  const size = sceneMasterSize(identity.id);
  if (
    metadata.format !== 'png' ||
    metadata.width !== size.width ||
    metadata.height !== size.height
  ) {
    throw new Error(`${filePath} must be a ${size.width}x${size.height} PNG master.`);
  }
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
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
    (size.width - 1) * 4 + 3,
    (size.height - 1) * size.width * 4 + 3,
    (size.width * size.height - 1) * 4 + 3,
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

async function encodeWithinBudget(input: Buffer, size: SceneSize, format: SceneFormat) {
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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function installOutputs(
  sceneRoot: string,
  stagingRoot: string,
  manifestText: string,
): Promise<void> {
  const variantsPath = path.join(sceneRoot, 'variants');
  const manifestPath = path.join(sceneRoot, 'scene-manifest.json');
  const nonce = `${process.pid}-${Date.now()}`;
  const variantsBackup = `${variantsPath}.backup-${nonce}`;
  const manifestBackup = `${manifestPath}.backup-${nonce}`;
  const stagedManifest = path.join(stagingRoot, 'scene-manifest.json');
  await writeFile(stagedManifest, manifestText);
  const hadVariants = await pathExists(variantsPath);
  const hadManifest = await pathExists(manifestPath);
  let variantsBackedUp = false;
  let manifestBackedUp = false;
  let variantsInstalled = false;
  let manifestInstalled = false;
  try {
    if (hadVariants) {
      await rename(variantsPath, variantsBackup);
      variantsBackedUp = true;
    }
    if (hadManifest) {
      await rename(manifestPath, manifestBackup);
      manifestBackedUp = true;
    }
    await rename(path.join(stagingRoot, 'variants'), variantsPath);
    variantsInstalled = true;
    await rename(stagedManifest, manifestPath);
    manifestInstalled = true;
  } catch (error) {
    if (variantsInstalled) await rm(variantsPath, { recursive: true, force: true });
    if (manifestInstalled) await rm(manifestPath, { force: true });
    if (variantsBackedUp) await rename(variantsBackup, variantsPath);
    if (manifestBackedUp) await rename(manifestBackup, manifestPath);
    throw error;
  }
  // The new package is complete. Cleanup failure must not roll it back.
  if (variantsBackedUp) await rm(variantsBackup, { recursive: true, force: true });
  if (manifestBackedUp) await rm(manifestBackup, { force: true });
}

function selectedAssetIds(only: unknown): Set<string> | null {
  if (only === undefined) return null;
  const ids = new Set(SCENE_MASTER_NAMES.map((name) => sceneIdentity(name).id));
  if (
    !Array.isArray(only) ||
    only.length === 0 ||
    only.some((id) => !ids.has(id)) ||
    new Set(only).size !== only.length
  ) {
    throw new Error('Selected scene IDs must be a non-empty list of distinct known asset IDs.');
  }
  return new Set(only as string[]);
}

async function verifiedCachedVariants(
  sceneRoot: string,
  masters: readonly SceneMaster[],
  selected: ReadonlySet<string>,
): Promise<Map<string, CachedVariant[]>> {
  const manifest = JSON.parse(
    await readFile(path.join(sceneRoot, 'scene-manifest.json'), 'utf8'),
  ) as StoredSceneManifest;
  const expectedIds = masters.map((master) => master.identity.id);
  if (
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length !== expectedIds.length ||
    new Set(manifest.assets.map((asset) => asset?.id)).size !== expectedIds.length ||
    manifest.assets.some((asset) => !expectedIds.includes(asset?.id))
  ) {
    throw new Error('Selective scene builds require a complete existing scene manifest.');
  }
  const cache = new Map<string, CachedVariant[]>();
  for (const master of masters) {
    const id = master.identity.id;
    if (selected.has(id)) continue;
    const asset = manifest.assets.find((entry) => entry.id === id)!;
    const size = sceneMasterSize(id);
    if (
      asset.source?.sha256 !== master.sourceSha256 ||
      asset.source.path !== master.fileName ||
      asset.source.bytes !== master.bytes ||
      asset.source.width !== size.width ||
      asset.source.height !== size.height ||
      asset.source.format !== 'png'
    ) {
      throw new Error(
        `Cached scene source "${id}" changed or has invalid metadata; select it for rebuilding.`,
      );
    }
    const expected = sceneVariantSizes(id).flatMap((variantSize) =>
      SCENE_FORMATS.map((format) => ({
        ...variantSize,
        format,
        path: `variants/${id}-${variantSize.width}x${variantSize.height}.${format}`,
      })),
    );
    if (
      !Array.isArray(asset.variants) ||
      asset.variants.length !== expected.length ||
      new Set(asset.variants.map((variant) => variant?.path)).size !== expected.length
    ) {
      throw new Error(`Cached scene "${id}" has an invalid variant inventory.`);
    }
    const variants: CachedVariant[] = [];
    for (const requirement of expected) {
      const variant = asset.variants.find((entry) => entry?.path === requirement.path);
      if (
        !variant ||
        variant.width !== requirement.width ||
        variant.height !== requirement.height ||
        variant.format !== requirement.format ||
        !FORMAT_SETTINGS[requirement.format].qualities.includes(variant.quality)
      ) {
        throw new Error(`Cached scene variant "${requirement.path}" has invalid metadata.`);
      }
      const output = await readFile(path.join(sceneRoot, requirement.path));
      const metadata = await sharp(output).metadata();
      const decoded = await sharp(output).raw().toBuffer({ resolveWithObject: true });
      if (
        output.length !== variant.bytes ||
        output.length > SCENE_BYTE_BUDGETS[requirement.format] ||
        sha256(output) !== variant.sha256 ||
        metadata.width !== requirement.width ||
        metadata.height !== requirement.height ||
        decoded.info.width !== requirement.width ||
        decoded.info.height !== requirement.height ||
        metadata.format !== (requirement.format === 'avif' ? 'heif' : 'webp') ||
        (requirement.format === 'avif' && metadata.compression !== 'av1')
      ) {
        throw new Error(
          `Cached scene variant "${requirement.path}" failed byte, hash, dimension, or format validation.`,
        );
      }
      variants.push({
        ...requirement,
        bytes: output.length,
        quality: variant.quality,
        sha256: sha256(output),
        output,
      });
    }
    cache.set(id, variants);
  }
  return cache;
}

export async function buildSceneAssets({
  sceneRoot = path.resolve('src', 'assets', 'scenes'),
  only,
}: { sceneRoot?: string; only?: readonly string[] } = {}) {
  const selected = selectedAssetIds(only);
  const resolvedRoot = path.resolve(sceneRoot);
  await assertMasterSet(resolvedRoot);

  const masters: SceneMaster[] = [];
  for (const fileName of SCENE_MASTER_NAMES) {
    const identity = sceneIdentity(fileName);
    const inspected = await inspectMaster(path.join(resolvedRoot, fileName), identity);
    if (
      replacementBaseline.assets.some(
        (entry) => entry.file === fileName && entry.sha256 === inspected.sourceSha256,
      )
    ) {
      throw new Error(`Scene source "${fileName}" retains its replaced baseline source hash.`);
    }
    masters.push({ fileName, identity, ...inspected });
  }

  const cached = selected
    ? await verifiedCachedVariants(resolvedRoot, masters, selected)
    : new Map<string, CachedVariant[]>();
  const stagingRoot = await mkdtemp(path.join(resolvedRoot, '.scene-build-'));
  const variantsRoot = path.join(stagingRoot, 'variants');
  await mkdir(variantsRoot);
  try {
    const assets = [];
    for (const master of masters) {
      const variants: SceneVariant[] = [];
      for (const size of sceneVariantSizes(master.identity.id)) {
        for (const format of SCENE_FORMATS) {
          const reused = cached
            .get(master.identity.id)
            ?.find((variant) => variant.width === size.width && variant.format === format);
          const { output, quality } =
            reused ?? (await encodeWithinBudget(master.input, size, format));
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
        sourceDescription:
          master.identity.id === 'civic-cypher-boxing-ring'
            ? CIVIC_CYPHER_SOURCE_DESCRIPTION
            : (FINAL_SCENE_SOURCE_DESCRIPTIONS[master.identity.id] ??
              (master.identity.id === 'transition-era-television-studio'
                ? 'Original flat cel-shaded editorial-cartoon background generated from text only with the OpenAI API, gpt-image-2.5-sunburst, high quality, at native 3840x2160. Background shifted down 72 pixels with dark top-edge continuation and lower-floor crop for moderator clearance. No image references or upscaling. Runtime variants derive from this master.'
                : SOURCE_DESCRIPTION)),
        licenseIdentifier: LICENSE_IDENTIFIER,
        source: {
          path: master.fileName,
          sha256: master.sourceSha256,
          ...sceneMasterSize(master.identity.id),
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
  const args = process.argv.slice(2);
  const sceneRoot = args[0] && !args[0].startsWith('--') ? path.resolve(args.shift()!) : undefined;
  const validOptions = args.length === 0 || (args.length === 2 && args[0] === '--only');
  const only = args.length === 0 ? undefined : args[1]?.split(',');
  Promise.resolve()
    .then(() => {
      if (!validOptions)
        throw new Error('Use build-scene-assets.ts [scene-root] [--only id1,id2].');
      return buildSceneAssets({ sceneRoot, only });
    })
    .then((manifest) => process.stdout.write(`Built ${manifest.assets.length} scene masters.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
