import type { BasicScoringBalance } from '../content/basic-scoring-balance';
import type { Phrase } from '../content/schemas';
import type { EnglishGrammarAnalysis } from './grammar/english-grammar-adapter';

export type BasicScoreBreakdownItem =
  | Readonly<{
      kind: 'base-phrase';
      operation: 'add';
      phraseId: string;
      phraseIndex: number;
      amount: number;
    }>
  | Readonly<{
      kind: 'length-bonus';
      operation: 'add';
      phraseCount: number;
      freePhraseCount: number;
      amount: number;
    }>
  | Readonly<{
      kind: 'directness-bonus';
      operation: 'add';
      amount: number;
    }>
  | Readonly<{
      kind: 'weakness-match';
      operation: 'note';
      defenderTag: string;
      phraseId: string;
      phraseIndex: number;
    }>
  | Readonly<{
      kind: 'weakness-multiplier';
      operation: 'multiply';
      factor: number;
    }>
  | Readonly<{
      kind: 'unrounded-total';
      operation: 'total';
      amount: number;
    }>
  | Readonly<{
      kind: 'final-damage';
      operation: 'round-half-up';
      amount: number;
    }>;

export type BasicScore = Readonly<{
  unroundedTotal: number;
  finalDamage: number;
  breakdown: readonly BasicScoreBreakdownItem[];
}>;

export type BasicScoringRequest = Readonly<{
  analysis: EnglishGrammarAnalysis;
  phrases: readonly Phrase[];
  defenderWeaknessTags: readonly string[];
  balance: BasicScoringBalance;
}>;

export function scoreBasicConstruction(
  request: BasicScoringRequest,
): BasicScore {
  const scoreable =
    request.analysis.legal &&
    request.analysis.complete &&
    request.analysis.sentenceStatus === 'complete';
  const scoredPhrases = scoreable
    ? resolveScoredPhrases(request.analysis, request.phrases)
    : [];
  const breakdown: BasicScoreBreakdownItem[] = scoredPhrases.map(
    (phrase, phraseIndex) => ({
      kind: 'base-phrase',
      operation: 'add',
      phraseId: phrase.id,
      phraseIndex,
      amount: phrase.baseValue,
    }),
  );

  breakdown.push({
    kind: 'length-bonus',
    operation: 'add',
    phraseCount: scoredPhrases.length,
    freePhraseCount: request.balance.lengthBonus.freePhraseCount,
    amount:
      Math.max(
        0,
        scoredPhrases.length - request.balance.lengthBonus.freePhraseCount,
      ) * request.balance.lengthBonus.perAdditionalPhrase,
  });
  breakdown.push({
    kind: 'directness-bonus',
    operation: 'add',
    amount: scoredPhrases.reduce(
      (total, phrase) => total + phrase.directness,
      0,
    ),
  });

  const weaknessMatches = request.defenderWeaknessTags.flatMap((defenderTag) =>
    scoredPhrases.flatMap((phrase, phraseIndex) =>
      phrase.tags.includes(defenderTag)
        ? [{ defenderTag, phraseId: phrase.id, phraseIndex }]
        : [],
    ),
  );
  breakdown.push(
    ...weaknessMatches.map(
      ({ defenderTag, phraseId, phraseIndex }): BasicScoreBreakdownItem => ({
        kind: 'weakness-match',
        operation: 'note',
        defenderTag,
        phraseId,
        phraseIndex,
      }),
    ),
  );
  breakdown.push({
    kind: 'weakness-multiplier',
    operation: 'multiply',
    factor: weaknessMatches.length > 0 ? request.balance.weaknessMultiplier : 1,
  });

  const calculated = replayBasicScoreBreakdown(breakdown);
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
    ...calculated,
    breakdown,
  };
}

export function replayBasicScoreBreakdown(
  breakdown: readonly BasicScoreBreakdownItem[],
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

export function roundNonNegativeDamage(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Damage must be a finite, non-negative number.');
  }
  return Math.floor(value + 0.5);
}

function resolveScoredPhrases(
  analysis: EnglishGrammarAnalysis,
  phrases: readonly Phrase[],
): readonly Phrase[] {
  const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]));
  return analysis.renderedPhrases.map((renderedPhrase) => {
    const phrase = phraseById.get(renderedPhrase.phraseId);
    if (!phrase) {
      throw new Error(
        `Scoring data is missing phrase "${renderedPhrase.phraseId}".`,
      );
    }
    if (phrase.role === 'continuation') {
      throw new Error('Continuation cards are not grammar phrases.');
    }
    return phrase;
  });
}
