import { selfKnockoutReviewState, reviewContext, reduceReviewState, preparedReviewState } from '../fixtures/ai-review-states';
import { describe, expect, test } from 'vitest';
import {
  advancedAiDelay,
  decidePalaceOperator,
  decidePartyStrategist,
  evaluatePalaceOperatorCandidates,
  evaluatePartyStrategistCandidates,
  palaceBeamWidth,
  palaceNodeLimit,
  palaceOperatorWeights,
  palaceReplyWidth,
  partyStrategistWeights,
  personalityMultiplier,
  scorePalaceOperatorFeatureSet,
  scorePartyStrategistFeatureSet,
  wrongSelectionUtility,
  type AdvancedAiFeatures,
} from '../../src/ai/advanced-ai';
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
} from '../../src/engine/simulation';
import { listConfiguredAiSimulationOptions } from '../../src/ai/simulation-policy';

const context: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

const zeroFeatures: AdvancedAiFeatures = Object.freeze({
  immediateDamage: 0,
  weaknessOpportunity: 0,
  comboOpportunity: 0,
  finisher: 0,
  grammarFlexibility: 0,
  denial: 0,
  continuation: 0,
  comebackValue: 0,
  opponentComebackRisk: 0,
  grammarRisk: 0,
  deadEnd: 0,
  immediateLethal: 0,
  lethalBlock: 0,
  continuationBreak: 0,
  chargePreservation: 0,
  wrongSelectionUtility: 0,
});

const neutralPersonality = { aggression: 0.5, denial: 0.5, risk: 0.5 };

