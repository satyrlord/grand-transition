import { describe, expect, test } from 'vitest';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  createDraftReducer,
  prepareDraftRound,
  snapshotDraftStateForPlayer,
  type DraftCardReference,
  type DraftCommand,
  type DraftEngineContext,
  type DraftRoundPreparationRequest,
  type DraftState,
} from '../../src/engine/draft-actions';
import {
  seededRandomSource,
  type RandomSource,
} from '../../src/engine/random-source';
import {
  generatePrivateHand,
  privateHandAvailableCount,
  privateHandCandidateWeight,
  type PrivateHandGenerationResult,
  type PrivateHandGenerationRequest,
} from '../../src/engine/private-hand-generation';
import { prepareEnglishGrammarPhrase } from '../../src/engine/grammar/english-grammar-adapter';

const playerIds = ['first-player', 'second-player'] as const;
const context: DraftEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
};

function request(charge = 0): DraftRoundPreparationRequest {
  const scene = sampleContent.scenes[0]!;
  return {
    schemaVersion: 1,
    mode: 'test',
    round: 1,
    seed: 2_026_082_3,
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
    phrases: sampleContent.phrases,
    characters: sampleContent.characters,
    locale: englishGameLocale,
    players: [
      {
        playerId: playerIds[0],
        characterId: sampleContent.characters[0]!.id,
        characterPhraseIds: sampleContent.characters[0]!.characterPhraseIds,
        weaknessTags: sampleContent.characters[0]!.weaknessTags,
        subjectNumber: 'singular',
        objectNumber: 'singular',
        comebackCharge: charge,
      },
      {
        playerId: playerIds[1],
        characterId: sampleContent.characters[1]!.id,
        characterPhraseIds: sampleContent.characters[1]!.characterPhraseIds,
        weaknessTags: sampleContent.characters[1]!.weaknessTags,
        subjectNumber: 'singular',
        objectNumber: 'singular',
        comebackCharge: 0,
      },
    ],
    timerSeconds: 30,
  };
}

