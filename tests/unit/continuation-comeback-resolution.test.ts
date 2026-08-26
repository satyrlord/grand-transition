import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import type { Phrase } from '../../src/content/schemas';
import {
  addComebackCharge,
  availableComebackTiers,
  comebackRules,
  resolveContinuationComebackRound,
  resolveContinuationStatus,
  selectComebackTier,
  type ComebackSelection,
  type ComebackTier,
  type ContinuationComebackPlayerInput,
} from '../../src/engine/continuation-comeback-resolution';
import type { ComboChainState } from '../../src/engine/combo-finisher-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarAnalysis,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';

const players = ['first-player', 'second-player'] as const;
const characters = sampleContent.characters;

function completeConstruction(): Readonly<{
  steps: readonly EnglishGrammarStep[];
  analysis: EnglishGrammarAnalysis;
  publicText: string;
}> {
  const phraseIds = ['national-consensus', 'before-the-next-election'] as const;
  const steps: readonly EnglishGrammarStep[] = phraseIds.map((phraseId) => ({
    kind: 'phrase',
    phrase: prepareEnglishGrammarPhrase(
      sampleContent.phrases.find((phrase) => phrase.id === phraseId)!,
      englishGameLocale,
    ),
  }));
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'plural',
  });
  if (!result.accepted) throw new Error('The test construction must be legal.');
  return {
    steps,
    analysis: result.analysis,
    publicText: result.analysis.publicText,
  };
}

function phrasesForDamage(damage: number): readonly Phrase[] {
  return sampleContent.phrases.map((phrase) => {
    if (phrase.id === 'national-consensus') {
      return { ...phrase, tags: ['neutral'] };
    }
    if (phrase.id === 'before-the-next-election') {
      return {
        ...phrase,
        customScores: [{ leftNounId: 'national-consensus', score: damage }],
        tags: ['neutral'],
      };
    }
    return phrase;
  });
}

function selection(tier: ComebackTier): ComebackSelection {
  const rule = comebackRules[tier];
  return {
    tier,
    ...rule,
    closingLineKey: `comeback.red-folded-chairman.${tier}`,
    closingLine:
      englishGameLocale.messages[`comeback.red-folded-chairman.${tier}`]!,
  };
}

function playerInput(
  index: 0 | 1,
  options: {
    readonly damage?: number;
    readonly carry?: boolean;
    readonly comeback?: ComebackTier | null;
    readonly charge?: number;
    readonly selfDamage?: number;
  } = {},
): ContinuationComebackPlayerInput {
  const construction = completeConstruction();
  const analysis = options.selfDamage
    ? {
        ...construction.analysis,
        resolution: {
          ...construction.analysis.resolution,
          selfDamageIntent: options.selfDamage,
        },
      }
    : construction.analysis;
  return {
    playerId: players[index],
    characterId: characters[index]!.id,
    construction: {
      ...construction,
      analysis,
      carryIntent: options.carry ?? false,
      selectedComeback:
        options.comeback === null || options.comeback === undefined
          ? null
          : selection(options.comeback),
    },
    comebackCharge: options.charge ?? 0,
    phrases: phrasesForDamage(options.damage ?? 0),
    defenderWeaknessTags: ['never-matches'],
    balance: basicScoringBalance,
  };
}

function resolve(
  first: ContinuationComebackPlayerInput,
  second: ContinuationComebackPlayerInput,
  comboState: ComboChainState = {},
) {
  return resolveContinuationComebackRound({
    players: [first, second],
    comboState,
  });
}

describe('continuation resolution', () => {
  test.each([0, 15])(
    'survives %i opponent damage and restores exact state facts once',
    (damage) => {
      const carrier = playerInput(0, { carry: true, selfDamage: 99 });
      const result = resolve(carrier, playerInput(1, { damage }));
      const resolved = result.players[players[0]]!;

      expect(resolved.outgoingDamage).toBe(0);
      expect(resolved.selfDamage).toBe(99);
      expect(resolved.continuation.status).toBe('survived');
      expect(resolved.continuation.restoredCarry).toEqual({
        steps: carrier.construction.steps,
        analysis: carrier.construction.analysis,
        publicText: carrier.construction.publicText,
      });
      expect(
        resolved.continuation.restoredCarry?.steps.some(
          (step) =>
            step.kind === 'phrase' && step.phrase.role === 'continuation',
        ),
      ).toBe(false);
      expect(result.comboState[players[0]]).toBeUndefined();
    },
  );

  test('breaks at 16 damage and clears only the carrier combo chains', () => {
    const comboState: ComboChainState = {
      [players[0]]: {
        previousNounIds: ['national-consensus'],
        chainByNounId: { 'national-consensus': 3 },
      },
      [players[1]]: {
        previousNounIds: ['televised-revolution'],
        chainByNounId: { 'televised-revolution': 2 },
      },
    };
    const result = resolve(
      playerInput(0, { carry: true }),
      playerInput(1, { damage: 16 }),
      comboState,
    );

    expect(result.players[players[0]]!.continuation).toEqual({
      status: 'broken',
      restoredCarry: null,
    });
    expect(result.comboState[players[0]]).toEqual({
      previousNounIds: [],
      chainByNounId: {},
    });
    expect(result.comboState[players[1]]!.previousNounIds).toEqual([
      'national-consensus',
    ]);
  });

  test('strong comeback breaks a carry through its 18 damage bonus', () => {
    expect(
      resolveContinuationStatus({
        carryIntent: true,
        opponentOutgoingDamage: 0,
      }),
    ).toBe('survived');
    const result = resolve(
      playerInput(0, { carry: true }),
      playerInput(1, { damage: 0, comeback: 'strong' }),
    );

    expect(result.players[players[0]]!.continuation.status).toBe('broken');
    expect(result.players[players[1]]!.sentenceDamage).toBe(0);
    expect(result.players[players[1]]!.outgoingDamage).toBe(18);
  });

  test('a later commit compares every restored noun with the last commit', () => {
    const comboState: ComboChainState = {
      [players[0]]: {
        previousNounIds: ['national-consensus'],
        chainByNounId: { 'national-consensus': 2 },
      },
    };
    const carried = resolve(
      playerInput(0, { carry: true }),
      playerInput(1),
      comboState,
    );
    expect(carried.comboState[players[0]]).toEqual(comboState[players[0]]);

    const committed = resolve(
      playerInput(0, { damage: 1 }),
      playerInput(1),
      carried.comboState,
    );
    expect(committed.players[players[0]]!.score?.combo).toEqual({
      nounPhraseId: 'national-consensus',
      phraseIndex: 0,
      chain: 3,
    });
  });
});

