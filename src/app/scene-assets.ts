import sceneManifest from '../assets/scenes/scene-manifest.json' with {
  type: 'json',
};
import foundationSceneFallbackUrl from '../assets/brand/title-proscenium-background.webp';

const sceneVariantUrls = {
  ...import.meta.glob('../assets/scenes/variants/*.avif', {
    eager: true,
    import: 'default',
    query: '?url&no-inline',
  }),
  ...import.meta.glob('../assets/scenes/variants/*.webp', {
    eager: true,
    import: 'default',
    query: '?url&no-inline',
  }),
} as Record<string, string>;

const supportedVariantWidths = [640, 1280, 1920] as const;
const supportedVariantFormats = ['avif', 'webp'] as const;

export type SceneVariantFormat = (typeof supportedVariantFormats)[number];

export type SceneRectangle = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type ScenePoint = Readonly<{
  x: number;
  y: number;
}>;

export type SceneAssetVariant = Readonly<{
  path: string;
  width: number;
  height: number;
  format: SceneVariantFormat;
  url: string;
  src: string;
}>;

export type SceneAssetSource = Readonly<{
  format: SceneVariantFormat;
  mimeType: `image/${SceneVariantFormat}`;
  srcSet: string;
  srcset: string;
  fallbackUrl: string;
  variants: readonly SceneAssetVariant[];
}>;

type SceneAssetBase = Readonly<{
  id: string;
  ownerType: 'scene';
  ownerId: string;
  layerRole: 'back' | 'foreground';
  width: number;
  height: number;
  url: string;
  webp: SceneAssetSource;
}>;

export type SceneManifestAsset = SceneAssetBase & Readonly<{
  kind: 'manifest';
  width: 1920;
  height: 1080;
  avif: SceneAssetSource;
  sizes: typeof sceneImageSizes;
  focalPoint: ScenePoint;
  focalRectangles: Readonly<Record<string, SceneRectangle | null>>;
  sharedSafeRectangles: Readonly<Record<string, SceneRectangle>>;
  crop: Readonly<{
    core: SceneRectangle;
    strategy: string;
  }>;
}>;

export type SceneFallbackAsset = SceneAssetBase & Readonly<{
  kind: 'fallback';
  width: 1672;
  height: 941;
  avif: null;
  sizes: '100vw';
}>;

export type SceneAsset = SceneManifestAsset | SceneFallbackAsset;

export const sceneImageSizes = '(max-aspect-ratio: 4/3) 134vw, 100vw';

const manifestAssets = readManifestAssets(sceneManifest);

/**
 * The complete scene package is validated while this module loads. A missing
 * URL means Vite did not include a manifest-declared runtime variant.
 */
export const sceneAssetManifest: readonly SceneManifestAsset[] = Object.freeze(
  manifestAssets.map(createSceneAsset),
);

export const sceneAssetFallbacks: readonly SceneFallbackAsset[] = Object.freeze([
  createFoundationSceneFallback(),
]);

const sceneAssetById = new Map(
  [...sceneAssetManifest, ...sceneAssetFallbacks].map((asset) => [
    asset.id,
    asset,
  ] as const),
);

export function resolveSceneAsset(assetId: string): SceneAsset {
  const asset = sceneAssetById.get(assetId);
  if (!asset) {
    throw new Error(`Scene asset "${assetId}" is missing from the manifest.`);
  }
  return asset;
}

type ManifestAsset = {
  id: string;
  ownerType: 'scene';
  ownerId: string;
  layerRole: 'back' | 'foreground';
  source: {
    path: string;
    width: 1920;
    height: 1080;
    format: 'png';
  };
  focalPoint: ScenePoint;
  focalRectangles: Record<string, SceneRectangle | null>;
  sharedSafeRectangles: Record<string, SceneRectangle>;
  crop: {
    core: SceneRectangle;
    strategy: string;
  };
  variants: Array<{
    path: string;
    width: number;
    height: number;
    format: SceneVariantFormat;
  }>;
};

