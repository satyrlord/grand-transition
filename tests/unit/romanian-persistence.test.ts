import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import {
  englishGameLocale,
  romanianGameLocale,
  sampleContent,
} from '../../src/game-content';
import { createSimulationSetup, simulateMatch } from '../../src/engine/simulation';
import {
  decodeMatchLog,
  decodeReplay,
  encodeMatchLog,
  encodeReplay,
  matchLogKind,
  normalizedJson,
  replayKind,
  replayMatch,
  replaySchemaVersion,
  storeMatchLogImport,
  storeReplayImport,
  type ReplayContext,
} from '../../src/persistence/codecs/replay-codec';
import {
  createMatchHistoryEntry,
  decodeMatchHistory,
  encodeMatchHistory,
  matchHistoryKind,
  matchHistorySchemaVersion,
} from '../../src/persistence/match-history';
import type { StoragePort } from '../../src/persistence/storage-port';

const seed = 20_260_917;

const englishContext: ReplayContext = {
  catalog: sampleContent,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const romanianContext: ReplayContext = {
  catalog: sampleContent,
  locale: romanianGameLocale,
  balance: basicScoringBalance,
};

const romanianCompleted = simulateMatch(
  seed,
  createSimulationSetup(sampleContent, { gameLocale: 'ro-RO' }),
  romanianContext,
);

const historySettings = {
  turnTimerSeconds: 30 as const,
  autoComplete: true,
  phraseColorCoding: true,
};

describe('Romanian replay, match-log, and history records', () => {
  test('records the captured game locale in the replay and match-log setup', () => {
    expect(romanianCompleted.replay.setup.gameLocale).toBe('ro-RO');
    expect(romanianCompleted.matchLog.setup.gameLocale).toBe('ro-RO');
    expect(romanianCompleted.replay.schemaVersion).toBe(replaySchemaVersion);
    expect(romanianCompleted.matchLog.schemaVersion).toBe(replaySchemaVersion);
    expect(replaySchemaVersion).toBe(2);
  });

  test('renders the recorded public sentence in Romanian, not English', () => {
    const sentences = romanianCompleted.matchLog.sentences;
    expect(sentences.length).toBeGreaterThan(0);
    const rendered = sentences.flatMap((sentence) => sentence.phrases);
    expect(rendered.length).toBeGreaterThan(0);
    const romanianTexts = new Set(Object.values(romanianGameLocale.messages));
    const englishTexts = new Set(Object.values(englishGameLocale.messages));
    expect(rendered.some((phrase) => romanianTexts.has(phrase.text))).toBe(true);
    const ownedByBoth = rendered.filter(
      (phrase) => englishTexts.has(phrase.text) && !romanianTexts.has(phrase.text),
    );
    expect(ownedByBoth).toEqual([]);
  });

  test('round-trips the recorded bytes and reproduces the exact final state', () => {
    const replay = decodeReplay(romanianCompleted.replayBytes);
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.value.setup.gameLocale).toBe('ro-RO');
    expect(encodeReplay(replay.value)).toBe(romanianCompleted.replayBytes);
    expect(Object.keys(JSON.parse(romanianCompleted.replayBytes))).toEqual([
      'schemaVersion',
      'kind',
      'seed',
      'setup',
      'commands',
    ]);

    const replayed = replayMatch(romanianCompleted.replayBytes, romanianContext);
    expect(replayed.ok).toBe(true);
    if (replayed.ok) {
      expect(replayed.state).toEqual(romanianCompleted.finalState);
      expect(replayed.normalized).toBe(romanianCompleted.replayBytes);
    }

    const log = decodeMatchLog(romanianCompleted.matchLogBytes);
    expect(log.ok).toBe(true);
    if (log.ok) {
      expect(log.value.setup.gameLocale).toBe('ro-RO');
      expect(encodeMatchLog(log.value)).toBe(romanianCompleted.matchLogBytes);
    }
  });

  test('keeps the English catalog fixtures valid under the new version', () => {
    const english = simulateMatch(seed, createSimulationSetup(sampleContent, { gameLocale: 'en' }), englishContext);
    expect(english.replay.setup.gameLocale).toBe('en');
    const replayed = replayMatch(english.replayBytes, englishContext);
    expect(replayed.ok).toBe(true);
    if (replayed.ok) expect(replayed.state).toEqual(english.finalState);
  });

  test('rejects a document replayed under another game locale', () => {
    expect(replayMatch(romanianCompleted.replayBytes, englishContext)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    const english = simulateMatch(seed, createSimulationSetup(sampleContent, { gameLocale: 'en' }), englishContext);
    expect(replayMatch(english.replayBytes, romanianContext)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
  });

  test('rejects an imported match log recorded under another game locale', () => {
    const storage = memoryStorage();
    const result = storeMatchLogImport(
      romanianCompleted.matchLogBytes,
      englishContext,
      storage.port,
      'match-log',
    );
    expect(result).toEqual({ ok: false, code: 'invalid-replay' });
    expect(storage.writes).toEqual([]);

    const accepted = storeMatchLogImport(
      romanianCompleted.matchLogBytes,
      romanianContext,
      storage.port,
      'match-log',
    );
    expect(accepted.ok).toBe(true);
    expect(storage.writes).toHaveLength(1);
  });

  test('accepts a Romanian match log with an authored second-person verb', () => {
    const base = romanianCompleted.matchLog;
    const first = base.sentences.find((sentence) => sentence.phrases.length > 0)!;
    const changed = {
      ...base,
      sentences: base.sentences.map((sentence) =>
        sentence === first
          ? {
              ...sentence,
              phrases: [
                {
                  ...sentence.phrases[0]!,
                  phraseId: 'denounced',
                  text: 'ați denunțat',
                },
                ...sentence.phrases.slice(1),
              ],
            }
          : sentence,
      ),
    };
    const storage = memoryStorage();
    const result = storeMatchLogImport(
      encodeMatchLog(changed),
      romanianContext,
      storage.port,
      'match-log',
    );
    expect(result.ok).toBe(true);
    expect(storage.writes).toHaveLength(1);
  });

  test('accepts Romanian direct-object clitics and marked noun text in a match log', () => {
    const base = romanianCompleted.matchLog;
    const first = base.sentences.find((sentence) => sentence.phrases.length >= 2)!;
    const changed = {
      ...base,
      sentences: base.sentences.map((sentence) =>
        sentence === first
          ? {
              ...sentence,
              phrases: [
                {
                  ...sentence.phrases[0]!,
                  phraseId: 'denounced',
                  text: 'v-a denunțat',
                },
                {
                  ...sentence.phrases[1]!,
                  phraseId: 'you',
                  text: 'pe dumneavoastră',
                },
                ...sentence.phrases.slice(2),
              ],
            }
          : sentence,
      ),
    };
    const storage = memoryStorage();
    const result = storeMatchLogImport(
      encodeMatchLog(changed),
      romanianContext,
      storage.port,
      'match-log',
    );
    expect(result.ok).toBe(true);
    expect(storage.writes).toHaveLength(1);
  });

  test('accepts a Romanian nested-object clitic in a match log', () => {
    const base = romanianCompleted.matchLog;
    const first = base.sentences.find((sentence) => sentence.phrases.length > 0)!;
    const changed = {
      ...base,
      sentences: base.sentences.map((sentence) =>
        sentence === first
          ? {
              ...sentence,
              phrases: [
                {
                  ...sentence.phrases[0]!,
                  phraseId: 'public-outsourced-explanation-past',
                  text: 'a pus pe altcineva să vă explice',
                },
                ...sentence.phrases.slice(1),
              ],
            }
          : sentence,
      ),
    };
    const storage = memoryStorage();
    const result = storeMatchLogImport(
      encodeMatchLog(changed),
      romanianContext,
      storage.port,
      'match-log',
    );
    expect(result.ok).toBe(true);
    expect(storage.writes).toHaveLength(1);
  });

  test('stores a Romanian replay without rewriting its recorded bytes', () => {
    const storage = memoryStorage();
    const result = storeReplayImport(
      romanianCompleted.replayBytes,
      romanianContext,
      storage.port,
      'replay',
    );
    expect(result.ok).toBe(true);
    expect(storage.writes).toEqual([
      { key: 'replay', value: romanianCompleted.replayBytes },
    ]);
  });

  test('rejects a version 1 document that carries no game locale', () => {
    const withoutLocale = JSON.parse(romanianCompleted.replayBytes) as {
      schemaVersion: number;
      setup: Record<string, unknown>;
    };
    withoutLocale.schemaVersion = 1;
    delete withoutLocale.setup.gameLocale;
    expect(decodeReplay(normalizedJson(withoutLocale))).toEqual({
      ok: false,
      code: 'unsupported-version',
    });

    const versionOne = JSON.parse(romanianCompleted.matchLogBytes) as {
      schemaVersion: number;
      setup: Record<string, unknown>;
    };
    versionOne.schemaVersion = 1;
    delete versionOne.setup.gameLocale;
    expect(decodeMatchLog(normalizedJson(versionOne))).toEqual({
      ok: false,
      code: 'unsupported-version',
    });
  });

  test('rejects a current-version document that omits the game locale', () => {
    const missing = JSON.parse(romanianCompleted.replayBytes) as {
      setup: Record<string, unknown>;
    };
    delete missing.setup.gameLocale;
    expect(decodeReplay(normalizedJson(missing))).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
  });

  test('rejects an unknown recorded game locale', () => {
    for (const [document, decode] of [
      [romanianCompleted.replay, decodeReplay],
      [romanianCompleted.matchLog, decodeMatchLog],
    ] as const) {
      expect(
        decode(
          normalizedJson({
            ...document,
            setup: { ...document.setup, gameLocale: 'fr' },
          }),
        ),
      ).toEqual({ ok: false, code: 'invalid-replay' });
    }
  });

  test('round-trips a Romanian history entry with its recorded language and text', () => {
    const entry = createMatchHistoryEntry(romanianCompleted.finalState, {
      id: 'romanian-match',
      initialSeed: seed,
      completedAt: '2026-09-17T10:00:00.000Z',
      settings: historySettings,
      gameLocale: 'ro-RO',
    });
    expect(entry.replay.setup.gameLocale).toBe('ro-RO');
    expect(entry.matchLog.setup.gameLocale).toBe('ro-RO');

    const encoded = encodeMatchHistory({
      schemaVersion: matchHistorySchemaVersion,
      kind: matchHistoryKind,
      entries: [entry],
    });
    const decoded = decodeMatchHistory(encoded);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.entries).toEqual([entry]);
    // Re-encoding the decoded document is byte-identical, so a language
    // selection change can never rewrite a stored match.
    expect(
      encodeMatchHistory({
        schemaVersion: matchHistorySchemaVersion,
        kind: matchHistoryKind,
        entries: decoded.value.entries,
      }),
    ).toBe(encoded);
  });

  test('keeps every Romanian seed reproducible with the captured locale', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffff }), (value) => {
        const match = simulateMatch(
          value,
          createSimulationSetup(sampleContent, { gameLocale: 'ro-RO' }),
          romanianContext,
        );
        expect(match.finalState.phase).toBe('results');
        const replayed = replayMatch(match.replayBytes, romanianContext);
        expect(replayed).toEqual(
          expect.objectContaining({ ok: true, state: match.finalState }),
        );
        expect(match.replay.kind).toBe(replayKind);
        expect(match.matchLog.kind).toBe(matchLogKind);
      }),
      { numRuns: 20, seed },
    );
  }, 60_000);

  test('keeps the interface language out of stored Romanian results', () => {
    // Storage documents carry no interface-locale field at all: the match
    // language is the only locale a recorded match depends on.
    const serialized = encodeMatchHistory({
      schemaVersion: matchHistorySchemaVersion,
      kind: matchHistoryKind,
      entries: [
        createMatchHistoryEntry(romanianCompleted.finalState, {
          id: 'interface-independent',
          initialSeed: seed,
          completedAt: '2026-09-17T10:05:00.000Z',
          settings: historySettings,
          gameLocale: 'ro-RO',
        }),
      ],
    });
    expect(serialized).not.toMatch(/interfaceLocale/u);
    expect(serialized).toContain('"gameLocale": "ro-RO"');
  });
});

function memoryStorage(): Readonly<{
  port: StoragePort;
  writes: { key: string; value: string }[];
}> {
  const writes: { key: string; value: string }[] = [];
  return {
    writes,
    port: {
      read: () => ({ ok: true, value: null }),
      write: (key, value) => {
        writes.push({ key, value });
        return { ok: true, value: undefined };
      },
      remove: () => ({ ok: true, value: undefined }),
    },
  };
}
