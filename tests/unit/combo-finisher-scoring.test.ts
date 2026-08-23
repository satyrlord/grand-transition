import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import type { Phrase } from '../../src/content/schemas';
import {
  replayComboFinisherBreakdown,
  scoreComboFinisherConstruction,
  type ComboChainState,
} from '../../src/engine/combo-finisher-scoring';
import { validateFinisherSelection } from '../../src/engine/finisher-rules';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarAnalysis,
  type EnglishGrammarStep,
  type GrammaticalNumber,
} from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const playerId = 'first-player';
const characterId = 'civic-fox';

function clonePhrase(
  sourceId: string,
  id: string,
  overrides: Partial<Phrase> = {},
): Phrase {
  const source = sampleContent.phrases.find((phrase) => phrase.id === sourceId);
  if (!source) throw new Error(`Missing test phrase "${sourceId}".`);
  return { ...structuredClone(source), id, ...overrides };
}

function analyze(
  phraseIds: readonly string[],
  phrases: readonly Phrase[] = sampleContent.phrases,
  subjectNumber: GrammaticalNumber = 'singular',
): EnglishGrammarAnalysis {
  const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]));
  const steps: EnglishGrammarStep[] = phraseIds.map((phraseId) => {
    const phrase = phraseById.get(phraseId);
    if (!phrase) throw new Error(`Missing test phrase "${phraseId}".`);
    return {
      kind: 'phrase',
      phrase: prepareEnglishGrammarPhrase(phrase, englishGameLocale),
    };
  });
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber,
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error(JSON.stringify(result.faults));
  return result.analysis;
}

function analyzeInvalid(): EnglishGrammarAnalysis {
  const noun = sampleContent.phrases.find(
    (phrase) => phrase.id === 'paper-promise',
  )!;
  const fault = sampleContent.phrases.find(
    (phrase) => phrase.id === 'velvet-megaphone',
  )!;
  const result = englishGrammarAdapter.analyze({
    steps: [
      {
        kind: 'phrase',
        phrase: prepareEnglishGrammarPhrase(noun, englishGameLocale),
      },
      {
        kind: 'deliberate-fault',
        sourcePhrase: prepareEnglishGrammarPhrase(fault, englishGameLocale),
      },
    ],
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });
  if (!result.accepted) throw new Error(JSON.stringify(result.faults));
  return result.analysis;
}

function score(
  analysis: EnglishGrammarAnalysis,
  comboState: ComboChainState = {},
  options: {
    readonly attackerPlayerId?: string;
    readonly attackerCharacterId?: string;
    readonly phrases?: readonly Phrase[];
    readonly defenderWeaknessTags?: readonly string[];
  } = {},
) {
  return scoreComboFinisherConstruction({
    attackerPlayerId: options.attackerPlayerId ?? playerId,
    attackerCharacterId: options.attackerCharacterId ?? characterId,
    comboState,
    analysis,
    phrases: options.phrases ?? sampleContent.phrases,
    defenderWeaknessTags: options.defenderWeaknessTags ?? [],
    balance: basicScoringBalance,
  });
}

function expectSuccess(result: ReturnType<typeof score>) {
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result;
}

describe('exact-noun combo chains', () => {
  test('grows from 1 through 4 and resets on absence, invalidity, and incompleteness', () => {
    let comboState: ComboChainState = {};
    const factors: number[] = [];
    for (let count = 1; count <= 4; count += 1) {
      const result = expectSuccess(
        score(analyze(['paper-promise', 'before-lunch']), comboState),
      );
      comboState = result.comboState;
      factors.push(result.score.combo!.chain);
    }
    expect(factors).toEqual([1, 2, 3, 4]);

    let result = expectSuccess(
      score(analyze(['velvet-megaphone', 'before-lunch']), comboState),
    );
    comboState = result.comboState;
    expect(comboState[playerId]!.chainByNounId['paper-promise']).toBe(1);
    result = expectSuccess(
      score(analyze(['paper-promise', 'before-lunch']), comboState),
    );
    expect(result.score.combo!.chain).toBe(1);

    result = expectSuccess(score(analyzeInvalid(), result.comboState));
    expect(result.comboState[playerId]).toEqual({
      previousNounIds: [],
      chainByNounId: {},
    });
    result = expectSuccess(
      score(analyze(['paper-promise']), result.comboState),
    );
    expect(result.score.finalDamage).toBe(0);
    expect(result.comboState[playerId]).toEqual({
      previousNounIds: [],
      chainByNounId: {},
    });
  });

  test('keeps player chains isolated', () => {
    const analysis = analyze(['paper-promise', 'before-lunch']);
    const first = expectSuccess(score(analysis));
    const second = expectSuccess(
      score(analysis, first.comboState, { attackerPlayerId: 'second-player' }),
    );
    const firstAgain = expectSuccess(score(analysis, second.comboState));

    expect(second.score.combo!.chain).toBe(1);
    expect(firstAgain.score.combo!.chain).toBe(2);
    expect(firstAgain.comboState['second-player']!.chainByNounId).toEqual({
      'paper-promise': 1,
    });
  });

  test('uses exact IDs across identical text and keeps number forms on one chain', () => {
    const twin = clonePhrase('paper-promise', 'paper-promise-twin');
    const phrases = [...sampleContent.phrases, twin];
    const first = expectSuccess(
      score(
        analyze(['paper-promise', 'before-lunch'], phrases),
        {},
        { phrases },
      ),
    );
    const twinResult = expectSuccess(
      score(
        analyze(['paper-promise-twin', 'before-lunch'], phrases),
        first.comboState,
        { phrases },
      ),
    );
    expect(twinResult.score.combo).toEqual({
      nounPhraseId: 'paper-promise-twin',
      phraseIndex: 0,
      chain: 1,
    });

    const singular = expectSuccess(
      score(
        analyze(['paper-promise', 'before-lunch'], phrases),
        {},
        { phrases },
      ),
    );
    const plural = expectSuccess(
      score(
        analyze(['paper-promise', 'before-lunch'], phrases, 'plural'),
        singular.comboState,
        { phrases },
      ),
    );
    expect(plural.score.combo!.chain).toBe(2);
  });

  test('counts repeated nouns once and selects the earliest tied highest chain', () => {
    const repeated = expectSuccess(
      score(analyze(['paper-promise', 'folds', 'paper-promise']), {
        [playerId]: {
          previousNounIds: ['paper-promise'],
          chainByNounId: { 'paper-promise': 1 },
        },
      }),
    );
    expect(repeated.score.combo).toEqual({
      nounPhraseId: 'paper-promise',
      phraseIndex: 0,
      chain: 2,
    });

    const tied = expectSuccess(
      score(analyze(['paper-promise', 'folds', 'velvet-megaphone']), {
        [playerId]: {
          previousNounIds: ['paper-promise', 'velvet-megaphone'],
          chainByNounId: {
            'paper-promise': 2,
            'velvet-megaphone': 2,
          },
        },
      }),
    );
    expect(tied.score.combo).toEqual({
      nounPhraseId: 'paper-promise',
      phraseIndex: 0,
      chain: 3,
    });
    expect(
      tied.score.breakdown.filter((item) => item.kind === 'combo-multiplier'),
    ).toHaveLength(1);
  });
});

