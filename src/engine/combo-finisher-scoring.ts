import type { BasicScoringBalance } from '../content/basic-scoring-balance';
import type { Phrase } from '../content/schemas';
import {
  roundNonNegativeDamage,
  scoreBasicConstruction,
  type BasicScoreBreakdownItem,
} from './basic-scoring';
import {
  validateFinisherOwner,
  type FinisherRuleError,
} from './finisher-rules';
import type { EnglishGrammarAnalysis } from './grammar/english-grammar-adapter';

export type PlayerComboChains = Readonly<{
  previousNounIds: readonly string[];
  chainByNounId: Readonly<Record<string, number>>;
}>;

export type ComboChainState = Readonly<Record<string, PlayerComboChains>>;

export type ComboExplanation = Readonly<{
  nounPhraseId: string;
  phraseIndex: number;
  chain: number;
}>;

export type ComboFinisherBreakdownItem =
  | BasicScoreBreakdownItem
  | Readonly<{
      kind: 'finisher-bonus';
      operation: 'add';
      phraseId: string;
      amount: number;
    }>
  | Readonly<{
      kind: 'combo-chain';
      operation: 'note';
      nounPhraseId: string;
      phraseIndex: number;
      chain: number;
    }>
  | Readonly<{
      kind: 'combo-multiplier';
      operation: 'multiply';
      nounPhraseId: string;
      phraseIndex: number;
      factor: number;
    }>;

export type ComboFinisherScore = Readonly<{
  unroundedTotal: number;
  finalDamage: number;
  combo: ComboExplanation | null;
  breakdown: readonly ComboFinisherBreakdownItem[];
}>;

export type ComboFinisherScoringRequest = Readonly<{
  attackerPlayerId: string;
  attackerCharacterId: string;
  comboState: ComboChainState;
  analysis: EnglishGrammarAnalysis;
  phrases: readonly Phrase[];
  defenderWeaknessTags: readonly string[];
  balance: BasicScoringBalance;
}>;

export type ComboFinisherScoringResult =
  | Readonly<{
      ok: true;
      score: ComboFinisherScore;
      comboState: ComboChainState;
    }>
  | Readonly<{
      ok: false;
      error: FinisherRuleError;
      comboState: ComboChainState;
    }>;

