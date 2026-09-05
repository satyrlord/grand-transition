import type { Character } from '../content/schemas';
import { scoreComboFinisherConstruction } from '../engine/combo-finisher-scoring';
import type { DraftCardReference, DraftCommand } from '../engine/draft-actions';
import {
  createMatchReducer,
  type MatchCommand,
  type MatchEngineContext,
  type MatchState,
} from '../engine/match-lifecycle';
import { seededRandomSource, type RandomSource } from '../engine/random-source';

export const localRadioCallerWeights = Object.freeze({
  immediateDamage: 1,
  weaknessOpportunity: 0.35,
  comboOpportunity: 0.35,
  finisher: 0.25,
  grammarFlexibility: 0.75,
  denial: 0.1,
  continuation: 0.15,
  comebackValue: 0.25,
  personality: 0.25,
  opponentComebackRisk: -0.25,
  grammarRisk: -1,
  deadEnd: -1_000,
  immediateLethal: 1_000,
} as const);

export type EasyAiFeatureName = keyof typeof localRadioCallerWeights;
export type EasyAiFeatures = Readonly<Record<EasyAiFeatureName, number>>;

export type EasyAiCandidate = Readonly<{
  command: DraftCommand;
  targetId: string;
  rawFeatures: EasyAiFeatures;
  normalizedFeatures: EasyAiFeatures;
  utility: number;
  selfKnockout: boolean;
}>;

export type EasyAiDecision = Readonly<{
  command: DraftCommand;
  candidates: readonly EasyAiCandidate[];
  delayMs: number;
  nextSeed: number;
}>;

export type EasyAiDecisionOptions = Readonly<{
  seed?: number;
  reducedDelay?: boolean;
  turnExpired?: boolean;
  randomSource?: RandomSource;
}>;

type BaseFeatureName = Exclude<EasyAiFeatureName, 'personality'>;
type BaseFeatures = Readonly<Record<BaseFeatureName, number>>;
type RawCandidate = Readonly<{
  command: DraftCommand;
  targetId: string;
  features: BaseFeatures;
  selfKnockout?: boolean;
}>;

const zeroBaseFeatures: BaseFeatures = Object.freeze({
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
});

export function enumerateEasyAiCommands(
  state: MatchState,
  context: MatchEngineContext,
  turnExpired = false,
  randomSource: RandomSource = seededRandomSource,
): readonly DraftCommand[] {
  const player = activeDraftPlayer(state);
  if (!player) return [];
  const commands: DraftCommand[] = [];
  for (const slot of state.draft!.board.slots) {
    if (slot.available) {
      commands.push(selectPhraseCommand(player.playerId, 'shared', slot.id));
    }
  }
  for (const card of player.hand) {
    commands.push(selectPhraseCommand(player.playerId, 'private', card.id));
  }
  if (!player.redrawUsed) {
    commands.push(actorCommand('redraw-hand', player.playerId));
  }
  commands.push(actorCommand('commit-sentence', player.playerId));
  if (player.construction.analysis.complete) {
    if (
      !player.construction.selectedComeback &&
      player.availableComebackTiers.length > 0
    ) {
      commands.push(actorCommand('select-comeback', player.playerId));
    }
  }
  if (turnExpired) {
    commands.push(actorCommand('expire-turn', player.playerId));
  }

  const reducer = createMatchReducer(context);
  return commands.filter((command) => {
    if (command.type === 'select-phrase' || command.type === 'expire-turn') {
      return true;
    }
    try {
      return reducer(state, command, randomSource).ok;
    } catch {
      return false;
    }
  });
}

export function scoreEasyAiFeatureSet(
  featureSets: readonly EasyAiFeatures[],
  personality: Character['aiPersonality'],
): readonly Readonly<{
  normalizedFeatures: EasyAiFeatures;
  utility: number;
}>[] {
  const maxima = featureMaxima(featureSets);
  return featureSets.map((features) => {
    const normalizedBase = Object.fromEntries(
      (Object.keys(zeroBaseFeatures) as BaseFeatureName[]).map((name) => [
        name,
        normalizeFeature(name, features[name], maxima[name]),
      ]),
    ) as Record<BaseFeatureName, number>;
    const normalizedFeatures: EasyAiFeatures = Object.freeze({
      ...normalizedBase,
      personality: personalityFeature(normalizedBase, personality),
    });
    return Object.freeze({
      normalizedFeatures,
      utility: utilityFor(normalizedFeatures),
    });
  });
}

