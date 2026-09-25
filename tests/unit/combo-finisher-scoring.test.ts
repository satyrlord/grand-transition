import { describe, expect, test } from 'vitest';
import {
  basicScoringBalance,
  type BasicScoringBalance,
} from '../../src/content/basic-scoring-balance.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import {
  scoreComboFinisherConstruction,
  type ComboChainState,
} from '../../src/engine/combo-finisher-scoring.ts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter.ts';

const add = (id: string): GrammarStep => ({
  kind: 'phrase',
  phrase: prepareEnglishGrammarPhrase(
    gameCatalog.phrases.find((phrase) => phrase.id === id)!,
    englishGameLocale,
  ),
});
const analysis = (ids: readonly string[]) => {
  const result = englishGrammarAdapter.analyze({
    steps: [...ids.map(add), { kind: 'end' }],
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error(result.faults[0]!.code);
  return result.analysis;
};
const score = (
  ids: readonly string[],
  comboState: ComboChainState = {},
  weaknesses: readonly string[] = [],
  balance: BasicScoringBalance = basicScoringBalance,
) =>
  scoreComboFinisherConstruction({
    attackerPlayerId: 'player',
    attackerCharacterId: 'red-folded-chairman',
    comboState,
    analysis: analysis(ids),
    phrases: gameCatalog.phrases,
    defenderWeaknessTags: weaknesses,
    balance,
  });

describe('Hollywood Roast combos and finishers', () => {
  test('repeating the same noun in consecutive complete insults raises its combo', () => {
    const first = score(['common-noun-001', 'common-predicate-010-present']);
    const second = score(['common-noun-001', 'common-predicate-010-present'], first.comboState);
    expect(first.score.finalDamage).toBe(5);
    expect(second.score.finalDamage).toBe(10);
    expect(second.score.combo).toMatchObject({
      nounPhraseId: 'common-noun-001',
      chain: 2,
    });
  });

  test('the first screenshot scores all three modifiers and its finisher', () => {
    const result = score([
      'common-noun-048',
      'common-verb-024-past',
      'common-noun-013',
      'common-modifier-012',
      'common-modifier-009',
      'common-modifier-013',
      'common-ending-001',
    ]);
    expect(result.score.finalDamage).toBe(13);
  });

  test('modifier points receive weakness and noun combos before the finisher is added', () => {
    const first = score(['common-noun-001', 'common-predicate-010-present']);
    const result = score(
      [
        'common-noun-001',
        'common-predicate-010-present',
        'common-modifier-001',
        'common-ending-001',
      ],
      first.comboState,
      ['consistency'],
    );
    expect(result.score.finalDamage).toBe(30); // (5 + 2) * 2 * 2 + 2
    expect(result.comboState.player!.previousNounIds).toEqual(['common-noun-001']);
  });

  test('multiplies a transitive clause by both noun combo chains', () => {
    const prior: ComboChainState = {
      player: {
        previousNounIds: ['common-noun-001'],
        chainByNounId: { 'common-noun-001': 1 },
      },
    };
    const result = score(['common-noun-001', 'common-verb-010-present', 'common-noun-001'], prior);
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({ kind: 'combo-multiplier', factor: 4 }),
    );
  });

  test('adds a finisher after clause scoring and applies its weakness separately', () => {
    const result = score(
      ['common-noun-001', 'common-predicate-010-present', 'common-ending-001'],
      {},
      ['bureaucracy'],
    );
    expect(result.score.breakdown).toContainEqual({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: 'common-ending-001',
      amount: 4,
    });
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'weakness-match',
        defenderTag: 'bureaucracy',
        phraseId: 'common-ending-001',
      }),
    );
  });

  test('applies a restriction multiplier to a phrase that a scene or character owns', () => {
    const result = score(
      ['common-noun-001', 'common-predicate-010-present', 'red-folded-chairman-ending-001'],
      {},
      [],
      { ...basicScoringBalance, restrictedPhraseMultiplier: 2 },
    );
    expect(result.score.breakdown).toContainEqual({
      kind: 'restriction-multiplier',
      operation: 'note',
      phraseIds: ['red-folded-chairman-ending-001'],
      factor: 2,
    });
    expect(result.score.breakdown).toContainEqual({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: 'red-folded-chairman-ending-001',
      amount: 6,
    });
  });

  test('an incomplete insult clears that player combo chain', () => {
    const incomplete = englishGrammarAdapter.analyze({
      steps: [add('common-noun-001'), { kind: 'end' }],
      subjectNumber: 'singular',
      objectNumber: 'singular',
    });
    if (!incomplete.accepted) throw new Error('expected accepted end');
    const result = scoreComboFinisherConstruction({
      attackerPlayerId: 'player',
      attackerCharacterId: 'red-folded-chairman',
      comboState: {
        player: {
          previousNounIds: ['common-noun-001'],
          chainByNounId: { 'common-noun-001': 3 },
        },
      },
      analysis: incomplete.analysis,
      phrases: gameCatalog.phrases,
      defenderWeaknessTags: [],
      balance: basicScoringBalance,
    });
    expect(result.score.finalDamage).toBe(0);
    expect(result.comboState.player).toEqual({
      previousNounIds: [],
      chainByNounId: {},
    });
  });
});