function prepared(charge = 0): DraftState {
  const result = prepareDraftRound(request(charge));
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function run(state: DraftState, command: DraftCommand): DraftState {
  const result = createDraftReducer(context)(
    state,
    command,
    seededRandomSource,
  );
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function withPrivateCard(
  state: DraftState,
  playerId: string,
  phraseId: string,
  suffix: string,
): readonly [DraftState, DraftCardReference] {
  const card = { id: `test-${suffix}`, phraseId };
  return [
    {
      ...state,
      playerStates: {
        ...state.playerStates,
        [playerId]: {
          ...state.playerStates[playerId]!,
          hand: [...state.playerStates[playerId]!.hand, card],
        },
      },
    },
    { source: 'private', cardId: card.id },
  ];
}

function select(
  state: DraftState,
  actorId: string,
  card: DraftCardReference,
): DraftState {
  return run(state, {
    type: 'select-phrase',
    source: 'user',
    actorId,
    payload: { card },
  });
}

function selectPrivate(
  state: DraftState,
  actorId: string,
  phraseId: string,
  suffix: string,
): DraftState {
  const [withCard, reference] = withPrivateCard(
    state,
    actorId,
    phraseId,
    suffix,
  );
  return select(withCard, actorId, reference);
}

function passWithValidCard(state: DraftState, playerId: string): DraftState {
  const reference = state.playerStates[playerId]!.legalCards.find((card) => {
    const phraseId =
      card.source === 'shared'
        ? state.board.slots.find((slot) => slot.id === card.cardId)!.phraseId
        : state.playerStates[playerId]!.hand.find(
            (item) => item.id === card.cardId,
          )!.phraseId;
    const role = sampleContent.phrases.find(
      (phrase) => phrase.id === phraseId,
    )!.role;
    return role !== 'continuation' && role !== 'ending';
  });
  return select(state, playerId, reference!);
}

function completeFirst(state = prepared()): DraftState {
  state = selectPrivate(state, playerIds[0], 'national-consensus', 'subject');
  state = passWithValidCard(state, playerIds[1]);
  state = selectPrivate(
    state,
    playerIds[0],
    'belongs-in-a-party-museum',
    'predicate',
  );
  return state;
}

describe('Hollywood Roast draft actions', () => {
  test('uses phrase rarity as draw weight and reports an impossible hand', () => {
    expect(
      privateHandCandidateWeight(
        sampleContent.phrases.find((phrase) => phrase.rarity === 'common')!,
      ),
    ).toBe(4);
    expect(
      privateHandCandidateWeight(
        sampleContent.phrases.find((phrase) => phrase.rarity === 'uncommon')!,
      ),
    ).toBe(2);
    expect(
      privateHandCandidateWeight(
        sampleContent.phrases.find((phrase) => phrase.rarity === 'rare')!,
      ),
    ).toBe(1);

    const base = request();
    const handRequest: PrivateHandGenerationRequest = {
      seed: 1,
      playerId: playerIds[0],
      characterId: base.players[0].characterId,
      sceneId: base.sceneId,
      phrases: [sampleContent.phrases[0]!],
      characterPhraseIds: [],
      scenePhraseIds: [sampleContent.phrases[0]!.id],
      generalPhraseIds: [sampleContent.phrases[0]!.id],
      excludedPhraseIds: [
        sampleContent.phrases[0]!.id,
        sampleContent.phrases[0]!.id,
        sampleContent.phrases[0]!.id,
      ],
    };
    expect(generatePrivateHand(handRequest)).toMatchObject({
      ok: false,
      error: { code: 'impossible-private-hand' },
    });
  });

  test('never repeats a phrase identifier within a private hand', () => {
    const base = request();
    const handRequest: PrivateHandGenerationRequest = {
      seed: 0,
      playerId: playerIds[0],
      characterId: base.players[0].characterId,
      sceneId: base.sceneId,
      phrases: sampleContent.phrases,
      characterPhraseIds: base.players[0].characterPhraseIds,
      scenePhraseIds: base.scenePhraseIds,
      generalPhraseIds: base.generalPhraseIds,
    };

    for (let seed = 0; seed < 250; seed += 1) {
      const result = generatePrivateHand({ ...handRequest, seed });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(
        new Set(result.hand.phraseIds),
        `duplicate private phrase at seed ${seed}`,
      ).toHaveLength(2);
    }
  });

  test('uses the forced connector roll and the 25 percent contrast replacement', () => {
    const base = request();
    const handRequest: PrivateHandGenerationRequest = {
      seed: 1,
      playerId: playerIds[0],
      characterId: base.players[0].characterId,
      sceneId: base.sceneId,
      phrases: sampleContent.phrases,
      characterPhraseIds: [],
      scenePhraseIds: base.scenePhraseIds,
      generalPhraseIds: base.generalPhraseIds,
    };
    const scripted = (values: readonly number[]): RandomSource => {
      let index = 0;
      return {
        next(seed) {
          const value = values[index] ?? 0;
          index += 1;
          return { value, nextSeed: seed + 1 };
        },
      };
    };
    const butHand = generatePrivateHand(
      handRequest,
      scripted([0.1, 0.1, 0, 0]),
    );
    const andHand = generatePrivateHand(
      handRequest,
      scripted([0.1, 0.9, 0, 0]),
    );
    const boundaryHand = generatePrivateHand(
      handRequest,
      scripted([0.1, 0.25, 0, 0]),
    );
    const connectorKindIn = (result: PrivateHandGenerationResult) => {
      expect(result.ok).toBe(true);
      if (!result.ok) return undefined;
      return sampleContent.phrases.find(
        (phrase) =>
          result.hand.phraseIds.includes(phrase.id) &&
          phrase.role === 'conjunction',
      )?.connectorKind;
    };
    expect(['but', 'yet']).toContain(connectorKindIn(butHand));
    expect(connectorKindIn(andHand)).toBe('and');
    expect(connectorKindIn(boundaryHand)).toBe('and');

    const restrictedPhrase = {
      ...sampleContent.phrases.find(
        (phrase) => phrase.id === 'national-salvation-committee',
      )!,
      characterIds: ['red-folded-chairman'],
    };
    const restrictedRequest = {
      ...handRequest,
      phrases: sampleContent.phrases.map((phrase) =>
        phrase.id === restrictedPhrase.id ? restrictedPhrase : phrase,
      ),
    };
    expect(privateHandAvailableCount(restrictedRequest)).toBeLessThan(
      privateHandAvailableCount({
        ...restrictedRequest,
        characterPhraseIds: ['national-salvation-committee'],
      }),
    );
  });

  test('deals both private hands before the common board and reproduces the fixed deal', () => {
    const state = prepared();
    const repeated = prepared();
    expect(state.board.slots).toHaveLength(9);
    expect(state.playerStates[playerIds[0]]!.hand).toHaveLength(2);
    expect(state.playerStates[playerIds[1]]!.hand).toHaveLength(2);
    expect(
      new Set(state.board.slots.map((slot) => slot.phraseId)),
    ).toHaveLength(9);
    for (const playerId of playerIds) {
      expect(
        new Set(
          state.playerStates[playerId]!.hand.map((card) => card.phraseId),
        ),
      ).toHaveLength(2);
    }
    const roundPhraseIds = [
      ...playerIds.flatMap((playerId) =>
        state.playerStates[playerId]!.hand.map((card) => card.phraseId),
      ),
      ...state.board.slots.map((slot) => slot.phraseId),
    ];
    expect(roundPhraseIds).toHaveLength(13);
    expect(new Set(roundPhraseIds)).toHaveLength(13);
    expect(state.reservedPhraseIds).toEqual(roundPhraseIds);
    expect(repeated.reservedPhraseIds).toEqual(state.reservedPhraseIds);
    expect(repeated.seed).toBe(state.seed);
    expect(state.turn.durationSeconds).toBe(30);

    const next = prepareDraftRound({
      ...request(),
      round: 2,
      previousOpeningPlayerId: state.openingPlayerId,
    });
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.state.openingPlayerId).toBe(playerIds[1]);
  });

  test('keeps every starting board and hand phrase unique across seeded deals', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      const result = prepareDraftRound({ ...request(), seed });
      expect(
        result.ok,
        result.ok ? undefined : `seed ${seed}: ${JSON.stringify(result.error)}`,
      ).toBe(true);
      if (!result.ok) continue;
      expect(
        new Set(result.state.reservedPhraseIds),
        `duplicate round phrase at seed ${seed}`,
      ).toHaveLength(13);
      expect(result.state.reservedPhraseIds).toHaveLength(13);
    }
  });

  test('lets either player take every available common-board card', () => {
    const state = prepared();
    const slot = state.board.slots.find((candidate) => candidate.available)!;
    const reference = { source: 'shared', cardId: slot.id } as const;
    expect(() => select(state, playerIds[0], reference)).not.toThrow();
  });

  test('accepts noun and noun as an early conjunction-denial sequence', () => {
    let state = prepared();
    state = selectPrivate(
      state,
      playerIds[0],
      'televised-revolution',
      'noun-one',
    );
    state = passWithValidCard(state, playerIds[1]);
    state = selectPrivate(
      state,
      playerIds[0],
      'coalition-and',
      'coalition-and',
    );
    state = passWithValidCard(state, playerIds[1]);
    state = selectPrivate(
      state,
      playerIds[0],
      'national-salvation-committee',
      'noun-two',
    );

    expect(state.playerStates[playerIds[0]]!.construction).toMatchObject({
      grammarMistakes: 0,
      analysis: {
        state: 'SUBJECT_READY',
        complete: false,
        agreement: { subject: 'plural' },
      },
    });
  });

  test('consumes a wrong card, records one grammar mistake, preserves the sentence, and passes the pick', () => {
    const initial = prepared();
    const selected = selectPrivate(
      initial,
      playerIds[0],
      'before-the-next-election',
      'wrong-predicate',
    );
    const construction = selected.playerStates[playerIds[0]]!.construction;
    expect(construction.steps).toEqual([]);
    expect(construction.grammarMistakes).toBe(1);
    expect(construction.lastGrammarMistakePhraseId).toBe(
      'before-the-next-election',
    );
    expect(selected.activePlayerId).toBe(playerIds[1]);
  });

  test('accepts a modifier after a complete clause without ending construction', () => {
    let state = completeFirst();
    state = selectPrivate(
      state,
      playerIds[1],
      'televised-revolution',
      'other-subject',
    );
    state = selectPrivate(
      state,
      playerIds[0],
      'before-the-next-election',
      'modifier',
    );

    expect(state.playerStates[playerIds[0]]!.construction).toMatchObject({
      status: 'building',
      grammarMistakes: 0,
      lastGrammarMistakePhraseId: null,
      analysis: {
        complete: true,
        publicText:
          'A national consensus belongs in a history museum before the next election',
        nextRoles: ['modifier', 'conjunction', 'ending'],
      },
    });
  });

  test('selecting a continuation at any point carries the current fragment and ends that player for the round', () => {
    const selected = selectPrivate(
      prepared(),
      playerIds[0],
      'ellipsis',
      'continuation',
    );
    expect(selected.playerStates[playerIds[0]]!.construction).toMatchObject({
      status: 'ended',
      carryIntent: true,
      analysis: { complete: false },
    });
  });

  test('ending an incomplete sentence is allowed and scores as incomplete', () => {
    const state = run(prepared(), {
      type: 'commit-sentence',
      source: 'user',
      actorId: playerIds[0],
      payload: {},
    });
    expect(state.playerStates[playerIds[0]]!.construction).toMatchObject({
      status: 'ended',
      analysis: { complete: false, sentenceStatus: 'incomplete' },
    });
  });

  test('a finisher ends a complete sentence as soon as it is selected', () => {
    let state = completeFirst();
    state = passWithValidCard(state, playerIds[1]);
    state = selectPrivate(
      state,
      playerIds[0],
      'by-emergency-ordinance',
      'finisher',
    );
    expect(state.playerStates[playerIds[0]]!.construction.status).toBe('ended');
  });

  test('a comeback uses the strongest filled tier and ends the sentence', () => {
    let state = completeFirst(prepared(60));
    state = passWithValidCard(state, playerIds[1]);
    state = run(state, {
      type: 'select-comeback',
      source: 'user',
      actorId: playerIds[0],
      payload: {},
    });
    expect(state.playerStates[playerIds[0]]!.construction).toMatchObject({
      status: 'ended',
      selectedComebackTier: 'strong',
    });
    expect(state.playerStates[playerIds[0]]!.construction.previewText).toMatch(
      /\. And you have a servile mentality\.$/u,
    );
    expect(
      state.playerStates[playerIds[0]]!.construction.analysis.publicText,
    ).not.toContain('And you have a servile mentality');
    expect(state.playerStates[playerIds[0]]!.comebackCharge).toBe(0);
  });

  test('redraw replaces both hand cards once without passing the pick', () => {
    const initial = prepared();
    const reservedPhraseIds = new Set(initial.reservedPhraseIds);
    const redrawCommand = {
      type: 'redraw-hand',
      source: 'user',
      actorId: playerIds[0],
      payload: {},
    } as const;
    const redrawn = run(initial, redrawCommand);
    expect(redrawn.activePlayerId).toBe(playerIds[0]);
    expect(redrawn.playerStates[playerIds[0]]!.redrawUsed).toBe(true);
    expect(redrawn.playerStates[playerIds[0]]!.hand).toHaveLength(2);
    expect(
      redrawn.playerStates[playerIds[0]]!.hand.every(
        (card) => !reservedPhraseIds.has(card.phraseId),
      ),
    ).toBe(true);
    expect(redrawn.reservedPhraseIds).toHaveLength(
      initial.reservedPhraseIds.length + 2,
    );
    expect(
      createDraftReducer(context)(redrawn, redrawCommand, seededRandomSource),
    ).toMatchObject({
      ok: false,
      error: { code: 'redraw-already-used' },
    });
  });

  test('a timeout passes the pick while both players are building', () => {
    const state = run(prepared(), {
      type: 'expire-turn',
      source: 'user',
      actorId: playerIds[0],
      payload: {},
    });
    expect(state.activePlayerId).toBe(playerIds[1]);
    expect(state.playerStates[playerIds[0]]!.timeoutDamage).toBe(0);
    expect(state.playerStates[playerIds[0]]!.construction.status).toBe(
      'building',
    );
  });

  test('timeouts after the opponent ends deal 3, 6, 12, and 24', () => {
    let state = prepared();
    state = selectPrivate(state, playerIds[0], 'ellipsis', 'first-carry');
    const expectations = [3, 9, 21, 45];
    for (const expected of expectations) {
      state = run(state, {
        type: 'expire-turn',
        source: 'user',
        actorId: playerIds[1],
        payload: {},
      });
      expect(state.playerStates[playerIds[1]]!.timeoutDamage).toBe(expected);
    }
  });

  test('opponent snapshots hide the hand but expose its accepted public text', () => {
    const state = selectPrivate(
      prepared(),
      playerIds[0],
      'national-consensus',
      'public-subject',
    );
    const snapshot = snapshotDraftStateForPlayer(state, playerIds[1]);
    expect(snapshot.players[playerIds[0]]!.hand).toEqual({ count: 2 });
    expect(snapshot.players[playerIds[0]]!.legalCards).toEqual([]);
    expect(snapshot.players[playerIds[0]]!.construction.previewText).toBe(
      'A national consensus',
    );
  });

  test('restores an exact continuation and rejects tampered or illegal carry data', () => {
    const completed = completeFirst(prepared());
    const construction = completed.playerStates[playerIds[0]]!.construction;
    const carry = {
      steps: construction.steps,
      analysis: construction.analysis,
      publicText: construction.previewText,
    };
    const base = request();
    const restored = prepareDraftRound({
      ...base,
      players: [{ ...base.players[0], restoredCarry: carry }, base.players[1]],
    });
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(
        restored.state.playerStates[playerIds[0]]!.construction.steps,
      ).toEqual(carry.steps);
    }

    expect(() =>
      prepareDraftRound({
        ...base,
        players: [
          {
            ...base.players[0],
            restoredCarry: { ...carry, publicText: `${carry.publicText}!` },
          },
          base.players[1],
        ],
      }),
    ).toThrow(/must match/iu);

    const illegalStep = {
      kind: 'phrase' as const,
      phrase: prepareEnglishGrammarPhrase(
        sampleContent.phrases.find((phrase) => phrase.id === 'rebrands')!,
        englishGameLocale,
      ),
    };
    expect(() =>
      prepareDraftRound({
        ...base,
        players: [
          {
            ...base.players[0],
            restoredCarry: { ...carry, steps: [illegalStep] },
          },
          base.players[1],
        ],
      }),
    ).toThrow(/legal grammar steps/iu);
  });

  test('rejects wrong phase, actor, ownership, availability, and comeback boundaries without mutation', () => {
    const initial = prepared();
    const reduce = createDraftReducer(context);
    const cases: readonly [DraftState, DraftCommand, string][] = [
      [
        { ...initial, phase: 'draft-complete' },
        {
          type: 'commit-sentence',
          source: 'user',
          actorId: playerIds[0],
          payload: {},
        },
        'wrong-phase',
      ],
      [
        initial,
        {
          type: 'commit-sentence',
          source: 'user',
          actorId: playerIds[1],
          payload: {},
        },
        'wrong-actor',
      ],
      [
        initial,
        {
          type: 'select-phrase',
          source: 'user',
          actorId: playerIds[0],
          payload: { card: { source: 'shared', cardId: 'missing' } },
        },
        'card-unavailable',
      ],
      [
        initial,
        {
          type: 'select-phrase',
          source: 'user',
          actorId: playerIds[0],
          payload: {
            card: {
              source: 'private',
              cardId: initial.playerStates[playerIds[1]]!.hand[0]!.id,
            },
          },
        },
        'card-not-owned',
      ],
      [
        initial,
        {
          type: 'select-comeback',
          source: 'user',
          actorId: playerIds[0],
          payload: {},
        },
        'sentence-incomplete',
      ],
    ];
    for (const [state, command, code] of cases) {
      const before = structuredClone(state);
      const result = reduce(state, command, seededRandomSource);
      expect(result).toMatchObject({ ok: false, error: { code } });
      expect(state).toEqual(before);
    }

    const completed = passWithValidCard(
      completeFirst(prepared()),
      playerIds[1],
    );
    const unaffordable = reduce(
      completed,
      {
        type: 'select-comeback',
        source: 'user',
        actorId: playerIds[0],
        payload: {},
      },
      seededRandomSource,
    );
    expect(unaffordable).toMatchObject({
      ok: false,
      error: { code: 'comeback-unaffordable' },
    });
  });
});
