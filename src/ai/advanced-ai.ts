import type { Character } from '../content/schemas';
import type { DraftCommand } from '../engine/draft-actions';
import {
  createMatchReducer,
  type MatchEngineContext,
  type MatchState,
} from '../engine/match-lifecycle';
import { seededRandomSource, type RandomSource } from '../engine/random-source';
import {
  evaluateLocalRadioCallerCandidates,
  type EasyAiCandidate,
} from './easy-ai';

export type AdvancedAiDifficulty = 'palace-operator' | 'party-strategist';

export const partyStrategistWeights = Object.freeze({
  immediateDamage: 1,
  weaknessOpportunity: 1.2,
  comboOpportunity: 1,
  finisher: 1,
  grammarFlexibility: 0.75,
  denial: 1,
  continuation: 0.8,
  comebackValue: 0.9,
  opponentComebackRisk: -0.25,
  grammarRisk: -4,
  deadEnd: -10_000,
  immediateLethal: 10_000,
  lethalBlock: 8_000,
} as const);

export const palaceOperatorWeights = Object.freeze({
  continuationBreak: 1.2,
  chargePreservation: 0.8,
  wrongSelectionUtility: 1,
} as const);

export const palaceBeamWidth = 12;
export const palaceReplyWidth = 8;
export const palaceNodeLimit = 256;
export const palaceReplyDiscount = 0.85;

type PartyFeatureName = keyof typeof partyStrategistWeights;
type PalaceFeatureName = keyof typeof palaceOperatorWeights;

export type AdvancedAiFeatures = Readonly<
  Record<PartyFeatureName | PalaceFeatureName, number>
>;

export type PartyStrategistCandidate = Readonly<{
  command: DraftCommand;
  targetId: string;
  rawFeatures: AdvancedAiFeatures;
  normalizedFeatures: AdvancedAiFeatures;
  utility: number;
  selfKnockout: boolean;
}>;

export type PartyStrategistDecision = Readonly<{
  command: DraftCommand;
  candidates: readonly PartyStrategistCandidate[];
  delayMs: number;
  nextSeed: number;
}>;

export type PalaceOperatorCandidate = PartyStrategistCandidate &
  Readonly<{
    firstPlyUtility: number;
    principalReply: DraftCommand | null;
    principalReplyUtility: number;
    evaluatedReplies: number;
  }>;

export type PalaceOperatorDecision = Readonly<{
  command: DraftCommand;
  candidates: readonly PalaceOperatorCandidate[];
  delayMs: number;
  nextSeed: number;
  evaluatedNodes: number;
  principalReply: DraftCommand | null;
}>;

export type AdvancedAiDecisionOptions = Readonly<{
  seed?: number;
  reducedDelay?: boolean;
  turnExpired?: boolean;
  randomSource?: RandomSource;
}>;

const binaryFeatures = new Set<keyof AdvancedAiFeatures>([
  'weaknessOpportunity',
  'comboOpportunity',
  'grammarRisk',
  'deadEnd',
  'immediateLethal',
  'lethalBlock',
  'continuationBreak',
]);

const partyFeatureNames = Object.keys(
  partyStrategistWeights,
) as PartyFeatureName[];
const palaceFeatureNames = Object.keys(
  palaceOperatorWeights,
) as PalaceFeatureName[];
const advancedFeatureNames = [
  ...partyFeatureNames,
  ...palaceFeatureNames,
] as const;

export function personalityMultiplier(trait: number): number {
  return 1 + (trait - 0.5) * 0.4;
}

export function wrongSelectionUtility(
  removedPhraseValue: number,
  exactSelfDamage: number,
): number {
  return removedPhraseValue - exactSelfDamage;
}

export function scorePartyStrategistFeatureSet(
  features: AdvancedAiFeatures,
  personality: Character['aiPersonality'],
): number {
  return partyUtility(features, personality);
}

export function scorePalaceOperatorFeatureSet(
  features: AdvancedAiFeatures,
  personality: Character['aiPersonality'],
): number {
  const partyCandidate = {
    normalizedFeatures: features,
    utility: partyUtility(features, personality),
  } as PartyStrategistCandidate;
  return palaceFirstPlyUtility(partyCandidate, personality);
}

