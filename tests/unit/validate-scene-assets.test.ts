import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'vitest';
// @ts-expect-error The production image validator is a native ECMAScript module.
import * as sceneValidator from '../../tools/validate-scene-assets.mjs';
// @ts-expect-error The production image builder is a native ECMAScript module.
import * as sceneBuilder from '../../tools/build-scene-assets.mjs';

const {
  SCENE_MASTER_NAMES,
  buildSceneAssets,
} = sceneBuilder as {
  SCENE_MASTER_NAMES: readonly string[];
  buildSceneAssets: (options: { sceneRoot: string }) => Promise<unknown>;
};
const { validateSceneAssets } = sceneValidator as {
  validateSceneAssets: (options: { sceneRoot: string }) => Promise<unknown>;
};

const width = 1920;
const height = 1080;
let fixture: string;
let baseManifestText: string;
let baseVariantBytes: Map<string, Buffer>;

async function writeMaster(root: string, fileName: string): Promise<void> {
  const filePath = path.join(root, fileName);
  if (!fileName.includes('-desks')) {
    await sharp({
      create: {
        background: { b: 52, g: 35, r: 18 },
        channels: 3,
        height,
        width,
      },
    })
      .png()
      .toFile(filePath);
    return;
  }

  const pixels = Buffer.alloc(width * height * 4);
  const left = Math.floor(width * 0.26);
  const right = Math.floor(width * 0.68);
  const top = Math.floor(height * 0.56);
  for (let y = top; y < height; y += 1) {
    for (const start of [left, right]) {
      for (let x = start; x < start + Math.floor(width * 0.06); x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 120;
        pixels[offset + 1] = 52;
        pixels[offset + 2] = 28;
        pixels[offset + 3] = y === top || x === start ? 128 : 255;
      }
    }
  }
  await sharp(pixels, { raw: { channels: 4, height, width } })
    .png()
    .toFile(filePath);
}

async function writeMasterSet(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await Promise.all(SCENE_MASTER_NAMES.map((fileName) => writeMaster(root, fileName)));
}

async function readManifest(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(fixture, 'scene-manifest.json'), 'utf8'),
  ) as Record<string, unknown>;
}

async function restoreFixture(): Promise<void> {
  await writeFile(path.join(fixture, 'scene-manifest.json'), baseManifestText);
  const variantsRoot = path.join(fixture, 'variants');
  await rm(variantsRoot, { force: true, recursive: true });
  await mkdir(variantsRoot);
  await Promise.all(
    [...baseVariantBytes].map(([fileName, bytes]) =>
      writeFile(path.join(fixture, 'variants', fileName), bytes),
    ),
  );
}

beforeAll(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-scene-validation-'));
  await writeMasterSet(fixture);
  await buildSceneAssets({ sceneRoot: fixture });
  baseManifestText = await readFile(
    path.join(fixture, 'scene-manifest.json'),
    'utf8',
  );
  const variantNames = await readdir(path.join(fixture, 'variants'));
  baseVariantBytes = new Map(
    await Promise.all(
      variantNames.map(async (fileName) => [
        fileName,
        await readFile(path.join(fixture, 'variants', fileName)),
      ] as const),
    ),
  );
}, 120_000);

afterEach(async () => {
  await restoreFixture();
});

afterAll(async () => {
  await rm(fixture, { force: true, recursive: true });
});

describe.sequential('scene asset manifest validator', () => {
  test('accepts a complete temporary scene package', async () => {
    await expect(validateSceneAssets({ sceneRoot: fixture })).resolves.toBeTruthy();
  });

  test('rejects a missing license identifier', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    delete assets[0]!.licenseIdentifier;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /licenseIdentifier/i,
    );
  });

  test('rejects a source hash that does not match the master file', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const source = assets[0]!.source as Record<string, unknown>;
    source.sha256 = '0'.repeat(64);
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /source SHA-256 does not match/i,
    );
  });

  test('rejects a variant hash that does not match the encoded file', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    variants[0]!.sha256 = '0'.repeat(64);
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /SHA-256 does not match/i,
    );
  });

  test('rejects a variant with unsupported dimensions', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    variants[0]!.width = 800;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /unsupported dimensions/i,
    );
  });

  test('rejects a variant with an unsupported format', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    variants[0]!.format = 'png';
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /unsupported format/i,
    );
  });

  test('rejects an out-of-range crop rectangle', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const crop = assets[0]!.crop as Record<string, unknown>;
    const core = crop.core as Record<string, unknown>;
    core.x = -0.01;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /crop\.core\.x.*between 0 and 1/i,
    );
  });

  test('rejects normalized crop geometry that differs from the approved core', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const crop = assets[0]!.crop as Record<string, unknown>;
    const core = crop.core as Record<string, unknown>;
    core.width = 0.74;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /crop\.core must match the approved scene geometry/iu,
    );
  });

  test('rejects normalized safe geometry that differs from the approved rectangles', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const rectangles = assets[0]!.sharedSafeRectangles as Record<
      string,
      Record<string, unknown>
    >;
    rectangles.centralInteraction!.x = 0.31;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /sharedSafeRectangles must match the approved scene geometry/iu,
    );
  });

  test('rejects duplicate asset IDs', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    assets[1]!.id = assets[0]!.id;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /Duplicate scene asset ID/i,
    );
  });

  test('rejects duplicate declared asset paths', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const firstVariants = assets[0]!.variants as Array<Record<string, unknown>>;
    const secondVariants = assets[1]!.variants as Array<Record<string, unknown>>;
    secondVariants[0]!.path = firstVariants[0]!.path;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /duplicate asset path/i,
    );
  });

  test('rejects a missing variant record', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    variants.pop();
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /missing variants/i,
    );
  });

  test('rejects a missing variant file', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    const variantPath = variants[0]!.path as string;
    await rm(path.join(fixture, variantPath));

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /variant file is missing/i,
    );
  });

  test('rejects an extra variant file', async () => {
    await writeFile(path.join(fixture, 'variants', 'extra.webp'), Buffer.from('extra'));

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      /Extra scene variant file is not declared/i,
    );
  });
});


test.each(['avif', 'webp'] as const)('rejects visible chroma green in a hash-valid %s variant', async (format) => {
  const manifest = await readManifest();
  const asset = (manifest.assets as Array<{ variants: Array<{ format: string; path: string; width: number; height: number; bytes: number; sha256: string }> }>)[0]!;
  const variant = asset.variants.find((entry) => entry.format === format)!;
  const image = sharp({ create: { width: variant.width, height: variant.height, channels: 3, background: { r: 0, g: 255, b: 0 } } });
  const bytes = await (format === 'avif' ? image.avif() : image.webp()).toBuffer();
  await writeFile(path.join(fixture, variant.path), bytes);
  variant.bytes = bytes.length;
  variant.sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join(fixture, 'scene-manifest.json'), JSON.stringify(manifest));
  await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow('chroma-green');
});
