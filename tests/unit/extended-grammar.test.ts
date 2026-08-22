import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/content/sample-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarInput,
  type EnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const phraseById = new Map(
  sampleContent.phrases.map((source) => [
    source.id,
    prepareEnglishGrammarPhrase(source, englishGameLocale),
  ]),
);

function phrase(id: string): EnglishGrammarPhrase {
  const result = phraseById.get(id);
  if (!result) throw new Error(`Missing test phrase "${id}".`);
  return result;
}

const add = (
  id: string,
  conjunctionMode?: 'new-subject' | 'shared-subject',
): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: phrase(id),
  ...(conjunctionMode ? { conjunctionMode } : {}),
});
const end: EnglishGrammarStep = { kind: 'end' };

function analyze(steps: readonly EnglishGrammarStep[]) {
  const input: EnglishGrammarInput = {
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
  return englishGrammarAdapter.analyze(input);
}

describe('extended English grammar', () => {
  test.each([
    [
      'predicate then predicate',
      [
        add('paper-promise'),
        add('before-lunch'),
        add('and'),
        add('velvet-megaphone'),
        add('in-an-empty-hall'),
      ],
      'A paper promise before lunch and a velvet megaphone in an empty hall',
    ],
    [
      'predicate then verb',
      [
        add('paper-promise'),
        add('before-lunch'),
        add('and'),
        add('velvet-megaphone'),
        add('outshouts'),
        add('committee-kite'),
      ],
      'A paper promise before lunch and a velvet megaphone outshouts a committee kite',
    ],
    [
      'verb then predicate',
      [
        add('paper-promise'),
        add('outshouts'),
        add('velvet-megaphone'),
        add('and'),
        add('committee-kite'),
        add('past-the-deadline'),
      ],
      'A paper promise outshouts a velvet megaphone and a committee kite past the deadline',
    ],
    [
      'verb then verb',
      [
        add('paper-promise'),
        add('outshouts'),
        add('velvet-megaphone'),
        add('and'),
        add('committee-kite'),
        add('polishes'),
        add('paper-promise'),
      ],
      'A paper promise outshouts a velvet megaphone and a committee kite polishes a paper promise',
    ],
  ])('accepts the two-clause %s form', (_name, steps, publicText) => {
    expect(analyze(steps as readonly EnglishGrammarStep[])).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        legal: true,
        complete: true,
        sentenceStatus: 'complete',
        state: 'CLAUSE_COMPLETE',
        publicText,
      }),
    });
  });

  test('uses the shared subject for a conjunction verb branch', () => {
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('and', 'shared-subject'),
        add('outshouts'),
        add('velvet-megaphone'),
      ]),
    ).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        state: 'CLAUSE_COMPLETE',
        publicText:
          'A paper promise before lunch and outshouts a velvet megaphone',
      }),
    });
  });

  test('reports both conjunction branch states and their next roles', () => {
    expect(
      analyze([add('paper-promise'), add('before-lunch'), add('and')]),
    ).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        state: 'EXPECT_SUBJECT_AFTER_CONJUNCTION',
        nextRoles: ['noun'],
      }),
    });
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('and', 'shared-subject'),
      ]),
    ).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        state: 'EXPECT_VERB_AFTER_SHARED_SUBJECT',
        nextRoles: ['verb'],
      }),
    });
  });

  test('accepts COMPLETE CLAUSE + ENDING and ends construction', () => {
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('with-the-receipt'),
      ]),
    ).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        complete: true,
        state: 'ENDED',
        publicText: 'A paper promise before lunch with the receipt.',
        resolution: expect.objectContaining({ constructionEnded: true }),
      }),
    });
  });

  test.each([
    [[], 'EXPECT_SUBJECT'],
    [[add('paper-promise')], 'EXPECT_VERB_OR_PREDICATE'],
    [[add('paper-promise'), add('folds')], 'EXPECT_OBJECT'],
    [
      [add('paper-promise'), add('before-lunch'), add('and')],
      'EXPECT_SUBJECT_AFTER_CONJUNCTION',
    ],
    [
      [add('paper-promise'), add('before-lunch'), add('and', 'shared-subject')],
      'EXPECT_VERB_AFTER_SHARED_SUBJECT',
    ],
  ])('keeps incomplete input as valid zero-damage state %s', (steps, state) => {
    expect(analyze(steps as readonly EnglishGrammarStep[])).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        legal: true,
        complete: false,
        sentenceStatus: 'incomplete',
        state,
        resolution: {
          outgoingDamageIntent: 0,
          selfDamageIntent: 0,
          removedPhraseId: null,
          constructionEnded: false,
          feedback: null,
        },
      }),
    });
  });

  test('resolves an illegal source phrase as a deliberate strategic foul', () => {
    const fault: EnglishGrammarStep = {
      kind: 'deliberate-fault',
      sourcePhrase: phrase('folds'),
    };

    expect(analyze([fault])).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        legal: false,
        complete: false,
        sentenceStatus: 'invalid',
        state: 'INVALID',
        nextRoles: [],
        resolution: {
          outgoingDamageIntent: 0,
          selfDamageIntent: 3,
          removedPhraseId: 'folds',
          constructionEnded: true,
          feedback: 'strategic-foul',
        },
      }),
    });
  });

  test('does not convert a legal phrase or ended construction into a foul', () => {
    const legalFault: EnglishGrammarStep = {
      kind: 'deliberate-fault',
      sourcePhrase: phrase('paper-promise'),
    };
    expect(analyze([legalFault])).toEqual({
      accepted: false,
      faults: [expect.objectContaining({ code: 'cannot-fault-legal-phrase' })],
    });

    const endedFault: EnglishGrammarStep = {
      kind: 'deliberate-fault',
      sourcePhrase: phrase('folds'),
    };
    expect(
      analyze([add('paper-promise'), add('before-lunch'), end, endedFault]),
    ).toEqual({
      accepted: false,
      faults: [
        expect.objectContaining({ code: 'cannot-fault-ended-construction' }),
      ],
    });
  });
});