export function evaluatePartyStrategistCandidates(
  state: MatchState,
  context: MatchEngineContext,
  options: Pick<AdvancedAiDecisionOptions, 'randomSource' | 'turnExpired'> = {},
): readonly PartyStrategistCandidate[] {
  const randomSource = options.randomSource ?? seededRandomSource;
  const easyCandidates = evaluateLocalRadioCallerCandidates(state, context, {
    randomSource,
    turnExpired: options.turnExpired,
  });
  return scoreAdvancedCandidates(state, context, easyCandidates, randomSource);
}

export function decidePartyStrategist(
  state: MatchState,
  context: MatchEngineContext,
  options: AdvancedAiDecisionOptions = {},
): PartyStrategistDecision | null {
  const randomSource = options.randomSource ?? seededRandomSource;
  const candidates = evaluatePartyStrategistCandidates(state, context, {
    randomSource,
    turnExpired: options.turnExpired,
  });
  if (candidates.length === 0) return null;
  const seed = options.seed ?? decisionSeed(state, 'party-strategist');
  const selected = selectBestCandidate(candidates, seed, randomSource);
  const delay = advancedAiDelay(
    'party-strategist',
    selected.nextSeed,
    options.reducedDelay,
    randomSource,
  );
  return Object.freeze({
    command: selected.candidate.command,
    candidates,
    delayMs: delay.delayMs,
    nextSeed: delay.nextSeed,
  });
}

export function evaluatePalaceOperatorCandidates(
  state: MatchState,
  context: MatchEngineContext,
  options: Pick<AdvancedAiDecisionOptions, 'randomSource' | 'turnExpired'> = {},
): Readonly<{
  candidates: readonly PalaceOperatorCandidate[];
  evaluatedNodes: number;
}> {
  const randomSource = options.randomSource ?? seededRandomSource;
  const partyCandidates = evaluatePartyStrategistCandidates(state, context, {
    randomSource,
    turnExpired: options.turnExpired,
  });
  const eligible = keepNonKnockoutWrongSelections(partyCandidates);
  let evaluatedNodes = Math.min(palaceNodeLimit, partyCandidates.length);
  const firstPly = eligible
    .map((candidate) => ({
      candidate,
      utility: palaceFirstPlyUtility(candidate, actorPersonality(state, context)),
    }))
    .toSorted(
      (left, right) =>
        right.utility - left.utility ||
        compareCommands(left.candidate, right.candidate),
    )
    .slice(0, palaceBeamWidth);
  const actorId = state.activePlayerId;
  const opponentId = state.playerOrder.find((playerId) => playerId !== actorId);
  const searched: PalaceOperatorCandidate[] = [];

  for (const first of firstPly) {
    const nextState = reduceAccepted(
      state,
      context,
      first.candidate.command,
      randomSource,
    );
    let principalReply: DraftCommand | null = null;
    let principalReplyUtility = 0;
    let evaluatedReplies = 0;
    if (
      nextState &&
      opponentId &&
      nextState.activePlayerId === opponentId &&
      evaluatedNodes < palaceNodeLimit
    ) {
      const replyEasy = evaluateLocalRadioCallerCandidates(nextState, context, {
        randomSource,
      })
        .toSorted(
          (left, right) =>
            right.utility - left.utility || compareEasyCandidates(left, right),
        )
        .slice(
          0,
          Math.min(palaceReplyWidth, palaceNodeLimit - evaluatedNodes),
        );
      const replies = scoreAdvancedCandidates(
        nextState,
        context,
        replyEasy,
        randomSource,
      ).toSorted(
        (left, right) => right.utility - left.utility || compareCommands(left, right),
      );
      evaluatedReplies = replies.length;
      evaluatedNodes += evaluatedReplies;
      principalReply = replies[0]?.command ?? null;
      principalReplyUtility = replies[0]?.utility ?? 0;
    }
    searched.push(
      Object.freeze({
        ...first.candidate,
        utility: first.utility - palaceReplyDiscount * principalReplyUtility,
        firstPlyUtility: first.utility,
        principalReply,
        principalReplyUtility,
        evaluatedReplies,
      }),
    );
  }

  return Object.freeze({
    candidates: searched.toSorted(
      (left, right) => right.utility - left.utility || compareCommands(left, right),
    ),
    evaluatedNodes,
  });
}

