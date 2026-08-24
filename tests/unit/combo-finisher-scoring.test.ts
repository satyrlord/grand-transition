import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import {
  scoreComboFinisherConstruction,
  type ComboChainState,
} from '../../src/engine/combo-finisher-scoring';
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
) =>
  scoreComboFinisherConstruction({
    attackerPlayerId: 'player',
    attackerCharacterId: 'civic-fox',
    comboState,
    analysis: analysis(ids),
    phrases: sampleContent.phrases,
    defenderWeaknessTags: weaknesses,
    balance: basicScoringBalance,
  });

describe('Hollywood Roast combos and finishers', () => {
  test('repeating the same noun in consecutive complete insults raises its combo', () => {
    const first = score(['paper-promise', 'before-lunch']);
    const second = score(['paper-promise', 'before-lunch'], first.comboState);
    expect(first.score.finalDamage).toBe(5);
    expect(second.score.finalDamage).toBe(10);
    expect(second.score.combo).toMatchObject({
      nounPhraseId: 'paper-promise',
      chain: 2,
    });
  });

  test('multiplies a transitive clause by both noun combo chains', () => {
    const prior: ComboChainState = {
      player: {
        previousNounIds: ['paper-promise'],
        chainByNounId: { 'paper-promise': 1 },
      },
    };
    const result = score(['paper-promise', 'folds', 'paper-promise'], prior);
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({ kind: 'combo-multiplier', factor: 4 }),
    );
  });

  test('adds a finisher after clause scoring and applies its weakness separately', () => {
    const result = score(
      ['paper-promise', 'before-lunch', 'with-the-receipt'],
      {},
      ['paperwork'],
    );
    expect(result.score.breakdown).toContainEqual({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: 'with-the-receipt',
      amount: 4,
    });
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'weakness-match',
        defenderTag: 'paperwork',
        phraseId: 'with-the-receipt',
      }),
    );
  });

  test('an incomplete insult clears that player combo chain', () => {
    const incomplete = englishGrammarAdapter.analyze({
      steps: [add('paper-promise'), { kind: 'end' }],
      subjectNumber: 'singular',
      objectNumber: 'singular',
    });
    if (!incomplete.accepted) throw new Error('expected accepted end');
    const result = scoreComboFinisherConstruction({
      attackerPlayerId: 'player',
      attackerCharacterId: 'civic-fox',
      comboState: {
        player: {
          previousNounIds: ['paper-promise'],
          chainByNounId: { 'paper-promise': 3 },
        },
      },
      analysis: incomplete.analysis,
      phrases: sampleContent.phrases,
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