export function evaluateLocalRadioCallerCandidates(
  state: MatchState,
  context: MatchEngineContext,
  options: Pick<EasyAiDecisionOptions, 'randomSource' | 'turnExpired'> = {},
): readonly EasyAiCandidate[] {
  const randomSource = options.randomSource ?? seededRandomSource;
  const commands = enumerateEasyAiCommands(
    state,
    context,
    options.turnExpired,
    randomSource,
  );
  const ordinaryCommands = commands.filter(
    (command) => command.type !== 'redraw-hand',
  );
  const rawCandidates = ordinaryCommands.map((command) =>
    evaluateCommand(state, context, command, randomSource),
  );
  const actor = activeDraftPlayer(state);
  if (!actor) return [];
  const personality = characterFor(context, actor.characterId).aiPersonality;
  const scored = scoreRawCandidates(rawCandidates, personality);
  const redraw = commands.find((command) => command.type === 'redraw-hand');
  const redrawCandidate = redraw
    ? evaluateRedraw(state, context, redraw, personality, randomSource)
    : null;
  return [...scored, ...(redrawCandidate ? [redrawCandidate] : [])].toSorted(
    compareCandidates,
  );
}

export function decideLocalRadioCaller(
  state: MatchState,
  context: MatchEngineContext,
  options: EasyAiDecisionOptions = {},
): EasyAiDecision | null {
  const randomSource = options.randomSource ?? seededRandomSource;
  const candidates = evaluateLocalRadioCallerCandidates(state, context, {
    randomSource,
    turnExpired: options.turnExpired,
  });
  if (candidates.length === 0) return null;
  const selectable = candidates.some(({ selfKnockout }) => !selfKnockout)
    ? candidates.filter(({ selfKnockout }) => !selfKnockout)
    : candidates;
  const bestUtility = Math.max(...selectable.map(({ utility }) => utility));
  const tied = selectable
    .filter(({ utility }) => utility === bestUtility)
    .toSorted(compareCandidates);
  let seed = options.seed ?? decisionSeed(state);
  const selectionStep = randomSource.next(seed);
  seed = selectionStep.nextSeed;
  const selected =
    tied[
      Math.min(
        tied.length - 1,
        Math.floor(selectionStep.value * tied.length),
      )
    ]!;
  const delay = localRadioCallerDelay(seed, options.reducedDelay, randomSource);
  return Object.freeze({
    command: selected.command,
    candidates,
    delayMs: delay.delayMs,
    nextSeed: delay.nextSeed,
  });
}

export function localRadioCallerDelay(
  seed: number,
  reducedDelay = false,
  randomSource: RandomSource = seededRandomSource,
): Readonly<{ delayMs: number; nextSeed: number }> {
  if (reducedDelay) return Object.freeze({ delayMs: 100, nextSeed: seed >>> 0 });
  const step = randomSource.next(seed);
  return Object.freeze({
    delayMs: 500 + Math.min(600, Math.floor(step.value * 601)),
    nextSeed: step.nextSeed,
  });
}

export function redrawExpectedUtility(
  currentUtilities: readonly number[],
  replacementUtilities: readonly number[],
): number | null {
  if (replacementUtilities.length !== 2) return null;
  const currentMean = mean(currentUtilities);
  if (
    replacementUtilities.some((utility) => utility < currentMean + 0.15)
  ) {
    return null;
  }
  return Math.min(...replacementUtilities);
}

