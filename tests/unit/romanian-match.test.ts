import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, romanianGameLocale, gameCatalog } from '../../src/game-content.ts';
import {
  createSimulationSetup,
  simulateMatch,
  simulateMatches,
  summarizeSimulation,
} from '../../src/simulation/simulation.ts';
import {
  createMatchReducer,
  type MatchCommand,
  type MatchEngineContext,
  type MatchResolution,
  type MatchState,
} from '../../src/engine/match-lifecycle.ts';
import { seededRandomSource } from '../../src/engine/random-source.ts';
import { ladderDifficulty } from '../../src/engine/ladder.ts';
import {
  createReplayInitialState,
  encodeReplay,
  replayKind,
  replaySchemaVersion,
  type ReplayContext,
  type ReplayDocument,
} from '../../src/persistence/codecs/replay-codec.ts';

const seed = 20_260_917;

const englishContext: ReplayContext = {
  catalog: gameCatalog,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const romanianContext: ReplayContext = {
  catalog: gameCatalog,
  locale: romanianGameLocale,
  balance: basicScoringBalance,
};

const engineContext = (locale: typeof englishGameLocale): MatchEngineContext => ({
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale,
  balance: basicScoringBalance,
});

const romanianSetup = (options: Parameters<typeof createSimulationSetup>[1] = {}) =>
  createSimulationSetup(gameCatalog, { ...options, gameLocale: 'ro-RO' });

/** Score, weakness, combo, and continuation facts that must not depend on language. */
function scoreFacts(resolutions: readonly MatchResolution[]) {
  return resolutions.map((resolution) => ({
    round: resolution.round,
    openingPlayerId: resolution.openingPlayerId,
    players: Object.fromEntries(
      Object.entries(resolution.players).map(([playerId, player]) => [
        playerId,
        {
          prideBefore: player.prideBefore,
          prideAfter: player.prideAfter,
          selfDamage: player.selfDamage,
          opponentOutgoingDamage: player.opponentOutgoingDamage,
          sentenceDamage: player.sentenceDamage,
          comebackBonus: player.comebackBonus,
          outgoingDamage: player.outgoingDamage,
          sentenceSubtotal: player.sentenceSubtotal,
          phraseCount: player.phraseCount,
          comboMultiplier: player.comboMultiplier,
          weaknessActivated: player.weaknessActivated,
          comebackActivated: player.comebackActivated,
          continuation: player.continuation.status,
          completeValidInsult: player.completeValidInsult,
          constructionStatus: player.constructionStatus,
        },
      ]),
    ),
  }));
}

describe('Romanian deterministic play', () => {
  test.each(['local-radio-caller', 'party-strategist', 'palace-operator'] as const)(
    'finishes fixed Romanian seeds at the %s difficulty',
    (difficulty) => {
      const report = simulateMatches(
        seed,
        4,
        romanianSetup({ aiDifficulty: difficulty }),
        romanianContext,
      );
      expect(report.completedMatches).toBe(report.matches);
      expect(report.privacyLeaks).toBe(0);
      expect(report.timerOverruns).toBe(0);
      expect(Object.values(report.winners).reduce((total, wins) => total + wins, 0)).toBe(
        report.matches,
      );
      expect(summarizeSimulation(report)).toContain(`privacy-leaks=0`);
    },
    60_000,
  );

  test('finishes fixed Romanian hotseat seeds without an invalid-command loop', () => {
    const report = simulateMatches(
      seed,
      4,
      { ...romanianSetup(), mode: 'hotseat', aiDifficulty: null },
      romanianContext,
    );
    expect(report.completedMatches).toBe(report.matches);
    expect(report.privacyLeaks).toBe(0);
    expect(report.timerOverruns).toBe(0);
  }, 60_000);

  test('covers every ladder rung difficulty with a completed Romanian match', () => {
    // The shipped ladder has one rung per playable scene.
    const rungCount = gameCatalog.scenes.length;
    const difficulties = new Set(
      Array.from({ length: rungCount }, (_, rungIndex) => ladderDifficulty(rungIndex, rungCount)),
    );
    expect(difficulties).toEqual(
      new Set(['local-radio-caller', 'party-strategist', 'palace-operator']),
    );
    for (const difficulty of difficulties) {
      const match = simulateMatch(
        seed,
        romanianSetup({ aiDifficulty: difficulty }),
        romanianContext,
      );
      expect(match.finalState.phase).toBe('results');
      expect(match.finalState.winner).toBeTruthy();
    }
  }, 60_000);

  test('scores a matched semantic clause identically in both game locales', () => {
    const english = simulateMatch(
      seed,
      createSimulationSetup(gameCatalog, {
        aiDifficulty: 'palace-operator',
        gameLocale: 'en',
      }),
      englishContext,
    );
    // Replay the exact same accepted public commands in Romanian. The commands
    // name stable card identifiers, so both locales receive identical inputs.
    const romanianReplay: ReplayDocument = {
      ...english.replay,
      setup: { ...english.replay.setup, gameLocale: 'ro-RO' },
    };
    const reducer = createMatchReducer(engineContext(romanianGameLocale));
    const start = createReplayInitialState(romanianReplay, romanianContext);
    expect(start).not.toBeNull();
    const state = applyCommands(reducer, start!, romanianReplay.commands);
    expect(state.phase).toBe('results');
    expect(state.winner).toBe(english.finalState.winner);
    expect(scoreFacts(state.resolutionHistory)).toEqual(
      scoreFacts(english.finalState.resolutionHistory),
    );
    expect(english.replay.setup.gameLocale).toBe('en');
  }, 60_000);

  test('repeats a fixed Romanian fixture byte for byte', () => {
    const run = () => {
      const match = simulateMatch(
        seed,
        romanianSetup({ aiDifficulty: 'party-strategist' }),
        romanianContext,
      );
      return {
        bytes: encodeReplay(match.replay),
        state: match.finalState,
        facts: scoreFacts(match.finalState.resolutionHistory),
      };
    };
    const first = run();
    const second = run();
    expect(second.bytes).toBe(first.bytes);
    expect(second.state).toEqual(first.state);
    expect(second.facts).toEqual(first.facts);
  }, 60_000);

  test('leaves Romanian state unchanged when a command is rejected', () => {
    const reducer = createMatchReducer(engineContext(romanianGameLocale));
    const start = createReplayInitialState(
      {
        schemaVersion: replaySchemaVersion,
        kind: replayKind,
        seed,
        setup: romanianSetup(),
        commands: [],
      },
      romanianContext,
    );
    expect(start).not.toBeNull();
    const state = applyCommands(reducer, start!, [
      { type: 'start-match', source: 'user', payload: {} },
      { type: 'prepare-round', source: 'user', payload: {} },
    ]);
    const activePlayerId = state.activePlayerId;
    const opponentId = state.playerOrder.find((id) => id !== activePlayerId)!;
    const foreignCard = state.draft!.playerStates[opponentId]!.hand[0]!;
    const before = structuredClone(state);

    const rejected = reducer(
      state,
      {
        type: 'select-phrase',
        source: 'user',
        actorId: activePlayerId,
        payload: { card: { source: 'private', cardId: foreignCard.id } },
      },
      seededRandomSource,
    );

    expect(rejected.ok).toBe(false);
    expect(rejected.ok ? null : rejected.error.code).toBe('card-not-owned');
    expect(state).toEqual(before);
    expect(state.commandHistory).toEqual(before.commandHistory);
  });
});

function applyCommands(
  reducer: ReturnType<typeof createMatchReducer>,
  start: MatchState,
  commands: readonly MatchCommand[],
): MatchState {
  let state = start;
  for (const command of commands) {
    const result = reducer(state, command, seededRandomSource);
    if (!result.ok) {
      throw new Error(`Rejected ${command.type}: ${result.error.code}`);
    }
    state = result.state;
  }
  return state;
}
