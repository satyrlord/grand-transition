import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';

const execute = promisify(execFile);
const script = path.resolve('tools/prepare-checkout.ts');
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-lfs-'));
  directories.push(root);
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: path.join(root, 'global-config'),
    GIT_CONFIG_NOSYSTEM: '1',
  };
  const remote = path.join(root, 'remote.git');
  const seed = path.join(root, 'seed');
  const checkout = path.join(root, 'code checkout');
  const git = (cwd: string, ...args: string[]) => execute('git', args, { cwd, env });
  await git(root, 'lfs', 'install', '--skip-repo');
  await git(root, 'init', '--bare', '--initial-branch=main', remote);
  await git(root, 'init', '--initial-branch=main', seed);
  await git(seed, 'config', 'user.email', 'fixture@example.invalid');
  await git(seed, 'config', 'user.name', 'LFS fixture');
  await git(seed, 'lfs', 'install', '--local');
  await git(seed, 'lfs', 'track', '*.bin');
  const payload = 'A small local asset. No GitHub download is necessary.\n';
  await writeFile(path.join(seed, 'asset.bin'), payload);
  await git(seed, 'add', '.');
  await git(seed, 'commit', '-m', 'fixture');
  await git(seed, 'remote', 'add', 'origin', remote);
  await git(seed, 'push', 'origin', 'main');
  await git(
    root,
    '-c',
    'filter.lfs.smudge=',
    '-c',
    'filter.lfs.process=',
    '-c',
    'filter.lfs.required=false',
    'clone',
    remote,
    checkout,
  );
  const pointer = await readFile(path.join(checkout, 'asset.bin'), 'utf8');
  expect(pointer).toContain('version https://git-lfs.github.com/spec/v1');
  const prepare = (mode: string, cwd = checkout) =>
    execute(process.execPath, [script, mode], { cwd, env });
  const disconnect = () =>
    git(checkout, 'remote', 'set-url', 'origin', path.join(root, 'unavailable.git'));
  return { root, env, git, checkout, payload, pointer, prepare, disconnect };
}

describe('LFS checkout preparation', () => {
  test('prepares a source-only checkout offline without changing global settings or local edits', async () => {
    const item = await fixture();
    const globalBefore = await readFile(item.env.GIT_CONFIG_GLOBAL, 'utf8');
    await item.disconnect();
    await writeFile(path.join(item.checkout, 'notes.txt'), 'Keep my work.');

    await item.prepare('code');

    expect(await readFile(path.join(item.checkout, 'asset.bin'), 'utf8')).toBe(item.pointer);
    expect(await readFile(path.join(item.checkout, 'notes.txt'), 'utf8')).toBe('Keep my work.');
    expect(
      (await item.git(item.checkout, 'config', '--local', '--get', 'filter.lfs.process')).stdout,
    ).toContain('--skip');
    expect(await readFile(item.env.GIT_CONFIG_GLOBAL, 'utf8')).toBe(globalBefore);
  });

  test('downloads assets only on request and reuses their objects offline in a linked worktree', async () => {
    const item = await fixture();
    await item.prepare('assets');
    expect(await readFile(path.join(item.checkout, 'asset.bin'), 'utf8')).toBe(item.payload);
    await item.disconnect();
    const worktree = path.join(item.root, 'task checkout');
    await item.git(item.checkout, 'worktree', 'add', '-b', 'task', worktree, 'HEAD');
    await writeFile(path.join(worktree, 'asset.bin'), item.pointer);

    await item.prepare('code', worktree);
    expect(await readFile(path.join(worktree, 'asset.bin'), 'utf8')).toBe(item.payload);
    // A repeated asset preparation also succeeds without its remote.
    await item.prepare('assets', worktree);
    expect(await readFile(path.join(item.checkout, 'asset.bin'), 'utf8')).toBe(item.payload);
  });

  test('fails asset preparation when a missing object cannot be downloaded', async () => {
    const item = await fixture();
    await item.disconnect();

    await expect(item.prepare('assets')).rejects.toMatchObject({
      code: expect.any(Number),
      stdout: expect.not.stringContaining('Assets downloaded and validated.'),
    });
    expect(await readFile(path.join(item.checkout, 'asset.bin'), 'utf8')).toBe(item.pointer);
  });

  test('rejects an unknown mode before changing checkout configuration', async () => {
    const item = await fixture();
    const config = path.join(item.checkout, '.git/config');
    const before = await readFile(config, 'utf8');

    await expect(item.prepare('unknown')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Use npm run checkout:code or npm run checkout:assets.'),
    });
    expect(await readFile(config, 'utf8')).toBe(before);
  });

  test('fails validation when a cached object has incorrect bytes', async () => {
    const item = await fixture();
    await item.prepare('assets');
    const oid = item.pointer.match(/oid sha256:([a-f0-9]{64})/u)![1]!;
    const object = path.join(
      item.checkout,
      '.git/lfs/objects',
      oid.slice(0, 2),
      oid.slice(2, 4),
      oid,
    );
    await writeFile(object, 'Incorrect bytes.');
    await item.disconnect();

    await expect(item.prepare('assets')).rejects.toMatchObject({
      code: expect.any(Number),
      stdout: expect.not.stringContaining('Assets downloaded and validated.'),
    });
  });
});
