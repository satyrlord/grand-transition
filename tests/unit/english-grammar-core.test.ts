import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/content/sample-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarInput,
  type EnglishGrammarPhrase,
  type EnglishGrammarStep,
  type GrammaticalNumber,
} from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const phraseById = new Map(
  sampleContent.phrases.map((phrase) => [
    phrase.id,
    prepareEnglishGrammarPhrase(phrase, englishGameLocale),
  ]),
);

function phrase(id: string): EnglishGrammarPhrase {
  const result = phraseById.get(id);
  if (!result) throw new Error(`Missing test phrase "${id}".`);
  return result;
}

const add = (id: string): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: phrase(id),
});
const end: EnglishGrammarStep = { kind: 'end' };

const phraseIdByRole = {
  noun: 'paper-promise',
  verb: 'folds',
  predicate: 'before-lunch',
  conjunction: 'and',
  ending: 'with-the-receipt',
  continuation: 'still-echoes',
} as const;

function analyze(
  steps: readonly EnglishGrammarStep[],
  subjectNumber: GrammaticalNumber = 'singular',
  objectNumber: GrammaticalNumber = 'singular',
) {
  const input: EnglishGrammarInput = {
    steps,
    subjectNumber,
    objectNumber,
  };
  return englishGrammarAdapter.analyze(input);
}

describe('English grammar core', () => {
  test.each([
    [[], 'EXPECT_SUBJECT', ['noun'], false, ''],
    [
      [add('paper-promise')],
      'EXPECT_VERB_OR_PREDICATE',
      ['verb', 'predicate'],
      false,
      'A paper promise',
    ],
    [
      [add('paper-promise'), add('folds')],
      'EXPECT_OBJECT',
      ['noun'],
      false,
      'A paper promise folds',
    ],
    [
      [add('paper-promise'), add('before-lunch')],
      'CLAUSE_COMPLETE',
      ['conjunction', 'ending'],
      true,
      'A paper promise before lunch',
    ],
    [
      [add('paper-promise'), add('before-lunch'), end],
      'ENDED',
      [],
      true,
      'A paper promise before lunch.',
    ],
  ])(
    'reports the %s path as %s',
    (steps, state, nextRoles, complete, publicText) => {
      const result = analyze(steps as readonly EnglishGrammarStep[]);
      expect(result).toEqual({
        accepted: true,
        analysis: expect.objectContaining({
          legal: true,
          complete,
          state,
          nextRoles,
          capitalization: 'sentence-case',
          punctuation: state === 'ENDED' ? '.' : '',
          publicText,
        }),
      });
    },
  );

  test('completes and ends NOUN + VERB + NOUN', () => {
    const result = analyze([
      add('paper-promise'),
      add('outshouts'),
      add('velvet-megaphone'),
      end,
    ]);

    expect(result).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        state: 'ENDED',
        complete: true,
        publicText: 'A paper promise outshouts a velvet megaphone.',
      }),
    });
  });

  test('renders plural subject agreement and independent object number', () => {
    const result = analyze(
      [add('paper-promise'), add('outshouts'), add('paper-promise'), end],
      'plural',
      'singular',
    );

    expect(result).toEqual({
      accepted: true,
      analysis: expect.objectContaining({
        agreement: { subject: 'plural', object: 'singular' },
        publicText: 'Paper promises outshout a paper promise.',
        renderedPhrases: [
          expect.objectContaining({ grammaticalNumber: 'plural' }),
          expect.objectContaining({ grammaticalNumber: 'plural' }),
          expect.objectContaining({ grammaticalNumber: 'singular' }),
        ],
      }),
    });
  });

  test('rejects every role outside each core transition-table row', () => {
    const cases = [
      {
        steps: [],
        state: 'EXPECT_SUBJECT',
        acceptedRoles: ['noun'],
        expectedRoles: ['noun'],
      },
      {
        steps: [add('paper-promise')],
        state: 'EXPECT_VERB_OR_PREDICATE',
        acceptedRoles: ['verb', 'predicate'],
        expectedRoles: ['verb', 'predicate'],
      },
      {
        steps: [add('paper-promise'), add('folds')],
        state: 'EXPECT_OBJECT',
        acceptedRoles: ['noun'],
        expectedRoles: ['noun'],
      },
      {
        steps: [add('paper-promise'), add('before-lunch')],
        state: 'CLAUSE_COMPLETE',
        acceptedRoles: ['conjunction', 'ending'],
        expectedRoles: ['conjunction', 'ending'],
      },
    ] as const;

    for (const testCase of cases) {
      for (const [role, phraseId] of Object.entries(phraseIdByRole)) {
        if ((testCase.acceptedRoles as readonly string[]).includes(role)) {
          continue;
        }
        expect(analyze([...testCase.steps, add(phraseId)])).toEqual({
          accepted: false,
          faults: [
            {
              kind: 'illegal-transition',
              code: 'unexpected-role',
              state: testCase.state,
              attempted: role,
              phraseId,
              stepIndex: testCase.steps.length,
              expectedRoles: testCase.expectedRoles,
            },
          ],
        });
      }
    }
  });

  test.each([
    [[], 'EXPECT_SUBJECT', ['noun']],
    [[add('paper-promise')], 'EXPECT_VERB_OR_PREDICATE', ['verb', 'predicate']],
    [[add('paper-promise'), add('folds')], 'EXPECT_OBJECT', ['noun']],
  ])(
    'rejects an end transition from incomplete state %s',
    (steps, state, roles) => {
      expect(analyze([...steps, end] as readonly EnglishGrammarStep[])).toEqual(
        {
          accepted: false,
          faults: [
            {
              kind: 'illegal-transition',
              code: 'cannot-end-incomplete',
              state,
              attempted: 'end',
              phraseId: null,
              stepIndex: steps.length,
              expectedRoles: roles,
            },
          ],
        },
      );
    },
  );

  test('requires the English locale and every referenced message', () => {
    const source = sampleContent.phrases[0]!;
    expect(() =>
      prepareEnglishGrammarPhrase(source, {
        ...englishGameLocale,
        locale: 'ro',
      }),
    ).toThrow(/English game-locale bundle/iu);
    expect(() =>
      prepareEnglishGrammarPhrase(source, {
        ...englishGameLocale,
        messages: {},
      }),
    ).toThrow(/missing/iu);
  });
});