export function decidePalaceOperator(
  state: MatchState,
  context: MatchEngineContext,
  options: AdvancedAiDecisionOptions = {},
): PalaceOperatorDecision | null {
  const randomSource = options.randomSource ?? seededRandomSource;
  const search = evaluatePalaceOperatorCandidates(state, context, {
    randomSource,
    turnExpired: options.turnExpired,
  });
  if (search.candidates.length === 0) return null;
  const seed = options.seed ?? decisionSeed(state, 'palace-operator');
  const selected = selectBestCandidate(search.candidates, seed, randomSource);
  const delay = advancedAiDelay(
    'palace-operator',
    selected.nextSeed,
    options.reducedDelay,
    randomSource,
  );
  return Object.freeze({
    command: selected.candidate.command,
    candidates: search.candidates,
    delayMs: delay.delayMs,
    nextSeed: delay.nextSeed,
    evaluatedNodes: search.evaluatedNodes,
    principalReply: selected.candidate.principalReply,
  });
}

export function advancedAiDelay(
  difficulty: AdvancedAiDifficulty,
  seed: number,
  reducedDelay = false,
  randomSource: RandomSource = seededRandomSource,
): Readonly<{ delayMs: number; nextSeed: number }> {
  if (reducedDelay) return Object.freeze({ delayMs: 100, nextSeed: seed >>> 0 });
  const step = randomSource.next(seed);
  const minimum = difficulty === 'party-strategist' ? 700 : 900;
  const span = difficulty === 'party-strategist' ? 800 : 900;
  return Object.freeze({
    delayMs: minimum + Math.min(span, Math.floor(step.value * (span + 1))),
    nextSeed: step.nextSeed,
  });
}

function scoreAdvancedCandidates(
  state: MatchState,
  context: MatchEngineContext,
  easyCandidates: readonly EasyAiCandidate[],
  randomSource: RandomSource,
): readonly PartyStrategistCandidate[] {
  if (easyCandidates.length === 0) return [];
  const actorId = state.activePlayerId;
  const actor = context.characters.find(
    ({ id }) => id === state.playerStates[actorId]?.characterId,
  );
  if (!actor) throw new Error(`Unknown AI character for player "${actorId}".`);
  const lethalThreatIds = opponentLethalThreatIds(
    state,
    context,
    randomSource,
  );
  const opponentValues = opponentSharedPhraseValues(
    state,
    context,
    randomSource,
  );
  const raw = easyCandidates.map((candidate) => {
    const nextState = reduceAccepted(state, context, candidate.command, randomSource);
    const actorPrideBefore = state.playerStates[actorId]?.pride ?? 0;
    const actorPrideAfter = nextState?.playerStates[actorId]?.pride ?? actorPrideBefore;
    const exactSelfDamage = Math.max(0, actorPrideBefore - actorPrideAfter);
    const wrong = candidate.rawFeatures.grammarRisk > 0;
    const rawFeatures: AdvancedAiFeatures = Object.freeze({
      immediateDamage: finite(candidate.rawFeatures.immediateDamage),
      weaknessOpportunity: binary(candidate.rawFeatures.weaknessOpportunity),
      comboOpportunity: binary(candidate.rawFeatures.comboOpportunity),
      finisher: finite(candidate.rawFeatures.finisher),
      grammarFlexibility: finite(candidate.rawFeatures.grammarFlexibility),
      denial: binary(candidate.rawFeatures.denial),
      continuation: binary(candidate.rawFeatures.continuation),
      comebackValue: finite(candidate.rawFeatures.comebackValue),
      opponentComebackRisk: finite(candidate.rawFeatures.opponentComebackRisk),
      grammarRisk: binary(candidate.rawFeatures.grammarRisk),
      deadEnd: binary(candidate.rawFeatures.deadEnd),
      immediateLethal: binary(candidate.rawFeatures.immediateLethal),
      lethalBlock:
        candidate.command.type === 'select-phrase' &&
        candidate.command.payload.card.source === 'shared' &&
        lethalThreatIds.has(candidate.targetId)
          ? 1
          : 0,
      continuationBreak:
        opponentContinuation(state, actorId) &&
        candidate.rawFeatures.immediateDamage >= 16
          ? 1
          : 0,
      chargePreservation:
        (nextState?.playerStates[actorId]?.comebackCharge ??
          state.playerStates[actorId]?.comebackCharge ??
          0) / 60,
      wrongSelectionUtility: wrong
        ? wrongSelectionUtility(
            opponentValues.get(candidate.targetId) ?? 0,
            exactSelfDamage,
          )
        : 0,
    });
    return {
      candidate,
      rawFeatures,
      selfKnockout:
        actorPrideBefore > 0 && actorPrideAfter === 0 && nextState?.phase === 'results',
    };
  });
  const maxima = Object.fromEntries(
    advancedFeatureNames.map((name) => [
      name,
      Math.max(0, ...raw.map(({ rawFeatures }) => Math.abs(rawFeatures[name]))),
    ]),
  ) as Record<keyof AdvancedAiFeatures, number>;
  return raw
    .map(({ candidate, rawFeatures, selfKnockout }) => {
      const normalizedFeatures = Object.freeze(
        Object.fromEntries(
          advancedFeatureNames.map((name) => [
            name,
            normalize(name, rawFeatures[name], maxima[name]),
          ]),
        ) as Record<keyof AdvancedAiFeatures, number>,
      );
      return Object.freeze({
        command: candidate.command,
        targetId: candidate.targetId,
        rawFeatures,
        normalizedFeatures,
        utility: partyUtility(normalizedFeatures, actor.aiPersonality),
        selfKnockout,
      });
    })
    .toSorted(compareCommands);
}

