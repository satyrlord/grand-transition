import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import baseline from '../../tools/character-replacement-baseline.json';
import * as characterValidator from '../../tools/validate-character-assets.ts';

const { validateCharacterAssets, validateCharacterSkinInventory } = characterValidator as {
  validateCharacterAssets: (options: { characterRoot: string }) => Promise<unknown>;
  validateCharacterSkinInventory: (
    assets: readonly Readonly<{ ownerId: string; skinId: string }>[],
  ) => unknown;
};

function skinInventory(alternateCount: number, defaultCount = 1) {
  return [
    ...Array.from({ length: defaultCount }, () => ({
      ownerId: 'boundary-character',
      skinId: 'default',
    })),
    ...Array.from({ length: alternateCount }, (_, index) => ({
      ownerId: 'boundary-character',
      skinId: `alternate-${index + 1}`,
    })),
  ];
}

let fixture: string;
let baseManifestText: string;

async function readManifest(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(fixture, 'character-manifest.json'), 'utf8'),
  ) as Record<string, unknown>;
}

let fixtureReady: Promise<void>;

async function prepareFixture(): Promise<void> {
  fixture = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-character-validation-'));
  await cp(path.resolve('src', 'assets', 'characters'), fixture, {
    recursive: true,
  });
  baseManifestText = await readFile(path.join(fixture, 'character-manifest.json'), 'utf8');
}

beforeAll(() => {
  fixtureReady = prepareFixture();
  return fixtureReady;
});

afterEach(async () => {
  await writeFile(path.join(fixture, 'character-manifest.json'), baseManifestText);
});

afterAll(async () => {
  await fixtureReady.catch(() => undefined);
  if (!fixture) return;
  await rm(fixture, { force: true, recursive: true });
});

describe.sequential('character asset manifest validator', () => {
  test('accepts one default skin and the eight-alternate boundary', () => {
    expect(() => validateCharacterSkinInventory(skinInventory(8))).not.toThrow();
  });

  test('rejects a ninth alternate at its character context', () => {
    expect(() => validateCharacterSkinInventory(skinInventory(9))).toThrow(
      /boundary-character.*at most eight alternate skins.*found 9/iu,
    );
  });

  test.each([0, 2])('rejects %s default skins at its character context', (defaultCount) => {
    expect(() => validateCharacterSkinInventory(skinInventory(1, defaultCount))).toThrow(
      new RegExp(`boundary-character.*exactly one default skin.*found ${defaultCount}`, 'iu'),
    );
  });

  test.each([undefined, 'up', 'right'])(
    'rejects missing or unreviewed facing %s',
    async (facing) => {
      const manifest = await readManifest();
      const assets = manifest.assets as Array<Record<string, unknown>>;
      assets[0]!.facing = facing;
      await writeFile(path.join(fixture, 'character-manifest.json'), JSON.stringify(manifest));
      await expect(validateCharacterAssets({ characterRoot: fixture })).rejects.toThrow(
        /facing metadata/u,
      );
    },
  );
  test('accepts the complete fixed replacement package', async () => {
    await expect(validateCharacterAssets({ characterRoot: fixture })).resolves.toBeTruthy();
  }, 30_000);

  test('rejects a missing license identifier', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    delete assets[0]!.licenseIdentifier;
    await writeFile(
      path.join(fixture, 'character-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await expect(validateCharacterAssets({ characterRoot: fixture })).rejects.toThrow(
      /licenseIdentifier/iu,
    );
  });

  test('rejects a source that still declares the replaced hash', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const source = assets[0]!.source as Record<string, unknown>;
    source.sha256 = baseline.assets[0]!.sha256;
    await writeFile(
      path.join(fixture, 'character-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await expect(validateCharacterAssets({ characterRoot: fixture })).rejects.toThrow(
      /replaced baseline source hash/iu,
    );
  });

  test('rejects a missing runtime variant', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    const variants = assets[0]!.variants as Array<Record<string, unknown>>;
    variants.pop();
    await writeFile(
      path.join(fixture, 'character-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await expect(validateCharacterAssets({ characterRoot: fixture })).rejects.toThrow(
      /declare every runtime variant/iu,
    );
  });
});
