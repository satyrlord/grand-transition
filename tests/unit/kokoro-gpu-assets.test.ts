import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test } from 'vitest';

const { validateKokoroGpuAssets } = await import(pathToFileURL(path.resolve('tools/kokoro-gpu-assets.mjs')).href);
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-gpu-'));
  roots.push(root);
  const manifest = JSON.parse(await readFile('public/tts/kokoro-gpu/manifest.json', 'utf8'));
  for (const file of manifest.files) await writeFile(path.join(root, file.path), 'corrupt');
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return { root, manifest };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

test('validates the shipped pinned FP32 shards, runtime, voices, and reassembled model', async () => {
  await expect(validateKokoroGpuAssets()).resolves.toBeUndefined();
});

test('rejects a stale compiled manifest before loading model bytes', async () => {
  const {root} = await fixture();
  const compiled = path.join(root,'compiled.json');
  await writeFile(compiled,'{}');
  await expect(validateKokoroGpuAssets(root,compiled)).rejects.toThrow('compiled GPU speech manifest is stale');
});

test.each(['sourceSha256', 'modelSha256', 'revision', 'runtime'])('rejects changed %s provenance', async field => {
  const { root, manifest } = await fixture();
  manifest[field] = 'changed';
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  await expect(validateKokoroGpuAssets(root)).rejects.toThrow('manifest or file inventory is invalid');
});

test.each(['duplicate', 'missing', 'changed-hash', 'reordered-shards'])('rejects %s inventory', async mode => {
  const { root, manifest } = await fixture();
  if (mode === 'duplicate') manifest.files[1] = manifest.files[0];
  if (mode === 'missing') manifest.files.pop();
  if (mode === 'changed-hash') manifest.files[0].sha256 = '0'.repeat(64);
  if (mode === 'reordered-shards') manifest.shards.reverse();
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  await expect(validateKokoroGpuAssets(root)).rejects.toThrow('manifest or file inventory is invalid');
});

test('rejects unmanifested files and corrupt bytes', async () => {
  const { root } = await fixture();
  await expect(validateKokoroGpuAssets(root)).rejects.toThrow('hash or size mismatch');
  await writeFile(path.join(root, 'extra.bin'), 'extra');
  await expect(validateKokoroGpuAssets(root)).rejects.toThrow('directory has an invalid inventory');
});