export function scoreComboFinisherConstruction(
  request: ComboFinisherScoringRequest,
): ComboFinisherScoringResult {
  const phraseById = new Map(
    request.phrases.map((phrase) => [phrase.id, phrase]),
  );
  const renderedPhrases = request.analysis.renderedPhrases.map(
    (renderedPhrase) => {
      const phrase = phraseById.get(renderedPhrase.phraseId);
      if (!phrase) {
        throw new Error(
          `Scoring data is missing phrase "${renderedPhrase.phraseId}".`,
        );
      }
      return phrase;
    },
  );
  const finisher = renderedPhrases.find((phrase) => phrase.role === 'ending');
  if (finisher) {
    const owner = validateFinisherOwner({
      finisher,
      attackerCharacterId: request.attackerCharacterId,
    });
    if (!owner.ok) {
      return {
        ok: false,
        error: owner.error,
        comboState: request.comboState,
      };
    }
  }

  const scoreable =
    request.analysis.legal &&
    request.analysis.complete &&
    request.analysis.sentenceStatus === 'complete';
  const nounOccurrences = scoreable
    ? request.analysis.renderedPhrases.flatMap((phrase, phraseIndex) =>
        phrase.role === 'noun'
          ? [{ nounPhraseId: phrase.phraseId, phraseIndex }]
          : [],
      )
    : [];
  const uniqueNouns = nounOccurrences.filter(
    (noun, index, nouns) =>
      nouns.findIndex(
        (candidate) => candidate.nounPhraseId === noun.nounPhraseId,
      ) === index,
  );
  const previous = request.comboState[request.attackerPlayerId] ?? {
    previousNounIds: [],
    chainByNounId: {},
  };
  const nextPlayerChains = scoreable
    ? advanceComboChains(
        previous,
        uniqueNouns.map((noun) => noun.nounPhraseId),
      )
    : { previousNounIds: [], chainByNounId: {} };
  const combo = chooseCombo(uniqueNouns, nextPlayerChains.chainByNounId);
  const comboState: ComboChainState = {
    ...request.comboState,
    [request.attackerPlayerId]: nextPlayerChains,
  };

  const basic = scoreBasicConstruction({
    analysis: request.analysis,
    phrases: request.phrases,
    defenderWeaknessTags: request.defenderWeaknessTags,
    balance: request.balance,
  });
  const additiveItems = basic.breakdown.filter(
    (item) =>
      item.kind === 'base-phrase' ||
      item.kind === 'length-bonus' ||
      item.kind === 'directness-bonus',
  );
  const weaknessNotes = basic.breakdown.filter(
    (item) => item.kind === 'weakness-match',
  );
  const weaknessMultiplier = basic.breakdown.find(
    (item) => item.kind === 'weakness-multiplier',
  );
  if (!weaknessMultiplier) {
    throw new Error('Basic scoring must provide a weakness multiplier.');
  }

  const breakdown: ComboFinisherBreakdownItem[] = [...additiveItems];
  if (finisher && scoreable) {
    breakdown.push({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: finisher.id,
      amount: finisher.finisherBonus ?? 0,
    });
  }
  breakdown.push(...weaknessNotes, weaknessMultiplier);
  if (combo) {
    breakdown.push({
      kind: 'combo-chain',
      operation: 'note',
      ...combo,
    });
    breakdown.push({
      kind: 'combo-multiplier',
      operation: 'multiply',
      nounPhraseId: combo.nounPhraseId,
      phraseIndex: combo.phraseIndex,
      factor: combo.chain,
    });
  }

  const calculated = replayComboFinisherBreakdown(breakdown);
  breakdown.push({
    kind: 'unrounded-total',
    operation: 'total',
    amount: calculated.unroundedTotal,
  });
  breakdown.push({
    kind: 'final-damage',
    operation: 'round-half-up',
    amount: calculated.finalDamage,
  });
  return {
    ok: true,
    score: { ...calculated, combo, breakdown },
    comboState,
  };
}

export function replayComboFinisherBreakdown(
  breakdown: readonly ComboFinisherBreakdownItem[],
): Readonly<{ unroundedTotal: number; finalDamage: number }> {
  let runningTotal = 0;
  for (const item of breakdown) {
    if (item.operation === 'add') runningTotal += item.amount;
    if (item.operation === 'multiply') runningTotal *= item.factor;
  }
  return {
    unroundedTotal: runningTotal,
    finalDamage: roundNonNegativeDamage(runningTotal),
  };
}

function advanceComboChains(
  previous: PlayerComboChains,
  nounPhraseIds: readonly string[],
): PlayerComboChains {
  const priorNouns = new Set(previous.previousNounIds);
  const currentNouns = new Set(nounPhraseIds);
  const chainByNounId: Record<string, number> = {};
  for (const nounPhraseId of Object.keys(previous.chainByNounId)) {
    if (!currentNouns.has(nounPhraseId)) chainByNounId[nounPhraseId] = 1;
  }
  for (const nounPhraseId of nounPhraseIds) {
    chainByNounId[nounPhraseId] = priorNouns.has(nounPhraseId)
      ? (previous.chainByNounId[nounPhraseId] ?? 1) + 1
      : 1;
  }
  return { previousNounIds: [...nounPhraseIds], chainByNounId };
}

function chooseCombo(
  nouns: readonly Readonly<{
    nounPhraseId: string;
    phraseIndex: number;
  }>[],
  chainByNounId: Readonly<Record<string, number>>,
): ComboExplanation | null {
  let selected: ComboExplanation | null = null;
  for (const noun of nouns) {
    const candidate = {
      ...noun,
      chain: chainByNounId[noun.nounPhraseId] ?? 1,
    };
    if (!selected || candidate.chain > selected.chain) selected = candidate;
  }
  return selected;
}
