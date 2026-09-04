import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import baseline from '../../tools/character-replacement-baseline.json';
// @ts-expect-error The production image validator is a native ECMAScript module.
import * as characterValidator from '../../tools/validate-character-assets.mjs';

const { validateCharacterAssets } = characterValidator as {
  validateCharacterAssets: (options: {
    characterRoot: string;
  }) => Promise<unknown>;
};

let fixture: string;
let baseManifestText: string;

async function readManifest(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(fixture, 'character-manifest.json'), 'utf8'),
  ) as Record<string, unknown>;
}

beforeAll(async () => {
  fixture = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-character-validation-'),
  );
  await cp(path.resolve('src', 'assets', 'characters'), fixture, {
    recursive: true,
  });
  baseManifestText = await readFile(
    path.join(fixture, 'character-manifest.json'),
    'utf8',
  );
});

afterEach(async () => {
  await writeFile(
    path.join(fixture, 'character-manifest.json'),
    baseManifestText,
  );
});

afterAll(async () => {
  await rm(fixture, { force: true, recursive: true });
});

describe.sequential('character asset manifest validator', () => {
  test(
    'accepts the complete fixed replacement package',
    async () => {
      await expect(
        validateCharacterAssets({ characterRoot: fixture }),
      ).resolves.toBeTruthy();
    },
    30_000,
  );

  test('rejects a missing license identifier', async () => {
    const manifest = await readManifest();
    const assets = manifest.assets as Array<Record<string, unknown>>;
    delete assets[0]!.licenseIdentifier;
    await writeFile(
      path.join(fixture, 'character-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await expect(
      validateCharacterAssets({ characterRoot: fixture }),
    ).rejects.toThrow(/licenseIdentifier/iu);
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
    await expect(
      validateCharacterAssets({ characterRoot: fixture }),
    ).rejects.toThrow(/replaced baseline source hash/iu);
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
    await expect(
      validateCharacterAssets({ characterRoot: fixture }),
    ).rejects.toThrow(/declare every runtime variant/iu);
  });
});
