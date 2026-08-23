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
const fault = (id: string): EnglishGrammarStep => ({
  kind: 'deliberate-fault',
  sourcePhrase: phrase(id),
});

const phraseIdByRole = {
  noun: 'paper-promise',
  verb: 'folds',
  predicate: 'before-lunch',
  conjunction: 'and',
  ending: 'with-the-receipt',
  continuation: 'still-echoes',
} as const;

const completeFormCases = [
  [
    'minimum predicate clause',
    [add('paper-promise'), add('before-lunch')],
    'A paper promise before lunch',
  ],
  [
    'minimum verb clause',
    [add('paper-promise'), add('outshouts'), add('velvet-megaphone')],
    'A paper promise outshouts a velvet megaphone',
  ],
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
  [
    'predicate then shared-subject verb',
    [
      add('paper-promise'),
      add('before-lunch'),
      add('and', 'shared-subject'),
      add('outshouts'),
      add('velvet-megaphone'),
    ],
    'A paper promise before lunch and outshouts a velvet megaphone',
  ],
  [
    'verb then shared-subject verb',
    [
      add('paper-promise'),
      add('outshouts'),
      add('velvet-megaphone'),
      add('and', 'shared-subject'),
      add('polishes'),
      add('committee-kite'),
    ],
    'A paper promise outshouts a velvet megaphone and polishes a committee kite',
  ],
] as const;

function analyze(steps: readonly EnglishGrammarStep[]) {
  const input: EnglishGrammarInput = {
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
  return englishGrammarAdapter.analyze(input);
}

describe('extended English grammar', () => {
  test.each(completeFormCases)(
    'accepts the %s form',
    (_name, steps, publicText) => {
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
    },
  );

  test.each(completeFormCases)(
    'accepts an ending after the %s form',
    (_name, steps, publicText) => {
      expect(
        analyze([
          ...(steps as readonly EnglishGrammarStep[]),
          add('with-the-receipt'),
        ]),
      ).toEqual({
        accepted: true,
        analysis: expect.objectContaining({
          complete: true,
          state: 'ENDED',
          nextRoles: [],
          punctuation: '.',
          publicText: `${publicText} with the receipt.`,
          resolution: expect.objectContaining({ constructionEnded: true }),
        }),
      });
    },
  );

  test('a legal ending rejects every later step', () => {
    const endedSteps = [
      add('paper-promise'),
      add('before-lunch'),
      add('with-the-receipt'),
    ];
    const laterSteps = [
      ...Object.entries(phraseIdByRole).map(([attempted, phraseId]) => ({
        step: add(phraseId),
        code: 'unexpected-role',
        attempted,
        phraseId,
      })),
      {
        step: end,
        code: 'cannot-end-incomplete',
        attempted: 'end',
        phraseId: null,
      },
      {
        step: fault('folds'),
        code: 'cannot-fault-ended-construction',
        attempted: 'verb',
        phraseId: 'folds',
      },
    ] as const;

    for (const later of laterSteps) {
      expect(analyze([...endedSteps, later.step])).toEqual({
        accepted: false,
        faults: [
          {
            kind: 'illegal-transition',
            code: later.code,
            state: 'ENDED',
            attempted: later.attempted,
            phraseId: later.phraseId,
            stepIndex: endedSteps.length,
            expectedRoles: [],
          },
        ],
      });
    }
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

  test.each([
    [[], 'EXPECT_SUBJECT', ['noun']],
    [[add('paper-promise')], 'EXPECT_VERB_OR_PREDICATE', ['verb', 'predicate']],
    [[add('paper-promise'), add('folds')], 'EXPECT_OBJECT', ['noun']],
    [
      [add('paper-promise'), add('before-lunch'), add('and')],
      'EXPECT_SUBJECT_AFTER_CONJUNCTION',
      ['noun'],
    ],
    [
      [add('paper-promise'), add('before-lunch'), add('and', 'shared-subject')],
      'EXPECT_VERB_AFTER_SHARED_SUBJECT',
      ['verb'],
    ],
  ])(
    'keeps incomplete input as valid zero-damage state %s',
    (steps, state, nextRoles) => {
      expect(analyze(steps as readonly EnglishGrammarStep[])).toEqual({
        accepted: true,
        analysis: expect.objectContaining({
          legal: true,
          complete: false,
          sentenceStatus: 'incomplete',
          state,
          nextRoles,
          resolution: {
            outgoingDamageIntent: 0,
            selfDamageIntent: 0,
            removedPhraseId: null,
            constructionEnded: false,
            feedback: null,
          },
        }),
      });
    },
  );

  test('resolves an illegal source phrase as a deliberate strategic foul', () => {
    expect(analyze([fault('folds')])).toEqual({
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

  test.each([
    [
      'legal source',
      [fault('paper-promise')],
      'cannot-fault-legal-phrase',
      'EXPECT_SUBJECT',
      'noun',
      'paper-promise',
      0,
      ['noun'],
    ],
    [
      'ended construction',
      [
        add('paper-promise'),
        add('before-lunch'),
        add('with-the-receipt'),
        fault('folds'),
      ],
      'cannot-fault-ended-construction',
      'ENDED',
      'verb',
      'folds',
      3,
      [],
    ],
    [
      'continuation role',
      [add('paper-promise'), add('still-echoes')],
      'unexpected-role',
      'EXPECT_VERB_OR_PREDICATE',
      'continuation',
      'still-echoes',
      1,
      ['verb', 'predicate'],
    ],
    [
      'unexpected role',
      [
        add('paper-promise'),
        add('before-lunch'),
        add('and'),
        add('before-lunch'),
      ],
      'unexpected-role',
      'EXPECT_SUBJECT_AFTER_CONJUNCTION',
      'predicate',
      'before-lunch',
      3,
      ['noun'],
    ],
  ])(
    'returns the exact typed failure for %s',
    (
      _name,
      steps,
      code,
      state,
      attempted,
      phraseId,
      stepIndex,
      expectedRoles,
    ) => {
      expect(analyze(steps as readonly EnglishGrammarStep[])).toEqual({
        accepted: false,
        faults: [
          {
            kind: 'illegal-transition',
            code,
            state,
            attempted,
            phraseId,
            stepIndex,
            expectedRoles,
          },
        ],
      });
    },
  );
});
