import { describe, expect, test } from 'vitest';
import {
  basicScoringBalance,
  basicScoringBalanceSchema,
} from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import {
  replayBasicScoreBreakdown,
  roundNonNegativeDamage,
  scoreBasicConstruction,
} from '../../src/engine/basic-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarAnalysis,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const phraseById = new Map(
  sampleContent.phrases.map((phrase) => [phrase.id, phrase]),
);

function step(phraseId: string): EnglishGrammarStep {
  return {
    kind: 'phrase',
    phrase: preparedPhrase(phraseId),
  };
}

function preparedPhrase(phraseId: string) {
  const phrase = phraseById.get(phraseId);
  if (!phrase) throw new Error(`Missing test phrase "${phraseId}".`);
  return prepareEnglishGrammarPhrase(phrase, englishGameLocale);
}

function analyze(steps: readonly EnglishGrammarStep[]): EnglishGrammarAnalysis {
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error('The test construction was rejected.');
  return result.analysis;
}

function score(
  phraseIds: readonly string[],
  defenderWeaknessTags: readonly string[] = [],
) {
  return scoreBasicConstruction({
    analysis: analyze(phraseIds.map(step)),
    phrases: sampleContent.phrases,
    defenderWeaknessTags,
    balance: basicScoringBalance,
  });
}

describe('basic scoring balance data', () => {
  test('accepts only the approved length, weakness, and rounding values', () => {
    expect(basicScoringBalanceSchema.parse(basicScoringBalance)).toEqual(
      basicScoringBalance,
    );
    expect(
      basicScoringBalanceSchema.safeParse({
        ...basicScoringBalance,
        weaknessMultiplier: 3,
      }).success,
    ).toBe(false);
    expect(
      basicScoringBalanceSchema.safeParse({
        ...basicScoringBalance,
        lengthBonus: { freePhraseCount: 4, perAdditionalPhrase: 1 },
      }).success,
    ).toBe(false);
  });
});

