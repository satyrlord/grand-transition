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
    id: string;
    ownerId: string;
    skinId: string;
    stateId: string;
    facing: 'left' | 'right';
    source: { sha256: string };
    variants: Array<{ path: string; sha256: string }>;
  }>;
};

const { buildCharacterAssets, mapWithConcurrency } = characterBuilder as {
  mapWithConcurrency: (values: number[], concurrency: number, work: (value: number) => Promise<number>) => Promise<number[]>;
  buildCharacterAssets: (options: {
    characterRoot: string;
    masterNames: readonly string[];
    only?: string[];
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
  test('rejects missing, invalid, or stale orientation review before changing outputs', async () => {
    const file = path.join(fixture, 'portrait-layout.json');
    const original = await readFile(file, 'utf8');
    const before = await readdir(fixture);
    for (const mutation of ['missing', 'invalid', 'stale']) {
      const layout = JSON.parse(original) as { portraits: Record<string, { facing: string; sourceSha256: string }> };
      if (mutation === 'missing') delete layout.portraits.alpha;
      if (mutation === 'invalid') layout.portraits.alpha!.facing = 'up';
      if (mutation === 'stale') layout.portraits.alpha!.sourceSha256 = '0'.repeat(64);
      try {
        await writeFile(file, JSON.stringify(layout));
        await expect(buildCharacterAssets({ characterRoot: fixture, masterNames: ['alpha.png', 'beta--alternate.png'] })).rejects.toThrow(/inventory|facing/u);
        expect(await readdir(fixture)).toEqual(before);
      } finally { await writeFile(file, original); }
    }
  });

  test('waits for active encoders before reporting a failure and stops the remaining queue', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started: number[] = [];
    let reported = false;
    let activeFinished = false;
    const result = mapWithConcurrency([0, 1, 2], 2, async (value) => {
      started.push(value);
      if (value === 0) { await Promise.resolve(); throw new Error('failed encoding'); }
      await gate;
      activeFinished = true;
      return value;
    }).catch((error: unknown) => { reported = true; return error; });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(reported).toBe(false);
    release();
    expect(await result).toMatchObject({ message: 'failed encoding' });
    expect(activeFinished).toBe(true);
    expect(started).toEqual([0, 1]);
  });

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

  test(
    'rebuilds only selected character variants and rejects a stale reused cache',
    async () => {
      const masterNames = ['alpha.png', 'beta--alternate.png'];
      const baseline = await buildCharacterAssets({ characterRoot: fixture, masterNames });
      const beta = baseline.assets.find(({ id }) => id === 'beta--alternate')!;
      const betaVariant = path.join(fixture, beta.variants[0]!.path);
      const betaBytes = await readFile(betaVariant);

      await writeMaster('alpha.png', '#335577');
      const layoutPath = path.join(fixture, 'portrait-layout.json');
      const layout = JSON.parse(await readFile(layoutPath, 'utf8')) as {
        portraits: Record<string, { facing: string; sourceSha256: string }>;
      };
      layout.portraits.alpha!.sourceSha256 = createHash('sha256')
        .update(await readFile(path.join(fixture, 'alpha.png')))
        .digest('hex');
      await writeFile(layoutPath, JSON.stringify(layout));
      await writeFile(path.join(fixture, 'variants/alpha-128x128.avif'), 'replace selected cache');

      const selected = await buildCharacterAssets({
        characterRoot: fixture,
        masterNames,
        only: ['alpha'],
      });
      expect(await readFile(betaVariant)).toEqual(betaBytes);
      expect(await readFile(path.join(fixture, 'variants/alpha-128x128.avif'), 'utf8'))
        .not.toBe('replace selected cache');
      expect(selected.assets.find(({ id }) => id === 'alpha')!.source.sha256)
        .toBe(layout.portraits.alpha!.sourceSha256);

      await writeFile(betaVariant, 'stale reused cache');
      await writeMaster('alpha.png', '#446688');
      layout.portraits.alpha!.sourceSha256 = createHash('sha256')
        .update(await readFile(path.join(fixture, 'alpha.png')))
        .digest('hex');
      await writeFile(layoutPath, JSON.stringify(layout));
      await expect(buildCharacterAssets({
        characterRoot: fixture,
        masterNames,
        only: ['alpha'],
      })).rejects.toThrow(/Cached character variant/u);
      await writeFile(betaVariant, betaBytes);
    },
    240_000,
  );
});
