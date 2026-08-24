import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import {
  ceilDamage,
  replayBasicScoreBreakdown,
  scoreBasicConstruction,
} from '../../src/engine/basic-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const add = (id: string): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: prepareEnglishGrammarPhrase(
    sampleContent.phrases.find((phrase) => phrase.id === id)!,
    englishGameLocale,
  ),
});
const analysis = (ids: readonly string[], end = true) => {
  const result = englishGrammarAdapter.analyze({
    steps: [...ids.map(add), ...(end ? ([{ kind: 'end' }] as const) : [])],
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error(result.faults[0]!.code);
  return result.analysis;
};
const score = (ids: readonly string[], weaknesses: readonly string[] = []) =>
  scoreBasicConstruction({
    analysis: analysis(ids),
    phrases: sampleContent.phrases,
    defenderWeaknessTags: weaknesses,
    balance: basicScoringBalance,
  });

describe('Hollywood Roast clause scoring', () => {
  test('scores semantic compatibility instead of summing card values', () => {
    const result = score(['paper-promise', 'before-lunch']);
    expect(result.finalDamage).toBe(5);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ['paper-promise', 'before-lunch'],
      amount: 5,
    });
  });

  test('supports flavour matches and exact noun-specific score overrides', () => {
    const baseAnalysis = analysis(['paper-promise', 'before-lunch']);
    const flavourPhrases = sampleContent.phrases.map((phrase) =>
      phrase.id === 'before-lunch'
        ? {
            ...phrase,
            scorePreferences: {
              substance: [],
              flavour: [{ left: ['empty-promise'] }],
            },
          }
        : phrase,
    );
    expect(
      scoreBasicConstruction({
        analysis: baseAnalysis,
        phrases: flavourPhrases,
        defenderWeaknessTags: [],
        balance: basicScoringBalance,
      }).finalDamage,
    ).toBe(3);

    const customPhrases = flavourPhrases.map((phrase) =>
      phrase.id === 'before-lunch'
        ? {
            ...phrase,
            customScores: [{ leftNounId: 'paper-promise', score: 9 }],
          }
        : phrase,
    );
    expect(
      scoreBasicConstruction({
        analysis: baseAnalysis,
        phrases: customPhrases,
        defenderWeaknessTags: [],
        balance: basicScoringBalance,
      }).finalDamage,
    ).toBe(9);
  });

  test('applies a weakness multiplier to the matching clause only', () => {
    expect(
      score(['paper-promise', 'before-lunch'], ['empty-promise']).finalDamage,
    ).toBe(10);
  });

  test('applies 1.5 for each scene- or character-restricted phrase before weakness', () => {
    const result = score(['velvet-megaphone', 'folds', 'committee-kite']);
    expect(result.finalDamage).toBe(8);
    expect(result.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'restriction-multiplier',
        factor: 1.5,
      }),
    );
  });

  test('adds the scores of compound-subject clauses', () => {
    expect(
      score(['paper-promise', 'and', 'velvet-megaphone', 'before-lunch'])
        .finalDamage,
    ).toBe(6);
  });

  test('adds the scores of compound-object clauses', () => {
    expect(
      score([
        'paper-promise',
        'outshouts',
        'velvet-megaphone',
        'and',
        'committee-kite',
      ]).finalDamage,
    ).toBe(7);
  });

  test('scores front-because subordinate and main clauses separately', () => {
    expect(
      score([
        'because',
        'paper-promise',
        'before-lunch',
        'velvet-megaphone',
        'in-an-empty-hall',
      ]).finalDamage,
    ).toBe(10);
  });

  test('scores each extended front-because clause once before the main clause', () => {
    expect(
      score([
        'because',
        'paper-promise',
        'before-lunch',
        'and',
        'velvet-megaphone',
        'in-an-empty-hall',
        'borrowed-mandate',
        'before-lunch',
      ]).finalDamage,
    ).toBe(15);
  });

  test('does not reuse an object relation after a shared-subject subordinate extension', () => {
    expect(
      score([
        'because',
        'paper-promise',
        'folds',
        'velvet-megaphone',
        'and',
        'before-lunch',
        'borrowed-mandate',
        'before-lunch',
      ]).finalDamage,
    ).toBe(11);
  });

  test('an incomplete sentence deals zero damage and has no clause score', () => {
    const result = scoreBasicConstruction({
      analysis: analysis(['paper-promise']),
      phrases: sampleContent.phrases,
      defenderWeaknessTags: ['empty-promise'],
      balance: basicScoringBalance,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.breakdown.some((item) => item.kind === 'clause-score')).toBe(
      false,
    );
  });

  test('replays clause totals and always rounds damage up', () => {
    expect(
      replayBasicScoreBreakdown([
        {
          kind: 'clause-score',
          operation: 'add',
          phraseIds: ['a'],
          amount: 2.1,
        },
      ]),
    ).toEqual({ unroundedTotal: 2.1, finalDamage: 3 });
    expect(ceilDamage(0)).toBe(0);
    expect(() => ceilDamage(-1)).toThrow(/non-negative/iu);
  });
});
