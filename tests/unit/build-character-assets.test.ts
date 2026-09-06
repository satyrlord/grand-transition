import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
// @ts-expect-error The production image builder is a native ECMAScript module.
import * as characterBuilder from '../../tools/build-character-assets.mjs';

type BuiltCharacterManifest = {
  assets: Array<{
    ownerId: string;
    skinId: string;
    stateId: string;
    facing: 'left' | 'right';
    variants: Array<{ sha256: string }>;
  }>;
};

const { buildCharacterAssets } = characterBuilder as {
  buildCharacterAssets: (options: {
    characterRoot: string;
    masterNames: readonly string[];
  }) => Promise<BuiltCharacterManifest>;
};

let fixture: string;

async function writeMaster(fileName: string, color: string): Promise<void> {
  const figure = Buffer.from(
    `<svg width="2048" height="2048"><ellipse cx="1024" cy="1040" rx="520" ry="820" fill="${color}"/></svg>`,
  );
  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: figure }])
    .png()
    .toFile(path.join(fixture, fileName));
}

beforeAll(async () => {
  fixture = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-character-build-'),
  );
  await writeMaster('alpha.png', '#223344');
  await writeMaster('beta--alternate.png', '#884422');
  const portraits = Object.fromEntries(await Promise.all(['alpha', 'beta--alternate'].map(async (id) => [id, {
    facing: id === 'alpha' ? 'right' : 'left',
    sourceSha256: createHash('sha256').update(await readFile(path.join(fixture, id + '.png'))).digest('hex'),
  }])));
  await writeFile(path.join(fixture, 'portrait-layout.json'), JSON.stringify({ schemaVersion: 1, portraits }));
});

afterAll(async () => {
  await rm(fixture, { force: true, recursive: true });
});

describe('character asset builder', () => {
  test(
    'reproduces the manifest and every runtime variant',
    async () => {
      const masterNames = ['alpha.png', 'beta--alternate.png'];
      const first = await buildCharacterAssets({
        characterRoot: fixture,
        masterNames,
      });
      const firstManifest = await readFile(
        path.join(fixture, 'character-manifest.json'),
        'utf8',
      );
      const firstHashes = first.assets.flatMap((asset) =>
        asset.variants.map((variant) => variant.sha256),
      );

      const second = await buildCharacterAssets({
        characterRoot: fixture,
        masterNames,
      });
      const secondManifest = await readFile(
        path.join(fixture, 'character-manifest.json'),
        'utf8',
      );

      expect(secondManifest).toBe(firstManifest);
      expect(second.assets).toHaveLength(2);
      expect(second.assets.map(({ facing }) => facing)).toEqual(['right', 'left']);
      expect(second.assets.flatMap((asset) => asset.variants)).toHaveLength(20);
      expect(
        second.assets.flatMap((asset) =>
          asset.variants.map((variant) => variant.sha256),
        ),
      ).toEqual(firstHashes);
      expect(second.assets[1]).toMatchObject({
        ownerId: 'beta',
        skinId: 'alternate',
        stateId: 'selection',
      });
    },
    180_000,
  );
});
