import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test } from 'vitest';

const { validateNeuralAssets } = await import(
  pathToFileURL(path.resolve('tools/neural-speech-assets.mjs')).href
);

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-neural-'));
  roots.push(root);
  const manifest = JSON.parse(await readFile(
    path.resolve('public/tts/piper/manifest.json'),
    'utf8',
  ));
  for (const file of manifest.files) {
    await writeFile(path.join(root, file.path), `fixture:${file.path}`);
  }
  await writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify(manifest),
  );
  return { root, manifest };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

test('accepts the exact pinned neural asset identity and file inventory', async () => {
  await expect(validateNeuralAssets()).resolves.toBeUndefined();
});

test.each([
  ['schemaVersion', 2],
  ['revision', 'unpinned'],
  ['sources', []],
  ['runtime', 'onnxruntime-web@latest'],
  ['sampleRate', 44100],
] as const)('rejects changed neural manifest identity %s', async (field, value) => {
  const { root, manifest } = await fixture();
  manifest[field] = value;
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  await expect(validateNeuralAssets(root)).rejects.toThrow(
    'manifest is invalid',
  );
});

test('rejects duplicate, missing, and unmanifested neural asset paths', async () => {
  const duplicate = await fixture();
  duplicate.manifest.files[1].path = duplicate.manifest.files[0].path;
  await writeFile(
    path.join(duplicate.root, 'manifest.json'),
    JSON.stringify(duplicate.manifest),
  );
  await expect(validateNeuralAssets(duplicate.root)).rejects.toThrow(
    'manifest is invalid',
  );

  const missing = await fixture();
  missing.manifest.files.pop();
  await writeFile(
    path.join(missing.root, 'manifest.json'),
    JSON.stringify(missing.manifest),
  );
  await expect(validateNeuralAssets(missing.root)).rejects.toThrow(
    'manifest is invalid',
  );

  const extra = await fixture();
  await writeFile(path.join(extra.root, 'unexpected.bin'), 'unexpected');
  await expect(validateNeuralAssets(extra.root)).rejects.toThrow(
    'invalid inventory',
  );
});

test('rejects output bytes that do not match the pinned package', async () => {
  const { root } = await fixture();
  await expect(validateNeuralAssets(root)).rejects.toThrow('hash mismatch');
});
