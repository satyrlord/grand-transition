import { selfKnockoutReviewState, reviewContext, reduceReviewState } from '../fixtures/ai-review-states';
import { describe, expect, test } from 'vitest';
import {
  decideLocalRadioCaller,
  enumerateEasyAiCommands,
  evaluateLocalRadioCallerCandidates,
  localRadioCallerDelay,
  localRadioCallerWeights,
  redrawExpectedUtility,
  scoreEasyAiFeatureSet,
  type EasyAiFeatures,
} from '../../src/ai/easy-ai';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  createMatchReducer,
  createMatchSetupState,
  type MatchCommand,
  type MatchEngineContext,
  type MatchState,
} from '../../src/engine/match-lifecycle';
import { seededRandomSource, type RandomSource } from '../../src/engine/random-source';
import {
  createSimulationSetup,
  listLocalRadioCallerSimulationOptions,
  simulateMatch,
  simulateMatches,
} from '../../src/engine/simulation';

const context: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

const zeroFeatures: EasyAiFeatures = Object.freeze({
  immediateDamage: 0,
  weaknessOpportunity: 0,
  comboOpportunity: 0,
  finisher: 0,
  grammarFlexibility: 0,
  denial: 0,
  continuation: 0,
  comebackValue: 0,
  personality: 0,
  opponentComebackRisk: 0,
  grammarRisk: 0,
  deadEnd: 0,
  immediateLethal: 0,
});

