import type { QuoteRevealRecord } from '../content/quote-reveals.ts';
import {
  quoteGuessLimit,
  revealedCardIds,
  type CommittedSentence,
  type QuoteGuessScore,
  type QuoteRevealIndex,
} from './quote-receipts.ts';
import { seededRandomSource } from './random-source.ts';
import { stableHash } from './stable-hash.ts';

// Milestone 034: the Real-or-invented guess of the receipts panel. Only the
// panel uses these rules, so they load with it.

export type QuoteGuessAnswer = 'real' | 'adapted' | 'invented';

/** Orders the sentences by round, with the sentence of the opening player first. */
export function sentencesInTurnOrder<Sentence extends CommittedSentence>(
  sentences: readonly Sentence[],
  rounds: readonly Readonly<{ round: number; openingPlayerId: string }>[],
): readonly Sentence[] {
  const openingPlayer = new Map(rounds.map((round) => [round.round, round.openingPlayerId]));
  const opens = (sentence: Sentence) =>
    openingPlayer.get(sentence.round) === sentence.playerId ? 0 : 1;
  return sentences.toSorted(
    (left, right) => left.round - right.round || opens(left) - opens(right),
  );
}

/**
 * Selects the cards of the guess. The same sentences and seed give the same cards.
 * The cards with a real source come first, and invented cards fill the other
 * places. A match with no card from real speech has no guess, because each
 * answer would be Invented.
 */
export function selectQuoteGuessCards(
  sentences: readonly CommittedSentence[],
  reveals: QuoteRevealIndex,
  seed: number,
): readonly string[] {
  const candidates = revealedCardIds(sentences, reveals);
  const isInvented = (cardId: string) => reveals.get(cardId)!.classification === 'invented';
  const sourced = candidates.filter((cardId) => !isInvented(cardId));
  if (sourced.length === 0) return [];
  if (candidates.length <= quoteGuessLimit) return candidates;
  const selected = new Set<string>();
  // The hash keeps this draw apart from the board draws of the same match seed.
  let state = stableHash('quote-guess', seed);
  for (const group of [sourced, candidates.filter(isInvented)]) {
    const remaining = [...group];
    while (selected.size < quoteGuessLimit && remaining.length > 0) {
      const step = seededRandomSource.next(state);
      state = step.nextSeed;
      selected.add(remaining.splice(Math.floor(step.value * remaining.length), 1)[0]!);
    }
  }
  return candidates.filter((cardId) => selected.has(cardId));
}

/** The answer that is correct for a record. A real slogan counts as a real quote. */
export function quoteGuessAnswer(record: QuoteRevealRecord): QuoteGuessAnswer {
  if (record.classification === 'invented') return 'invented';
  return record.classification === 'adapted-quote' ? 'adapted' : 'real';
}

export function scoreQuoteGuess(
  cardIds: readonly string[],
  answers: Readonly<Record<string, QuoteGuessAnswer>>,
  reveals: QuoteRevealIndex,
): QuoteGuessScore {
  const correct = cardIds.filter((cardId) => {
    const record = reveals.get(cardId);
    return record !== undefined && answers[cardId] === quoteGuessAnswer(record);
  }).length;
  return { correct, total: cardIds.length };
}