describe('comeback charge, selection, and scoring', () => {
  test.each([
    [0, []],
    [19, []],
    [20, ['weak']],
    [39, ['weak']],
    [40, ['weak', 'medium']],
    [59, ['weak', 'medium']],
    [60, ['weak', 'medium', 'strong']],
  ] as const)('exposes exact tiers at charge %i', (charge, tiers) => {
    expect(availableComebackTiers(charge)).toEqual(tiers);
  });

  test('caps received opponent damage at 60 and does not use self-damage', () => {
    expect(addComebackCharge(59, 50)).toBe(60);
    const result = resolve(
      playerInput(0, { charge: 19, selfDamage: 50 }),
      playerInput(1, { damage: 4 }),
    );
    expect(result.players[players[0]]!.comebackCharge).toBe(23);
  });

  test('applies received damage only after prior comeback spending', () => {
    const chosen = selectComebackTier({
      playerId: players[0],
      character: characters[0]!,
      tier: 'weak',
      phase: 'drafting',
      constructionComplete: true,
      selectedComeback: null,
      charge: 60,
      seed: 42,
      commandHistory: [],
      locale: englishGameLocale,
    });
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    const first = playerInput(0, { damage: 0, charge: chosen.charge });
    const result = resolve(
      {
        ...first,
        construction: {
          ...first.construction,
          selectedComeback: chosen.selection,
        },
      },
      playerInput(1, { damage: 30 }),
    );
    expect(result.players[players[0]]!.comebackCharge).toBe(60);
  });

  test.each([
    ['weak', 20, 4],
    ['medium', 40, 10],
    ['strong', 60, 18],
  ] as const)(
    '%s spends %i and adds %i after sentence scoring',
    (tier, cost, bonus) => {
      const chosen = selectComebackTier({
        playerId: players[0],
        character: characters[0]!,
        tier,
        phase: 'drafting',
        constructionComplete: true,
        selectedComeback: null,
        charge: cost,
        seed: 42,
        locale: englishGameLocale,
      });
      expect(chosen.ok).toBe(true);
      if (!chosen.ok) return;
      expect(chosen.charge).toBe(0);
      expect(chosen.selection.damageBonus).toBe(bonus);

      const result = resolve(
        {
          ...playerInput(0, { damage: 7 }),
          construction: {
            ...playerInput(0, { damage: 7 }).construction,
            selectedComeback: chosen.selection,
          },
        },
        playerInput(1),
      );
      expect(result.players[players[0]]!.sentenceDamage).toBe(7);
      expect(result.players[players[0]]!.outgoingDamage).toBe(7 + bonus);
    },
  );

  test('reproduces the closing line and keeps it outside grammar and combos', () => {
    const request = {
      playerId: players[0],
      character: characters[0]!,
      tier: 'medium' as const,
      phase: 'drafting',
      constructionComplete: true,
      selectedComeback: null,
      charge: 60,
      seed: 93,
      commandHistory: [
        {
          type: 'commit-sentence',
          source: 'user' as const,
          actorId: players[1],
          payload: {},
        },
      ],
      locale: englishGameLocale,
    };
    const first = selectComebackTier(request);
    const repeated = selectComebackTier(request);
    expect(first).toEqual(repeated);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const without = resolve(playerInput(0, { damage: 5 }), playerInput(1));
    const withLineInput = playerInput(0, { damage: 5 });
    const withLine = resolve(
      {
        ...withLineInput,
        construction: {
          ...withLineInput.construction,
          selectedComeback: first.selection,
        },
      },
      playerInput(1),
    );
    expect(withLine.players[players[0]]!.score?.combo).toEqual(
      without.players[players[0]]!.score?.combo,
    );
    expect(withLineInput.construction.analysis).toEqual(
      playerInput(0, { damage: 5 }).construction.analysis,
    );
    expect(withLine.players[players[0]]!.closingLine).toBe(
      'Your mandate has been postponed for lack of substance.',
    );
  });

  test.each([
    ['wrong-phase', { phase: 'resolution' }],
    ['sentence-incomplete', { constructionComplete: false }],
    ['comeback-already-selected', { selectedComeback: selection('weak') }],
    ['comeback-unaffordable', { charge: 19 }],
  ] as const)(
    'returns %s without changing charge or seed',
    (code, overrides) => {
      const result = selectComebackTier({
        playerId: players[0],
        character: characters[0]!,
        tier: 'weak',
        phase: 'drafting',
        constructionComplete: true,
        selectedComeback: null,
        charge: 20,
        seed: 42,
        locale: englishGameLocale,
        ...overrides,
      });
      expect(result).toEqual({
        ok: false,
        error: {
          kind: 'rule-error',
          code,
          facts: {
            playerId: players[0],
            tier: 'weak',
            charge: 'charge' in overrides ? overrides.charge : 20,
          },
        },
      });
      expect('nextSeed' in result).toBe(false);
    },
  );
});
