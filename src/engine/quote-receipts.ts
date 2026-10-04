import type { QuoteRevealRecord } from '../content/quote-reveals.ts';
import type { Phrase } from '../content/schemas.ts';

// Milestone 034: which committed phrases show a receipt. These rules read a
// completed match. They do not change it.

/** The records that can show a receipt, by card ID. */
export type QuoteRevealIndex = ReadonlyMap<string, QuoteRevealRecord>;

export type CommittedSentence = Readonly<{
  round: number;
  playerId: string;
  phrases: readonly Readonly<{ phraseId: string }>[];
}>;

export type QuoteGuessScore = Readonly<{ correct: number; total: number }>;

export const quoteGuessLimit = 5;

/** A continuation never shows a receipt, so its record is not in the index. */
export function createQuoteRevealIndex(
  records: readonly QuoteRevealRecord[],
  phrases: readonly Pick<Phrase, 'id' | 'role'>[],
): QuoteRevealIndex {
  const continuationIds = new Set(
    phrases.filter((phrase) => phrase.role === 'continuation').map((phrase) => phrase.id),
  );
  return new Map(
    records
      .filter((record) => !continuationIds.has(record.cardId))
      .map((record) => [record.cardId, record]),
  );
}

/** Each different committed card that has a record, in sentence order. */
export function revealedCardIds(
  sentences: readonly CommittedSentence[],
  reveals: QuoteRevealIndex,
): readonly string[] {
  const cardIds = new Set<string>();
  for (const sentence of sentences) {
    for (const { phraseId } of sentence.phrases) {
      if (reveals.has(phraseId)) cardIds.add(phraseId);
    }
  }
  return [...cardIds];
}
