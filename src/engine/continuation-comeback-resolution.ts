import type { Character, Phrase } from '../content/schemas';
import type { BasicScoringBalance } from '../content/basic-scoring-balance';
import type { GameLocaleBundle } from '../localization/game-locale-schema';
import type { GameCommand, RuleError } from './game-contracts';
import {
  scoreComboFinisherConstruction,
  type ComboChainState,
  type ComboFinisherScore,
} from './combo-finisher-scoring';
import type {
  EnglishGrammarAnalysis,
  EnglishGrammarStep,
} from './grammar/english-grammar-adapter';
import { seededRandomSource, type RandomSource } from './random-source';

export const comebackTiers = ['weak', 'medium', 'strong'] as const;
export type ComebackTier = (typeof comebackTiers)[number];

export const comebackRules = {
  weak: { cost: 20, damageBonus: 4 },
  medium: { cost: 40, damageBonus: 10 },
  strong: { cost: 60, damageBonus: 18 },
} as const satisfies Readonly<
  Record<ComebackTier, Readonly<{ cost: number; damageBonus: number }>>
>;

export const comebackChargeCap = 60;
export const continuationBreakDamage = 16;

export type ComebackSelection = Readonly<{
  tier: ComebackTier;
  cost: number;
  damageBonus: number;
  closingLineKey: string;
  closingLine: string;
}>;

export type ComebackSelectionErrorCode =
  | 'comeback-already-selected'
  | 'comeback-unaffordable'
  | 'sentence-incomplete'
  | 'wrong-phase';

export type ComebackSelectionError = RuleError<
  ComebackSelectionErrorCode,
  {
    readonly playerId: string;
    readonly tier: ComebackTier;
    readonly charge: number;
  }
>;

export type ContinuationCarry = Readonly<{
  steps: readonly EnglishGrammarStep[];
  analysis: EnglishGrammarAnalysis;
  publicText: string;
}>;

export function availableComebackTiers(
  charge: number,
): readonly ComebackTier[] {
  const boundedCharge = normalizeCharge(charge);
  return comebackTiers.filter(
    (tier) => comebackRules[tier].cost <= boundedCharge,
  );
}

export function addComebackCharge(
  currentCharge: number,
  receivedOpponentDamage: number,
): number {
  return Math.min(
    comebackChargeCap,
    normalizeCharge(currentCharge) + normalizeDamage(receivedOpponentDamage),
  );
}

export function resolveContinuationStatus(request: {
  readonly carryIntent: boolean;
  readonly opponentOutgoingDamage: number;
  readonly opponentComebackTier: ComebackTier | null;
}): 'broken' | 'none' | 'survived' {
  if (!request.carryIntent) return 'none';
  return normalizeDamage(request.opponentOutgoingDamage) >=
    continuationBreakDamage || request.opponentComebackTier === 'strong'
    ? 'broken'
    : 'survived';
}

export function selectComebackTier(request: {
  readonly playerId: string;
  readonly character: Character;
  readonly tier: ComebackTier;
  readonly phase: string;
  readonly constructionComplete: boolean;
  readonly selectedComeback: ComebackSelection | null;
  readonly charge: number;
  readonly seed: number;
  readonly commandHistory?: readonly GameCommand[];
  readonly locale: GameLocaleBundle;
  readonly randomSource?: RandomSource;
}):
  | Readonly<{
      ok: true;
      charge: number;
      nextSeed: number;
      selection: ComebackSelection;
    }>
  | Readonly<{ ok: false; error: ComebackSelectionError }> {
  if (request.phase !== 'drafting') {
    return selectionFailure('wrong-phase', request);
  }
  if (!request.constructionComplete) {
    return selectionFailure('sentence-incomplete', request);
  }
  if (request.selectedComeback) {
    return selectionFailure('comeback-already-selected', request);
  }

  const rule = comebackRules[request.tier];
  const charge = normalizeCharge(request.charge);
  if (charge < rule.cost) {
    return selectionFailure('comeback-unaffordable', request);
  }

  const lineKeys = request.character.comebackLinesByTier[request.tier];
  const randomStep = (request.randomSource ?? seededRandomSource).next(
    request.seed,
  );
  const historyOffset =
    stableHistoryHash(request.commandHistory ?? []) % lineKeys.length;
  const lineIndex =
    (Math.min(
      lineKeys.length - 1,
      Math.floor(randomStep.value * lineKeys.length),
    ) +
      historyOffset) %
    lineKeys.length;
  const closingLineKey = lineKeys[lineIndex]!;
  const closingLine = request.locale.messages[closingLineKey];
  if (!closingLine) {
    throw new Error(`The locale is missing comeback line "${closingLineKey}".`);
  }

  return {
    ok: true,
    charge: charge - rule.cost,
    nextSeed: randomStep.nextSeed,
    selection: {
      tier: request.tier,
      cost: rule.cost,
      damageBonus: rule.damageBonus,
      closingLineKey,
      closingLine,
    },
  };
}

