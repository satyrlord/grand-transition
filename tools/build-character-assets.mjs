import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import baseline from './character-replacement-baseline.json' with { type: 'json' };

export const CHARACTER_MASTER_NAMES = Object.freeze(
  baseline.assets.map(({ file }) => file).toSorted((left, right) => left.localeCompare(right, 'en')),
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

async function encodeVariant(input, width, format) {
  const pipeline = sharp(input).resize(width, width, { fit: 'contain', kernel: sharp.kernel.lanczos3 });
  return format === 'avif'
    ? pipeline.avif({ effort: 8, quality: QUALITY.avif }).toBuffer()
    : pipeline.webp({ alphaQuality: 100, effort: 6, quality: QUALITY.webp, smartSubsample: true }).toBuffer();
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

async function mapWithConcurrency(values, concurrency, work) {
  const results = Array.from({ length: values.length });
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await work(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}

export async function buildCharacterAssets({
  characterRoot = path.resolve('src', 'assets', 'characters'),
  masterNames = CHARACTER_MASTER_NAMES,
} = {}) {
  const resolvedRoot = path.resolve(characterRoot);
  await assertMasterSet(resolvedRoot, masterNames);
  const temporaryRoot = await mkdtemp(
    path.join(resolvedRoot, '.character-assets-build-'),
  );
  const temporaryVariants = path.join(temporaryRoot, 'variants');
  await mkdir(temporaryVariants, { recursive: true });
  try {
    const assets = await mapWithConcurrency(
      masterNames,
      3,
      async (fileName) => {
      const id = assetId(fileName);
      const { input } = await readMaster(resolvedRoot, fileName);
      const variants = await Promise.all(
        CHARACTER_VARIANT_SIZES.flatMap((width) =>
          CHARACTER_VARIANT_FORMATS.map(async (format) => {
          const output = await encodeVariant(input, width, format);
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
            quality: QUALITY[format],
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
  const characterRoot = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  buildCharacterAssets({ characterRoot })
    .then((manifest) => process.stdout.write(`Built ${manifest.assets.length} character masters and ${manifest.assets.length * CHARACTER_VARIANT_SIZES.length * CHARACTER_VARIANT_FORMATS.length} variants.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
