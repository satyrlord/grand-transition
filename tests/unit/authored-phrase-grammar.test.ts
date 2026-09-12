import { describe, expect, test } from 'vitest';
import { englishGameLocale, phraseCardCatalog } from '../../src/game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';

const byId = new Map(phraseCardCatalog.phrases.map((phrase) => [phrase.id, phrase]));
const step = (id: string): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: prepareEnglishGrammarPhrase(byId.get(id)!, englishGameLocale),
});

function analyze(ids: readonly string[]) {
  return englishGrammarAdapter.analyze({
    steps: ids.map(step),
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
}

describe('authored humor grammar integration', () => {
  test('the Prophet adds eight original private film-motif cards without replacing existing cards', () => {
    const prophet = phraseCardCatalog.characters.find(({ id }) => id === 'algorithmic-prophet')!;
    expect(prophet.characterPhraseIds).toHaveLength(25);
    for (const suffix of [
      'bottled-prophecy-archive', 'sacred-leaderboard', 'laptop-wind-of-destiny',
      'ceremonial-donation-bow', 'tap-water-excuses', 'prophetic-damp-socks',
      'greatness-error-cell', 'bravery-follow-up',
    ]) {
      const id = `algorithmic-prophet-${suffix}`;
      expect(prophet.characterPhraseIds).toContain(id);
      expect(byId.get(id)?.characterIds).toEqual(['algorithmic-prophet']);
    }
    expect(analyze([
      'you', 'belongs-in-a-party-museum',
      'algorithmic-prophet-laptop-wind-of-destiny',
      'algorithmic-prophet-bravery-follow-up',
    ])).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText: 'You belong in a history museum after mistaking the laptop fan for a wind of destiny and your bravery has never faced a follow-up question.',
      },
    });
  });

  test('every ending completes personal, nonpersonal, and plural clauses', () => {
    for (const ending of phraseCardCatalog.phrases.filter(({ role }) => role === 'ending')) {
      for (const subject of ['you', 'campaign-promise', 'your-voters']) {
        const result = analyze([subject, 'belongs-in-a-party-museum', ending.id]);
        expect(result, `${subject} + ${ending.id}`).toMatchObject({
          accepted: true,
          analysis: { complete: true, state: 'ENDED' },
        });
        if (result.accepted) {
          expect(result.analysis.publicText).toMatch(/\.$/u);
          expect(result.analysis.publicText).not.toMatch(/\.\.|undefined|\s{2}/u);
        }
      }
    }
  });

  test('rewritten nouns and modifiers remain usable in complete clauses', () => {
    for (const phrase of phraseCardCatalog.phrases) {
      const ids = phrase.role === 'noun'
        ? [phrase.id, 'belongs-in-a-party-museum', 'under-the-national-banner']
        : phrase.role === 'modifier'
          ? ['you', 'belongs-in-a-party-museum', phrase.id, 'under-the-national-banner']
          : null;
      if (ids) {
        expect(analyze(ids), phrase.id).toMatchObject({
          accepted: true,
          analysis: { complete: true, state: 'ENDED' },
        });
      }
    }
  });

  test.each([
    ['you', 'is-aligned-with-the-glorious-digital-transition', 'You are digitally transformed into a fax machine'],
    ['campaign-promise', 'is-classified-as-load-bearing', 'Your promise with the expiry date scratched off is too expensive to uninstall'],
    ['your-voters', 'quietly-navigates-the-peoples-policy-landscape', 'Your voters get lost in the settings menu'],
    ['my-opponent', 'serves-the-people-through-a-maintenance-window', 'My opponent serves the people an error message in triplicate'],
  ])('renders agreement for %s with %s', (subject, predicate, expected) => {
    expect(analyze([subject, predicate])).toMatchObject({
      accepted: true,
      analysis: { complete: true, publicText: expected },
    });
  });

  test('each human has distinct ending choices and every comeback is exclusive', () => {
    const lines: string[] = [];
    for (const character of phraseCardCatalog.characters) {
      if (character.species === 'human') {
        const endings = character.characterPhraseIds.filter((id) => byId.get(id)?.role === 'ending');
        expect(endings.length, character.id).toBeGreaterThanOrEqual(2);
      }
      for (const key of Object.values(character.comebackLinesByTier).flat()) {
        lines.push(phraseCardCatalog.englishMessages[key]!.trim().toLowerCase());
      }
    }
    expect(lines).toHaveLength(phraseCardCatalog.characters.length * 3);
    expect(new Set(lines).size).toBe(lines.length);
  });

  test.each([
    [
      'comeback.velvet-mogul.weak',
      'Your argument is the only asset even I would not buy.',
    ],
    [
      'comeback.government-ai.medium',
      'Your argument passed the human test. The examiner was your cousin.',
    ],
    [
      'comeback.thunder-tribune.strong',
      'I obey the rules. Your argument was expelled for impersonating a thought.',
    ],
  ])('keeps the reviewed %s tier directed at the opponent', (key, expected) => {
    expect(phraseCardCatalog.englishMessages[key]).toBe(expected);
    expect(expected).toMatch(/\byour argument\b/iu);
  });
});
