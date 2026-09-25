import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation.ts';
import { createBrowserStorage } from '../../src/persistence/browser-storage.ts';
import {
  createMatchHistoryEntry,
  decodeMatchHistory,
  decodeMatchHistoryEntry,
  encodeMatchHistory,
  encodeMatchHistoryEntry,
  matchHistoryKind,
  MatchHistoryRepository,
  matchHistorySchemaVersion,
  matchHistoryStorageKey,
  type MatchHistoryEntry,
} from '../../src/persistence/match-history.ts';
import type { RecordStoragePort, StoragePort } from '../../src/persistence/storage-port.ts';
import { replaySchemaVersion } from '../../src/persistence/codecs/replay-codec.ts';

const completed = simulateMatch(
  20_260_829,
  createSimulationSetup(gameCatalog, { gameLocale: 'en' }),
  {
    catalog: gameCatalog,
    locale: englishGameLocale,
    balance: basicScoringBalance,
  },
);

describe('persistent match history', () => {
  test('updates terminal speech diagnostics on the same history entry', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.records, storage.port);
    const entry = historyEntry('speech-match', '2026-08-29T12:00:00.000Z');
    repository.append(entry);
    expect(
      new MatchHistoryRepository(storage.records, storage.port).snapshot().entries[0]!
        .speechDiagnostics,
    ).toBeUndefined();
    const diagnostics = {
      schemaVersion: 1 as const,
      status: 'finished' as const,
      droppedEvents: 0,
      events: [
        {
          type: 'playback-end' as const,
          round: 1,
          speakerId: entry.matchLog.winner,
          voice: 'kokoro:bm_george',
          rate: 1.2,
          pitch: 1,
          elapsedMs: 1234,
        },
      ],
    };
    repository.updateSpeechDiagnostics(entry.id, diagnostics);
    const restored = new MatchHistoryRepository(storage.records, storage.port).snapshot().entries;
    expect(storage.writes.map(({ id }) => id)).toEqual([entry.id, entry.id]);
    expect(restored).toHaveLength(1);
    expect(restored[0]).toEqual({ ...entry, speechDiagnostics: diagnostics });
    repository.updateSpeechDiagnostics('missing-match', diagnostics);
    expect(repository.snapshot().entries).toEqual(restored);
  });
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

  test('stores history without indentation and still reads indented history', () => {
    const document = {
      schemaVersion: matchHistorySchemaVersion,
      kind: matchHistoryKind,
      entries: [historyEntry('match-one', '2026-08-29T12:00:00.000Z')],
    } as const;
    const encoded = encodeMatchHistory(document);
    // Entries are never removed, so indentation would halve the number of
    // matches that fit in the browser storage quota.
    expect(encoded).toBe(`${JSON.stringify(JSON.parse(encoded))}\n`);
    const indented = `${JSON.stringify(JSON.parse(encoded), null, 2)}\n`;
    expect(encoded.length).toBeLessThan(indented.length * 0.75);
    expect(decodeMatchHistory(indented)).toEqual(decodeMatchHistory(encoded));
  });

  test('round-trips normalized public replay and match-log data', () => {
    const entry = historyEntry('match-one', '2026-08-29T12:00:00.000Z');
    expect(entry.replay.schemaVersion).toBe(replaySchemaVersion);
    expect(entry.matchLog.schemaVersion).toBe(replaySchemaVersion);
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
    expect(encoded).not.toMatch(/userAgent|browserId|machine|privateHand|unselected/iu);
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
      usedPhrases.every((phrase) => phrase.phraseId.length > 0 && phrase.text.length > 0),
    ).toBe(true);
    expect(encoded).toContain(usedPhrases[0]!.text);
  });

  test.each([0, 1, 6, 12] as const)(
    'drops a replay and match-log pair recorded under document version %s and keeps the rest',
    (schemaVersion) => {
      const stale = historyEntry(`stale-entry-${schemaVersion}`, '2026-08-29T12:30:00.000Z');
      const current = historyEntry('current-entry', '2026-08-29T13:30:00.000Z');
      const stored = JSON.parse(
        encodeMatchHistory({
          schemaVersion: matchHistorySchemaVersion,
          kind: matchHistoryKind,
          entries: [stale, current],
        }),
      ) as {
        entries: Array<{
          replay: { schemaVersion: number };
          matchLog: { schemaVersion: number };
        }>;
      };
      stored.entries[0]!.replay.schemaVersion = schemaVersion;
      stored.entries[0]!.matchLog.schemaVersion = schemaVersion;

      const decoded = decodeMatchHistory(JSON.stringify(stored));

      expect(decoded.ok).toBe(true);
      expect(decoded.ok && decoded.value.entries.map(({ id }) => id)).toEqual(['current-entry']);
    },
  );

  test('ignores a foreign pair before validating retained-entry identity and time', () => {
    const current = historyEntry('current-entry', '2026-08-29T13:30:00.000Z');
    const stored = JSON.parse(
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [current],
      }),
    ) as { entries: Array<Record<string, unknown>> };
    const foreign = structuredClone(stored.entries[0]!);
    foreign.completedAt = 'not-an-iso-time';
    (foreign.replay as { schemaVersion: number }).schemaVersion = replaySchemaVersion + 1;
    (foreign.matchLog as { schemaVersion: number }).schemaVersion = replaySchemaVersion + 1;
    stored.entries.push(foreign);

    const decoded = decodeMatchHistory(JSON.stringify(stored));

    expect(decoded.ok && decoded.value.entries.map(({ id }) => id)).toEqual(['current-entry']);
  });

  test('rejects mismatched replay and match-log versions instead of ignoring them', () => {
    const entry = historyEntry('mixed-version', '2026-08-29T15:45:00.000Z');
    const stored = JSON.parse(
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [entry],
      }),
    ) as {
      entries: Array<{
        replay: { schemaVersion: number };
        matchLog: { schemaVersion: number };
      }>;
    };
    stored.entries[0]!.replay.schemaVersion = replaySchemaVersion + 1;

    expect(decodeMatchHistory(JSON.stringify(stored))).toEqual({
      ok: false,
      code: 'invalid-data',
    });
  });

  test('stores every entry, restores newest first, and ignores duplicate IDs', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.records, storage.port);
    const first = historyEntry('match-one', '2026-08-29T12:00:00.000Z');
    const second = historyEntry('match-two', '2026-08-29T13:00:00.000Z');

    repository.append(first);
    repository.append(second);
    repository.append(second);

    expect(repository.snapshot().entries.map(({ id }) => id)).toEqual(['match-two', 'match-one']);
    expect(storage.writes).toHaveLength(2);
    expect(
      [...storage.recordValues.values()].map((serialized) => {
        const decoded = decodeMatchHistoryEntry(serialized);
        return decoded.ok && decoded.value?.id;
      }),
    ).toEqual(['match-one', 'match-two']);

    const restored = new MatchHistoryRepository(storage.records, storage.port);
    expect(restored.snapshot().entries.map(({ id }) => id)).toEqual(['match-two', 'match-one']);
  });

  test.each(['storage-quota', 'storage-security', 'storage-unavailable'] as const)(
    'keeps the completed match in memory after %s',
    (failureCode) => {
      const storage = memoryStorage({ writeFailure: failureCode });
      const repository = new MatchHistoryRepository(storage.records, storage.port);

      const snapshot = repository.append(historyEntry('session-match', '2026-08-29T14:00:00.000Z'));

      expect(snapshot.entries).toHaveLength(1);
      expect(snapshot.persistenceFailure).toBe(failureCode);
      expect(storage.recordValues.size).toBe(0);
    },
  );

  test('keeps entries in memory after a background storage failure', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.records, storage.port);
    repository.append(historyEntry('first-match', '2026-08-29T14:00:00.000Z'));

    expect(repository.storageFailed('storage-quota').persistenceFailure).toBe('storage-quota');
    const snapshot = repository.append(historyEntry('second-match', '2026-08-29T14:30:00.000Z'));

    expect(snapshot.entries.map(({ id }) => id)).toEqual(['second-match', 'first-match']);
    expect(storage.writes.map(({ id }) => id)).toEqual(['first-match']);
  });

  test('moves a single-key history document into entry records', () => {
    const first = historyEntry('legacy-one', '2026-08-29T12:00:00.000Z');
    const second = historyEntry('legacy-two', '2026-08-29T13:00:00.000Z');
    const storage = memoryStorage({
      initialValue: encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [first, second],
      }),
      initialRecords: { [first.id]: encodeMatchHistoryEntry(first) },
    });

    const repository = new MatchHistoryRepository(storage.records, storage.port);

    expect(repository.snapshot().entries.map(({ id }) => id)).toEqual(['legacy-two', 'legacy-one']);
    expect(repository.snapshot().persistenceFailure).toBeNull();
    // The first entry was already moved, so only the second one is written.
    expect(storage.writes.map(({ id }) => id)).toEqual(['legacy-two']);
    expect(storage.values.has(matchHistoryStorageKey)).toBe(false);
    expect(new MatchHistoryRepository(storage.records, storage.port).snapshot().entries).toEqual(
      repository.snapshot().entries,
    );
  });

  test('removes a stored entry record from another replay version', () => {
    const entry = historyEntry('current', '2026-08-29T12:00:00.000Z');
    const foreign = JSON.parse(encodeMatchHistoryEntry(entry)) as {
      id: string;
      replay: { schemaVersion: number };
      matchLog: { schemaVersion: number };
    };
    foreign.id = 'foreign';
    foreign.replay.schemaVersion = replaySchemaVersion + 1;
    foreign.matchLog.schemaVersion = replaySchemaVersion + 1;
    const storage = memoryStorage({
      initialRecords: { foreign: JSON.stringify(foreign), current: encodeMatchHistoryEntry(entry) },
    });

    const repository = new MatchHistoryRepository(storage.records, storage.port);

    expect(repository.snapshot().entries.map(({ id }) => id)).toEqual(['current']);
    expect([...storage.recordValues.keys()]).toEqual(['current']);
  });

  test('preserves an invalid entry record and keeps new history in memory', () => {
    const storage = memoryStorage({ initialRecords: { broken: '{' } });
    const repository = new MatchHistoryRepository(storage.records, storage.port);

    const snapshot = repository.append(historyEntry('session-match', '2026-08-29T15:00:00.000Z'));

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.persistenceFailure).toBe('invalid-json');
    expect(storage.recordValues.get('broken')).toBe('{');
    expect(storage.writes).toHaveLength(0);
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
    const repository = new MatchHistoryRepository(storage.records, storage.port);

    const snapshot = repository.append(historyEntry('session-match', '2026-08-29T15:00:00.000Z'));

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
    const foreignMatchLog = {
      ...entry.matchLog,
      schemaVersion: replaySchemaVersion + 1,
    } as unknown as MatchHistoryEntry['matchLog'];
    expect(() =>
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: [{ ...entry, matchLog: foreignMatchLog }],
      }),
    ).toThrow('invalid entry');
  });

  test('keeps an invalid generated entry in memory without blocking the caller', () => {
    const storage = memoryStorage();
    const repository = new MatchHistoryRepository(storage.records, storage.port);
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
          gameLocale: 'en',
        },
      ),
    ).toThrow('Match history requires a completed match.');
    expect(() =>
      createMatchHistoryEntry(completed.finalState, {
        id: 'bad-time',
        initialSeed: 20_260_829,
        completedAt: 'yesterday',
        settings: settings(),
        gameLocale: 'en',
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
    gameLocale: 'en',
  });
}

