import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  maximumGameLogBytes,
  maximumStoredGameLogs,
  writeGameLog,
} from '../../tools/game-log-writer';

const validLog = `${JSON.stringify({
  type: 'match-log',
  formatVersion: 1,
  seed: 73,
})}\n${JSON.stringify({ type: 'match-complete', winner: 'player-one' })}\n`;

describe('game log writer', () => {
  test('writes collision-safe log files inside the ignored repository folder', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-log-'));
    const first = await writeGameLog({
      text: validLog,
      repositoryRoot,
      now: new Date('2026-08-28T12:00:00Z'),
    });
    const second = await writeGameLog({
      text: validLog,
      repositoryRoot,
      now: new Date('2026-08-28T18:00:00Z'),
    });
    expect(first).toBe('logs/match-2026-08-28-seed-73.log');
    expect(second).toBe('logs/match-2026-08-28-seed-73-2.log');
    expect(await readFile(path.join(repositoryRoot, first), 'utf8')).toBe(
      validLog,
    );
  });

  test('rejects invalid, empty, oversized, and out-of-repository writes', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-log-'));
    await expect(writeGameLog({ text: '', repositoryRoot })).rejects.toThrow(
      'empty',
    );
    await expect(
      writeGameLog({ text: '{"type":"wrong"}\n', repositoryRoot }),
    ).rejects.toThrow('header');
    await expect(
      writeGameLog({
        text: `${validLog}${'x'.repeat(maximumGameLogBytes)}`,
        repositoryRoot,
      }),
    ).rejects.toThrow('exceeds');
    await expect(
      writeGameLog({
        text: validLog,
        repositoryRoot,
        logDirectory: path.dirname(repositoryRoot),
      }),
    ).rejects.toThrow('inside the repository');
    await expect(
      writeGameLog({
        text: validLog.replace('"seed":73', '"seed":-1'),
        repositoryRoot,
      }),
    ).rejects.toThrow('header');
    await expect(
      writeGameLog({
        text: validLog.replace('"seed":73', '"seed":4294967296'),
        repositoryRoot,
      }),
    ).rejects.toThrow('header');
  });

  test('rejects a log directory symlink that resolves outside the repository', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-log-'));
    const outsideDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'gt-outside-'),
    );
    const linkedDirectory = path.join(repositoryRoot, 'linked-logs');
    await symlink(
      outsideDirectory,
      linkedDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    await expect(
      writeGameLog({
        text: validLog,
        repositoryRoot,
        logDirectory: linkedDirectory,
      }),
    ).rejects.toThrow('inside the repository');
    expect(await readdir(outsideDirectory)).toEqual([]);
  });

  test('retains only the newest 50 match files and preserves unrelated logs', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-log-'));
    const logDirectory = path.join(repositoryRoot, 'logs');
    await mkdir(logDirectory);
    await writeFile(path.join(logDirectory, 'keep.log'), 'unrelated\n');
    for (let index = 0; index <= maximumStoredGameLogs; index += 1) {
      await writeGameLog({
        text: validLog.replace('"seed":73', `"seed":${index}`),
        repositoryRoot,
        now: new Date(Date.UTC(2026, 7, 1 + index)),
      });
    }
    const files = await readdir(logDirectory);
    expect(files.filter((file) => file.startsWith('match-'))).toHaveLength(
      maximumStoredGameLogs,
    );
    expect(files).toContain('keep.log');
    expect(files).not.toContain('match-2026-08-01-seed-0.log');
    expect(files).toContain('match-2026-09-20-seed-50.log');
  });
});
