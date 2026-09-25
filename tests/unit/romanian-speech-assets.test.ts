import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test } from 'vitest';

type ManifestFile = { path: string; bytes: number; sha256: string };
type FixtureManifest = {
  files: ManifestFile[];
  voices: { id: string; license: string }[];
  runtime: { path: string; bytes: number; sha256: string };
};

const { validateRomanianSpeechAssets } = await import(
  pathToFileURL(path.resolve('tools/romanian-speech-assets.ts')).href
);
const roots: string[] = [];

async function fixture(mutate: (manifest: FixtureManifest) => void = () => {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-ro-'));
  roots.push(root);
  const manifest = JSON.parse(
    await readFile('public/tts/ro/manifest.json', 'utf8'),
  ) as FixtureManifest;
  mutate(manifest);
  for (const file of manifest.files) {
    const target = path.join(root, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'corrupt');
  }
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('validates the shipped Romanian weights, pronunciation data, and licences', async () => {
  await expect(validateRomanianSpeechAssets()).resolves.toBeUndefined();
});

test('rejects a manifest that no longer matches the pinned inventory', async () => {
  const root = await fixture((manifest) => {
    manifest.files[0]!.sha256 = 'f'.repeat(64);
  });
  await expect(validateRomanianSpeechAssets(root)).rejects.toThrow(
    'The Romanian speech asset manifest is invalid.',
  );
});

test.each([
  [
    'voice identity',
    (manifest: FixtureManifest) => {
      manifest.voices[1]!.id = 'ro_RO-other-medium';
    },
  ],
  [
    'voice license',
    (manifest: FixtureManifest) => {
      manifest.voices[1]!.license = 'MIT';
    },
  ],
  [
    'runtime path',
    (manifest: FixtureManifest) => {
      manifest.runtime.path = '../other/runtime.wasm';
    },
  ],
] as const)('rejects drift in Romanian %s metadata', async (_name, mutate) => {
  const root = await fixture(mutate);
  await expect(validateRomanianSpeechAssets(root)).rejects.toThrow(
    'The Romanian speech asset manifest is invalid.',
  );
});

test('rejects an extra file in the shipped package', async () => {
  const root = await fixture();
  await writeFile(path.join(root, 'stray.bin'), 'stray');
  await expect(validateRomanianSpeechAssets(root)).rejects.toThrow('invalid inventory');
});

test('rejects assets whose bytes do not match the pinned digests', async () => {
  const root = await fixture();
  await expect(validateRomanianSpeechAssets(root)).rejects.toThrow('hash mismatch');
});

test('the shipped manifest declares both Romanian voices, the shared runtime, and its licences', async () => {
  const manifest = JSON.parse(await readFile('public/tts/ro/manifest.json', 'utf8')) as {
    voices: {
      id: string;
      default: boolean;
      model: { files: string[]; bytes: number; sha256: string };
      lang: string;
      license: string;
    }[];
    runtime: { path: string; bytes: number; sha256: string };
    files: ManifestFile[];
  };
  expect(manifest.voices.map((voice) => voice.id)).toEqual([
    'ro_RO-mihai-medium',
    'ro_RO-liana-medium',
  ]);
  expect(manifest.voices[0]).toMatchObject({
    default: true,
    model: { files: ['mihai/model.onnx'] },
    lang: 'ro-RO',
  });
  expect(manifest.voices[1]).toMatchObject({
    default: false,
    model: { files: ['liana/model.onnx'] },
    license: 'CC BY-NC 4.0',
  });
  // The ONNX runtime is shared with the English package rather than duplicated.
  expect(manifest.runtime.path).toBe('../piper/ort-wasm-simd-threaded.wasm');
  // Both models and the pronunciation data ship with the package.
  expect(manifest.files.map(({ path: name }) => name)).toContain('mihai/model.onnx');
  expect(manifest.files.map(({ path: name }) => name)).toContain('liana/model.onnx');
  for (const { model } of manifest.voices) {
    const hash = createHash('sha256');
    let bytes = 0;
    for (const file of model.files) {
      const content = await readFile(path.join('public/tts/ro', file));
      expect(content.length).toBeLessThan(100 * 1024 * 1024);
      bytes += content.length;
      hash.update(content);
    }
    expect(bytes).toBe(model.bytes);
    expect(hash.digest('hex')).toBe(model.sha256);
  }
  expect(manifest.files.map(({ path: name }) => name)).toContain('pronounce/data/bundle-1.data');
  const notice = await readFile('public/tts/ro/NOTICE.txt', 'utf8');
  expect(notice).toContain('CC BY-NC 4.0');
  expect(notice).toContain('GPL-3.0-only');
  expect(notice).toContain('Mihai');
  expect(notice).toContain('Liana');
});