describe('finishers and ordered scoring', () => {
  test('commits a legal ending and applies its bonus before both multipliers', () => {
    const analysis = analyze([
      'paper-promise',
      'before-lunch',
      'with-the-receipt',
    ]);
    expect(analysis.state).toBe('ENDED');
    expect(analysis.resolution.constructionEnded).toBe(true);

    const result = expectSuccess(
      score(
        analysis,
        {
          [playerId]: {
            previousNounIds: ['paper-promise'],
            chainByNounId: { 'paper-promise': 1 },
          },
        },
        { defenderWeaknessTags: ['empty-promise'] },
      ),
    );
    expect(result.score.breakdown.map((item) => item.kind)).toEqual([
      'base-phrase',
      'base-phrase',
      'base-phrase',
      'length-bonus',
      'directness-bonus',
      'finisher-bonus',
      'weakness-match',
      'weakness-match',
      'weakness-match',
      'weakness-multiplier',
      'combo-chain',
      'combo-multiplier',
      'unrounded-total',
      'final-damage',
    ]);
    expect(result.score.unroundedTotal).toBe(40);
    expect(result.score.finalDamage).toBe(40);
    expect(replayComboFinisherBreakdown(result.score.breakdown)).toEqual({
      unroundedTotal: 40,
      finalDamage: 40,
    });
  });

  test('adds a visible zero for an ending without a configured bonus', () => {
    const plainEnding = clonePhrase('with-the-receipt', 'plain-ending', {
      finisherBonus: undefined,
    });
    const phrases = [...sampleContent.phrases, plainEnding];
    const result = expectSuccess(
      score(
        analyze(['paper-promise', 'before-lunch', 'plain-ending'], phrases),
        {},
        { phrases },
      ),
    );
    expect(
      result.score.breakdown.find((item) => item.kind === 'finisher-bonus'),
    ).toEqual({
      kind: 'finisher-bonus',
      operation: 'add',
      phraseId: 'plain-ending',
      amount: 0,
    });
  });

  test('returns typed premature and wrong-owner failures without state changes', () => {
    const ownedEnding = clonePhrase('with-the-receipt', 'owned-ending', {
      characterIds: [characterId],
    });
    const wrongOwnerEnding = clonePhrase(
      'with-the-receipt',
      'wrong-owner-ending',
      { characterIds: ['brass-peacock'] },
    );
    expect(
      validateFinisherSelection({
        analysisBeforeSelection: analyze(['paper-promise']),
        attackerCharacterId: characterId,
        finisher: ownedEnding,
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'finisher-premature',
        facts: {
          attackerCharacterId: characterId,
          finisherPhraseId: 'owned-ending',
        },
      },
    });
    expect(
      validateFinisherSelection({
        analysisBeforeSelection: analyze(['paper-promise', 'before-lunch']),
        attackerCharacterId: characterId,
        finisher: wrongOwnerEnding,
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'finisher-wrong-owner',
        facts: {
          attackerCharacterId: characterId,
          finisherPhraseId: 'wrong-owner-ending',
        },
      },
    });

    const phrases = [...sampleContent.phrases, wrongOwnerEnding];
    const comboState: ComboChainState = {
      [playerId]: {
        previousNounIds: ['paper-promise'],
        chainByNounId: { 'paper-promise': 3 },
      },
    };
    const scoreResult = score(
      analyze(['paper-promise', 'before-lunch', 'wrong-owner-ending'], phrases),
      comboState,
      { phrases },
    );
    expect(scoreResult).toEqual({
      ok: false,
      error: {
        kind: 'rule-error',
        code: 'finisher-wrong-owner',
        facts: {
          attackerCharacterId: characterId,
          finisherPhraseId: 'wrong-owner-ending',
        },
      },
      comboState,
    });
  });
});
