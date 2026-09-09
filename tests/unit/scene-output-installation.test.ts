import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
// @ts-expect-error The production image tool is a native ECMAScript module.
import { installOutputs } from '../../tools/build-scene-assets.mjs';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename), rm: vi.fn(actual.rm) };
});

const roots: string[] = [];
afterEach(async () => {
  vi.mocked(rename).mockReset();
  vi.mocked(rm).mockReset();
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  vi.mocked(rename).mockImplementation(actual.rename);
  vi.mocked(rm).mockImplementation(actual.rm);
  await Promise.all(roots.splice(0).map((root) => actual.rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-scene-install-'));
  roots.push(root);
  const staging = path.join(root, '.staging');
  await mkdir(path.join(root, 'variants'));
  await mkdir(path.join(staging, 'variants'), { recursive: true });
  await writeFile(path.join(root, 'variants', 'old.webp'), 'old pixels');
  await writeFile(path.join(root, 'scene-manifest.json'), 'old manifest');
  await writeFile(path.join(staging, 'variants', 'new.webp'), 'new pixels');
  return { root, staging };
}

test.each([1, 2, 3, 4])('preserves the previous scene package when rename %s fails', async (failure) => {
  const { root, staging } = await fixture();
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  let calls = 0;
  vi.mocked(rename).mockImplementation(async (from, to) => {
    if (++calls === failure) throw new Error('Simulated rename failure');
    await actual.rename(from, to);
  });
  await expect(installOutputs(root, staging, 'new manifest')).rejects.toThrow('Simulated rename failure');
  expect(await readFile(path.join(root, 'scene-manifest.json'), 'utf8')).toBe('old manifest');
  expect(await readdir(path.join(root, 'variants'))).toEqual(['old.webp']);
  expect(await readFile(path.join(root, 'variants', 'old.webp'), 'utf8')).toBe('old pixels');
});

test('keeps the installed package when obsolete backup removal fails', async () => {
  const { root, staging } = await fixture();
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  vi.mocked(rm).mockImplementation(async (target, options) => {
    if (String(target).includes('scene-manifest.json.backup-')) throw new Error('Simulated cleanup failure');
    await actual.rm(target, options);
  });
  await expect(installOutputs(root, staging, 'new manifest')).rejects.toThrow('Simulated cleanup failure');
  expect(await readFile(path.join(root, 'scene-manifest.json'), 'utf8')).toBe('new manifest');
  expect(await readdir(path.join(root, 'variants'))).toEqual(['new.webp']);
  expect(await readFile(path.join(root, 'variants', 'new.webp'), 'utf8')).toBe('new pixels');
});
