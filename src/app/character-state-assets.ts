import contract from '../assets/characters/state-contract.json' with { type: 'json' };
import stateManifest from '../assets/characters/states/state-manifest.json' with { type: 'json' };
import { characterAssetManifest, createSource, matchCharacterImageSizes, type CharacterAsset, type CharacterAssetVariant } from './character-assets';
import { characterMotion, type CharacterFrame, type CharacterStateId } from './character-motion';

export type CharacterStatePackage = Readonly<{
  ownerId: string;
  skinId: string;
  frames: readonly CharacterFrame[];
}>;

const stateVariantUrls = import.meta.glob('../assets/characters/states/variants/*.{avif,webp}', {
  eager: true, import: 'default', query: '?url&no-inline',
}) as Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const packages = createCharacterStatePackages(stateManifest, characterAssetManifest, stateVariantUrls);
const packagesBySkin = new Map(packages.map((entry) => [entry.ownerId + ':' + entry.skinId, entry.frames]));
for (const asset of characterAssetManifest) {
  if (contract.characterIds.includes(asset.ownerId) && !packagesBySkin.has(asset.ownerId + ':' + asset.skinId)) {
    throw new Error('Required character state package is missing: ' + asset.id);
  }
}

export function resolveCharacterFrames(ownerId: string, skinId: string): readonly CharacterFrame[] | null {
  return packagesBySkin.get(ownerId + ':' + skinId) ?? null;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(path + ' must be a non-empty string.');
  return value;
}

/** URLs are supplied by Vite's external-asset imports. This function loads no image. */
export function createCharacterStatePackages(
  value: unknown,
  selections: readonly CharacterAsset[],
  urls: Readonly<Record<string, string>>,
): readonly CharacterStatePackage[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.assets) || !Array.isArray(value.packages)) {
    throw new Error('Character state manifest must contain schemaVersion 1, assets, and packages.');
  }
  const assets = new Map<string, Record<string, unknown>>();
  for (const raw of value.assets) {
    if (!isRecord(raw)) throw new Error('Character state asset must be an object.');
    const id = requiredString(raw.id, 'Character state asset ID');
    if (assets.has(id)) throw new Error('Duplicate character state asset: ' + id);
    assets.set(id, raw);
  }
  const seen = new Set<string>();
  return Object.freeze(value.packages.map((raw) => {
    if (!isRecord(raw) || !Array.isArray(raw.states)) throw new Error('Character state package must contain states.');
    const mappings = raw.states;
    const ownerId = requiredString(raw.ownerId, 'Character state owner');
    const skinId = requiredString(raw.skinId, 'Character state skin');
    const key = ownerId + ':' + skinId;
    if (seen.has(key)) throw new Error('Duplicate character state package: ' + key);
    seen.add(key);
    if (raw.states.length !== contract.states.length) throw new Error(key + ': all nine states are required.');
    const selection = selections.find((asset) => asset.ownerId === ownerId && asset.skinId === skinId);
    if (!selection) throw new Error(key + ': selection portrait is missing.');
    const frames = contract.states.map(({ id }) => {
      const stateId = id as CharacterStateId;
      const matches = mappings.filter((record) => isRecord(record) && record.stateId === stateId);
      const mapping = matches[0];
      if (matches.length !== 1 || !isRecord(mapping) ||
        mapping.durationMs !== characterMotion[stateId].durationMs ||
        mapping.loop !== characterMotion[stateId].loop) throw new Error(key + ': invalid state mapping for ' + stateId);
      if (stateId === 'selection') {
        if (mapping.assetId !== selection.id) throw new Error(key + ': incorrect selection mapping.');
        return Object.freeze({ id: selection.id, stateId, url: selection.url, sizes: matchCharacterImageSizes, avif: selection.avif, webp: selection.webp });
      }
      const assetId = requiredString(mapping.assetId, key + ': state asset ID');
      const asset = assets.get(assetId);
      if (!asset || asset.ownerId !== ownerId || asset.skinId !== skinId || asset.stateId !== stateId) {
        throw new Error(key + ': missing or incorrect asset for ' + stateId);
      }
      const variants = readVariants(assetId, asset.variants, urls);
      const avif = createSource(variants, 'avif');
      const webp = createSource(variants, 'webp');
      return Object.freeze({ id: assetId, stateId, url: webp.variants.at(-1)!.url, sizes: matchCharacterImageSizes, avif, webp });
    });
    return Object.freeze({ ownerId, skinId, frames: Object.freeze(frames) });
  }));
}

function readVariants(id: string, value: unknown, urls: Readonly<Record<string, string>>): readonly CharacterAssetVariant[] {
  if (!Array.isArray(value) || value.length !== 6) throw new Error(id + ': six state variants are required.');
  const seen = new Set<string>();
  return Object.freeze(value.map((raw) => {
    if (!isRecord(raw) || typeof raw.width !== 'number' || ![320, 640, 960].includes(raw.width) ||
      raw.height !== raw.width || (raw.format !== 'avif' && raw.format !== 'webp')) {
      throw new Error(id + ': invalid state variant dimensions or format.');
    }
    const key = raw.width + ':' + raw.format;
    if (seen.has(key)) throw new Error(id + ': duplicate state variant ' + key);
    seen.add(key);
    const variantPath = 'states/variants/' + id + '-' + raw.width + 'x' + raw.width + '.' + raw.format;
    if (raw.path !== variantPath) throw new Error(id + ': incorrect state variant path.');
    const url = urls['../assets/characters/' + variantPath];
    if (!url) throw new Error(id + ': missing state variant URL ' + variantPath);
    return Object.freeze({ path: variantPath, width: raw.width, height: raw.width, format: raw.format, url });
  }));
}
