import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import type { DraftCommand } from '../../src/engine/draft-actions';
import {
  createMatchReducer,
  type MatchEngineContext,
  type MatchState,
} from '../../src/engine/match-lifecycle';
import { seededRandomSource } from '../../src/engine/random-source';
import {
  createSimulationSetup,
  encodeSimulationReport,
  listSimulationOptions,
  simulateMatch,
  simulateMatches,
  summarizeSimulation,
} from '../../src/engine/simulation';
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
} from '../../src/persistence/codecs/replay-codec';
import type { StoragePort } from '../../src/persistence/storage-port';
import legacyReplayFixture from '../fixtures/replay-v1-scoring.json';

const context: ReplayContext = {
  catalog: sampleContent,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const engineContext: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

describe('versioned replay and local match-log codecs', () => {
  const completed = simulateMatch(
    20_260_823,
    createSimulationSetup(sampleContent),
    context,
  );

  test('normalizes, decodes, re-encodes, and reproduces an exact final state', () => {
    const decoded = decodeReplay(completed.replayBytes);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

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

  test('replays legacy version 1 scoring with its original balance', () => {
    const legacyReplay = normalizedJson(legacyReplayFixture);
    const replayed = replayMatch(legacyReplay, context);

    expect(replayed.ok).toBe(true);
    if (replayed.ok) {
      expect(replayed.replay.schemaVersion).toBe(1);
      expect(replayed.normalized).toBe(legacyReplay);
      expect(replayed.state.winner).toBe('player-1');
      expect(
        replayed.state.resolutionHistory.map((resolution) => ({
          round: resolution.round,
          playerOneDamage: resolution.players['player-1']!.outgoingDamage,
          playerTwoDamage: resolution.players['player-2']!.outgoingDamage,
          playerOnePride: resolution.players['player-1']!.prideAfter,
          playerTwoPride: resolution.players['player-2']!.prideAfter,
        })),
      ).toEqual([
        {
          round: 1,
          playerOneDamage: 2,
          playerTwoDamage: 0,
          playerOnePride: 5,
          playerTwoPride: 3,
        },
        {
          round: 2,
          playerOneDamage: 2,
          playerTwoDamage: 0,
          playerOnePride: 5,
          playerTwoPride: 1,
        },
        {
          round: 3,
          playerOneDamage: 10,
          playerTwoDamage: 0,
          playerOnePride: 5,
          playerTwoPride: 0,
        },
      ]);
    }
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
      'selections',
      'breakdowns',
      'events',
      'winner',
    ]);
    expect(completed.matchLog.rounds.length).toBeGreaterThan(0);
    expect(completed.matchLog.breakdowns.length).toBeGreaterThan(0);
    expect(completed.matchLog.winner).toBe(completed.finalState.winner);
  });

  test.each([
    ['invalid-json', '{'],
    [
      'wrong-document',
      normalizedJson({ ...completed.replay, kind: matchLogKind }),
    ],
    [
      'invalid-replay',
      normalizedJson({ ...completed.replay, commands: undefined }),
    ],
    [
      'unsupported-version',
      normalizedJson({ ...completed.replay, schemaVersion: 3 }),
    ],
  ] as const)(
    'rejects replay fixture %s before a write or match result',
    (code, bytes) => {
      const storage = recordingStorage();
      const result = storeReplayImport(bytes, context, storage.port, 'replay');
      expect(result).toEqual({ ok: false, code });
      expect(storage.writes).toEqual([]);
      expect('state' in result).toBe(false);
    },
  );

  test.each([
    ['invalid-json', '{'],
    [
      'wrong-document',
      normalizedJson({ ...completed.matchLog, kind: replayKind }),
    ],
    [
      'invalid-replay',
      normalizedJson({ ...completed.matchLog, rounds: undefined }),
    ],
    [
      'unsupported-version',
      normalizedJson({ ...completed.matchLog, schemaVersion: 3 }),
    ],
  ] as const)('rejects match-log fixture %s before a write', (code, bytes) => {
    const storage = recordingStorage();
    const result = storeMatchLogImport(bytes, storage.port, 'match-log');
    expect(result).toEqual({ ok: false, code });
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
      decodeMatchLog(
        normalizedJson({ ...completed.matchLog, winner: 'unknown-player' }),
      ),
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
    const replayed = storeReplayImport(
      completed.replayBytes,
      context,
      storage.port,
      'replay',
    );
    expect(replayed.ok).toBe(true);
    expect(storage.writes).toEqual([
      { key: 'replay', value: completed.replayBytes },
    ]);

    const logStorage = recordingStorage();
    expect(
      storeMatchLogImport(completed.matchLogBytes, logStorage.port, 'match-log')
        .ok,
    ).toBe(true);
    expect(logStorage.writes).toEqual([
      { key: 'match-log', value: completed.matchLogBytes },
    ]);

    const disabled = recordingStorage('storage-disabled');
    expect(
      storeReplayImport(
        completed.replayBytes,
        context,
        disabled.port,
        'replay',
      ),
    ).toEqual({ ok: false, code: 'storage-disabled' });
    expect(
      storeMatchLogImport(completed.matchLogBytes, disabled.port, 'match-log'),
    ).toEqual({ ok: false, code: 'storage-disabled' });
  });

  test('omits every unselected private card ID, phrase ID, and phrase text', () => {
    const privateCards = collectPrivateCards(completed.replay);
    const selectedIds = new Set(
      completed.replay.commands.flatMap((command) => {
        if (!('actorId' in command) || !('card' in command.payload)) return [];
        return command.payload.card.source === 'private'
          ? [command.payload.card.cardId]
          : [];
      }),
    );
    const unselected = privateCards.filter((card) => !selectedIds.has(card.id));
    const replayStrings = collectStrings(JSON.parse(completed.replayBytes));
    const logStrings = collectStrings(JSON.parse(completed.matchLogBytes));
    expect(unselected.length).toBeGreaterThan(0);
    for (const card of unselected) {
      const phrase = sampleContent.phrases.find(
        (candidate) => candidate.id === card.phraseId,
      )!;
      const phraseText = englishGameLocale.messages[phrase.textKey]!;
      expect(completed.replayBytes).not.toContain(card.id);
      expect(completed.matchLogBytes).not.toContain(card.id);
      expect(replayStrings).not.toContain(card.phraseId);
      expect(logStrings).not.toContain(card.phraseId);
      expect(replayStrings).not.toContain(phraseText);
      expect(logStrings).not.toContain(phraseText);
    }
    expect(completed.matchLogBytes).not.toMatch(
      /browser|machine|timestamp|userAgent/iu,
    );
  });

  test('requires a completed match before creating a local log', () => {
    const initial = createReplayInitialState(completed.replay, context)!;
    expect(() => createMatchLog(completed.replay, initial)).toThrow(
      'completed match',
    );
  });
});

describe('headless simulation and generated invariants', () => {
  const setup = createSimulationSetup(sampleContent);

  test.each([0, 0xffff_ffff])(
    'accepts boundary seed %s and repeats every byte',
    (seed) => {
      const first = simulateMatch(seed, setup, context);
      const second = simulateMatch(seed, setup, context);
      expect(second.replayBytes).toBe(first.replayBytes);
      expect(second.matchLogBytes).toBe(first.matchLogBytes);
      expect(second.finalState).toEqual(first.finalState);
    },
  );

  test('repeats aggregate summary and normalized output bytes', () => {
    const first = simulateMatches(0xffff_ffff, 2, setup, context);
    const second = simulateMatches(0xffff_ffff, 2, setup, context);
    expect(summarizeSimulation(second)).toBe(summarizeSimulation(first));
    expect(encodeSimulationReport(second)).toBe(encodeSimulationReport(first));
    expect(second.results.map((result) => result.seed)).toEqual([
      0xffff_ffff, 0,
    ]);
    expect(second.completedMatches).toBe(2);
  });

  test(
    'keeps the 500-match calibration between three and ten rounds',
    () => {
      const report = simulateMatches(20_260_830, 500, setup, context);
      const averageRounds = report.totalRounds / report.matches;
      expect(averageRounds).toBeGreaterThanOrEqual(3);
      expect(averageRounds).toBeLessThanOrEqual(10);
    },
    30_000,
  );

  test('rejects invalid setup values, counts, and seeds with named facts', () => {
    expect(() =>
      createSimulationSetup(sampleContent, { sceneId: 'missing-scene' }),
    ).toThrow('scene');
    expect(() =>
      createSimulationSetup(sampleContent, {
        characterIds: ['missing-character', sampleContent.characters[0]!.id],
      }),
    ).toThrow('character');
    expect(() =>
      createSimulationSetup(sampleContent, { pride: [-1, 100] }),
    ).toThrow('Pride');
    expect(() =>
      createSimulationSetup(sampleContent, { charge: [0, 61] }),
    ).toThrow('charge');
    expect(() => simulateMatches(0, 0, setup, context)).toThrow(
      'positive integer',
    );
    expect(() => simulateMatch(-1, setup, context)).toThrow('unsigned 32-bit');
    expect(() => simulateMatch(0x1_0000_0000, setup, context)).toThrow(
      'unsigned 32-bit',
    );
    expect(() =>
      simulateMatch(72, { ...setup, sceneId: 'missing-scene' }, context),
    ).toThrow(
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
    expect(listSimulationOptions(completed.finalState, engineContext)).toEqual(
      [],
    );
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
      const result = reducer(
        state,
        { type, source: 'ai', payload: {} },
        seededRandomSource,
      );
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
          expect(result.finalState.commandHistory).toEqual(
            result.replay.commands,
          );
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
  }, 120_000);
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
        return failureCode
          ? { ok: false, code: failureCode }
          : { ok: true, value: undefined };
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

function collectStateCards(
  state: MatchState,
  cards: Map<string, string>,
): void {
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
