import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  gateRecordPath,
  readGateRecord,
  skipVariable,
  treeOf,
  writeGateRecord,
} from '../../tools/quality-gate-record.ts';

const hooks = path.resolve('.githooks');
let root = '';
let remote = '';

function git(directory: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
  expect(result.status, `git ${args.join(' ')}\n${result.stdout}${result.stderr}`).toBe(0);
  return result.stdout.trim();
}

function commit(name: string): string {
  writeFileSync(path.join(root, name), name);
  git(root, 'add', name);
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', name);
  return git(root, 'rev-parse', 'HEAD');
}

function push(ref: string, environment: Record<string, string> = {}) {
  return spawnSync('git', ['push', 'origin', ref], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, [skipVariable]: '', ...environment },
  });
}

beforeEach(() => {
  const base = mkdtempSync(path.join(os.tmpdir(), 'grand-transition-record-'));
  root = path.join(base, 'work');
  remote = path.join(base, 'remote.git');
  mkdirSync(root);
  git(base, 'init', '--bare', '--initial-branch=main', remote);
  git(root, 'init', '--initial-branch=main');
  git(root, 'remote', 'add', 'origin', remote);
  // Keep the gate record out of the working tree, as the repository's own
  // ignore file does for `tmp/`.
  writeFileSync(path.join(root, '.gitignore'), 'tmp/\n');
  git(root, 'add', '.gitignore');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'start');
});

afterEach(() => {
  rmSync(path.dirname(root), { recursive: true, force: true });
});

describe('gate record', () => {
  test('is written only on a clean working tree and holds the tree of HEAD', () => {
    commit('one');
    const written = writeGateRecord('quick', { cleanBefore: true, directory: root });
    expect(written).toEqual({ written: true });
    expect(readGateRecord(root)).toMatchObject({
      mode: 'quick',
      tree: treeOf('HEAD', root),
      node: process.version,
    });
    expect(JSON.parse(readFileSync(gateRecordPath(root), 'utf8'))).toHaveProperty('recordedAt');
  });

  test('is not written when the working tree has changes', () => {
    commit('one');
    writeFileSync(path.join(root, 'one'), 'changed');
    expect(writeGateRecord('full', { cleanBefore: true, directory: root })).toEqual({
      written: false,
      reason: 'the working tree has changes',
    });
    expect(readGateRecord(root)).toBeNull();
  });

  test('is not written when the tree had changes before the gate ran', () => {
    commit('one');
    expect(writeGateRecord('quick', { cleanBefore: false, directory: root })).toMatchObject({
      written: false,
    });
  });
});

describe('pre-push check', () => {
  beforeEach(() => {
    git(root, 'config', 'core.hooksPath', hooks.replaceAll('\\', '/'));
  });

  test('stops a push to main of a tree without a record and gives the gate command', () => {
    commit('one');
    const result = push('HEAD:refs/heads/main');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('npm run quality:quick');
    expect(result.stderr).toContain(treeOf('HEAD', root)!);
  });

  test('stops a push to main when the record belongs to an earlier tree', () => {
    commit('one');
    writeGateRecord('quick', { cleanBefore: true, directory: root });
    commit('two');
    expect(push('HEAD:refs/heads/main').status).not.toBe(0);
  });

  test('continues a push to main of a tree with a record', () => {
    commit('one');
    writeGateRecord('quick', { cleanBefore: true, directory: root });
    const result = push('HEAD:refs/heads/main');
    expect(result.status, result.stderr).toBe(0);
  });

  test('continues a push to a different branch without a record', () => {
    commit('one');
    const result = push('HEAD:refs/heads/feature');
    expect(result.status, result.stderr).toBe(0);
  });

  test('continues a push to main with the skip variable', () => {
    commit('one');
    const result = push('HEAD:refs/heads/main', { [skipVariable]: '1' });
    expect(result.status, result.stderr).toBe(0);
  });
});
