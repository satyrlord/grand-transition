import type { QuoteRevealRecord } from '../content/quote-reveals.ts';
import type { ContentCatalog } from '../content/content-catalog.ts';
import type { Phrase } from '../content/schemas.ts';
import type { GameLocaleBundle } from '../localization/game-locale-schema.ts';
import { grammarFor } from './grammar/grammar-locale.ts';

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

/**
 * A stable card ID can have different wording in stored history. Only current
 * rendered forms support the current receipt. One stale occurrence excludes
 * that ID throughout the match, including the guessing game.
 */
export function eligibleQuoteReveals(
  sentences: readonly Readonly<{
    phrases: readonly Readonly<{ phraseId: string; text: string }>[];
  }>[],
  reveals: QuoteRevealIndex,
  catalog: Pick<ContentCatalog, 'phrases'>,
  locale: GameLocaleBundle,
): QuoteRevealIndex {
  const grammar = grammarFor(locale);
  const phrases = new Map(catalog.phrases.map((phrase) => [phrase.id, phrase]));
  const forms = new Map<string, ReadonlySet<string>>();
  const staleIds = new Set<string>();
  const eligible = new Map<string, QuoteRevealRecord>();
  for (const sentence of sentences) {
    for (const { phraseId, text } of sentence.phrases) {
      if (staleIds.has(phraseId)) continue;
      const record = reveals.get(phraseId);
      const phrase = phrases.get(phraseId);
      if (!record || !phrase || phrase.role === 'continuation') continue;
      let allowed = forms.get(phraseId);
      if (!allowed) {
        allowed = grammar.renderedForms(phrase, locale);
        forms.set(phraseId, allowed);
      }
      if (allowed.has(text)) {
        eligible.set(phraseId, record);
      } else {
        eligible.delete(phraseId);
        staleIds.add(phraseId);
      }
    }
  }
  return eligible;
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