function readManifestAssets(value: unknown): readonly ManifestAsset[] {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Scene manifest must declare schemaVersion 1.');
  }
  if (!Array.isArray(value.assets) || value.assets.length === 0) {
    throw new Error('Scene manifest must declare at least one asset.');
  }

  const ids = new Set<string>();
  return Object.freeze(
    value.assets.map((asset, index) => {
      const context = `Scene manifest asset ${index}`;
      if (!isRecord(asset)) throw new Error(`${context} must be an object.`);
      const id = requireString(asset.id, `${context} is missing an ID.`);
      if (ids.has(id)) throw new Error(`Duplicate scene asset "${id}".`);
      ids.add(id);
      if (asset.ownerType !== 'scene') {
        throw new Error(`Scene asset "${id}" must have ownerType scene.`);
      }
      const ownerId = requireString(
        asset.ownerId,
        `Scene asset "${id}" is missing an owner ID.`,
      );
      const layerRole = asset.layerRole;
      if (layerRole !== 'back' && layerRole !== 'foreground') {
        throw new Error(`Scene asset "${id}" has an invalid layer role.`);
      }
      if (!isRecord(asset.source)) {
        throw new Error(`Scene asset "${id}" is missing its source.`);
      }
      if (
        asset.source.width !== 1920 ||
        asset.source.height !== 1080 ||
        asset.source.format !== 'png'
      ) {
        throw new Error(`Scene asset "${id}" must have a 1920x1080 PNG source.`);
      }
      const variants = readVariants(id, asset.variants);
      return {
        id,
        ownerType: 'scene',
        ownerId,
        layerRole,
        source: {
          path: requireString(
            asset.source.path,
            `Scene asset "${id}" is missing its source path.`,
          ),
          width: 1920,
          height: 1080,
          format: 'png',
        },
        focalPoint: readPoint(asset.focalPoint, `Scene asset "${id}" focal point`),
        focalRectangles: readNullableRectangles(
          asset.focalRectangles,
          `Scene asset "${id}" focal rectangles`,
        ),
        sharedSafeRectangles: readRectangles(
          asset.sharedSafeRectangles,
          `Scene asset "${id}" shared safe rectangles`,
        ),
        crop: readCrop(asset.crop, `Scene asset "${id}" crop`),
        variants,
      } satisfies ManifestAsset;
    }),
  );
}

function readVariants(id: string, value: unknown): ManifestAsset['variants'] {
  if (!Array.isArray(value)) {
    throw new Error(`Scene asset "${id}" is missing its variants.`);
  }
  const expected = new Set(
    supportedVariantWidths.flatMap((width) =>
      supportedVariantFormats.map((format) => `${width}:${format}`),
    ),
  );
  const seen = new Set<string>();
  const variants = value.map((variant, index) => {
    if (!isRecord(variant)) {
      throw new Error(`Scene asset "${id}" variant ${index} must be an object.`);
    }
    const path = requireString(
      variant.path,
      `Scene asset "${id}" variant ${index} is missing its path.`,
    );
    const width = requireNumber(
      variant.width,
      `Scene asset "${id}" variant "${path}" is missing its width.`,
    );
    const height = requireNumber(
      variant.height,
      `Scene asset "${id}" variant "${path}" is missing its height.`,
    );
    const format = variant.format;
    const formatName = typeof format === 'string' ? format : 'unknown';
    if (
      !supportedVariantFormats.includes(format as SceneVariantFormat) ||
      !supportedVariantWidths.includes(width as (typeof supportedVariantWidths)[number]) ||
      height !== width * (9 / 16)
    ) {
      throw new Error(`Scene asset "${id}" variant "${path}" has unsupported dimensions or format.`);
    }
    const key = `${width}:${formatName}`;
    if (seen.has(key)) throw new Error(`Duplicate scene variant "${path}".`);
    seen.add(key);
    expected.delete(key);
    return {
      path,
      width,
      height,
      format: format as SceneVariantFormat,
    };
  });
  if (expected.size > 0) {
    throw new Error(
      `Scene asset "${id}" is missing variants: ${[...expected].join(', ')}.`,
    );
  }
  return variants;
}

function createSceneAsset(asset: ManifestAsset): SceneManifestAsset {
  const variants = asset.variants.map((variant) => {
    const url = resolveVariantUrl(asset.id, variant.path);
    return Object.freeze({ ...variant, url, src: url });
  });
  const avif = createSource(variants, 'avif');
  const webp = createSource(variants, 'webp');
  return Object.freeze({
    kind: 'manifest',
    id: asset.id,
    ownerType: asset.ownerType,
    ownerId: asset.ownerId,
    layerRole: asset.layerRole,
    width: 1920,
    height: 1080,
    url: webp.fallbackUrl,
    avif,
    webp,
    focalPoint: Object.freeze({ ...asset.focalPoint }),
    focalRectangles: freezeRecord(asset.focalRectangles),
    sharedSafeRectangles: freezeRecord(asset.sharedSafeRectangles),
    crop: Object.freeze({
      core: Object.freeze({ ...asset.crop.core }),
      strategy: asset.crop.strategy,
    }),
    sizes: sceneImageSizes,
  });
}