function evaluateRedraw(
  state: MatchState,
  context: MatchEngineContext,
  command: DraftCommand,
  personality: Character['aiPersonality'],
  randomSource: RandomSource,
): EasyAiCandidate | null {
  const reducer = createMatchReducer(context);
  const result = reducer(state, command, randomSource);
  if (!result.ok || !result.state.draft) return null;
  const actorId = command.actorId!;
  const currentPlayer = state.draft!.playerStates[actorId]!;
  const replacementPlayer = result.state.draft.playerStates[actorId]!;
  const current = currentPlayer.hand.map((card) =>
    evaluateCommand(
      state,
      context,
      selectPhraseCommand(actorId, 'private', card.id),
      randomSource,
    ),
  );
  const replacements = replacementPlayer.hand.map((card) =>
    evaluateCommand(
      result.state,
      context,
      selectPhraseCommand(actorId, 'private', card.id),
      randomSource,
    ),
  );
  if (replacements.length !== 2) return null;
  const union = scoreRawCandidates([...current, ...replacements], personality);
  const currentUtilities = union.slice(0, current.length).map(({ utility }) => utility);
  const replacementUtilities = union.slice(current.length).map(({ utility }) => utility);
  const expectedUtility = redrawExpectedUtility(
    currentUtilities,
    replacementUtilities,
  );
  if (expectedUtility === null) return null;
  const rawFeatures = withPersonality(zeroBaseFeatures, personality);
  return Object.freeze({
    command,
    targetId: '',
    rawFeatures,
    normalizedFeatures: rawFeatures,
    utility: expectedUtility,
    selfKnockout: false,
  });
}

function evaluateCommand(
  state: MatchState,
  context: MatchEngineContext,
  command: DraftCommand,
  randomSource: RandomSource,
): RawCandidate {
  const actorId = command.actorId!;
  const beforePlayer = state.draft!.playerStates[actorId]!;
  const opponentId = state.playerOrder.find((playerId) => playerId !== actorId)!;
  const opponent = state.playerStates[opponentId]!;
  const result = createMatchReducer(context)(state, command, randomSource);
  if (!result.ok) {
    return { command, targetId: commandTargetId(command), features: zeroBaseFeatures };
  }
  if (!result.state.draft) {
    const resolved = result.state.pendingResolution?.players[actorId];
    const selfKnockout = state.playerStates[actorId]!.pride > 0 &&
      result.state.playerStates[actorId]!.pride === 0 &&
      result.state.phase === 'results';
    return {
      command,
      targetId: commandTargetId(command),
      selfKnockout,
      features: {
        ...zeroBaseFeatures,
        immediateDamage: resolved?.outgoingDamage ?? 0,
        grammarRisk: (resolved?.grammarMistakes ?? 0) >
          beforePlayer.construction.grammarMistakes ? 1 : 0,
        immediateLethal: result.state.winner === actorId ? 1 : 0,
      },
    };
  }
  const afterPlayer = result.state.draft.playerStates[actorId]!;
  const construction = afterPlayer.construction;
  const scored =
    construction.carryIntent ||
    !construction.analysis.complete ||
    construction.analysis.sentenceStatus !== 'complete'
    ? null
    : scoreComboFinisherConstruction({
        attackerPlayerId: actorId,
        attackerCharacterId: afterPlayer.characterId,
        comboState: state.comboState,
        analysis: construction.analysis,
        phrases: context.phrases,
        defenderWeaknessTags: opponent.weaknessTags,
        balance: context.balance,
      }).score;
  const comebackValue = construction.selectedComeback?.damageBonus ?? 0;
  const immediateDamage = (scored?.finalDamage ?? 0) + comebackValue;
  const denial =
    command.type === 'select-phrase' &&
    command.payload.card.source === 'shared' &&
    state.draft!.playerStates[opponentId]!.legalCards.some(
      (card) =>
        card.source === 'shared' &&
        card.cardId === command.payload.card.cardId,
    )
      ? 1
      : 0;
  const features: BaseFeatures = Object.freeze({
    immediateDamage,
    weaknessOpportunity:
      scored?.breakdown.some((item) => item.kind === 'weakness-multiplier')
        ? 1
        : 0,
    comboOpportunity: (scored?.combo?.chain ?? 0) > 1 ? 1 : 0,
    finisher: scored?.breakdown.reduce(
      (total, item) => total + (item.kind === 'finisher-bonus' ? item.amount : 0),
      0,
    ) ?? 0,
    grammarFlexibility:
      construction.status === 'building'
        ? new Set(construction.requiredRoles).size
        : 0,
    denial,
    continuation: construction.carryIntent ? 1 : 0,
    comebackValue,
    opponentComebackRisk: Math.min(
      immediateDamage,
      60 - opponent.comebackCharge,
    ),
    grammarRisk:
      construction.grammarMistakes > beforePlayer.construction.grammarMistakes
        ? 1
        : 0,
    deadEnd:
      construction.status === 'building' &&
      !construction.analysis.complete &&
      afterPlayer.legalCards.length === 0
        ? 1
        : 0,
    immediateLethal:
      immediateDamage > 0 && immediateDamage >= opponent.pride ? 1 : 0,
  });
  return { command, targetId: commandTargetId(command), features };
}

