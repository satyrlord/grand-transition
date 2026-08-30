import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import { createSimulationSetup, simulateMatch } from '../../src/engine/simulation';
import { createBrowserStorage } from '../../src/persistence/browser-storage';
import {
  createMatchHistoryEntry,
  decodeMatchHistory,
  encodeMatchHistory,
  matchHistoryKind,
  MatchHistoryRepository,
  matchHistorySchemaVersion,
  matchHistoryStorageKey,
  type MatchHistoryEntry,
} from '../../src/persistence/match-history';
import type { StoragePort } from '../../src/persistence/storage-port';

const completed = simulateMatch(
  20_260_829,
  createSimulationSetup(sampleContent),
  {
    catalog: sampleContent,
    locale: englishGameLocale,
    balance: basicScoringBalance,
  },
);

describe('persistent match history', () => {
  test('maps browser storage security, quota, and unavailable failures', () => {
    const security = createBrowserStorage(
      throwingStorage({
        read: new DOMException('Storage is blocked.', 'SecurityError'),
      }),
    );
    const quota = createBrowserStorage(
      throwingStorage({
        write: new DOMException('Storage is full.', 'QuotaExceededError'),
      }),
    );
    const unavailable = createBrowserStorage(
      throwingStorage({ remove: new Error('Storage is unavailable.') }),
    );

    expect(security.read('history')).toEqual({
      ok: false,
      code: 'storage-security',
    });
    expect(quota.write('history', 'value')).toEqual({
      ok: false,
      code: 'storage-quota',
    });
    expect(unavailable.remove('history')).toEqual({
      ok: false,
      code: 'storage-unavailable',
    });
  });

  test('round-trips normalized public replay and match-log data', () => {
    const entry = historyEntry('match-one', '2026-08-29T12:00:00.000Z');
    const encoded = encodeMatchHistory({
      schemaVersion: matchHistorySchemaVersion,
      kind: matchHistoryKind,
      entries: [entry],
    });
    const decoded = decodeMatchHistory(encoded);

    expect(decoded).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ entries: [entry] }),
      }),
    );
    expect(encoded.endsWith('\n')).toBe(true);
    expect(encoded).not.toMatch(
      /userAgent|browserId|machine|privateHand|unselected/iu,
    );
    expect(JSON.parse(encoded)).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        kind: 'grand-transition-match-history',
      }),
    );
    const sentences = entry.matchLog.sentences!;
    expect(sentences).toHaveLength(
      entry.matchLog.rounds.length * entry.matchLog.setup.players.length,
    );
    const usedPhrases = sentences.flatMap((sentence) => sentence.phrases);
    expect(usedPhrases.length).toBeGreaterThan(0);
    expect(
      usedPhrases.every(
        (phrase) => phrase.phraseId.length > 0 && phrase.text.length > 0,
      ),
    ).toBe(true);
    expect(encoded).toContain(usedPhrases[0]!.text);
  });

  test('keeps an older valid entry without public sentence records', () => {
    const entry = historyEntry('older-entry', '2026-08-29T12:30:00.000Z');
    const stored = JSON.parse(
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [entry],
      }),
    ) as { entries: Array<{ matchLog: { sentences?: unknown } }> };
    delete stored.entries[0]!.matchLog.sentences;

    const decoded = decodeMatchHistory(JSON.stringify(stored));

    expect(decoded.ok).toBe(true);
    expect(
      decoded.ok ? decoded.value.entries[0]?.matchLog.sentences : null,
    ).toBeUndefined();
  });

  test('stores every entry, restores newest first, and ignores duplicate IDs', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.port);
    const first = historyEntry('match-one', '2026-08-29T12:00:00.000Z');
    const second = historyEntry('match-two', '2026-08-29T13:00:00.000Z');

    repository.append(first);
    repository.append(second);
    repository.append(second);

    expect(repository.snapshot().entries.map(({ id }) => id)).toEqual([
      'match-two',
      'match-one',
    ]);
    expect(storage.writes).toHaveLength(2);
    const stored = storage.values.get(matchHistoryStorageKey)!;
    const decoded = decodeMatchHistory(stored);
    expect(decoded.ok && decoded.value.entries.map(({ id }) => id)).toEqual([
      'match-one',
      'match-two',
    ]);

    const restored = new MatchHistoryRepository(storage.port);
    expect(restored.snapshot().entries.map(({ id }) => id)).toEqual([
      'match-two',
      'match-one',
    ]);
  });

  test.each([
    'storage-quota',
    'storage-security',
    'storage-unavailable',
  ] as const)('keeps the completed match in memory after %s', (failureCode) => {
    const storage = memoryStorage({ writeFailure: failureCode });
    const repository = new MatchHistoryRepository(storage.port);

    const snapshot = repository.append(
      historyEntry('session-match', '2026-08-29T14:00:00.000Z'),
    );

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.persistenceFailure).toBe(failureCode);
    expect(storage.values.has(matchHistoryStorageKey)).toBe(false);
  });

  test.each([
    ['invalid JSON', '{', 'invalid-json'],
    [
      'unsupported version',
      JSON.stringify({
        schemaVersion: 2,
        kind: matchHistoryKind,
        entries: [],
      }),
      'unsupported-version',
    ],
    [
      'invalid document',
      JSON.stringify({
        schemaVersion: 1,
        kind: matchHistoryKind,
        entries: 'wrong',
      }),
      'invalid-data',
    ],
  ])('preserves %s bytes and keeps new history in memory', (_, bytes, code) => {
    const storage = memoryStorage({ initialValue: bytes });
    const repository = new MatchHistoryRepository(storage.port);

    const snapshot = repository.append(
      historyEntry('session-match', '2026-08-29T15:00:00.000Z'),
    );

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.persistenceFailure).toBe(code);
    expect(storage.writes).toHaveLength(0);
    expect(storage.values.get(matchHistoryStorageKey)).toBe(bytes);
  });

  test('rejects a replay and match-log pair that describes different results', () => {
    const entry = historyEntry('mismatched', '2026-08-29T15:30:00.000Z');
    const stored = JSON.parse(
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [entry],
      }),
    ) as {
      entries: Array<{
        matchLog: {
          winner: string;
        };
      }>;
    };
    const opponentId = entry.matchLog.setup.players.find(
      (player) => player.playerId !== entry.matchLog.winner,
    )!.playerId;
    stored.entries[0]!.matchLog.winner = opponentId;

    expect(decodeMatchHistory(JSON.stringify(stored))).toEqual({
      ok: false,
      code: 'invalid-data',
    });
  });

  test('rejects a replay and match-log pair from different schema versions', () => {
    const entry = historyEntry('mixed-version', '2026-08-29T15:45:00.000Z');
    expect(() =>
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [
          {
            ...entry,
            matchLog: { ...entry.matchLog, schemaVersion: 1 },
          },
        ],
      }),
    ).toThrow('invalid entry');
  });

  test('keeps an invalid generated entry in memory without blocking the caller', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.port);
    const entry = historyEntry('invalid-entry', '2026-08-29T15:45:00.000Z');
    const opponentId = entry.matchLog.setup.players.find(
      (player) => player.playerId !== entry.matchLog.winner,
    )!.playerId;
    const invalidEntry: MatchHistoryEntry = {
      ...entry,
      matchLog: { ...entry.matchLog, winner: opponentId },
    };

    const snapshot = repository.append(invalidEntry);

    expect(snapshot.entries).toEqual([invalidEntry]);
    expect(snapshot.persistenceFailure).toBe('invalid-data');
    expect(storage.writes).toHaveLength(0);
  });

  test('rejects nonterminal matches and invalid completion times', () => {
    expect(() =>
      createMatchHistoryEntry(
        { ...completed.finalState, phase: 'setup', winner: undefined },
        {
          id: 'not-complete',
          initialSeed: 20_260_829,
          completedAt: '2026-08-29T12:00:00.000Z',
          settings: settings(),
        },
      ),
    ).toThrow('Match history requires a completed match.');
    expect(() =>
      createMatchHistoryEntry(completed.finalState, {
        id: 'bad-time',
        initialSeed: 20_260_829,
        completedAt: 'yesterday',
        settings: settings(),
      }),
    ).toThrow('Match history requires a valid ISO completion time.');
  });
});