function createFoundationSceneFallback(): SceneFallbackAsset {
  const variant = Object.freeze({
    path: 'assets/brand/title-proscenium-background.webp',
    width: 1672,
    height: 941,
    format: 'webp' as const,
    url: foundationSceneFallbackUrl,
    src: foundationSceneFallbackUrl,
  });
  const srcSet = `${variant.url} ${variant.width}w`;
  const webp = Object.freeze({
    format: 'webp' as const,
    mimeType: 'image/webp' as const,
    srcSet,
    srcset: srcSet,
    fallbackUrl: variant.url,
    variants: Object.freeze([variant]),
  });
  return Object.freeze({
    kind: 'fallback',
    id: 'catalog-foundation-neutral-scene',
    ownerType: 'scene',
    ownerId: 'catalog-foundation-neutral-scene',
    layerRole: 'back',
    width: 1672,
    height: 941,
    url: variant.url,
    webp,
    avif: null,
    sizes: '100vw',
  });
}

function createSource(
  variants: readonly SceneAssetVariant[],
  format: SceneVariantFormat,
): SceneAssetSource {
  const selected = Object.freeze(
    variants
      .filter((variant) => variant.format === format)
      .sort((left, right) => left.width - right.width),
  );
  if (selected.length !== supportedVariantWidths.length) {
    throw new Error(`Scene asset is missing its ${format.toUpperCase()} variants.`);
  }
  const srcSet = selected
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
  return Object.freeze({
    format,
    mimeType: `image/${format}` as `image/${SceneVariantFormat}`,
    srcSet,
    srcset: srcSet,
    fallbackUrl: selected.at(-1)!.url,
    variants: selected,
  });
}

function resolveVariantUrl(assetId: string, relativePath: string): string {
  const normalizedPath = relativePath.replaceAll('\\', '/');
  const key = `../assets/scenes/${normalizedPath}`;
  const url = sceneVariantUrls[key];
  if (!url) {
    throw new Error(
      `Scene asset "${assetId}" variant "${relativePath}" is missing from the Vite asset map.`,
    );
  }
  return url;
}

function readPoint(value: unknown, context: string): ScenePoint {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return Object.freeze({
    x: readRatio(value.x, `${context}.x`),
    y: readRatio(value.y, `${context}.y`),
  });
}

function readRectangles(
  value: unknown,
  context: string,
): Record<string, SceneRectangle> {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return Object.fromEntries(
    Object.entries(value).map(([name, rectangle]) => [
      name,
      readRectangle(rectangle, `${context}.${name}`),
    ]),
  );
}

function readNullableRectangles(
  value: unknown,
  context: string,
): Record<string, SceneRectangle | null> {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return Object.fromEntries(
    Object.entries(value).map(([name, rectangle]) => [
      name,
      rectangle === null ? null : readRectangle(rectangle, `${context}.${name}`),
    ]),
  );
}

function readCrop(
  value: unknown,
  context: string,
): ManifestAsset['crop'] {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  return {
    core: readRectangle(value.core, `${context}.core`),
    strategy: requireString(value.strategy, `${context} is missing a strategy.`),
  };
}

function readRectangle(value: unknown, context: string): SceneRectangle {
  if (!isRecord(value)) throw new Error(`${context} must be an object.`);
  const x = readRatio(value.x, `${context}.x`);
  const y = readRatio(value.y, `${context}.y`);
  const width = readRatio(value.width, `${context}.width`);
  const height = readRatio(value.height, `${context}.height`);
  if (width === 0 || height === 0) {
    throw new Error(`${context} must have a positive width and height.`);
  }
  if (x + width > 1 || y + height > 1) {
    throw new Error(`${context} must stay inside the normalized canvas.`);
  }
  return { x, y, width, height };
}

function readRatio(value: unknown, context: string): number {
  const number = requireNumber(value, `${context} must be a number.`);
  if (number < 0 || number > 1) {
    throw new Error(`${context} must be between 0 and 1.`);
  }
  return number;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(message);
  return value;
}

function requireNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(message);
  return value;
}

function freezeRecord<Value>(record: Readonly<Record<string, Value>>): Readonly<Record<string, Value>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        value && typeof value === 'object'
          ? Object.freeze({ ...(value as Record<string, unknown>) })
          : value,
      ]),
    ),
  ) as Readonly<Record<string, Value>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
