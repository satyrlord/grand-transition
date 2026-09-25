import type { Phrase } from '../content/schemas';

// Match contexts keep one phrase array for the whole match, so the index is
// built once per array instead of once per rule evaluation.
const phraseIndexes = new WeakMap<
  readonly Phrase[],
  ReadonlyMap<string, Phrase>
>();

export function phraseIndex(
  phrases: readonly Phrase[],
): ReadonlyMap<string, Phrase> {
  const existing = phraseIndexes.get(phrases);
  if (existing) return existing;
  const index = new Map(phrases.map((phrase) => [phrase.id, phrase]));
  phraseIndexes.set(phrases, index);
  return index;
}
