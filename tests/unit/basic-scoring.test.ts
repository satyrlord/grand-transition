import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
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
    const result = score(['national-consensus', 'before-the-next-election']);
    expect(result.finalDamage).toBe(5);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ['national-consensus', 'before-the-next-election'],
      amount: 5,
    });
  });

  test('supports flavour matches and exact noun-specific score overrides', () => {
    const baseAnalysis = analysis([
      'national-consensus',
      'before-the-next-election',
    ]);
    const flavourPhrases = sampleContent.phrases.map((phrase) =>
      phrase.id === 'before-the-next-election'
        ? {
            ...phrase,
            scorePreferences: {
              substance: [],
              flavour: [{ left: ['consensus'] }],
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
      phrase.id === 'before-the-next-election'
        ? {
            ...phrase,
            customScores: [{ leftNounId: 'national-consensus', score: 9 }],
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
      score(['national-consensus', 'before-the-next-election'], ['restraint'])
        .finalDamage,
    ).toBe(10);
  });

  test('applies 1.5 for each scene- or character-restricted phrase before weakness', () => {
    const result = score([
      'televised-revolution',
      'repackages',
      'national-salvation-committee',
    ]);
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
      score([
        'national-consensus',
        'coalition-and',
        'televised-revolution',
        'before-the-next-election',
      ]).finalDamage,
    ).toBe(6);
  });

  test('adds the scores of compound-object clauses', () => {
    expect(
      score([
        'national-consensus',
        'denounces',
        'televised-revolution',
        'coalition-and',
        'national-salvation-committee',
      ]).finalDamage,
    ).toBe(7);
  });

  test('scores front-because subordinate and main clauses separately', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'before-the-next-election',
        'televised-revolution',
        'on-public-television',
      ]).finalDamage,
    ).toBe(10);
  });

  test('scores each extended front-because clause once before the main clause', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'before-the-next-election',
        'coalition-and',
        'televised-revolution',
        'on-public-television',
        'coalition-protocol',
        'before-the-next-election',
      ]).finalDamage,
    ).toBe(15);
  });

  test('does not reuse an object relation after a shared-subject subordinate extension', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'repackages',
        'televised-revolution',
        'coalition-and',
        'before-the-next-election',
        'coalition-protocol',
        'before-the-next-election',
      ]).finalDamage,
    ).toBe(11);
  });

  test('an incomplete sentence deals zero damage and has no clause score', () => {
    const result = scoreBasicConstruction({
      analysis: analysis(['national-consensus']),
      phrases: sampleContent.phrases,
      defenderWeaknessTags: ['restraint'],
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