describe('basic scoring calculation', () => {
  test.each([
    {
      name: 'zero phrases',
      phrases: [],
      base: [],
      length: 0,
      directness: 0,
      unrounded: 0,
      final: 0,
    },
    {
      name: 'one incomplete phrase',
      phrases: ['paper-promise'],
      base: [],
      length: 0,
      directness: 0,
      unrounded: 0,
      final: 0,
    },
    {
      name: 'two complete phrases with directness zero',
      phrases: ['paper-promise', 'before-lunch'],
      base: [2, 2],
      length: 0,
      directness: 0,
      unrounded: 4,
      final: 4,
    },
    {
      name: 'three complete phrases with directness one',
      phrases: ['paper-promise', 'folds', 'velvet-megaphone'],
      base: [2, 2, 3],
      length: 0,
      directness: 1,
      unrounded: 8,
      final: 8,
    },
    {
      name: 'four complete phrases with a length bonus',
      phrases: [
        'paper-promise',
        'folds',
        'velvet-megaphone',
        'with-the-receipt',
      ],
      base: [2, 2, 3, 3],
      length: 1,
      directness: 2,
      unrounded: 13,
      final: 13,
    },
  ])(
    'scores $name',
    ({ phrases, base, length, directness, unrounded, final }) => {
      const result = score(phrases);
      expect(
        result.breakdown
          .filter((item) => item.kind === 'base-phrase')
          .map((item) => item.amount),
      ).toEqual(base);
      expect(
        result.breakdown.find((item) => item.kind === 'length-bonus'),
      ).toEqual(expect.objectContaining({ amount: length, operation: 'add' }));
      expect(
        result.breakdown.find((item) => item.kind === 'directness-bonus'),
      ).toEqual(
        expect.objectContaining({ amount: directness, operation: 'add' }),
      );
      expect(
        result.breakdown.find((item) => item.kind === 'weakness-multiplier'),
      ).toEqual(expect.objectContaining({ factor: 1, operation: 'multiply' }));
      expect(result.unroundedTotal).toBe(unrounded);
      expect(result.finalDamage).toBe(final);
    },
  );

  test('lists every weakness match in defender-tag order and multiplies once', () => {
    const result = score(
      ['paper-promise', 'folds', 'velvet-megaphone'],
      ['noise', 'empty-promise', 'retreat'],
    );

    expect(
      result.breakdown.filter((item) => item.kind === 'weakness-match'),
    ).toEqual([
      {
        kind: 'weakness-match',
        operation: 'note',
        defenderTag: 'noise',
        phraseId: 'velvet-megaphone',
        phraseIndex: 2,
      },
      {
        kind: 'weakness-match',
        operation: 'note',
        defenderTag: 'empty-promise',
        phraseId: 'paper-promise',
        phraseIndex: 0,
      },
      {
        kind: 'weakness-match',
        operation: 'note',
        defenderTag: 'empty-promise',
        phraseId: 'folds',
        phraseIndex: 1,
      },
      {
        kind: 'weakness-match',
        operation: 'note',
        defenderTag: 'retreat',
        phraseId: 'folds',
        phraseIndex: 1,
      },
    ]);
    expect(
      result.breakdown.find((item) => item.kind === 'weakness-multiplier'),
    ).toEqual({
      kind: 'weakness-multiplier',
      operation: 'multiply',
      factor: 2,
    });
    expect(result.unroundedTotal).toBe(16);
    expect(result.finalDamage).toBe(16);
  });

  test.each([
    { name: 'one match', tags: ['retreat'] },
    { name: 'several matching phrases', tags: ['empty-promise'] },
    {
      name: 'several matching defender tags',
      tags: ['noise', 'empty-promise', 'retreat'],
    },
  ])('applies one multiplier for $name', ({ tags }) => {
    expect(
      score(['paper-promise', 'folds', 'velvet-megaphone'], tags).finalDamage,
    ).toBe(16);
  });

  test.each([
    { value: 4.49, expected: 4 },
    { value: 4.5, expected: 5 },
    { value: 4.51, expected: 5 },
  ])('rounds $value to $expected', ({ value, expected }) => {
    expect(roundNonNegativeDamage(value)).toBe(expected);
  });

  test('returns a zero-only calculation for incomplete and invalid grammar', () => {
    const incomplete = scoreBasicConstruction({
      analysis: analyze([step('paper-promise')]),
      phrases: sampleContent.phrases,
      defenderWeaknessTags: ['empty-promise'],
      balance: basicScoringBalance,
    });
    const invalid = scoreBasicConstruction({
      analysis: analyze([
        step('paper-promise'),
        {
          kind: 'deliberate-fault',
          sourcePhrase: preparedPhrase('velvet-megaphone'),
        },
      ]),
      phrases: sampleContent.phrases,
      defenderWeaknessTags: ['empty-promise'],
      balance: basicScoringBalance,
    });

    for (const result of [incomplete, invalid]) {
      expect(result.unroundedTotal).toBe(0);
      expect(result.finalDamage).toBe(0);
      expect(
        result.breakdown
          .filter((item) => item.operation === 'add')
          .every((item) => item.amount === 0),
      ).toBe(true);
      expect(result.breakdown.some((item) => item.kind === 'base-phrase')).toBe(
        false,
      );
    }
  });

  test('replays the ordered breakdown without game or UI state', () => {
    const result = score(
      ['paper-promise', 'folds', 'velvet-megaphone', 'with-the-receipt'],
      ['empty-promise', 'paperwork'],
    );

    expect(result.breakdown.map((item) => item.kind)).toEqual([
      'base-phrase',
      'base-phrase',
      'base-phrase',
      'base-phrase',
      'length-bonus',
      'directness-bonus',
      'weakness-match',
      'weakness-match',
      'weakness-match',
      'weakness-match',
      'weakness-match',
      'weakness-multiplier',
      'unrounded-total',
      'final-damage',
    ]);
    expect(replayBasicScoreBreakdown(result.breakdown)).toEqual({
      unroundedTotal: result.unroundedTotal,
      finalDamage: result.finalDamage,
    });
    expect(result.breakdown.at(-2)).toEqual({
      kind: 'unrounded-total',
      operation: 'total',
      amount: result.unroundedTotal,
    });
    expect(result.breakdown.at(-1)).toEqual({
      kind: 'final-damage',
      operation: 'round-half-up',
      amount: result.finalDamage,
    });
  });
});
