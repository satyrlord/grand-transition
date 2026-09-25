import type { BasicScoringBalance } from '../content/basic-scoring-balance.ts';
import type { Phrase } from '../content/schemas.ts';
import {
  ceilDamage,
  clauseNoteItems,
  extractScoreClauses,
  scoreClause,
  type BasicScoreBreakdownItem,
} from './basic-scoring.ts';
import type { GrammarAnalysis } from './grammar/english-grammar-adapter.ts';
import { phraseIndex } from './phrase-index.ts';

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
      operation: 'note';
      nounPhraseIds: readonly string[];
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
  analysis: GrammarAnalysis;
  phrases: readonly Phrase[];
  defenderWeaknessTags: readonly string[];
  balance: BasicScoringBalance;
}>;

export type ComboFinisherScoringResult = Readonly<{
  ok: true;
  score: ComboFinisherScore;
  comboState: ComboChainState;
}>;

export function scoreComboFinisherConstruction(
  request: ComboFinisherScoringRequest,
): ComboFinisherScoringResult {
  const phraseById = phraseIndex(request.phrases);
  const scoreable = request.analysis.complete && request.analysis.sentenceStatus === 'complete';
  const nounOccurrences = scoreable
    ? request.analysis.renderedPhrases.flatMap((phrase, phraseIndex) =>
        phrase.role === 'noun' ? [{ nounPhraseId: phrase.phraseId, phraseIndex }] : [],
      )
    : [];
  const uniqueNouns = nounOccurrences.filter(
    (noun, index, nouns) =>
      nouns.findIndex((candidate) => candidate.nounPhraseId === noun.nounPhraseId) === index,
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
  const comboState: ComboChainState = {
    ...request.comboState,
    [request.attackerPlayerId]: nextPlayerChains,
  };
  const combo = chooseCombo(uniqueNouns, nextPlayerChains.chainByNounId);
  const breakdown: ComboFinisherBreakdownItem[] = [];

  if (scoreable) {
    for (const clause of extractScoreClauses(request.analysis, phraseById)) {
      const scored = scoreClause(clause, phraseById, request.defenderWeaknessTags, request.balance);
      breakdown.push(...clauseNoteItems(clause, scored));
      const comboFactor = clause.nounPhraseIds.reduce(
        (factor, nounId) => factor * (nextPlayerChains.chainByNounId[nounId] ?? 1),
        1,
      );
      if (comboFactor > 1) {
        breakdown.push({
          kind: 'combo-multiplier',
          operation: 'note',
          nounPhraseIds: clause.nounPhraseIds,
          factor: comboFactor,
        });
      }
      breakdown.push({
        kind: 'clause-score',
        operation: 'add',
        phraseIds: clause.phraseIds,
        amount: scored.scoreBeforeCombo * comboFactor,
      });
    }

    if (combo && combo.chain > 1) {
      breakdown.push({ kind: 'combo-chain', operation: 'note', ...combo });
    }
    const finisherIndex = request.analysis.renderedPhrases.findIndex(
      (rendered) => phraseById.get(rendered.phraseId)?.role === 'ending',
    );
    const finisher =
      finisherIndex >= 0
        ? phraseById.get(request.analysis.renderedPhrases[finisherIndex]!.phraseId)
        : undefined;
    if (finisher) {
      const restrictionFactor =
        finisher.sceneIds || finisher.characterIds ? request.balance.restrictedPhraseMultiplier : 1;
      const weaknessTags = request.defenderWeaknessTags.filter((tag) =>
        finisher.tags.includes(tag),
      );
      if (restrictionFactor !== 1) {
        breakdown.push({
          kind: 'restriction-multiplier',
          operation: 'note',
          phraseIds: [finisher.id],
          factor: restrictionFactor,
        });
      }
      breakdown.push(
        ...weaknessTags.map((defenderTag) => ({
          kind: 'weakness-match' as const,
          operation: 'note' as const,
          defenderTag,
          phraseId: finisher.id,
          phraseIndex: finisherIndex,
        })),
      );
      if (weaknessTags.length > 0) {
        breakdown.push({
          kind: 'weakness-multiplier',
          operation: 'note',
          factor: request.balance.weaknessMultiplier,
        });
      }
      const amount =
        Math.ceil((finisher.finisherBonus ?? 0) * restrictionFactor) *
        (weaknessTags.length > 0 ? request.balance.weaknessMultiplier : 1);
      breakdown.push({
        kind: 'finisher-bonus',
        operation: 'add',
        phraseId: finisher.id,
        amount,
      });
    }
  }

  const calculated = replayComboFinisherBreakdown(breakdown);
  breakdown.push(
    {
      kind: 'unrounded-total',
      operation: 'total',
      amount: calculated.unroundedTotal,
    },
    {
      kind: 'final-damage',
      operation: 'ceil',
      amount: calculated.finalDamage,
    },
  );
  return {
    ok: true,
    score: { ...calculated, combo, breakdown },
    comboState,
  };
}

export function replayComboFinisherBreakdown(
  breakdown: readonly ComboFinisherBreakdownItem[],
): Readonly<{ unroundedTotal: number; finalDamage: number }> {
  const runningTotal = breakdown.reduce((total, item) => {
    if (item.kind === 'clause-score' || item.kind === 'finisher-bonus') {
      return total + item.amount;
    }
    return total;
  }, 0);
  return {
    unroundedTotal: runningTotal,
    finalDamage: ceilDamage(runningTotal),
  };
}

function advanceComboChains(
  previous: PlayerComboChains,
  nounPhraseIds: readonly string[],
): PlayerComboChains {
  const priorNouns = new Set(previous.previousNounIds);
  const chainByNounId: Record<string, number> = {};
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