export type ContinuationComebackPlayerInput = Readonly<{
  playerId: string;
  characterId: string;
  construction: Readonly<{
    steps: readonly EnglishGrammarStep[];
    analysis: EnglishGrammarAnalysis;
    publicText: string;
    carryIntent: boolean;
    selectedComeback: ComebackSelection | null;
  }>;
  comebackCharge: number;
  phrases: readonly Phrase[];
  defenderWeaknessTags: readonly string[];
  balance: BasicScoringBalance;
}>;

export type ContinuationComebackPlayerResult = Readonly<{
  playerId: string;
  sentenceDamage: number;
  comebackBonus: number;
  outgoingDamage: number;
  selfDamage: number;
  comebackCharge: number;
  availableComebackTiers: readonly ComebackTier[];
  closingLine: string | null;
  score: ComboFinisherScore | null;
  continuation: Readonly<{
    status: 'broken' | 'none' | 'survived';
    restoredCarry: ContinuationCarry | null;
  }>;
}>;

export type ContinuationComebackResolution = Readonly<{
  players: Readonly<Record<string, ContinuationComebackPlayerResult>>;
  comboState: ComboChainState;
}>;

export function resolveContinuationComebackRound(request: {
  readonly players: readonly [
    ContinuationComebackPlayerInput,
    ContinuationComebackPlayerInput,
  ];
  readonly comboState: ComboChainState;
}): ContinuationComebackResolution {
  let comboState = request.comboState;
  const scorePlayer = (player: ContinuationComebackPlayerInput) => {
    if (player.construction.carryIntent) {
      return {
        player,
        sentenceDamage: 0,
        comebackBonus: 0,
        outgoingDamage: 0,
        score: null,
      };
    }

    const scored = scoreComboFinisherConstruction({
      attackerPlayerId: player.playerId,
      attackerCharacterId: player.characterId,
      comboState,
      analysis: player.construction.analysis,
      phrases: player.phrases,
      defenderWeaknessTags: player.defenderWeaknessTags,
      balance: player.balance,
    });
    if (!scored.ok) {
      throw new Error(
        `Resolution received invalid finisher "${scored.error.facts.finisherPhraseId}".`,
      );
    }
    comboState = scored.comboState;
    const comebackBonus =
      player.construction.selectedComeback?.damageBonus ?? 0;
    return {
      player,
      sentenceDamage: scored.score.finalDamage,
      comebackBonus,
      outgoingDamage: scored.score.finalDamage + comebackBonus,
      score: scored.score,
    };
  };
  const attacks = [
    scorePlayer(request.players[0]),
    scorePlayer(request.players[1]),
  ] as const;

  const results: Record<string, ContinuationComebackPlayerResult> = {};
  for (const [index, attack] of attacks.entries()) {
    const opponentAttack = attacks[index === 0 ? 1 : 0];
    const continuationStatus = resolveContinuationStatus({
      carryIntent: attack.player.construction.carryIntent,
      opponentOutgoingDamage: opponentAttack.outgoingDamage,
      opponentComebackTier:
        opponentAttack.player.construction.selectedComeback?.tier ?? null,
    });
    const carryBreaks = continuationStatus === 'broken';
    const carrySurvives = continuationStatus === 'survived';
    if (carryBreaks) {
      comboState = {
        ...comboState,
        [attack.player.playerId]: {
          previousNounIds: [],
          chainByNounId: {},
        },
      };
    }
    const comebackCharge = addComebackCharge(
      attack.player.comebackCharge,
      opponentAttack.outgoingDamage,
    );
    results[attack.player.playerId] = {
      playerId: attack.player.playerId,
      sentenceDamage: attack.sentenceDamage,
      comebackBonus: attack.comebackBonus,
      outgoingDamage: attack.outgoingDamage,
      selfDamage:
        attack.player.construction.analysis.resolution.selfDamageIntent,
      comebackCharge,
      availableComebackTiers: availableComebackTiers(comebackCharge),
      closingLine:
        attack.player.construction.selectedComeback?.closingLine ?? null,
      score: attack.score,
      continuation: {
        status: continuationStatus,
        restoredCarry: carrySurvives
          ? {
              steps: attack.player.construction.steps,
              analysis: attack.player.construction.analysis,
              publicText: attack.player.construction.publicText,
            }
          : null,
      },
    };
  }

  return { players: results, comboState };
}

function selectionFailure(
  code: ComebackSelectionErrorCode,
  request: {
    readonly playerId: string;
    readonly tier: ComebackTier;
    readonly charge: number;
  },
): Readonly<{ ok: false; error: ComebackSelectionError }> {
  return {
    ok: false,
    error: {
      kind: 'rule-error',
      code,
      facts: {
        playerId: request.playerId,
        tier: request.tier,
        charge: normalizeCharge(request.charge),
      },
    },
  };
}

function normalizeCharge(charge: number): number {
  if (!Number.isInteger(charge) || charge < 0 || charge > comebackChargeCap) {
    throw new Error('Comeback charge must be an integer from 0 through 60.');
  }
  return charge;
}

function normalizeDamage(damage: number): number {
  if (!Number.isInteger(damage) || damage < 0) {
    throw new Error('Received damage must be a non-negative integer.');
  }
  return damage;
}

function stableHistoryHash(history: readonly GameCommand[]): number {
  const text = JSON.stringify(history);
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