function partyUtility(
  features: AdvancedAiFeatures,
  personality: Character['aiPersonality'],
): number {
  return partyFeatureNames.reduce((total, name) => {
    const weight = partyStrategistWeights[name];
    return total + features[name] * weight * traitWeight(name, personality);
  }, 0);
}

function palaceFirstPlyUtility(
  candidate: PartyStrategistCandidate,
  personality: Character['aiPersonality'],
): number {
  return palaceFeatureNames.reduce((total, name) => {
    const weight = palaceOperatorWeights[name];
    return (
      total +
      candidate.normalizedFeatures[name] * weight * traitWeight(name, personality)
    );
  }, candidate.utility);
}

function traitWeight(
  name: keyof AdvancedAiFeatures,
  personality: Character['aiPersonality'],
): number {
  if (
    name === 'immediateLethal' ||
    name === 'lethalBlock' ||
    name === 'deadEnd' ||
    name === 'grammarRisk'
  ) {
    return 1;
  }
  if (
    name === 'immediateDamage' ||
    name === 'weaknessOpportunity' ||
    name === 'comboOpportunity'
  ) {
    return personalityMultiplier(personality.aggression);
  }
  if (name === 'denial' || name === 'continuationBreak') {
    return personalityMultiplier(personality.denial);
  }
  if (
    name === 'finisher' ||
    name === 'continuation' ||
    name === 'comebackValue' ||
    name === 'chargePreservation' ||
    name === 'wrongSelectionUtility'
  ) {
    return personalityMultiplier(personality.risk);
  }
  return 1;
}

function keepNonKnockoutWrongSelections(
  candidates: readonly PartyStrategistCandidate[],
): readonly PartyStrategistCandidate[] {
  const hasSafe = candidates.some(({ selfKnockout }) => !selfKnockout);
  return hasSafe
    ? candidates.filter(
        ({ selfKnockout, rawFeatures }) =>
          !selfKnockout || rawFeatures.grammarRisk === 0,
      )
    : candidates;
}

