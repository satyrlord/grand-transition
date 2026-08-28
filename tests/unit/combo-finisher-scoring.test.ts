import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  scoreComboFinisherConstruction,
  type ComboChainState,
} from '../../src/engine/combo-finisher-scoring';
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
    attackerCharacterId: 'red-folded-chairman',
    comboState,
    analysis: analysis(ids),
    phrases: sampleContent.phrases,
    defenderWeaknessTags: weaknesses,
    balance: basicScoringBalance,
  });

describe('Hollywood Roast combos and finishers', () => {
  test('repeating the same noun in consecutive complete insults raises its combo', () => {
    const first = score(['national-consensus', 'belongs-in-a-party-museum']);
    const second = score(
      ['national-consensus', 'belongs-in-a-party-museum'],
      first.comboState,
    );
    expect(first.score.finalDamage).toBe(1);
    expect(second.score.finalDamage).toBe(2);
    expect(second.score.combo).toMatchObject({
      nounPhraseId: 'national-consensus',
      chain: 2,
    });
  });

  test('multiplies a transitive clause by both noun combo chains', () => {
    const prior: ComboChainState = {
      player: {
        previousNounIds: ['national-consensus'],
        chainByNounId: { 'national-consensus': 1 },
      },
    };
    const result = score(
      ['national-consensus', 'repackages', 'national-consensus'],
      prior,
    );
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({ kind: 'combo-multiplier', factor: 4 }),
    );
  });

  test('adds a finisher after clause scoring and applies its weakness separately', () => {
    const result = score(
      [
        'national-consensus',
        'belongs-in-a-party-museum',
        'by-emergency-ordinance',
      ],
      {},
      ['bureaucracy'],
    );
    expect(result.score.breakdown).toContainEqual({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: 'by-emergency-ordinance',
      amount: 4,
    });
    expect(result.score.breakdown).toContainEqual(
      expect.objectContaining({
        kind: 'weakness-match',
        defenderTag: 'bureaucracy',
        phraseId: 'by-emergency-ordinance',
      }),
    );
  });

  test('an incomplete insult clears that player combo chain', () => {
    const incomplete = englishGrammarAdapter.analyze({
      steps: [add('national-consensus'), { kind: 'end' }],
      subjectNumber: 'singular',
      objectNumber: 'singular',
    });
    if (!incomplete.accepted) throw new Error('expected accepted end');
    const result = scoreComboFinisherConstruction({
      attackerPlayerId: 'player',
      attackerCharacterId: 'red-folded-chairman',
      comboState: {
        player: {
          previousNounIds: ['national-consensus'],
          chainByNounId: { 'national-consensus': 3 },
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
