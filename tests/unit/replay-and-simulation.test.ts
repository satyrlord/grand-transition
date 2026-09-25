import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { fullQualityGateRequested } from '../../tools/quality-gate-mode.ts';
import {
  basicScoringBalance,
  scoringBalanceForMultiplier,
} from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, romanianGameLocale, gameCatalog } from '../../src/game-content.ts';
import type { DraftCommand } from '../../src/engine/draft-actions.ts';
import {
  createMatchReducer,
  type MatchEngineContext,
  type MatchState,
} from '../../src/engine/match-lifecycle.ts';
import { seededRandomSource } from '../../src/engine/random-source.ts';
import {
  createSimulationSetup,
  encodeSimulationReport,
  listSimulationOptions,
  simulateMatch,
  simulateMatches,
  summarizeSimulation,
} from '../../src/simulation/simulation.ts';
import {
  createMatchLog,
  createReplayInitialState,
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
  type MatchLogDocument,
  type ReplayContext,
  type ReplayDocument,
} from '../../src/persistence/codecs/replay-codec.ts';
import type { StoragePort } from '../../src/persistence/storage-port.ts';

const context: ReplayContext = {
  catalog: gameCatalog,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const engineContext: MatchEngineContext = {
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

describe('replay and local match-log codecs', () => {
  const completed = simulateMatch(
    20_260_823,
    createSimulationSetup(gameCatalog, { gameLocale: 'en' }),
    context,
  );

  test.each([1, 2, 3, 4, 5] as const)(
    'captures multiplier %s and replays independently of the current balance',
    (multiplier) => {
      const match = simulateMatch(
        20_260_823,
        {
          ...createSimulationSetup(gameCatalog, { gameLocale: 'en' }),
          basePointsMultiplier: multiplier,
        },
        context,
      );
      expect(match.replay.setup.basePointsMultiplier).toBe(multiplier);
      expect(match.matchLog.setup.basePointsMultiplier).toBe(multiplier);
      const replayed = replayMatch(match.replayBytes, {
        ...context,
        balance: scoringBalanceForMultiplier(5),
      });
      expect(replayed.ok).toBe(true);
      if (replayed.ok) expect(replayed.state).toEqual(match.finalState);
    },
  );

  test.each([undefined, 0, 6, 1.5, '3'])(
    'rejects an invalid captured multiplier %s',
    (multiplier) => {
      for (const [document, decode] of [
        [completed.replay, decodeReplay],
        [completed.matchLog, decodeMatchLog],
      ] as const) {
        expect(
          decode(
            normalizedJson({
              ...document,
              setup: { ...document.setup, basePointsMultiplier: multiplier },
            }),
          ),
        ).toEqual({ ok: false, code: 'invalid-replay' });
      }
    },
  );

  test('normalizes, decodes, re-encodes, and reproduces an exact final state', () => {
    const decoded = decodeReplay(completed.replayBytes);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.value.schemaVersion).toBe(replaySchemaVersion);
    expect(encodeReplay(decoded.value)).toBe(completed.replayBytes);
    expect(completed.replayBytes.endsWith('\n')).toBe(true);
    expect(completed.replayBytes.endsWith('\n\n')).toBe(false);
    expect(Object.keys(JSON.parse(completed.replayBytes))).toEqual([
      'schemaVersion',
      'kind',
      'seed',
      'setup',
      'commands',
    ]);

    const replayed = replayMatch(completed.replayBytes, context);
    expect(replayed.ok).toBe(true);
    if (replayed.ok) {
      expect(replayed.normalized).toBe(completed.replayBytes);
      expect(replayed.state).toEqual(completed.finalState);
    }
  });

  test('supports exactly one replay and match-log schema version', () => {
    expect(replaySchemaVersion).toBe(2);
    for (const schemaVersion of [0, 1, 13]) {
      for (const [document, decode] of [
        [completed.replay, decodeReplay],
        [completed.matchLog, decodeMatchLog],
      ] as const) {
        expect(decode(normalizedJson({ ...document, schemaVersion }))).toEqual({
          ok: false,
          code: 'unsupported-version',
        });
      }
    }
  });

  test('rejects a document recorded under another game locale', () => {
    const romanianContext: ReplayContext = { ...context, locale: romanianGameLocale };
    expect(replayMatch(completed.replayBytes, romanianContext)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    expect(encodeReplay(completed.replay)).toContain('"gameLocale": "en"');
    for (const [document, decode] of [
      [completed.replay, decodeReplay],
      [completed.matchLog, decodeMatchLog],
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
    const storage = recordingStorage();
    expect(
      storeMatchLogImport(completed.matchLogBytes, romanianContext, storage.port, 'match-log'),
    ).toEqual({ ok: false, code: 'invalid-replay' });
    expect(storage.writes).toHaveLength(0);
  });

  test('fails safely when a replay command references a missing catalog card', () => {
    const selection = completed.replay.commands.find((command) => command.type === 'select-phrase');
    expect(selection?.type).toBe('select-phrase');
    if (!selection || selection.type !== 'select-phrase') return;
    const staleReplay: ReplayDocument = {
      ...completed.replay,
      commands: completed.replay.commands.map((command) =>
        command === selection
          ? {
              ...command,
              payload: {
                card: {
                  ...command.payload.card,
                  cardId: 'missing-from-catalog',
                },
              },
            }
          : command,
      ),
    };
    expect(replayMatch(encodeReplay(staleReplay), context)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
  });

  test('normalizes and decodes the public match log', () => {
    const decoded = decodeMatchLog(completed.matchLogBytes);
    expect(decoded).toEqual({ ok: true, value: completed.matchLog });
    expect(encodeMatchLog((decoded as { value: MatchLogDocument }).value)).toBe(
      completed.matchLogBytes,
    );
    expect(Object.keys(JSON.parse(completed.matchLogBytes))).toEqual([
      'schemaVersion',
      'kind',
      'setup',
      'seed',
      'rounds',
      'sentences',
      'selections',
      'breakdowns',
      'events',
      'winner',
    ]);
    expect(completed.matchLog.rounds.length).toBeGreaterThan(0);
    expect(completed.matchLog.breakdowns.length).toBeGreaterThan(0);
    expect(completed.matchLog.winner).toBe(completed.finalState.winner);
  });

  test('requires the public sentence record in every match log', () => {
    const { sentences: _, ...withoutSentences } = completed.matchLog;

    expect(decodeMatchLog(normalizedJson(withoutSentences))).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    expect(decodeMatchLog(completed.matchLogBytes)).toMatchObject({ ok: true });
  });

  test.each([
    ['invalid-json', '{'],
    ['wrong-document', normalizedJson({ ...completed.replay, kind: matchLogKind })],
    ['invalid-replay', normalizedJson({ ...completed.replay, commands: undefined })],
    [
      'unsupported-version',
      normalizedJson({ ...completed.replay, schemaVersion: replaySchemaVersion + 1 }),
    ],
  ] as const)('rejects replay fixture %s before a write or match result', (code, bytes) => {
    const storage = recordingStorage();
    const result = storeReplayImport(bytes, context, storage.port, 'replay');
    expect(result).toEqual({ ok: false, code });
    expect(storage.writes).toEqual([]);
    expect('state' in result).toBe(false);
  });

  test.each([
    ['invalid-json', '{'],
    ['wrong-document', normalizedJson({ ...completed.matchLog, kind: replayKind })],
    ['invalid-replay', normalizedJson({ ...completed.matchLog, rounds: undefined })],
    [
      'unsupported-version',
      normalizedJson({ ...completed.matchLog, schemaVersion: replaySchemaVersion + 1 }),
    ],
  ] as const)('rejects match-log fixture %s before a write', (code, bytes) => {
    const storage = recordingStorage();
    const result = storeMatchLogImport(bytes, context, storage.port, 'match-log');
    expect(result).toEqual({ ok: false, code });
    expect(storage.writes).toEqual([]);
  });

  test.each([
    ['an unknown phrase ID', { phraseId: 'missing-from-catalog' }],
    ['stale phrase text', { text: 'retired catalog text' }],
  ])('rejects match-log import with %s before a write', (_name, change) => {
    const firstSentence = completed.matchLog.sentences.find(
      (sentence) => sentence.phrases.length > 0,
    )!;
    const stale = {
      ...completed.matchLog,
      sentences: completed.matchLog.sentences.map((sentence) =>
        sentence === firstSentence
          ? {
              ...sentence,
              phrases: sentence.phrases.map((phrase, index) =>
                index === 0 ? { ...phrase, ...change } : phrase,
              ),
            }
          : sentence,
      ),
    };
    const storage = recordingStorage();

    expect(storeMatchLogImport(normalizedJson(stale), context, storage.port, 'match-log')).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    expect(storage.writes).toEqual([]);
  });

  test('rejects missing document fields and a partial replay without returning state', () => {
    expect(decodeReplay(normalizedJson([]))).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    expect(decodeReplay(normalizedJson({ schemaVersion: '1' }))).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
    const partial: ReplayDocument = {
      ...completed.replay,
      commands: completed.replay.commands.slice(0, 1),
    };
    expect(replayMatch(encodeReplay(partial), context)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });
  });

  test('rejects privacy-bearing log fields and unknown player references', () => {
    const firstSelection = completed.matchLog.selections[0]!;
    const privacyBearingSelection = normalizedJson({
      ...completed.matchLog,
      selections: [
        {
          ...firstSelection,
          payload: {
            ...firstSelection.payload,
            privateText: 'unselected private phrase',
          },
        },
        ...completed.matchLog.selections.slice(1),
      ],
    });
    expect(decodeMatchLog(privacyBearingSelection)).toEqual({
      ok: false,
      code: 'invalid-replay',
    });

    expect(
      decodeMatchLog(
        normalizedJson({
          ...completed.matchLog,
          events: [
            {
              round: 1,
              playerId: completed.matchLog.setup.players[0].playerId,
              type: 'weakness',
              detail: 'private browser note',
            },
          ],
        }),
      ),
    ).toEqual({ ok: false, code: 'invalid-replay' });

    expect(
      decodeMatchLog(normalizedJson({ ...completed.matchLog, winner: 'unknown-player' })),
    ).toEqual({ ok: false, code: 'invalid-replay' });
  });

  test('rejects duplicate player IDs in replay and log setup', () => {
    const duplicatePlayers = [
      completed.replay.setup.players[0],
      {
        ...completed.replay.setup.players[1],
        playerId: completed.replay.setup.players[0].playerId,
      },
    ];
    expect(
      decodeReplay(
        normalizedJson({
          ...completed.replay,
          setup: { ...completed.replay.setup, players: duplicatePlayers },
        }),
      ),
    ).toEqual({ ok: false, code: 'invalid-replay' });
    expect(
      decodeMatchLog(
        normalizedJson({
          ...completed.matchLog,
          setup: { ...completed.matchLog.setup, players: duplicatePlayers },
        }),
      ),
    ).toEqual({ ok: false, code: 'invalid-replay' });
  });

  test('writes only fully validated normalized documents and reports storage failure', () => {
    const storage = recordingStorage();
    const replayed = storeReplayImport(completed.replayBytes, context, storage.port, 'replay');
    expect(replayed.ok).toBe(true);
    expect(storage.writes).toEqual([{ key: 'replay', value: completed.replayBytes }]);

    const logStorage = recordingStorage();
    expect(
      storeMatchLogImport(completed.matchLogBytes, context, logStorage.port, 'match-log').ok,
    ).toBe(true);
    expect(logStorage.writes).toEqual([{ key: 'match-log', value: completed.matchLogBytes }]);

    const disabled = recordingStorage('storage-disabled');
    expect(storeReplayImport(completed.replayBytes, context, disabled.port, 'replay')).toEqual({
      ok: false,
      code: 'storage-disabled',
    });
    expect(
      storeMatchLogImport(completed.matchLogBytes, context, disabled.port, 'match-log'),
    ).toEqual({ ok: false, code: 'storage-disabled' });
  });

  test('omits every unselected private card ID, phrase ID, and phrase text', () => {
    const privateCards = collectPrivateCards(completed.replay);
    const selectedIds = new Set(
      completed.replay.commands.flatMap((command) => {
        if (!('actorId' in command) || !('card' in command.payload)) return [];
        return command.payload.card.source === 'private' ? [command.payload.card.cardId] : [];
      }),
    );
    const unselected = privateCards.filter((card) => !selectedIds.has(card.id));
    const publicPhraseIds = new Set(
      (completed.matchLog.sentences ?? []).flatMap((sentence) =>
        sentence.phrases.map((phrase) => phrase.phraseId),
      ),
    );
    const privateOnly = unselected.filter((card) => !publicPhraseIds.has(card.phraseId));
    const replayStrings = collectStrings(JSON.parse(completed.replayBytes));
    const logStrings = collectStrings(JSON.parse(completed.matchLogBytes));
    expect(privateOnly.length).toBeGreaterThan(0);
    for (const card of privateOnly) {
      const phrase = gameCatalog.phrases.find((candidate) => candidate.id === card.phraseId)!;
      const phraseText = englishGameLocale.messages[phrase.textKey]!;
      expect(completed.replayBytes).not.toContain(card.id);
      expect(completed.matchLogBytes).not.toContain(card.id);
      expect(replayStrings).not.toContain(card.phraseId);
      expect(logStrings).not.toContain(card.phraseId);
      expect(replayStrings).not.toContain(phraseText);
      expect(logStrings).not.toContain(phraseText);
    }
    expect(completed.matchLogBytes).not.toMatch(/browser|machine|timestamp|userAgent/iu);
  });

  test('requires a completed match before creating a local log', () => {
    const initial = createReplayInitialState(completed.replay, context)!;
    expect(() => createMatchLog(completed.replay, initial)).toThrow('completed match');
  });
});

describe('headless simulation and generated invariants', () => {
  const setup = createSimulationSetup(gameCatalog, { gameLocale: 'en' });

  test.each([0, 0xffff_ffff])('accepts boundary seed %s and repeats every byte', (seed) => {
    const first = simulateMatch(seed, setup, context);
    const second = simulateMatch(seed, setup, context);
    expect(second.replayBytes).toBe(first.replayBytes);
    expect(second.matchLogBytes).toBe(first.matchLogBytes);
    expect(second.finalState).toEqual(first.finalState);
  });

  test('repeats aggregate summary and normalized output bytes', () => {
    const first = simulateMatches(0xffff_ffff, 2, setup, context);
    const second = simulateMatches(0xffff_ffff, 2, setup, context);
    expect(summarizeSimulation(second)).toBe(summarizeSimulation(first));
    expect(encodeSimulationReport(second)).toBe(encodeSimulationReport(first));
    expect(second.results.map((result) => result.seed)).toEqual([0xffff_ffff, 0]);
    expect(second.completedMatches).toBe(2);
  });

  const calibrationTest = fullQualityGateRequested() ? test : test.skip;
  calibrationTest(
    'keeps the current-catalog 500-match calibration between three and eleven rounds',
    () => {
      expect(context.catalog.characters).toHaveLength(19);
      expect(context.catalog.scenes).toHaveLength(7);
      const calibrationSetup = createSimulationSetup(context.catalog, {
        gameLocale: 'en',
        characterIds: ['red-folded-chairman', 'thunder-tribune'],
        sceneId: 'transition-era-television-studio',
      });
      const report = simulateMatches(20_260_830, 500, calibrationSetup, context);
      expect(report.completedMatches).toBe(500);
      const averageRounds = report.totalRounds / report.matches;
      expect(averageRounds).toBeGreaterThanOrEqual(3);
      expect(averageRounds).toBeLessThanOrEqual(11);
    },
    120_000,
  );

  test('rejects invalid setup values, counts, and seeds with named facts', () => {
    expect(() => createSimulationSetup(gameCatalog, { sceneId: 'missing-scene' })).toThrow('scene');
    expect(() =>
      createSimulationSetup(gameCatalog, {
        characterIds: ['missing-character', gameCatalog.characters[0]!.id],
      }),
    ).toThrow('character');
    expect(() => createSimulationSetup(gameCatalog, { pride: [-1, 100] })).toThrow('Pride');
    expect(() => createSimulationSetup(gameCatalog, { charge: [0, 61] })).toThrow('charge');
    expect(() => simulateMatches(0, 0, setup, context)).toThrow('positive integer');
    expect(() => simulateMatch(-1, setup, context)).toThrow('unsigned 32-bit');
    expect(() => simulateMatch(0x1_0000_0000, setup, context)).toThrow('unsigned 32-bit');
    expect(() => simulateMatch(72, { ...setup, sceneId: 'missing-scene' }, context)).toThrow(
      'The setup is invalid. Seed: 72. Replay path: replays/simulation-72.json.',
    );
  });

  test('shows stable phrase tags and utility and returns no option after results', () => {
    const replay: ReplayDocument = {
      schemaVersion: replaySchemaVersion,
      kind: replayKind,
      seed: 40,
      setup,
      commands: [],
    };
    let state = createReplayInitialState(replay, context)!;
    const reducer = createMatchReducer(engineContext);
    const advance = () => {
      const option = listSimulationOptions(state, engineContext)[0]!;
      const result = reducer(state, option.command, seededRandomSource);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
      return option;
    };
    expect(advance().command.type).toBe('start-match');
    expect(advance().command.type).toBe('prepare-round');
    const options = listSimulationOptions(state, engineContext);
    expect(options[0]!.phrase?.tags.length).toBeGreaterThan(0);
    expect(options[0]!.reason).toMatch(/scoring or weakness tag/iu);
    expect(options[0]!.utility).toBeGreaterThan(0);

    const completed = simulateMatch(40, setup, context);
    expect(listSimulationOptions(completed.finalState, engineContext)).toEqual([]);
  });

  test('rejects wrong ownership without changing state, Pride, charge, or history', () => {
    const replay: ReplayDocument = {
      schemaVersion: replaySchemaVersion,
      kind: replayKind,
      seed: 51,
      setup,
      commands: [],
    };
    let state = createReplayInitialState(replay, context)!;
    const reducer = createMatchReducer(engineContext);
    for (const type of ['start-match', 'prepare-round'] as const) {
      const result = reducer(state, { type, source: 'ai', payload: {} }, seededRandomSource);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    const actorId = state.activePlayerId;
    const otherId = state.playerOrder.find((id) => id !== actorId)!;
    const otherCard = state.draft!.playerStates[otherId]!.hand[0]!;
    const invalid: DraftCommand = {
      type: 'select-phrase',
      source: 'ai',
      actorId,
      payload: { card: { source: 'private', cardId: otherCard.id } },
    };
    const before = structuredClone(state);
    const rejected = reducer(state, invalid, seededRandomSource);
    expect(rejected).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'card-not-owned' }),
      }),
    );
    expect(state).toEqual(before);
  });

  test('replays the unique-card pool regression seed', () => {
    const result = simulateMatch(2_135_977_951, setup, context);
    expect(result.finalState.phase).toBe('results');
    expect(result.finalState.winner).toBeTruthy();
    expect(replayMatch(result.replayBytes, context)).toEqual(
      expect.objectContaining({ ok: true, state: result.finalState }),
    );
  });

  test('runs the CI generated-match workload with seed and replay-path evidence', () => {
    const runs = typeof window === 'undefined' ? 500 : 50;
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (seed) => {
        try {
          const result = simulateMatch(seed, setup, context);
          expect(result.finalState.phase).toBe('results');
          expect(result.finalState.winner).toBeTruthy();
          expect(result.finalState.commandHistory).toEqual(result.replay.commands);
          for (const player of Object.values(result.finalState.playerStates)) {
            expect(player.pride).toBeGreaterThanOrEqual(0);
            expect(player.pride).toBeLessThanOrEqual(100);
            expect(player.comebackCharge).toBeGreaterThanOrEqual(0);
            expect(player.comebackCharge).toBeLessThanOrEqual(60);
          }
          expect(replayMatch(result.replayBytes, context)).toEqual(
            expect.objectContaining({ ok: true, state: result.finalState }),
          );
        } catch (error) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)} Seed: ${seed}. Replay path: replays/simulation-${seed}.json.`,
          );
        }
      }),
      { numRuns: runs, seed: 20_260_823 },
    );
    // 500 deterministic matches plus their replays. The budget only tolerates a
    // fully loaded local worker pool; the workload and assertions are unchanged.
  }, 300_000);
});

function recordingStorage(failureCode?: string): Readonly<{
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
        return failureCode ? { ok: false, code: failureCode } : { ok: true, value: undefined };
      },
      remove: () => ({ ok: true, value: undefined }),
    },
  };
}

function collectPrivateCards(replay: ReplayDocument): readonly {
  id: string;
  phraseId: string;
}[] {
  let state = createReplayInitialState(replay, context)!;
  const reducer = createMatchReducer(engineContext);
  const cards = new Map<string, string>();
  for (const command of replay.commands) {
    collectStateCards(state, cards);
    const result = reducer(state, command, seededRandomSource);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
  }
  collectStateCards(state, cards);
  return [...cards].map(([id, phraseId]) => ({ id, phraseId }));
}

function collectStateCards(state: MatchState, cards: Map<string, string>): void {
  if (!state.draft) return;
  for (const player of Object.values(state.draft.playerStates)) {
    for (const card of player.hand) cards.set(card.id, card.phraseId);
  }
}

function collectStrings(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}
