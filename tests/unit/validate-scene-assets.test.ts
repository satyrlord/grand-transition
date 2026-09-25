import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import * as sceneValidator from '../../tools/validate-scene-assets.ts';
import * as sceneBuilder from '../../tools/build-scene-assets.ts';

const { SCENE_MASTER_NAMES, buildSceneAssets } = sceneBuilder as {
  SCENE_MASTER_NAMES: readonly string[];
  buildSceneAssets: (options: { sceneRoot: string }) => Promise<unknown>;
};
const { validateSceneAssets } = sceneValidator as {
  validateSceneAssets: (options: { sceneRoot: string }) => Promise<unknown>;
};

let fixture: string;
let baseManifestText: string;
let baseVariantBytes: Map<string, Buffer>;

async function writeMaster(root: string, fileName: string): Promise<void> {
  const width = 3840;
  const height = (width * 9) / 16;
  const filePath = path.join(root, fileName);
  if (!fileName.includes('-desks') && !fileName.includes('-foreground')) {
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
  const finalForeground = fileName.includes('-foreground');
  const left = Math.ceil(width * (finalForeground ? 0.13 : 0.26));
  const right = Math.ceil(width * (finalForeground ? 0.69 : 0.68));
  const top = Math.floor(height * (finalForeground ? 0.54 : 0.56));
  const bottom = finalForeground ? Math.floor(height * 0.98) : height;
  const objectWidth = Math.floor(width * (finalForeground ? 0.18 : 0.06));
  for (let y = top; y < bottom; y += 1) {
    for (const start of [left, right]) {
      for (let x = start; x < Math.min(width, start + objectWidth); x += 1) {
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
  return JSON.parse(await readFile(path.join(fixture, 'scene-manifest.json'), 'utf8')) as Record<
    string,
    unknown
  >;
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
  baseManifestText = await readFile(path.join(fixture, 'scene-manifest.json'), 'utf8');
  const variantNames = await readdir(path.join(fixture, 'variants'));
  baseVariantBytes = new Map(
    await Promise.all(
      variantNames.map(
        async (fileName) =>
          [fileName, await readFile(path.join(fixture, 'variants', fileName))] as const,
      ),
    ),
  );
  // Encode the complete 4K master set with the production codec settings.
}, 600_000);

afterEach(async () => {
  await restoreFixture();
});

afterAll(async () => {
  await rm(fixture, { force: true, recursive: true });
});

describe.sequential('scene asset manifest validator', () => {
  test('accepts a complete temporary scene package', async () => {
    await expect(validateSceneAssets({ sceneRoot: fixture })).resolves.toBeTruthy();
    // The fixture encodes the complete 4K master set first, so the validator shares the
    // processor with that work and with the other parallel test files.
  }, 120_000);

  test.each([
    'modern-debate-studio',
    'county-council-ballroom',
    'midnight-call-in-studio',
    'palace-press-hall',
    'influencer-campaign-livestream',
  ])('rejects a %s package without its 4K variant', async (sceneId) => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<{
      id: string;
      variants: Array<{ width: number; format: string }>;
    }>;
    const scene = assets.find((asset) => asset.id === sceneId)!;
    scene.variants = scene.variants.filter(
      (variant) => variant.width !== 3840 || variant.format !== 'avif',
    );
    await writeFile(path.join(fixture, 'scene-manifest.json'), JSON.stringify(manifest));
    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      'missing variants: 3840x2160:avif',
    );
  });

  test('rejects a missing license identifier', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    delete assets[0]!.licenseIdentifier;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(/licenseIdentifier/i);
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

  test('rejects reintroduction of every replaced studio source hash', async () => {
    const baseline = JSON.parse(
      await readFile('tools/scene-replacement-baseline.json', 'utf8'),
    ) as {
      assets: Array<{ file: string; sha256: string }>;
    };
    for (const replaced of baseline.assets) {
      const manifest = JSON.parse(baseManifestText) as {
        assets: Array<{ source: { path: string; sha256: string } }>;
      };
      manifest.assets.find((asset) => asset.source.path === replaced.file)!.source.sha256 =
        replaced.sha256;
      await writeFile(path.join(fixture, 'scene-manifest.json'), JSON.stringify(manifest));
      await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
        /replaced baseline source hash/u,
      );
    }
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
    const rectangles = assets[0]!.sharedSafeRectangles as Record<string, Record<string, unknown>>;
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

  test.each([
    ['county-council-ballroom-foreground', 'ownerId', 'county-council-ballroom-foreground'],
    ['county-council-ballroom-foreground', 'layerRole', 'back'],
    ['modern-debate-studio-desks', 'ownerId', 'modern-debate-studio-desks'],
    ['modern-debate-studio-desks', 'layerRole', 'back'],
  ] as const)('rejects invalid %s %s ownership metadata', async (id, field, value) => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    assets.find((asset) => asset.id === id)![field] = value;
    await writeFile(
      path.join(fixture, 'scene-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
      new RegExp(`${id}.*${field}`, 'iu'),
    );
  });

  test.each(
    (['source', 'variant'] as const).flatMap((target) =>
      (['central obstruction', 'truncated desks', 'left desk gap', 'right desk gap'] as const).map(
        (defect) => ({ target, defect }),
      ),
    ),
  )('rejects $defect in a final foreground $target', async ({ target, defect }) => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<{
      id: string;
      source: { path: string; bytes: number; sha256: string };
      variants: Array<{
        path: string;
        format: string;
        width: number;
        height: number;
        bytes: number;
        sha256: string;
      }>;
    }>;
    const asset = assets.find(({ id }) => id === 'county-council-ballroom-foreground')!;
    // Check the corrupted foreground before decoding unrelated scene packages.
    // Manifest order does not change validation requirements or the asset set.
    manifest.assets = [asset, ...assets.filter((candidate) => candidate !== asset)];
    const record =
      target === 'source'
        ? asset.source
        : asset.variants.find(({ format, width }) => format === 'webp' && width === 640)!;
    const filePath = path.join(fixture, record.path);
    const originalBytes = await readFile(filePath);
    try {
      const decoded = await sharp(originalBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { width, height } = decoded.info;
      if (defect === 'central obstruction') {
        const offset = (Math.floor(height * 0.5) * width + Math.floor(width * 0.5)) * 4;
        decoded.data[offset] = 120;
        decoded.data[offset + 1] = 52;
        decoded.data[offset + 2] = 28;
        decoded.data[offset + 3] = 255;
      } else {
        const left = defect === 'right desk gap' ? Math.floor(width * 0.77) : 0;
        const right = defect === 'left desk gap' ? Math.ceil(width * 0.23) : width;
        const top = Math.floor(height * (defect === 'truncated desks' ? 0.64 : 0.82));
        const bottom = defect === 'truncated desks' ? height : Math.ceil(height * 0.84);
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) decoded.data[(y * width + x) * 4 + 3] = 0;
        }
      }
      let image = sharp(decoded.data, { raw: decoded.info });
      image = target === 'source' ? image.png() : image.webp({ quality: 86, alphaQuality: 100 });
      const bytes = await image.toBuffer();
      await writeFile(filePath, bytes);
      record.bytes = bytes.length;
      record.sha256 = createHash('sha256').update(bytes).digest('hex');
      await writeFile(
        path.join(fixture, 'scene-manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(
        defect === 'central obstruction'
          ? /centralInteraction.*visible alpha/iu
          : new RegExp(
              `${defect === 'right desk gap' ? 'right' : 'left'}DeskFront.*incomplete`,
              'iu',
            ),
      );
    } finally {
      if (target === 'source') await writeFile(filePath, originalBytes);
    }
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

    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow(/missing variants/i);
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

test.each(['avif', 'webp'] as const)(
  'rejects visible chroma green in a hash-valid %s variant',
  async (format) => {
    const manifest = await readManifest();
    const asset = (
      manifest.assets as Array<{
        variants: Array<{
          format: string;
          path: string;
          width: number;
          height: number;
          bytes: number;
          sha256: string;
        }>;
      }>
    )[0]!;
    const variant = asset.variants.find((entry) => entry.format === format)!;
    const image = sharp({
      create: {
        width: variant.width,
        height: variant.height,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    });
    const bytes = await (format === 'avif' ? image.avif() : image.webp()).toBuffer();
    await writeFile(path.join(fixture, variant.path), bytes);
    variant.bytes = bytes.length;
    variant.sha256 = createHash('sha256').update(bytes).digest('hex');
    await writeFile(path.join(fixture, 'scene-manifest.json'), JSON.stringify(manifest));
    await expect(validateSceneAssets({ sceneRoot: fixture })).rejects.toThrow('chroma-green');
  },
);
