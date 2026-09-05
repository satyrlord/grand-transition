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

const publicState = {
  phase: 'results', round: 1, activePlayerId: 'player-one',
  players: {
    'player-one': { characterId: 'first', pride: 100, charge: 0, bubble: 'First.', construction: null },
    'player-two': { characterId: 'second', pride: 0, charge: 0, bubble: 'Second.', construction: null },
  },
  board: [], latestResolution: null,
};
const records = [
  { type: 'match-log', formatVersion: 1, seed: 73, mode: 'hotseat', sceneId: 'studio',
    players: [{ playerId: 'player-one', characterId: 'first' }, { playerId: 'player-two', characterId: 'second' }] },
  { type: 'action', sequence: 1, command: { type: 'resolve-round', source: 'user', payload: {} },
    move: { type: 'resolve-round' }, outcome: 'accepted', errorCode: null, state: publicState },
  { type: 'match-complete', winner: 'player-one', roundCount: 1, state: publicState },
];
const validLog = records.map((record) => JSON.stringify(record)).join('\n') + '\n';

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

  test('creates missing nested log directories inside the repository', async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-nested-log-'));
    const filename = await writeGameLog({
      text: validLog,
      repositoryRoot,
      logDirectory: path.join(repositoryRoot, 'new', 'nested', 'logs'),
    });
    expect(filename).toMatch(/^new\/nested\/logs\/match-/u);
    expect(await readFile(path.join(repositoryRoot, filename), 'utf8')).toBe(validLog);
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
    await expect(
      writeGameLog({
        text: validLog,
        repositoryRoot,
        logDirectory: path.join(linkedDirectory, 'new', 'logs'),
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


test.each([
  (data: typeof records) => { data[0]!.players = undefined; },
  (data: typeof records) => { data[1]!.sequence = 2; },
  (data: typeof records) => { data[2]!.winner = 'unknown-player'; },
  (data: typeof records) => { (data[1]!.state!.players['player-one'] as unknown as Record<string, unknown>).privateCardId = 'secret'; },
  (data: typeof records) => { data.pop(); },
])('rejects malformed complete log records before writing', async (mutate) => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-invalid-log-'));
  const data = structuredClone(records);
  mutate(data);
  const text = data.map((record) => JSON.stringify(record)).join('\n') + '\n';
  await expect(writeGameLog({ text, repositoryRoot })).rejects.toThrow();
  expect(await readdir(repositoryRoot)).toEqual([]);
});

test('rejects malformed interior JSON and data after completion', async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-invalid-lines-'));
  for (const text of [validLog.replace('\n', '\nnot-json\n'), validLog + '{}\n']) {
    await expect(writeGameLog({ text, repositoryRoot })).rejects.toThrow();
  }
  expect(await readdir(repositoryRoot)).toEqual([]);
});


test('accepts redacted private rejection and rejects private identifiers in it', async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'gt-redacted-log-'));
  const data: Array<Record<string, unknown>> = structuredClone(records);
  data[1] = {
    type: 'action', sequence: 1,
    command: { type: 'select-phrase', source: 'user', actorId: 'player-one', payload: { card: { source: 'private' } } },
    move: { type: 'select-phrase', actorId: 'player-one', source: 'private' },
    outcome: 'rejected', errorCode: 'card-unavailable', state: publicState,
  };
  const serialize = () => data.map((record) => JSON.stringify(record)).join('\n') + '\n';
  await expect(writeGameLog({ text: serialize(), repositoryRoot })).resolves.toContain('match-');
  const bad = data[1]!.move as Record<string, unknown>;
  bad.cardId = 'unselected-secret';
  await expect(writeGameLog({ text: serialize(), repositoryRoot })).rejects.toThrow('selection');
});