function settings() {
  return {
    turnTimerSeconds: 30 as const,
    autoComplete: true,
    phraseColorCoding: true,
  };
}

function throwingStorage(
  failures: Readonly<{
    read?: Error;
    write?: Error;
    remove?: Error;
  }>,
): Storage {
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

function memoryStorage(
  input: Readonly<{
    initialValue?: string;
    initialRecords?: Readonly<Record<string, string>>;
    readFailure?: string;
    writeFailure?: string;
  }> = {},
): Readonly<{
  port: StoragePort;
  records: RecordStoragePort;
  values: Map<string, string>;
  recordValues: Map<string, string>;
  writes: readonly Readonly<{ id: string; value: string }>[];
}> {
  const values = new Map<string, string>();
  if (input.initialValue !== undefined) {
    values.set(matchHistoryStorageKey, input.initialValue);
  }
  const recordValues = new Map(Object.entries(input.initialRecords ?? {}));
  const writes: { id: string; value: string }[] = [];
  return {
    values,
    recordValues,
    writes,
    records: {
      readAll: () =>
        input.readFailure
          ? { ok: false, code: input.readFailure }
          : { ok: true, value: [...recordValues.values()] },
      put: (id, value) => {
        if (input.writeFailure) return { ok: false, code: input.writeFailure };
        writes.push({ id, value });
        recordValues.set(id, value);
        return { ok: true, value: undefined };
      },
      remove: (id) => {
        recordValues.delete(id);
        return { ok: true, value: undefined };
      },
    },
    port: {
      read: (key) =>
        input.readFailure
          ? { ok: false, code: input.readFailure }
          : { ok: true, value: values.get(key) ?? null },
      write: (key, value) => {
        if (input.writeFailure) return { ok: false, code: input.writeFailure };
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
