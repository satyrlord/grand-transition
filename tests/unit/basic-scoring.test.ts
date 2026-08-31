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
    const result = score(['national-consensus', 'belongs-in-a-party-museum']);
    expect(result.finalDamage).toBe(5);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ['national-consensus', 'belongs-in-a-party-museum'],
      amount: 5,
    });
  });

  test('supports flavour matches and exact noun-specific score overrides', () => {
    const baseAnalysis = analysis([
      'national-consensus',
      'belongs-in-a-party-museum',
    ]);
    const flavourPhrases = sampleContent.phrases.map((phrase) =>
      phrase.id === 'belongs-in-a-party-museum'
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
    ).toBe(8);

    const customPhrases = flavourPhrases.map((phrase) =>
      phrase.id === 'belongs-in-a-party-museum'
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
      score(['national-consensus', 'belongs-in-a-party-museum'], ['restraint'])
        .finalDamage,
    ).toBe(8);
  });

  test('keeps scene and character restrictions out of damage', () => {
    const result = score([
      'televised-revolution',
      'rebrands',
      'national-salvation-committee',
    ]);
    expect(result.finalDamage).toBe(11);
    expect(
      result.breakdown.some((item) => item.kind === 'restriction-multiplier'),
    ).toBe(false);
  });

  test('uses the exact 5, 8, 11, and 14 compatibility tiers', () => {
    const relationId = 'belongs-in-a-party-museum';
    const baseAnalysis = analysis(['national-consensus', relationId]);
    const tier = (substance: boolean, flavour: boolean): number =>
      scoreBasicConstruction({
        analysis: baseAnalysis,
        phrases: sampleContent.phrases.map((phrase) => {
          if (phrase.id === 'national-consensus') {
            return {
              ...phrase,
              scoreGroups: {
                substance: ['tier-substance'],
                flavour: ['tier-flavour'],
              },
            };
          }
          return phrase.id === relationId
            ? {
                ...phrase,
                scorePreferences: {
                  substance: substance ? [{ left: ['tier-substance'] }] : [],
                  flavour: flavour ? [{ left: ['tier-flavour'] }] : [],
                },
              }
            : phrase;
        }),
        defenderWeaknessTags: [],
        balance: basicScoringBalance,
      }).finalDamage;

    expect([
      tier(false, false),
      tier(false, true),
      tier(true, false),
      tier(true, true),
    ]).toEqual([5, 8, 11, 14]);
  });

  test('keeps a modifier in the preceding clause for weakness scoring', () => {
    const ids = [
      'national-consensus',
      'belongs-in-a-party-museum',
      'before-the-next-election',
    ] as const;
    const phrases = sampleContent.phrases.map((phrase) =>
      phrase.id === 'before-the-next-election'
        ? {
            ...phrase,
            sceneIds: ['transition-era-television-studio'],
          }
        : phrase,
    );
    const result = scoreBasicConstruction({
      analysis: analysis(ids),
      phrases,
      defenderWeaknessTags: ['consistency'],
      balance: basicScoringBalance,
    });

    expect(result.finalDamage).toBe(8);
    expect(
      result.breakdown.filter((item) => item.kind === 'clause-base'),
    ).toHaveLength(1);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ids,
      amount: 5,
    });
    expect(
      result.breakdown.some((item) => item.kind === 'restriction-multiplier'),
    ).toBe(false);
    expect(result.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'weakness-match',
        defenderTag: 'consistency',
        phraseId: 'before-the-next-election',
      }),
    );
  });

  test('keeps a with complement in the preceding clause', () => {
    const result = score([
      'my-opponent',
      'interrupts-the-debate',
      'with',
      'a-public-apology',
    ]);

    expect(
      result.breakdown.filter((item) => item.kind === 'clause-base'),
    ).toHaveLength(1);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: [
        'my-opponent',
        'interrupts-the-debate',
        'with',
        'a-public-apology',
      ],
      amount: 5,
    });
  });

  test('adds the scores of compound-subject clauses', () => {
    expect(
      score([
        'national-consensus',
        'coalition-and',
        'televised-revolution',
        'belongs-in-a-party-museum',
      ]).finalDamage,
    ).toBe(10);
  });

  test('adds the scores of compound-object clauses', () => {
    expect(
      score([
        'national-consensus',
        'denounced',
        'televised-revolution',
        'coalition-and',
        'national-salvation-committee',
      ]).finalDamage,
    ).toBe(16);
  });

  test('scores front-because subordinate and main clauses separately', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'belongs-in-a-party-museum',
        'televised-revolution',
        'makes-own-voters-change-the-channel',
      ]).finalDamage,
    ).toBe(16);
  });

  test('scores each extended front-because clause once before the main clause', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'belongs-in-a-party-museum',
        'coalition-and',
        'televised-revolution',
        'makes-own-voters-change-the-channel',
        'coalition-protocol',
        'belongs-in-a-party-museum',
      ]).finalDamage,
    ).toBe(21);
  });

  test('does not reuse an object relation after a shared-subject subordinate extension', () => {
    expect(
      score([
        'archive-because',
        'national-consensus',
        'rebrands',
        'televised-revolution',
        'coalition-and',
        'belongs-in-a-party-museum',
        'coalition-protocol',
        'belongs-in-a-party-museum',
      ]).finalDamage,
    ).toBe(21);
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
