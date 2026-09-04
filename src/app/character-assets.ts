import characterManifest from '../assets/characters/character-manifest.json' with {
  type: 'json',
};

const characterVariantUrls = {
  ...import.meta.glob('../assets/characters/variants/*.avif', {
    eager: true,
    import: 'default',
    query: '?url&no-inline',
  }),
  ...import.meta.glob('../assets/characters/variants/*.webp', {
    eager: true,
    import: 'default',
    query: '?url&no-inline',
  }),
} as Record<string, string>;

const supportedWidths = [128, 256, 320, 640, 960] as const;
const supportedFormats = ['avif', 'webp'] as const;

export type CharacterVariantFormat = (typeof supportedFormats)[number];

export type CharacterAssetVariant = Readonly<{
  path: string;
  width: number;
  height: number;
  format: CharacterVariantFormat;
  url: string;
}>;

export type CharacterAssetSource = Readonly<{
  format: CharacterVariantFormat;
  mimeType: `image/${CharacterVariantFormat}`;
  srcSet: string;
  variants: readonly CharacterAssetVariant[];
}>;

export type CharacterAsset = Readonly<{
  id: string;
  ownerId: string;
  skinId: string;
  stateId: 'selection';
  poseId: 'selection';
  expressionId: 'selection';
  width: 2048;
  height: 2048;
  url: string;
  sizes: string;
  avif: CharacterAssetSource;
  webp: CharacterAssetSource;
}>;

type ManifestAsset = {
  id: string;
  ownerType: 'character';
  ownerId: string;
  skinId: string;
  stateId: 'selection';
  poseId: 'selection';
  expressionId: 'selection';
  source: { width: 2048; height: 2048; format: 'png' };
  variants: Array<{
    path: string;
    width: number;
    height: number;
    format: CharacterVariantFormat;
  }>;
};

export const characterImageSizes = '(max-width: 1100px) 320px, 640px';

export const characterAssetManifest: readonly CharacterAsset[] = Object.freeze(
  readManifestAssets(characterManifest).map(createCharacterAsset),
);

const characterAssetById = new Map(
  characterAssetManifest.map((asset) => [asset.id, asset] as const),
);

export function resolveCharacterAsset(assetId: string): CharacterAsset {
  const asset = characterAssetById.get(assetId);
  if (!asset) {
    throw new Error(`Character asset "${assetId}" is missing from the manifest.`);
  }
  return asset;
}

function readManifestAssets(value: unknown): readonly ManifestAsset[] {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Character manifest must declare schemaVersion 1.');
  }
  if (!Array.isArray(value.assets) || value.assets.length === 0) {
    throw new Error('Character manifest must declare at least one asset.');
  }
  const ids = new Set<string>();
  return Object.freeze(
    value.assets.map((rawAsset, index) => {
      const context = `Character manifest asset ${index}`;
      if (!isRecord(rawAsset)) throw new Error(`${context} must be an object.`);
      const id = requireString(rawAsset.id, `${context} is missing an ID.`);
      if (ids.has(id)) throw new Error(`Duplicate character asset "${id}".`);
      ids.add(id);
      if (rawAsset.ownerType !== 'character') {
        throw new Error(`Character asset "${id}" must have ownerType character.`);
      }
      if (!isRecord(rawAsset.source)) {
        throw new Error(`Character asset "${id}" is missing its source.`);
      }
      if (
        rawAsset.source.width !== 2048 ||
        rawAsset.source.height !== 2048 ||
        rawAsset.source.format !== 'png'
      ) {
        throw new Error(`Character asset "${id}" must have a 2048x2048 PNG source.`);
      }
      const asset: ManifestAsset = {
        id,
        ownerType: 'character',
        ownerId: requireString(
          rawAsset.ownerId,
          `Character asset "${id}" is missing its owner ID.`,
        ),
        skinId: requireString(
          rawAsset.skinId,
          `Character asset "${id}" is missing its skin ID.`,
        ),
        stateId: requireSelection(rawAsset.stateId, id, 'state'),
        poseId: requireSelection(rawAsset.poseId, id, 'pose'),
        expressionId: requireSelection(rawAsset.expressionId, id, 'expression'),
        source: { width: 2048, height: 2048, format: 'png' },
        variants: readVariants(id, rawAsset.variants),
      };
      return asset;
    }),
  );
}

function readVariants(id: string, value: unknown): ManifestAsset['variants'] {
  if (!Array.isArray(value)) {
    throw new Error(`Character asset "${id}" is missing its variants.`);
  }
  const expected = new Set(
    supportedWidths.flatMap((width) =>
      supportedFormats.map((format) => `${width}:${format}`),
    ),
  );
  const variants = value.map((rawVariant, index) => {
    if (!isRecord(rawVariant)) {
      throw new Error(`Character asset "${id}" variant ${index} must be an object.`);
    }
    const width = rawVariant.width;
    const format = rawVariant.format;
    if (
      typeof width !== 'number' ||
      !supportedWidths.includes(width as (typeof supportedWidths)[number]) ||
      rawVariant.height !== width ||
      !supportedFormats.includes(format as CharacterVariantFormat)
    ) {
      throw new Error(`Character asset "${id}" variant ${index} is unsupported.`);
    }
    const key = `${width}:${String(format)}`;
    if (!expected.delete(key)) {
      throw new Error(`Character asset "${id}" has duplicate variant ${key}.`);
    }
    return {
      path: requireString(
        rawVariant.path,
        `Character asset "${id}" variant ${index} is missing its path.`,
      ),
      width,
      height: width,
      format: format as CharacterVariantFormat,
    };
  });
  if (expected.size > 0) {
    throw new Error(
      `Character asset "${id}" is missing variants: ${[...expected].join(', ')}.`,
    );
  }
  return variants;
}

function createCharacterAsset(asset: ManifestAsset): CharacterAsset {
  const variants = asset.variants.map((variant) =>
    Object.freeze({ ...variant, url: resolveVariantUrl(asset.id, variant.path) }),
  );
  const avif = createSource(variants, 'avif');
  const webp = createSource(variants, 'webp');
  return Object.freeze({
    id: asset.id,
    ownerId: asset.ownerId,
    skinId: asset.skinId,
    stateId: asset.stateId,
    poseId: asset.poseId,
    expressionId: asset.expressionId,
    width: 2048,
    height: 2048,
    url: webp.variants.at(-1)?.url ?? '',
    sizes: characterImageSizes,
    avif,
    webp,
  });
}

function createSource(
  variants: readonly CharacterAssetVariant[],
  format: CharacterVariantFormat,
): CharacterAssetSource {
  const selected = variants.filter((variant) => variant.format === format);
  return Object.freeze({
    format,
    mimeType: `image/${format}`,
    srcSet: selected.map((variant) => `${variant.url} ${variant.width}w`).join(', '),
    variants: Object.freeze(selected),
  });
}

function resolveVariantUrl(id: string, variantPath: string): string {
  const sourcePath = `../assets/characters/${variantPath}`;
  const url = characterVariantUrls[sourcePath];
  if (!url) {
    throw new Error(`Character asset "${id}" variant "${variantPath}" has no URL.`);
  }
  return url;
}

function requireSelection(value: unknown, id: string, field: string): 'selection' {
  if (value !== 'selection') {
    throw new Error(`Character asset "${id}" must use selection ${field} metadata.`);
  }
  return value;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
