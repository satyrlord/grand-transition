import { describe, expect, test } from 'vitest';
import { basicScoringBalance, scoringBalanceForMultiplier, legacyVersion3BasicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  ceilDamage,
  replayBasicScoreBreakdown,
  scoreBasicConstruction,
  extractScoreClauseAnchors,
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

  test.each(['and', 'but', 'because', 'yet', 'so', 'for'])(
    'neutral %s clauses do not activate any defender weakness',
    (connector) => {
      const ids = ['you', 'is', 'my-opponent', connector, 'you', 'is', 'my-opponent'];
      const weaknesses = [...new Set(sampleContent.characters.flatMap((character) => character.weaknessTags))];
      const result = score(ids, weaknesses);
      expect(result.finalDamage).toBeGreaterThan(0);
      expect(result.finalDamage).toBe(score(ids).finalDamage);
      expect(result.breakdown.some((item) => item.kind === 'weakness-match' || item.kind === 'weakness-multiplier')).toBe(false);
    },
  );

  test('neutral with and its neutral complement add no weakness while a tagged complement still matches', () => {
    const neutral = ['you', 'is', 'my-opponent', 'with', 'you'];
    expect(score(neutral, ['credibility', 'decorum']).finalDamage).toBe(score(neutral).finalDamage);
    const tagged = score(['you', 'is', 'my-opponent', 'with', 'a-thief'], ['corruption']);
    expect(tagged.breakdown).toContainEqual(expect.objectContaining({ kind: 'weakness-match', phraseId: 'a-thief', defenderTag: 'corruption' }));
  });

  test('a neutral action retains compatibility scoring without adding weakness damage', () => {
    const ids = ['you', 'explains', 'my-opponent'];
    const result = score(ids, ['evidence', 'credibility', 'decorum', 'consistency']);
    expect(result.finalDamage).toBe(score(ids).finalDamage);
    expect(result.breakdown.some((item) => item.kind === 'weakness-match')).toBe(false);
  });

  test('narration anchors distinguish repeated relation occurrences and shared compound completion', () => {
    const phrases = new Map(sampleContent.phrases.map((phrase) => [phrase.id, phrase]));
    expect(extractScoreClauseAnchors(analysis(['national-consensus', 'belongs-in-a-party-museum']), phrases)).toEqual([1]);
    expect(extractScoreClauseAnchors(analysis(['national-consensus', 'and', 'televised-revolution', 'belongs-in-a-party-museum']), phrases)).toEqual([3, 3]);
    expect(extractScoreClauseAnchors(analysis(['national-consensus', 'belongs-in-a-party-museum', 'and', 'televised-revolution', 'belongs-in-a-party-museum']), phrases)).toEqual([1, 4]);
  });
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

  test.each([1, 2, 3, 4, 5] as const)('uses compatibility multiplier %s with the fixed five-point base', (multiplier) => {
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
        balance: scoringBalanceForMultiplier(multiplier),
      }).finalDamage;

    expect([
      tier(false, false),
      tier(false, true),
      tier(true, false),
      tier(true, true),
    ]).toEqual([5, 5 + multiplier, 5 + 2 * multiplier, 5 + 3 * multiplier]);
  });

  test.each([1, 2, 3, 4, 5] as const)('keeps custom bases, modifier points, and weakness separate at multiplier %s', (multiplier) => {
    const result = scoreBasicConstruction({
      analysis: analysis(['national-consensus', 'belongs-in-a-party-museum', 'before-the-next-election']),
      phrases: sampleContent.phrases.map((phrase) => phrase.id === 'belongs-in-a-party-museum'
        ? { ...phrase, customScores: [{ leftNounId: 'national-consensus', score: 9 }] }
        : phrase),
      defenderWeaknessTags: ['consistency'],
      balance: scoringBalanceForMultiplier(multiplier),
    });
    expect(result.finalDamage).toBe(17);
    expect(result.breakdown.filter((item) => item.kind === 'weakness-multiplier')).toHaveLength(1);
    expect(result.breakdown).toContainEqual(expect.objectContaining({ kind: 'clause-base', amount: 11 }));
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

    expect(result.finalDamage).toBe(11);
    expect(
      result.breakdown.filter((item) => item.kind === 'clause-base'),
    ).toHaveLength(1);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ids,
      amount: 7,
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

  test('each stacked modifier adds points to the screenshot clause', () => {
    const core = ['a-pig', 'stole', 'municipal-ribbon'];
    const modifiers = ['on-the-campaign-trail', 'during-budget-season', 'under-the-studio-lights'];
    expect([0, 1, 2, 3].map((count) =>
      score([...core, ...modifiers.slice(0, count)]).finalDamage,
    )).toEqual([5, 7, 9, 11]);
    const ids = [...core, ...modifiers];
    expect(scoreBasicConstruction({
      analysis: analysis(ids), phrases: sampleContent.phrases,
      defenderWeaknessTags: [], balance: legacyVersion3BasicScoringBalance,
    }).finalDamage).toBe(5);
  });

  test('stacked modifier tags trigger one weakness multiplier on their clause only', () => {
    const ids = ['a-pig', 'stole', 'municipal-ribbon',
      'on-the-campaign-trail', 'during-budget-season', 'under-the-studio-lights',
      'yet', 'national-consensus', 'belongs-in-a-party-museum'];
    const modifiers = new Set(ids.slice(3, 6));
    const phrases = sampleContent.phrases.map((phrase) => ({
      ...phrase, tags: modifiers.has(phrase.id) ? ['modifier-only'] : [],
    }));
    const result = scoreBasicConstruction({
      analysis: analysis(ids), phrases, defenderWeaknessTags: ['modifier-only'],
      balance: basicScoringBalance,
    });
    expect(result.finalDamage).toBe(22); // ceil(11 * 1.5 + 5)
    expect(result.breakdown.filter((item) => item.kind === 'weakness-match')).toHaveLength(3);
    expect(result.breakdown.filter((item) => item.kind === 'weakness-multiplier')).toHaveLength(1);
  });

  test('modifier points apply to custom scores and repeated occurrences', () => {
    const ids = ['national-consensus', 'belongs-in-a-party-museum',
      'before-the-next-election', 'before-the-next-election'];
    const phrases = sampleContent.phrases.map((phrase) =>
      phrase.id === 'belongs-in-a-party-museum'
        ? { ...phrase, customScores: [{ leftNounId: 'national-consensus', score: 9 }] }
        : phrase);
    expect(scoreBasicConstruction({
      analysis: analysis(ids), phrases, defenderWeaknessTags: [],
      balance: basicScoringBalance,
    }).finalDamage).toBe(13);
  });

  test('a shared modifier adds points to each compound-subject clause', () => {
    expect(score(['national-consensus', 'and', 'televised-revolution',
      'belongs-in-a-party-museum', 'before-the-next-election']).finalDamage).toBe(14);
  });

  test('modifiers give no damage to incomplete sentences', () => {
    const ids = ['national-consensus', 'belongs-in-a-party-museum', 'before-the-next-election'];
    expect(score([...ids, 'yet']).finalDamage).toBe(0);
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

  test('keeps a coordinated copular noun complement in the preceding clause', () => {
    const ids = [
      'your-brother',
      'is-a-snitch',
      'and',
      'a-pig',
    ] as const;
    const result = score(ids, ['restraint']);

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
    expect(result.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'weakness-match',
        defenderTag: 'restraint',
        phraseId: 'a-pig',
      }),
    );
  });

  test('adds the scores of compound-subject clauses', () => {
    expect(
      score([
        'national-consensus',
        'and',
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
        'and',
        'national-salvation-committee',
      ]).finalDamage,
    ).toBe(16);
  });

  test('scores front-because subordinate and main clauses separately', () => {
    expect(
      score([
        'because',
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
        'because',
        'national-consensus',
        'belongs-in-a-party-museum',
        'and',
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
        'because',
        'national-consensus',
        'rebrands',
        'televised-revolution',
        'and',
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