describe('Local Radio Caller', () => {
  test('enumerates each accepted card, redraw, and expiration command', () => {
    const state = preparedMatch();
    const player = state.draft!.playerStates[state.activePlayerId]!;
    const availableShared = state.draft!.board.slots.filter(
      ({ available }) => available,
    ).length;

    const ordinary = enumerateEasyAiCommands(state, context);
    expect(
      ordinary.filter(({ type }) => type === 'select-phrase'),
    ).toHaveLength(availableShared + player.hand.length);
    expect(ordinary.map(({ type }) => type)).toContain('redraw-hand');
    expect(ordinary.map(({ type }) => type)).not.toContain('expire-turn');

    const expired = enumerateEasyAiCommands(state, context, true);
    expect(expired.map(({ type }) => type)).toContain('expire-turn');
    for (const command of expired) {
      expect(createMatchReducer(context)(state, command, seededRandomSource).ok).toBe(
        true,
      );
    }
  });

  test('isolates each signed utility term at its exact weight', () => {
    const neutralPersonality = { aggression: 0, denial: 0, risk: 0 };
    for (const name of Object.keys(localRadioCallerWeights) as Array<
      keyof typeof localRadioCallerWeights
    >) {
      if (name === 'personality') continue;
      const features = { ...zeroFeatures, [name]: 1 };
      const [scored] = scoreEasyAiFeatureSet(
        [features, zeroFeatures],
        neutralPersonality,
      );
      expect(scored!.utility, name).toBe(localRadioCallerWeights[name]);
    }

    const [withPersonality] = scoreEasyAiFeatureSet(
      [{ ...zeroFeatures, immediateDamage: 1 }, zeroFeatures],
      { aggression: 1, denial: 0, risk: 0 },
    );
    const [withoutPersonality] = scoreEasyAiFeatureSet(
      [{ ...zeroFeatures, immediateDamage: 1 }, zeroFeatures],
      { aggression: 0, denial: 0, risk: 0 },
    );
    expect(withPersonality!.utility - withoutPersonality!.utility).toBeCloseTo(
      localRadioCallerWeights.personality / 3,
      12,
    );
  });

  test('normalizes finite values across one candidate set', () => {
    const scored = scoreEasyAiFeatureSet(
      [
        { ...zeroFeatures, immediateDamage: 2 },
        { ...zeroFeatures, immediateDamage: 4 },
        zeroFeatures,
      ],
      { aggression: 0, denial: 0, risk: 0 },
    );
    expect(scored.map(({ normalizedFeatures }) => normalizedFeatures.immediateDamage)).toEqual([
      0.5,
      1,
      0,
    ]);
  });

  test('applies the exact redraw threshold to one union-normalized set', () => {
    expect(redrawExpectedUtility([0, 0], [0.15, 1])).toBe(0.15);
    expect(redrawExpectedUtility([0, 0], [0.149_999, 1])).toBeNull();
    expect(redrawExpectedUtility([0, 0], [0.2, 0.9])).toBe(0.2);
    expect(redrawExpectedUtility([0, 0], [1])).toBeNull();

    const union = scoreEasyAiFeatureSet(
      [
        { ...zeroFeatures, immediateDamage: 2 },
        { ...zeroFeatures, immediateDamage: 2 },
        { ...zeroFeatures, immediateDamage: 3 },
        { ...zeroFeatures, immediateDamage: 4 },
      ],
      { aggression: 0, denial: 0, risk: 0 },
    ).map(({ utility }) => utility);
    expect(union).toEqual([0.5, 0.5, 0.75, 1]);
    expect(redrawExpectedUtility(union.slice(0, 2), union.slice(2))).toBe(0.75);
  });

  test('makes lethal dominant and rejects a dead end when a safe action exists', () => {
    const scored = scoreEasyAiFeatureSet(
      [
        { ...zeroFeatures, immediateLethal: 1 },
        { ...zeroFeatures, immediateDamage: 1 },
        { ...zeroFeatures, deadEnd: 1 },
        zeroFeatures,
      ],
      { aggression: 0, denial: 0, risk: 0 },
    );
    expect(scored[0]!.utility).toBeGreaterThan(scored[1]!.utility);
    expect(scored[2]!.utility).toBeLessThan(scored[3]!.utility);
  });

  test('repeats candidates and a seeded equal-utility selection', () => {
    const state = preparedMatch();
    const firstCandidates = evaluateLocalRadioCallerCandidates(state, context);
    const secondCandidates = evaluateLocalRadioCallerCandidates(state, context);
    expect(secondCandidates).toEqual(firstCandidates);

    const constantRandom: RandomSource = {
      next(seed) {
        return { value: 0.75, nextSeed: (seed + 1) >>> 0 };
      },
    };
    const first = decideLocalRadioCaller(state, context, {
      seed: 42,
      randomSource: constantRandom,
    });
    const second = decideLocalRadioCaller(state, context, {
      seed: 42,
      randomSource: constantRandom,
    });
    expect(second).toEqual(first);
    expect(decideLocalRadioCaller(state, context)).toEqual(
      decideLocalRadioCaller(state, context),
    );
  });

  test('consumes a selection draw before the delay for one best action', () => {
    const opening = preparedMatch();
    const openingCandidates = evaluateLocalRadioCallerCandidates(
      opening,
      context,
    );
    const safeSubject = openingCandidates.find(
      ({ command, rawFeatures }) =>
        command.type === 'select-phrase' && rawFeatures.grammarRisk === 0,
    );
    expect(safeSubject).toBeTruthy();
    const afterSubject = reduce(opening, safeSubject!.command);
    const actorId = afterSubject.activePlayerId;
    const opponentId = afterSubject.playerOrder.find(
      (playerId) => playerId !== actorId,
    )!;
    const actor = afterSubject.draft!.playerStates[actorId]!;
    let state: MatchState = {
      ...afterSubject,
      playerStates: {
        ...afterSubject.playerStates,
        [opponentId]: {
          ...afterSubject.playerStates[opponentId]!,
          pride: 1,
        },
      },
      draft: {
        ...afterSubject.draft!,
        playerStates: {
          ...afterSubject.draft!.playerStates,
          [actorId]: { ...actor, redrawUsed: true },
        },
      },
    };
    let candidates = evaluateLocalRadioCallerCandidates(state, context);
    let bestUtility = Math.max(...candidates.map(({ utility }) => utility));
    const tiedBest = candidates.filter(
      ({ utility }) => utility === bestUtility,
    );
    expect(tiedBest).toHaveLength(2);
    const suppressed = tiedBest[1]!.command;
    expect(suppressed.type).toBe('select-phrase');
    if (suppressed.type === 'select-phrase') {
      const active = state.draft!.playerStates[actorId]!;
      const board = {
        ...state.draft!.board,
        slots: state.draft!.board.slots.map((slot) =>
          suppressed.payload.card.source === 'shared' &&
          slot.id === suppressed.payload.card.cardId
            ? { ...slot, available: false }
            : slot,
        ),
      };
      state = {
        ...state,
        board,
        draft: {
          ...state.draft!,
          board,
          playerStates: {
            ...state.draft!.playerStates,
            [actorId]: {
              ...active,
              hand:
                suppressed.payload.card.source === 'private'
                  ? active.hand.filter(
                      ({ id }) => id !== suppressed.payload.card.cardId,
                    )
                  : active.hand,
            },
          },
        },
      };
    }
    candidates = evaluateLocalRadioCallerCandidates(state, context);
    bestUtility = Math.max(...candidates.map(({ utility }) => utility));
    expect(
      candidates.filter(({ utility }) => utility === bestUtility),
    ).toHaveLength(1);

    let draws = 0;
    const orderedRandom: RandomSource = {
      next(seed) {
        const value = draws === 0 ? 0.999 : 0;
        draws += 1;
        return { value, nextSeed: (seed + 1) >>> 0 };
      },
    };
    const decision = decideLocalRadioCaller(state, context, {
      seed: 42,
      randomSource: orderedRandom,
    });

    expect(decision?.delayMs).toBe(500);
    expect(decision?.nextSeed).toBe(44);
    expect(draws).toBe(2);
  });

  test('reaches both delay endpoints and uses the exact reduced delay', () => {
    const low: RandomSource = {
      next: (seed) => ({ value: 0, nextSeed: (seed + 1) >>> 0 }),
    };
    const high: RandomSource = {
      next: (seed) => ({
        value: 600 / 601,
        nextSeed: (seed + 1) >>> 0,
      }),
    };
    expect(localRadioCallerDelay(1, false, low).delayMs).toBe(500);
    expect(localRadioCallerDelay(1, false, high).delayMs).toBe(1_100);
    expect(localRadioCallerDelay(1, true, high)).toEqual({
      delayMs: 100,
      nextSeed: 1,
    });
  });

  test('completes one replayable match through the Local Radio Caller policy', () => {
    const setup = createSimulationSetup(sampleContent, {
      aiDifficulty: 'local-radio-caller',
    });
    const replayContext = {
      catalog: sampleContent,
      locale: englishGameLocale,
      balance: basicScoringBalance,
    };
    const result = simulateMatch(
      21,
      setup,
      replayContext,
      listLocalRadioCallerSimulationOptions,
    );
    expect(result.finalState.phase).toBe('results');
    expect(result.finalState.winner).toBeTruthy();
    expect(result.replay.commands.every(({ source }) => source === 'ai')).toBe(
      true,
    );
    expect(result.privacyLeaks).toBe(0);
    expect(result.timerOverruns).toBe(0);
    expect(result.maximumPresentationDelayMs).toBeGreaterThanOrEqual(500);
    expect(result.maximumPresentationDelayMs).toBeLessThanOrEqual(1_100);

    const report = simulateMatches(
      21,
      2,
      setup,
      replayContext,
      listLocalRadioCallerSimulationOptions,
    );
    expect(report).toMatchObject({
      completedMatches: 2,
      privacyLeaks: 0,
      timerOverruns: 0,
    });
    expect(report.maximumPresentationDelayMs).toBeGreaterThanOrEqual(500);
    expect(report.maximumPresentationDelayMs).toBeLessThanOrEqual(1_100);
  });
});