function opponentLethalThreatIds(
  state: MatchState,
  context: MatchEngineContext,
  randomSource: RandomSource,
): ReadonlySet<string> {
  const opponentState = forceOpponentTurn(state);
  if (!opponentState) return new Set();
  return new Set(
    evaluateLocalRadioCallerCandidates(opponentState, context, { randomSource })
      .filter(
        ({ command, rawFeatures }) =>
          command.type === 'select-phrase' &&
          command.payload.card.source === 'shared' &&
          rawFeatures.immediateLethal > 0,
      )
      .map(({ targetId }) => targetId),
  );
}

function opponentSharedPhraseValues(
  state: MatchState,
  context: MatchEngineContext,
  randomSource: RandomSource,
): ReadonlyMap<string, number> {
  const opponentState = forceOpponentTurn(state);
  if (!opponentState) return new Map();
  return new Map(
    evaluateLocalRadioCallerCandidates(opponentState, context, { randomSource })
      .filter(
        ({ command }) =>
          command.type === 'select-phrase' &&
          command.payload.card.source === 'shared',
      )
      .map(({ targetId, utility }) => [targetId, Math.max(0, utility)]),
  );
}

function forceOpponentTurn(state: MatchState): MatchState | null {
  if (!state.draft) return null;
  const opponentId = state.playerOrder.find(
    (playerId) => playerId !== state.activePlayerId,
  );
  if (
    !opponentId ||
    state.draft.playerStates[opponentId]?.construction.status !== 'building'
  ) {
    return null;
  }
  return {
    ...state,
    activePlayerId: opponentId,
    draft: {
      ...state.draft,
      activePlayerId: opponentId,
      turn: { ...state.draft.turn, activePlayerId: opponentId },
    },
  };
}

function reduceAccepted(
  state: MatchState,
  context: MatchEngineContext,
  command: DraftCommand,
  randomSource: RandomSource,
): MatchState | null {
  const result = createMatchReducer(context)(state, command, randomSource);
  return result.ok ? result.state : null;
}

function opponentContinuation(state: MatchState, actorId: string): boolean {
  const opponentId = state.playerOrder.find((playerId) => playerId !== actorId);
  return opponentId ? state.playerStates[opponentId]?.continuation !== null : false;
}

function actorPersonality(
  state: MatchState,
  context: MatchEngineContext,
): Character['aiPersonality'] {
  const characterId = state.playerStates[state.activePlayerId]?.characterId;
  const character = context.characters.find(({ id }) => id === characterId);
  if (!character) throw new Error(`Unknown AI character "${characterId ?? ''}".`);
  return character.aiPersonality;
}

function selectBestCandidate<
  Candidate extends Readonly<{ utility: number; command: DraftCommand; targetId: string }>,
>(
  candidates: readonly Candidate[],
  seed: number,
  randomSource: RandomSource,
): Readonly<{ candidate: Candidate; nextSeed: number }> {
  const bestUtility = Math.max(...candidates.map(({ utility }) => utility));
  const tied = candidates
    .filter(({ utility }) => utility === bestUtility)
    .toSorted(compareCommands);
  const step = randomSource.next(seed);
  const index = Math.min(tied.length - 1, Math.floor(step.value * tied.length));
  return Object.freeze({ candidate: tied[index]!, nextSeed: step.nextSeed });
}

function normalize(
  name: keyof AdvancedAiFeatures,
  value: number,
  maximum: number,
): number {
  if (binaryFeatures.has(name)) return value === 0 ? 0 : 1;
  return maximum === 0 ? 0 : value / maximum;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function binary(value: number): number {
  return value === 0 ? 0 : 1;
}

function compareEasyCandidates(left: EasyAiCandidate, right: EasyAiCandidate) {
  return (
    left.command.type.localeCompare(right.command.type) ||
    left.targetId.localeCompare(right.targetId)
  );
}

function compareCommands(
  left: Readonly<{ command: DraftCommand; targetId: string }>,
  right: Readonly<{ command: DraftCommand; targetId: string }>,
): number {
  return (
    left.command.type.localeCompare(right.command.type) ||
    left.targetId.localeCompare(right.targetId)
  );
}

function decisionSeed(
  state: MatchState,
  difficulty: AdvancedAiDifficulty,
): number {
  let hash = state.seed >>> 0;
  const text = `${difficulty}:${JSON.stringify(state.commandHistory)}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}