describe('advanced AI ladder policies', () => {
  test('uses exact Party and Palace utility weights', () => {
    const partyTerms = {
      weaknessOpportunity: 1.2,
      comboOpportunity: 1,
      finisher: 1,
      denial: 1,
      continuation: 0.8,
      comebackValue: 0.9,
      grammarRisk: -4,
      deadEnd: -10_000,
      immediateLethal: 10_000,
      lethalBlock: 8_000,
    } as const;
    for (const [name, expected] of Object.entries(partyTerms)) {
      expect(
        scorePartyStrategistFeatureSet(
          { ...zeroFeatures, [name]: 1 },
          neutralPersonality,
        ),
        name,
      ).toBe(expected);
    }
    expect(partyStrategistWeights.grammarRisk).toBe(-4);
    expect(partyStrategistWeights.deadEnd).toBe(-10_000);
    expect(partyStrategistWeights.immediateLethal).toBe(10_000);
    expect(partyStrategistWeights.lethalBlock).toBe(8_000);
    expect(palaceOperatorWeights).toEqual({
      continuationBreak: 1.2,
      chargePreservation: 0.8,
      wrongSelectionUtility: 1,
    });
    expect(
      scorePalaceOperatorFeatureSet(
        {
          ...zeroFeatures,
          continuationBreak: 1,
          chargePreservation: 1,
          wrongSelectionUtility: 1,
        },
        neutralPersonality,
      ),
    ).toBe(3);
    expect(wrongSelectionUtility(2.5, 3)).toBe(-0.5);
  });

  test('keeps lethal, lethal-block, dead-end, and grammar ordering protected', () => {
    const personalities = [
      { aggression: 0, denial: 0, risk: 0 },
      { aggression: 1, denial: 1, risk: 1 },
    ];
    for (const personality of personalities) {
      const lethal = scorePartyStrategistFeatureSet(
        { ...zeroFeatures, immediateLethal: 1 },
        personality,
      );
      const lethalBlock = scorePartyStrategistFeatureSet(
        { ...zeroFeatures, lethalBlock: 1 },
        personality,
      );
      const nonlethal = scorePartyStrategistFeatureSet(
        {
          ...zeroFeatures,
          immediateDamage: 1,
          weaknessOpportunity: 1,
          comboOpportunity: 1,
          finisher: 1,
          denial: 1,
          continuation: 1,
          comebackValue: 1,
        },
        personality,
      );
      const grammarMistake = scorePartyStrategistFeatureSet(
        { ...zeroFeatures, grammarRisk: 1 },
        personality,
      );
      const deadEnd = scorePartyStrategistFeatureSet(
        { ...zeroFeatures, deadEnd: 1 },
        personality,
      );
      expect(lethal).toBe(10_000);
      expect(lethalBlock).toBe(8_000);
      expect(lethal).toBeGreaterThan(lethalBlock);
      expect(lethalBlock).toBeGreaterThan(nonlethal);
      expect(grammarMistake).toBe(-4);
      expect(deadEnd).toBe(-10_000);
    }
  });

  test('maps personality endpoints only to matching nonlethal weights', () => {
    expect(personalityMultiplier(0)).toBe(0.8);
    expect(personalityMultiplier(1)).toBe(1.2);
    const low = { aggression: 0, denial: 0, risk: 0 };
    const high = { aggression: 1, denial: 1, risk: 1 };
    expect(
      scorePartyStrategistFeatureSet(
        { ...zeroFeatures, weaknessOpportunity: 1 },
        low,
      ),
    ).toBe(1.2 * 0.8);
    expect(
      scorePartyStrategistFeatureSet(
        { ...zeroFeatures, weaknessOpportunity: 1 },
        high,
      ),
    ).toBe(1.2 * 1.2);
    expect(
      scorePartyStrategistFeatureSet(
        { ...zeroFeatures, denial: 1 },
        high,
      ),
    ).toBe(1.2);
    expect(
      scorePartyStrategistFeatureSet(
        { ...zeroFeatures, continuation: 1 },
        low,
      ),
    ).toBe(0.8 * 0.8);
  });

  test('reproduces one-ply Party choices for fixed state and history', () => {
    const state = preparedMatch();
    const candidates = evaluatePartyStrategistCandidates(state, context);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(({ utility }) => Number.isFinite(utility))).toBe(true);
    expect(evaluatePartyStrategistCandidates(state, context)).toEqual(candidates);
    const first = decidePartyStrategist(state, context, { seed: 22 });
    const second = decidePartyStrategist(state, context, { seed: 22 });
    expect(second).toEqual(first);
    expect(first?.delayMs).toBeGreaterThanOrEqual(700);
    expect(first?.delayMs).toBeLessThanOrEqual(1_500);
  });

  test('keeps Palace beam, reply width, and evaluated nodes inside exact limits', () => {
    const state = preparedMatch();
    const first = evaluatePalaceOperatorCandidates(state, context);
    const second = evaluatePalaceOperatorCandidates(state, context);
    expect(second).toEqual(first);
    expect(first.candidates.length).toBeLessThanOrEqual(palaceBeamWidth);
    expect(first.evaluatedNodes).toBeLessThanOrEqual(palaceNodeLimit);
    expect(
      first.candidates.every(
        ({ evaluatedReplies }) => evaluatedReplies <= palaceReplyWidth,
      ),
    ).toBe(true);
    expect(
      first.candidates.every(
        ({ principalReply, evaluatedReplies }) =>
          evaluatedReplies === 0 ? principalReply === null : principalReply !== null,
      ),
    ).toBe(true);

    const decision = decidePalaceOperator(state, context, { seed: 22 });
    expect(decision).toEqual(decidePalaceOperator(state, context, { seed: 22 }));
    expect(decision?.evaluatedNodes).toBe(first.evaluatedNodes);
    expect(decision?.delayMs).toBeGreaterThanOrEqual(900);
    expect(decision?.delayMs).toBeLessThanOrEqual(1_800);
  });

  test('reaches exact Party and Palace delay endpoints without search input', () => {
    const low: RandomSource = {
      next: (seed) => ({ value: 0, nextSeed: (seed + 1) >>> 0 }),
    };
    const partyHigh: RandomSource = {
      next: (seed) => ({ value: 800 / 801, nextSeed: (seed + 1) >>> 0 }),
    };
    const palaceHigh: RandomSource = {
      next: (seed) => ({ value: 900 / 901, nextSeed: (seed + 1) >>> 0 }),
    };
    expect(advancedAiDelay('party-strategist', 1, false, low).delayMs).toBe(700);
    expect(
      advancedAiDelay('party-strategist', 1, false, partyHigh).delayMs,
    ).toBe(1_500);
    expect(advancedAiDelay('palace-operator', 1, false, low).delayMs).toBe(900);
    expect(
      advancedAiDelay('palace-operator', 1, false, palaceHigh).delayMs,
    ).toBe(1_800);
    expect(advancedAiDelay('palace-operator', 1, true, palaceHigh)).toEqual({
      delayMs: 100,
      nextSeed: 1,
    });
  });

  test.each([
    ['party-strategist', 700, 1_500],
    ['palace-operator', 900, 1_800],
  ] as const)(
    'completes one replayable %s match inside its delay bounds',
    (difficulty, minimumDelay, maximumDelay) => {
      const result = simulateMatch(
        22,
        createSimulationSetup(sampleContent, { aiDifficulty: difficulty }),
        {
          catalog: sampleContent,
          locale: englishGameLocale,
          balance: basicScoringBalance,
        },
        listConfiguredAiSimulationOptions,
      );
      expect(result.finalState.phase).toBe('results');
      expect(result.finalState.winner).toBeTruthy();
      expect(result.maximumPresentationDelayMs).toBeGreaterThanOrEqual(
        minimumDelay,
      );
      expect(result.maximumPresentationDelayMs).toBeLessThanOrEqual(
        maximumDelay,
      );
      expect(result.privacyLeaks).toBe(0);
      expect(result.timerOverruns).toBe(0);
    },
    15_000,
  );

  test('routes configured Local Radio Caller simulation through its exact provider', () => {
    const state = preparedMatch();
    const localState = {
      ...state,
      setup: { ...state.setup, aiDifficulty: 'local-radio-caller' },
    };
    expect(listConfiguredAiSimulationOptions(localState, context)).toEqual(
      listLocalRadioCallerSimulationOptions(localState, context),
    );
  });
});