function preparedMatch(): MatchState {
  const [first, second] = sampleContent.characters;
  const scene = sampleContent.scenes[0]!;
  let state = createMatchSetupState({
    schemaVersion: 1,
    seed: 21,
    mode: 'ai',
    aiDifficulty: 'local-radio-caller',
    players: [configuredPlayer('player-one', first!.id), configuredPlayer('player-two', second!.id)],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: sampleContent.phrases.map(({ id }) => id),
    openingPlayerIndex: scene.openingPlayerIndex,
  });
  state = reduce(state, { type: 'start-match', source: 'ai', payload: {} });
  return reduce(state, { type: 'prepare-round', source: 'ai', payload: {} });
}

function configuredPlayer(playerId: string, characterId: string) {
  const character = sampleContent.characters.find(({ id }) => id === characterId)!;
  return {
    playerId,
    characterId,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular' as const,
    objectNumber: 'singular' as const,
  };
}

function reduce(state: MatchState, command: MatchCommand): MatchState {
  const result = createMatchReducer(context)(state, command, seededRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}


test.each([false, true])('preserves terminal mistake risk and avoids self-knockout (reversed=%s)', (reversed) => {
  const state = selfKnockoutReviewState(reversed);
  const candidates = evaluateLocalRadioCallerCandidates(state, reviewContext);
  const fatal = candidates.filter(({ selfKnockout }) => selfKnockout);
  expect(fatal.length).toBeGreaterThan(0);
  expect(fatal.every(({ rawFeatures }) => rawFeatures.grammarRisk === 1)).toBe(true);
  const safe = reduceReviewState(state, {
    type: 'commit-sentence', source: 'ai', actorId: state.activePlayerId, payload: {},
  });
  expect(safe.playerStates[state.activePlayerId]!.pride).toBe(3);
  expect(safe.phase).toBe('resolution');
  const decision = decideLocalRadioCaller(state, reviewContext)!;
  expect(reduceReviewState(state, decision.command).playerStates[state.activePlayerId]!.pride).toBe(3);
});
