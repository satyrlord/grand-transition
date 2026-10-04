import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCharacterAssets, type CharacterManifest } from './build-character-assets.ts';
import {
  buildCharacterStates,
  statePackages,
  type StateManifest,
} from './build-character-states.ts';
import { validateCharacterAssets } from './validate-character-assets.ts';
import { validateCharacterStates } from './validate-character-states.ts';

const SHIPPING_ROOT = path.resolve('src/assets/characters');

type VariantInventory = readonly {
  variants: readonly { path: string; sha256: string }[];
}[];

export function changedVariantCount(previous: VariantInventory, current: VariantInventory): number {
  const previousHashes = new Map(
    previous.flatMap(({ variants }) => variants.map(({ path, sha256 }) => [path, sha256] as const)),
  );
  return current.reduce(
    (count, { variants }) =>
      count + variants.filter(({ path, sha256 }) => previousHashes.get(path) !== sha256).length,
    0,
  );
}

export async function buildCharacterPackage({
  characterRoot,
  skinId,
}: {
  characterRoot: unknown;
  skinId: unknown;
}) {
  if (typeof characterRoot !== 'string' || !characterRoot.trim()) {
    throw new Error('A staged character root is required.');
  }
  if (
    typeof skinId !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$/u.test(skinId)
  ) {
    throw new Error('A valid skin ID is required.');
  }
  const root = path.resolve(characterRoot);
  if (root === SHIPPING_ROOT) {
    throw new Error('Build the character package in a staged tree before installation.');
  }
  const currentSelection = JSON.parse(
    await readFile(path.join(root, 'character-manifest.json'), 'utf8'),
  ) as CharacterManifest;
  const skin = currentSelection.assets?.find((asset) => asset?.id === skinId);
  if (!skin) throw new Error(`Unknown selection skin ID "${skinId}".`);
  if (!statePackages(currentSelection).some((entry: { id: string }) => entry.id === skinId)) {
    throw new Error(`Skin "${skinId}" does not own a five-pose state package.`);
  }
  const currentStates = JSON.parse(
    await readFile(path.join(root, 'states/state-manifest.json'), 'utf8'),
  ) as StateManifest;

  const selectionManifest = await buildCharacterAssets({
    characterRoot: root,
    only: [skinId],
  });
  const stateManifest = await buildCharacterStates({
    characterRoot: root,
    only: [skinId],
  });
  await validateCharacterAssets({ characterRoot: root });
  const stateValidation = await validateCharacterStates({ characterRoot: root });
  return {
    skinId,
    selectionAssets: selectionManifest.assets.length,
    selectionVariantsChanged: changedVariantCount(
      currentSelection.assets.filter((asset) => asset.id === skinId),
      selectionManifest.assets.filter((asset) => asset.id === skinId),
    ),
    statePackages: stateManifest.packages.length,
    stateMasters: stateManifest.assets.length,
    stateVariantsChanged: changedVariantCount(
      currentStates.assets.filter(
        (asset) => asset.ownerId === skin.ownerId && asset.skinId === skin.skinId,
      ),
      stateManifest.assets.filter(
        (asset) => asset.ownerId === skin.ownerId && asset.skinId === skin.skinId,
      ),
    ),
    worstPackageBytes: stateValidation.worstPackageBytes,
  };
}

const invokedScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedScript) {
  const args = process.argv.slice(2);
  const characterRoot = args[0] && !args[0].startsWith('--') ? args.shift() : undefined;
  const valid = args.length === 2 && args[0] === '--skin';
  Promise.resolve()
    .then(() => {
      if (!valid)
        throw new Error('Use build-character-package.ts <staged-character-root> --skin <skin-id>.');
      return buildCharacterPackage({ characterRoot, skinId: args[1] });
    })
    .then((result) => {
      process.stdout.write(`Built targeted character package: ${JSON.stringify(result)}.\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