function preparedMatch(): MatchState {
  const [first, second] = sampleContent.characters;
  const scene = sampleContent.scenes[0]!;
  let state = createMatchSetupState({
    schemaVersion: 1,
    seed: 22,
    mode: 'ai',
    aiDifficulty: 'party-strategist',
    players: [
      configuredPlayer('player-one', first!.id),
      configuredPlayer('player-two', second!.id),
    ],
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


test.each([decidePartyStrategist, decidePalaceOperator])('advanced policy avoids terminal self-knockout', (decide) => {
  for (const reversed of [false, true]) {
    const state = selfKnockoutReviewState(reversed);
    const decision = decide(state, reviewContext)!;
    expect(reduceReviewState(state, decision.command).playerStates[state.activePlayerId]!.pride).toBe(3);
  }
});

test('scores current carry instead of prior-round continuation', () => {
  let state = preparedReviewState(22);
  const actor = state.activePlayerId;
  const opponent = state.playerOrder.find((id) => id !== actor)!;
  const pick = (card: { source: 'shared' | 'private'; cardId: string }) => {
    state = reduceReviewState(state, { type: 'select-phrase', source: 'ai', actorId: state.activePlayerId, payload: { card } });
  };
  pick(state.draft!.playerStates[actor]!.legalCards[0]!);
  const continuation = state.draft!.playerStates[opponent]!.legalCards.find((card) =>
    state.draft!.board.slots.some((slot) => slot.id === card.cardId && slot.role === 'continuation'))!;
  pick(continuation);
  const completing = state.draft!.playerStates[actor]!.legalCards.find((card) => {
    const next = reduceReviewState(state, { type: 'select-phrase', source: 'ai', actorId: actor, payload: { card } });
    return next.draft?.playerStates[actor]?.construction.analysis.complete;
  })!;
  pick(completing);
  state = { ...state, playerStates: { ...state.playerStates, [actor]: { ...state.playerStates[actor]!, comebackCharge: 60 } },
    draft: { ...state.draft!, playerStates: { ...state.draft!.playerStates, [actor]: { ...state.draft!.playerStates[actor]!, comebackCharge: 60, availableComebackTiers: ['weak', 'medium', 'strong'] } } } };
  const construction = state.draft!.playerStates[actor]!.construction;
  const subjectId = construction.analysis.renderedPhrases[0]!.phraseId;
  const relationId = construction.analysis.renderedPhrases.find(
    ({ role }) => role === 'predicate' || role === 'verb',
  )!.phraseId;
  const boundaryState = {
    ...state,
    playerStates: {
      ...state.playerStates,
      [opponent]: { ...state.playerStates[opponent]!, weaknessTags: [] },
    },
  };
  for (const damage of [15, 16]) {
    const boundaryContext = {
      ...reviewContext,
      phrases: reviewContext.phrases.map((phrase) => phrase.id === relationId
        ? { ...phrase, customScores: [{ leftNounId: subjectId, score: damage }] }
        : phrase),
    };
    const commit = evaluatePartyStrategistCandidates(boundaryState, boundaryContext)
      .find(({ command }) => command.type === 'commit-sentence')!;
    expect(commit.rawFeatures.immediateDamage).toBe(damage);
    expect(commit.rawFeatures.continuationBreak).toBe(damage === 16 ? 1 : 0);
    const reducer = createMatchReducer(boundaryContext);
    const committed = reducer(boundaryState, commit.command, seededRandomSource);
    if (!committed.ok) throw new Error(committed.error.code);
    const resolved = reducer(committed.state, {
      type: 'resolve-round', source: 'ai', payload: {},
    }, seededRandomSource);
    if (!resolved.ok) throw new Error(resolved.error.code);
    expect(resolved.state.pendingResolution!.players[opponent]!.continuation.status === 'broken')
      .toBe(damage === 16);
  }
  expect(state.playerStates[opponent]!.continuation).toBeNull();
  expect(state.draft!.playerStates[opponent]!.construction.carryIntent).toBe(true);
  const candidate = evaluatePartyStrategistCandidates(state, reviewContext).find(({ command }) => command.type === 'select-comeback')!;
  expect(candidate.rawFeatures.immediateDamage).toBeGreaterThanOrEqual(16);
  expect(candidate.rawFeatures.continuationBreak).toBe(1);
  const resolution = reduceReviewState(reduceReviewState(state, candidate.command), { type: 'resolve-round', source: 'ai', payload: {} });
  expect(resolution.pendingResolution!.players[opponent]!.continuation.status).toBe('broken');
  const withoutCarry = { ...state, playerStates: { ...state.playerStates, [opponent]: { ...state.playerStates[opponent]!, continuation: { steps: state.draft!.playerStates[opponent]!.construction.steps, analysis: state.draft!.playerStates[opponent]!.construction.analysis, publicText: state.draft!.playerStates[opponent]!.construction.previewText } } },
    draft: { ...state.draft!, playerStates: { ...state.draft!.playerStates, [opponent]: { ...state.draft!.playerStates[opponent]!, construction: { ...state.draft!.playerStates[opponent]!.construction, carryIntent: false } } } } };
  expect(evaluatePartyStrategistCandidates(withoutCarry, reviewContext).every(({ rawFeatures }) => rawFeatures.continuationBreak === 0)).toBe(true);
});
