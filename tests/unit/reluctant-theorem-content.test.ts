import { describe, expect, test } from 'vitest';
import { loadGameContent } from '../../tools/load-game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
} from '../../src/engine/grammar/english-grammar-adapter';

const { phraseCardCatalog, englishGameLocale } = loadGameContent();
const byId = new Map(phraseCardCatalog.phrases.map((phrase) => [phrase.id, phrase]));

describe('The Reluctant Theorem authored constructions', () => {
  test.each([
    ['you', 'reluctant-theorem-pending-proof-present',
      'reluctant-theorem-tomorrow-committee',
      'You are pending proof while the roof leaks and reconstruction starts tomorrow, once tomorrow passes committee.'],
    ['your-voters', 'reluctant-theorem-pending-proof-past',
      'reluctant-theorem-forms-first',
      'Your voters were pending proof while the roof leaked and the public counter serves forms while citizens queue outside.'],
  ])('preserves agreement and a complete ending for %s', (subject, predicate, ending, expected) => {
    const result = englishGrammarAdapter.analyze({
      steps: [subject, predicate, ending].map((id) => ({
        kind: 'phrase' as const,
        phrase: prepareEnglishGrammarPhrase(byId.get(id)!, englishGameLocale),
      })),
      subjectNumber: 'singular',
      objectNumber: 'singular',
    });
    expect(result).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED', publicText: expected },
    });
  });

  test('exposes the new weaknesses through multiple visible authored attacks', () => {
    const character = phraseCardCatalog.characters.find(({ id }) => id === 'reluctant-theorem')!;
    expect(character.weaknessTags).toEqual(['indecision', 'urgency', 'delivery']);
    for (const tag of character.weaknessTags) {
      const attacks = character.characterPhraseIds.filter((id) => byId.get(id)!.tags.includes(tag));
      expect(attacks.length, tag).toBeGreaterThanOrEqual(2);
    }
    expect(byId.get('reluctant-theorem-qualified-contrast')!.tags).toEqual([]);
  });
});