function historyEntry(id: string, completedAt: string): MatchHistoryEntry {
  return createMatchHistoryEntry(completed.finalState, {
    id,
    initialSeed: 20_260_829,
    completedAt,
    settings: settings(),
  });
}

function settings() {
  return {
    turnTimerSeconds: 30 as const,
    autoComplete: true,
    phraseColorCoding: true,
  };
}

function throwingStorage(failures: Readonly<{
  read?: Error;
  write?: Error;
  remove?: Error;
}>): Storage {
  return {
    length: 0,
    clear() {},
    getItem() {
      if (failures.read) throw failures.read;
      return null;
    },
    key() {
      return null;
    },
    removeItem() {
      if (failures.remove) throw failures.remove;
    },
    setItem() {
      if (failures.write) throw failures.write;
    },
  };
}

function memoryStorage(input: Readonly<{
  initialValue?: string;
  readFailure?: string;
  writeFailure?: string;
}> = {}): Readonly<{
  port: StoragePort;
  values: Map<string, string>;
  writes: readonly Readonly<{ key: string; value: string }>[];
}> {
  const values = new Map<string, string>();
  if (input.initialValue !== undefined) {
    values.set(matchHistoryStorageKey, input.initialValue);
  }
  const writes: { key: string; value: string }[] = [];
  return {
    values,
    writes,
    port: {
      read: (key) =>
        input.readFailure
          ? { ok: false, code: input.readFailure }
          : { ok: true, value: values.get(key) ?? null },
      write: (key, value) => {
        if (input.writeFailure) return { ok: false, code: input.writeFailure };
        writes.push({ key, value });
        values.set(key, value);
        return { ok: true, value: undefined };
      },
      remove: (key) => {
        values.delete(key);
        return { ok: true, value: undefined };
      },
    },
  };
}
