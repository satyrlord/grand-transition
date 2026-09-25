import { describe, expect, test } from 'vitest';
import { basicScoringBalance, scoringBalanceForMultiplier } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, gameCatalog } from '../../src/game-content';
import {
  ceilDamage,
  replayBasicScoreBreakdown,
  scoreBasicConstruction,
  extractScoreClauseAnchors,
} from '../../src/engine/basic-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';

const add = (id: string): GrammarStep => ({
  kind: 'phrase',
  phrase: prepareEnglishGrammarPhrase(
    gameCatalog.phrases.find((phrase) => phrase.id === id)!,
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
    phrases: gameCatalog.phrases,
    defenderWeaknessTags: weaknesses,
    balance: basicScoringBalance,
  });

describe('Hollywood Roast clause scoring', () => {

  test.each(['marble-diplomat-modifier-001', 'marble-diplomat-modifier-002'])(
    'neutral modifier %s does not activate luxury, elitism, or corruption weaknesses',
    (modifier) => {
      const ids = ['common-noun-028', 'common-verb-023-present', 'common-noun-053', modifier];
      const result = score(ids, ['luxury', 'elitism', 'corruption']);
      expect(result.finalDamage).toBeGreaterThan(0);
      expect(result.finalDamage).toBe(score(ids).finalDamage);
      expect(result.breakdown.some((item) => item.kind === 'weakness-match')).toBe(false);
    },
  );

  test.each(['common-predicate-013-past', 'common-predicate-013-present', 'common-predicate-013-future'])(
    'the concise %s predicate does not imply a credibility weakness',
    (predicate) => {
      const ids = ['common-noun-028', predicate];
      expect(score(ids, ['credibility']).finalDamage).toBe(score(ids).finalDamage);
      expect(score(ids, ['miners']).breakdown).toContainEqual(
        expect.objectContaining({ kind: 'weakness-match', phraseId: predicate, defenderTag: 'miners' }),
      );
    },
  );

  test.each([
    { connector: 'common-conjunction-001', label: 'common-conjunction-001' },
    { connector: 'common-conjunction-002', label: 'common-conjunction-002' },
    { connector: 'common-conjunction-003', label: 'common-conjunction-003' },
    { connector: 'algorithmic-prophet-conjunction-001', label: 'yet' },
    { connector: 'common-conjunction-004', label: 'common-conjunction-004' },
  ])(
    'neutral $label clauses do not activate any defender weakness',
    ({ connector }) => {
      const ids = ['common-noun-028', 'common-verb-023-present', 'common-noun-053', connector, 'common-noun-028', 'common-verb-023-present', 'common-noun-053'];
      const weaknesses = [...new Set(gameCatalog.characters.flatMap((character) => character.weaknessTags))];
      const result = score(ids, weaknesses);
      expect(result.finalDamage).toBeGreaterThan(0);
      expect(result.finalDamage).toBe(score(ids).finalDamage);
      expect(result.breakdown.some((item) => item.kind === 'weakness-match' || item.kind === 'weakness-multiplier')).toBe(false);
    },
  );

  test('neutral with and its neutral complement add no weakness while a tagged complement still matches', () => {
    const neutral = ['common-noun-028', 'common-verb-023-present', 'common-noun-053', 'common-conjunction-005', 'common-noun-028'];
    expect(score(neutral, ['credibility', 'decorum']).finalDamage).toBe(score(neutral).finalDamage);
    const tagged = score(['common-noun-028', 'common-verb-023-present', 'common-noun-053', 'common-conjunction-005', 'common-noun-033'], ['corruption']);
    expect(tagged.breakdown).toContainEqual(expect.objectContaining({ kind: 'weakness-match', phraseId: 'common-noun-033', defenderTag: 'corruption' }));
  });

  test('a neutral action retains compatibility scoring without adding weakness damage', () => {
    const ids = ['common-noun-028', 'common-verb-006-present', 'common-noun-053'];
    const result = score(ids, ['evidence', 'credibility', 'decorum', 'consistency']);
    expect(result.finalDamage).toBe(score(ids).finalDamage);
    expect(result.breakdown.some((item) => item.kind === 'weakness-match')).toBe(false);
  });

  test('narration anchors distinguish repeated relation occurrences and shared compound completion', () => {
    const phrases = new Map(gameCatalog.phrases.map((phrase) => [phrase.id, phrase]));
    expect(extractScoreClauseAnchors(analysis(['common-noun-001', 'common-predicate-010-present']), phrases)).toEqual([1]);
    expect(extractScoreClauseAnchors(analysis(['common-noun-001', 'common-conjunction-001', 'common-noun-002', 'common-predicate-010-present']), phrases)).toEqual([3, 3]);
    expect(extractScoreClauseAnchors(analysis(['common-noun-001', 'common-predicate-010-present', 'common-conjunction-001', 'common-noun-002', 'common-predicate-010-present']), phrases)).toEqual([1, 4]);
  });
  test('scores semantic compatibility instead of summing card values', () => {
    const result = score(['common-noun-001', 'common-predicate-010-present']);
    expect(result.finalDamage).toBe(5);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: ['common-noun-001', 'common-predicate-010-present'],
      amount: 5,
    });
  });

  test('supports flavour matches and exact noun-specific score overrides', () => {
    const baseAnalysis = analysis([
      'common-noun-001',
      'common-predicate-010-present',
    ]);
    const flavourPhrases = gameCatalog.phrases.map((phrase) =>
      phrase.id === 'common-predicate-010-present'
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
      phrase.id === 'common-predicate-010-present'
        ? {
            ...phrase,
            customScores: [{ leftNounId: 'common-noun-001', score: 9 }],
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
      score(['common-noun-001', 'common-predicate-010-present'], ['restraint'])
        .finalDamage,
    ).toBe(10);
  });

  test('keeps the shipped score balance whole-numbered', () => {
    expect([
      basicScoringBalance.modifierPoints,
      basicScoringBalance.basePointsMinimum,
      basicScoringBalance.basePointsMultiplier,
      basicScoringBalance.substanceGroupPoints,
      basicScoringBalance.flavourGroupPoints,
      basicScoringBalance.weaknessMultiplier,
      basicScoringBalance.restrictedPhraseMultiplier,
    ].every((value) => Number.isInteger(value))).toBe(true);
    expect(basicScoringBalance.weaknessMultiplier).toBe(2);
    expect(basicScoringBalance.restrictedPhraseMultiplier).toBe(1);
  });

  test('keeps scene and character restrictions out of damage', () => {
    const result = score([
      'common-noun-002',
      'common-verb-010-present',
      'red-folded-chairman-noun-001',
    ]);
    expect(result.finalDamage).toBe(11);
    expect(
      result.breakdown.some((item) => item.kind === 'restriction-multiplier'),
    ).toBe(false);
  });

  test.each([1, 2, 3, 4, 5] as const)('uses compatibility multiplier %s with the fixed five-point base', (multiplier) => {
    const relationId = 'common-predicate-010-present';
    const baseAnalysis = analysis(['common-noun-001', relationId]);
    const tier = (substance: boolean, flavour: boolean): number =>
      scoreBasicConstruction({
        analysis: baseAnalysis,
        phrases: gameCatalog.phrases.map((phrase) => {
          if (phrase.id === 'common-noun-001') {
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
      analysis: analysis(['common-noun-001', 'common-predicate-010-present', 'common-modifier-001']),
      phrases: gameCatalog.phrases.map((phrase) => phrase.id === 'common-predicate-010-present'
        ? { ...phrase, customScores: [{ leftNounId: 'common-noun-001', score: 9 }] }
        : phrase),
      defenderWeaknessTags: ['consistency'],
      balance: scoringBalanceForMultiplier(multiplier),
    });
    expect(result.finalDamage).toBe(22);
    expect(result.breakdown.filter((item) => item.kind === 'weakness-multiplier')).toHaveLength(1);
    expect(result.breakdown).toContainEqual(expect.objectContaining({ kind: 'clause-base', amount: 11 }));
  });

  test('keeps a modifier in the preceding clause for weakness scoring', () => {
    const ids = [
      'common-noun-001',
      'common-predicate-010-present',
      'common-modifier-001',
    ] as const;
    const phrases = gameCatalog.phrases.map((phrase) =>
      phrase.id === 'common-modifier-001'
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

    expect(result.finalDamage).toBe(14);
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
        phraseId: 'common-modifier-001',
      }),
    );
  });

  test('each stacked modifier adds points to the screenshot clause', () => {
    const core = ['common-noun-048', 'common-verb-024-past', 'common-noun-013'];
    const modifiers = ['common-modifier-012', 'common-modifier-009', 'common-modifier-013'];
    expect([0, 1, 2, 3].map((count) =>
      score([...core, ...modifiers.slice(0, count)]).finalDamage,
    )).toEqual([5, 7, 9, 11]);
    const ids = [...core, ...modifiers];
    expect(scoreBasicConstruction({
      analysis: analysis(ids), phrases: gameCatalog.phrases,
      defenderWeaknessTags: [], balance: { ...basicScoringBalance, modifierPoints: 0 },
    }).finalDamage).toBe(5);
  });

  test('stacked modifier tags trigger one weakness multiplier on their clause only', () => {
    const ids = ['common-noun-048', 'common-verb-024-past', 'common-noun-013',
      'common-modifier-012', 'common-modifier-009', 'common-modifier-013',
      'algorithmic-prophet-conjunction-001', 'common-noun-001',
      'common-predicate-010-present'];
    const modifiers = new Set(ids.slice(3, 6));
    const phrases = gameCatalog.phrases.map((phrase) => ({
      ...phrase, tags: modifiers.has(phrase.id) ? ['modifier-only'] : [],
    }));
    const result = scoreBasicConstruction({
      analysis: analysis(ids), phrases, defenderWeaknessTags: ['modifier-only'],
      balance: basicScoringBalance,
    });
    expect(result.finalDamage).toBe(27); // 11 * 2 + 5
    expect(result.breakdown.filter((item) => item.kind === 'weakness-match')).toHaveLength(3);
    expect(result.breakdown.filter((item) => item.kind === 'weakness-multiplier')).toHaveLength(1);
  });

  test('modifier points apply to custom scores and repeated occurrences', () => {
    const ids = ['common-noun-001', 'common-predicate-010-present',
      'common-modifier-001', 'common-modifier-001'];
    const phrases = gameCatalog.phrases.map((phrase) =>
      phrase.id === 'common-predicate-010-present'
        ? { ...phrase, customScores: [{ leftNounId: 'common-noun-001', score: 9 }] }
        : phrase);
    expect(scoreBasicConstruction({
      analysis: analysis(ids), phrases, defenderWeaknessTags: [],
      balance: basicScoringBalance,
    }).finalDamage).toBe(13);
  });

  test('a shared modifier adds points to each compound-subject clause', () => {
    expect(score(['common-noun-001', 'common-conjunction-001', 'common-noun-002',
      'common-predicate-010-present', 'common-modifier-001']).finalDamage).toBe(14);
  });

  test('modifiers give no damage to incomplete sentences', () => {
    const ids = ['common-noun-001', 'common-predicate-010-present', 'common-modifier-001'];
    expect(score([...ids, 'algorithmic-prophet-conjunction-001']).finalDamage).toBe(0);
  });

  test('keeps a with complement in the preceding clause', () => {
    const result = score([
      'common-noun-053',
      'common-predicate-001-present',
      'common-conjunction-005',
      'common-noun-054',
    ]);

    expect(
      result.breakdown.filter((item) => item.kind === 'clause-base'),
    ).toHaveLength(1);
    expect(result.breakdown).toContainEqual({
      kind: 'clause-base',
      operation: 'note',
      phraseIds: [
        'common-noun-053',
        'common-predicate-001-present',
        'common-conjunction-005',
        'common-noun-054',
      ],
      amount: 5,
    });
  });

  test('keeps a coordinated copular noun complement in the preceding clause', () => {
    const ids = [
      'common-noun-036',
      'common-predicate-015-present',
      'common-conjunction-001',
      'common-noun-048',
    ] as const;
    const result = score(ids, ['restraint']);

    expect(result.finalDamage).toBe(10);
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
        phraseId: 'common-noun-048',
      }),
    );
  });

  test('adds the scores of compound-subject clauses', () => {
    expect(
      score([
        'common-noun-001',
        'common-conjunction-001',
        'common-noun-002',
        'common-predicate-010-present',
      ]).finalDamage,
    ).toBe(10);
  });

  test('adds the scores of compound-object clauses', () => {
    expect(
      score([
        'common-noun-001',
        'common-verb-001-past',
        'common-noun-002',
        'common-conjunction-001',
        'red-folded-chairman-noun-001',
      ]).finalDamage,
    ).toBe(16);
  });

  test('scores front-because subordinate and main clauses separately', () => {
    expect(
      score([
        'common-conjunction-003',
        'common-noun-001',
        'common-predicate-010-present',
        'common-noun-002',
        'common-predicate-011-present',
      ]).finalDamage,
    ).toBe(16);
  });

  test('scores each extended front-because clause once before the main clause', () => {
    expect(
      score([
        'common-conjunction-003',
        'common-noun-001',
        'common-predicate-010-present',
        'common-conjunction-001',
        'common-noun-002',
        'common-predicate-011-present',
        'common-noun-003',
        'common-predicate-010-present',
      ]).finalDamage,
    ).toBe(21);
  });

  test('does not reuse an object relation after a shared-subject subordinate extension', () => {
    expect(
      score([
        'common-conjunction-003',
        'common-noun-001',
        'common-verb-010-present',
        'common-noun-002',
        'common-conjunction-001',
        'common-predicate-010-present',
        'common-noun-003',
        'common-predicate-010-present',
      ]).finalDamage,
    ).toBe(21);
  });

  test('an incomplete sentence deals zero damage and has no clause score', () => {
    const result = scoreBasicConstruction({
      analysis: analysis(['common-noun-001']),
      phrases: gameCatalog.phrases,
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