function scoreRawCandidates(
  candidates: readonly RawCandidate[],
  personality: Character['aiPersonality'],
): readonly EasyAiCandidate[] {
  const fullFeatures = candidates.map(({ features }) =>
    withPersonality(features, personality),
  );
  const scored = scoreEasyAiFeatureSet(fullFeatures, personality);
  return candidates.map((candidate, index) =>
    Object.freeze({
      command: candidate.command,
      targetId: candidate.targetId,
      selfKnockout: candidate.selfKnockout ?? false,
      rawFeatures: fullFeatures[index]!,
      normalizedFeatures: scored[index]!.normalizedFeatures,
      utility: scored[index]!.utility,
    }),
  );
}

function withPersonality(
  features: BaseFeatures,
  personality: Character['aiPersonality'],
): EasyAiFeatures {
  return Object.freeze({
    ...features,
    personality: personalityFeature(features, personality),
  });
}

function personalityFeature(
  features: BaseFeatures,
  personality: Character['aiPersonality'],
): number {
  return (
    personality.aggression * features.immediateDamage +
    personality.denial * features.denial +
    personality.risk * ((features.finisher + features.continuation) / 2)
  ) / 3;
}

function featureMaxima(
  featureSets: readonly EasyAiFeatures[],
): Record<EasyAiFeatureName, number> {
  return Object.fromEntries(
    (Object.keys(localRadioCallerWeights) as EasyAiFeatureName[]).map((name) => [
      name,
      Math.max(0, ...featureSets.map((features) => Math.abs(features[name]))),
    ]),
  ) as Record<EasyAiFeatureName, number>;
}

function normalizeFeature(
  name: BaseFeatureName,
  value: number,
  maximum: number,
): number {
  if (
    name === 'weaknessOpportunity' ||
    name === 'comboOpportunity' ||
    name === 'grammarRisk' ||
    name === 'deadEnd' ||
    name === 'immediateLethal'
  ) {
    return value === 0 ? 0 : 1;
  }
  return maximum === 0 ? 0 : value / maximum;
}

function utilityFor(features: EasyAiFeatures): number {
  return (Object.keys(localRadioCallerWeights) as EasyAiFeatureName[]).reduce(
    (total, name) => total + features[name] * localRadioCallerWeights[name],
    0,
  );
}

function activeDraftPlayer(state: MatchState) {
  if (
    !state.draft ||
    (state.phase !== 'drafting' && state.phase !== 'sudden-death')
  ) {
    return null;
  }
  const player = state.draft.playerStates[state.activePlayerId];
  return player?.construction.status === 'building' ? player : null;
}

function characterFor(context: MatchEngineContext, characterId: string): Character {
  const character = context.characters.find(({ id }) => id === characterId);
  if (!character) throw new Error(`Unknown AI character "${characterId}".`);
  return character;
}

function actorCommand(
  type: Exclude<DraftCommand['type'], 'select-phrase'>,
  actorId: string,
): DraftCommand {
  return { type, source: 'ai', actorId, payload: {} } as DraftCommand;
}

function selectPhraseCommand(
  actorId: string,
  source: DraftCardReference['source'],
  cardId: string,
): DraftCommand {
  return {
    type: 'select-phrase',
    source: 'ai',
    actorId,
    payload: { card: { source, cardId } },
  };
}

function commandTargetId(command: MatchCommand): string {
  return command.type === 'select-phrase' ? command.payload.card.cardId : '';
}

function compareCandidates(left: EasyAiCandidate, right: EasyAiCandidate): number {
  return (
    left.command.type.localeCompare(right.command.type) ||
    left.targetId.localeCompare(right.targetId)
  );
}

function decisionSeed(state: MatchState): number {
  let hash = state.seed >>> 0;
  const text = JSON.stringify(state.commandHistory);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}
