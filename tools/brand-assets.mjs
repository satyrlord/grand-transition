import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const definitions = [
  { id: 'grand-transition-emblem', width: 1254, height: 1254, runtimeWidth: 640, runtimeHeight: 640, stem: 'grand-transition-emblem-640' },
  { id: 'title-proscenium-background', width: 1672, height: 941, runtimeWidth: 1672, runtimeHeight: 941, stem: 'title-proscenium-background' },
  { id: 'politburo-portrait-frame', width: 1086, height: 1448, runtimeWidth: 1086, runtimeHeight: 1448, stem: 'politburo-portrait-frame' },
];
const formats = ['avif', 'webp'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceDescription = 'Original editorial-cartoon interface art created for Grand Transition.';
const licenseIdentifier = 'LicenseRef-Grand-Transition-Original';
const crop = { x: 0, y: 0, width: 1, height: 1 };
const focalPoint = { x: 0.5, y: 0.5 };
const requireFact = (condition, message) => { if (!condition) throw new Error(message); };

export function validateBrandManifest(manifest) {
  requireFact(manifest?.schemaVersion === 1 && Array.isArray(manifest.assets) && manifest.assets.length === definitions.length,
    'Brand manifest must contain its three assets.');
  const seen = new Set();
  for (const asset of manifest.assets) {
    const definition = definitions.find(({ id }) => id === asset.id);
    requireFact(definition && !seen.has(asset.id), `Brand asset ${asset.id}: unknown or duplicate ID.`);
    seen.add(asset.id);
    requireFact(asset.ownerType === 'interface' && asset.ownerId === asset.id &&
      asset.sourceDescription === sourceDescription && asset.licenseIdentifier === licenseIdentifier,
    `${asset.id}: invalid owner, source description, or license.`);
    requireFact(JSON.stringify(asset.crop) === JSON.stringify(crop) && JSON.stringify(asset.focalPoint) === JSON.stringify(focalPoint),
      `${asset.id}: invalid crop or focal point.`);
    const expected = [{ path: definition.id + '.png', width: definition.width, height: definition.height, format: 'png' },
      ...formats.map((format) => ({ path: definition.stem + '.' + format, width: definition.runtimeWidth, height: definition.runtimeHeight, format }))];
    requireFact(Array.isArray(asset.variants) && asset.variants.length === 2, `${asset.id}: two runtime variants are required.`);
    const files = [asset.source, ...asset.variants];
    for (let index = 0; index < expected.length; index++) {
      const file = files[index];
      requireFact(file && Object.entries(expected[index]).every(([key, value]) => file[key] === value), `${asset.id}: invalid file path, dimensions, or format.`);
      requireFact(/^[a-f0-9]{64}$/u.test(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes > 0, `${file.path}: invalid hash or bytes.`);
      if (index > 0) requireFact(file.bytes <= (file.format === 'avif' ? 350 : 500) * 1024, `${file.path}: exceeds byte budget.`);
    }
  }
  for (const format of formats) {
    const bytes = manifest.assets.filter(({ id }) => id !== 'politburo-portrait-frame')
      .reduce((total, asset) => total + asset.variants.find((variant) => variant.format === format).bytes, 0);
    requireFact(bytes <= 300 * 1024, `Title ${format} package exceeds 300 KiB.`);
  }
  return manifest;
}

export async function buildBrandAssets(root = path.resolve('src/assets/brand')) {
  const outputs = [];
  const assets = [];
  for (const definition of definitions) {
    const sourcePath = definition.id + '.png';
    const input = await readFile(path.join(root, sourcePath));
    const metadata = await sharp(input).metadata();
    requireFact(metadata.format === 'png' && metadata.width === definition.width && metadata.height === definition.height,
      `${sourcePath}: unexpected master dimensions or format.`);
    const variants = [];
    for (const format of formats) {
      const pipeline = sharp(input).resize(definition.runtimeWidth, definition.runtimeHeight, { kernel: sharp.kernel.lanczos3 });
      const bytes = await (format === 'avif' ? pipeline.avif({ quality: 65, effort: 6 })
        : pipeline.webp({ quality: 78, alphaQuality: 100, effort: 6, smartSubsample: true })).toBuffer();
      const file = definition.stem + '.' + format;
      outputs.push({ file, bytes });
      variants.push({ path: file, width: definition.runtimeWidth, height: definition.runtimeHeight, format, bytes: bytes.length, sha256: hash(bytes) });
    }
    assets.push({ id: definition.id, ownerType: 'interface', ownerId: definition.id, sourceDescription, licenseIdentifier,
      source: { path: sourcePath, width: definition.width, height: definition.height, format: 'png', bytes: input.length, sha256: hash(input) },
      focalPoint, crop, variants });
  }
  const manifest = validateBrandManifest({ schemaVersion: 1, assets });
  // Validate every source and package before replacing any generated output.
  for (const { file, bytes } of outputs) await writeFile(path.join(root, file), bytes);
  await writeFile(path.join(root, 'brand-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export async function validateBrandAssets(root = path.resolve('src/assets/brand')) {
  const manifest = validateBrandManifest(JSON.parse(await readFile(path.join(root, 'brand-manifest.json'), 'utf8')));
  for (const asset of manifest.assets) {
    for (const file of [asset.source, ...asset.variants]) {
      const bytes = await readFile(path.join(root, file.path));
      const metadata = await sharp(bytes).metadata();
      const format = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format;
      requireFact(hash(bytes) === file.sha256 && bytes.length === file.bytes, `${file.path}: hash or byte size mismatch.`);
      requireFact(format === file.format && metadata.width === file.width && metadata.height === file.height, `${file.path}: decoded format or dimensions mismatch.`);
    }
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const operation = command === 'build' ? buildBrandAssets : command === 'validate' ? validateBrandAssets : undefined;
  if (!operation) throw new Error('Use brand-assets.mjs build or validate.');
  operation().then(() => console.log(`Brand asset ${command} passed: three masters and six variants.`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
