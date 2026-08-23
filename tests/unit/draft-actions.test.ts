import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/content/sample-content';
import type { Phrase } from '../../src/content/schemas';
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
  generatePrivateHand,
  privateHandCandidateWeight,
  type PrivateHandGenerationRequest,
} from '../../src/engine/private-hand-generation';
import {
  seededRandomSource,
  type RandomSource,
} from '../../src/engine/random-source';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const playerIds = ['first-player', 'second-player'] as const;
const context: DraftEngineContext = {
  phrases: sampleContent.phrases,
  locale: englishGameLocale,
};

function roundRequest(
  seed = 2_026_082_3,
  phrases: readonly Phrase[] = sampleContent.phrases,
  privatePhraseIds?: readonly [readonly string[], readonly string[]],
): DraftRoundPreparationRequest {
  const scene = sampleContent.scenes[0]!;
  const firstCharacter = sampleContent.characters[0]!;
  const secondCharacter = sampleContent.characters[1]!;
  return {
    schemaVersion: 1,
    mode: 'test',
    round: 1,
    seed,
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: phrases
      .filter((phrase) => !phrase.characterIds && !phrase.sceneIds)
      .map((phrase) => phrase.id),
    phrases,
    locale: englishGameLocale,
    players: [
      {
        playerId: playerIds[0],
        characterId: firstCharacter.id,
        publicPhraseIds: firstCharacter.phrasePools.public,
        privatePhraseIds:
          privatePhraseIds?.[0] ?? firstCharacter.phrasePools.private,
        weaknessTags: firstCharacter.weaknessTags,
        subjectNumber: 'singular',
        objectNumber: 'plural',
        availableComebackTiers: ['weak'],
      },
      {
        playerId: playerIds[1],
        characterId: secondCharacter.id,
        publicPhraseIds: secondCharacter.phrasePools.public,
        privatePhraseIds:
          privatePhraseIds?.[1] ?? secondCharacter.phrasePools.private,
        weaknessTags: secondCharacter.weaknessTags,
        subjectNumber: 'plural',
        objectNumber: 'singular',
      },
    ],
    timerSeconds: 30,
  };
}

function expectPrepared(request = roundRequest()): DraftState {
  const result = prepareDraftRound(request);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
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
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.state;
}

function emptyCommand<Type extends DraftCommand['type']>(
  type: Type,
  actorId: string,
): Extract<DraftCommand, { readonly type: Type }> {
  return {
    type,
    source: 'user',
    actorId,
    payload: {},
  } as Extract<DraftCommand, { readonly type: Type }>;
}

function phraseIdForReference(
  state: DraftState,
  playerId: string,
  reference: DraftCardReference,
): string {
  if (reference.source === 'shared') {
    return state.board.slots.find((slot) => slot.id === reference.cardId)!
      .phraseId;
  }
  return state.playerStates[playerId]!.hand.find(
    (card) => card.id === reference.cardId,
  )!.phraseId;
}

function legalReferenceForRole(
  state: DraftState,
  playerId: string,
  role: Phrase['role'],
): DraftCardReference {
  const reference = state.playerStates[playerId]!.legalCards.find(
    (card) =>
      sampleContent.phrases.find(
        (phrase) => phrase.id === phraseIdForReference(state, playerId, card),
      )?.role === role,
  );
  expect(reference).toBeDefined();
  return reference!;
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

function completeFirstPlayer(): DraftState {
  let state = expectPrepared();
  state = select(
    state,
    playerIds[0],
    legalReferenceForRole(state, playerIds[0], 'noun'),
  );
  state = run(state, emptyCommand('expire-turn', playerIds[1]));
  state = select(
    state,
    playerIds[0],
    legalReferenceForRole(state, playerIds[0], 'predicate'),
  );
  expect(state.playerStates[playerIds[0]]!.construction.analysis.complete).toBe(
    true,
  );
  return state;
}

function clonePhrase(
  sourceId: string,
  id: string,
  overrides: Partial<Phrase> = {},
): Phrase {
  const source = sampleContent.phrases.find(
    (phrase) => phrase.id === sourceId,
  )!;
  return { ...structuredClone(source), id, ...overrides };
}

function abundantPrivateFixture(): {
  readonly request: DraftRoundPreparationRequest;
  readonly context: DraftEngineContext;
} {
  const additions = [
    clonePhrase('paper-promise', 'private-paper-a'),
    clonePhrase('velvet-megaphone', 'private-megaphone-a'),
    clonePhrase('folds', 'private-folds-a'),
    clonePhrase('before-lunch', 'private-lunch-a'),
    clonePhrase('paper-promise', 'private-paper-b'),
    clonePhrase('outshouts', 'private-outshouts-b'),
    clonePhrase('in-an-empty-hall', 'private-hall-b'),
    clonePhrase('and', 'private-and-b'),
  ];
  const phrases = [...sampleContent.phrases, ...additions];
  const request = roundRequest(4_242, phrases, [
    additions.slice(0, 4).map((phrase) => phrase.id),
    additions.slice(4).map((phrase) => phrase.id),
  ]);
  return {
    request,
    context: { phrases, locale: englishGameLocale },
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

describe('private-hand generation', () => {
  test('applies each approved integer weight term', () => {
    const rare = clonePhrase('still-echoes', 'rare-base', {
      rarity: 'rare',
      tags: ['unmatched'],
    });
    const common = { ...rare, rarity: 'common' as const };
    const baseContext = {
      legalRoles: new Set<Phrase['role']>(),
      opponentWeaknessTags: new Set<string>(),
      scenePhraseIds: new Set([rare.id]),
      generalPhraseIds: new Set([rare.id]),
    };

    expect(privateHandCandidateWeight(rare, baseContext)).toBe(1);
    expect(privateHandCandidateWeight(common, baseContext)).toBe(4);
    expect(
      privateHandCandidateWeight(rare, {
        ...baseContext,
        legalRoles: new Set([rare.role]),
      }),
    ).toBe(5);
    expect(
      privateHandCandidateWeight(rare, {
        ...baseContext,
        opponentWeaknessTags: new Set(['unmatched']),
      }),
    ).toBe(4);
    expect(
      privateHandCandidateWeight(
        { ...rare, tags: ['unmatched', 'second-match'] },
        {
          ...baseContext,
          opponentWeaknessTags: new Set(['unmatched', 'second-match']),
        },
      ),
    ).toBe(7);
    expect(
      privateHandCandidateWeight(
        { ...rare, tags: ['unmatched', 'unmatched'] },
        {
          ...baseContext,
          opponentWeaknessTags: new Set(['unmatched']),
        },
      ),
    ).toBe(4);
    expect(
      privateHandCandidateWeight(rare, {
        ...baseContext,
        scenePhraseIds: new Set(),
        generalPhraseIds: new Set(),
      }),
    ).toBe(2);
  });

  test('selects two stable, weighted, different phrase IDs without replacement', () => {
    const fixture = abundantPrivateFixture();
    const player = fixture.request.players[0];
    const opponent = fixture.request.players[1];
    const handRequest: PrivateHandGenerationRequest = {
      seed: 91,
      playerId: player.playerId,
      characterId: player.characterId,
      sceneId: fixture.request.sceneId,
      phrases: fixture.request.phrases,
      privatePhraseIds: player.privatePhraseIds,
      scenePhraseIds: fixture.request.scenePhraseIds,
      generalPhraseIds: fixture.request.generalPhraseIds,
      legalRoles: ['noun'],
      opponentWeaknessTags: opponent.weaknessTags,
    };

    const first = generatePrivateHand(handRequest);
    const repeated = generatePrivateHand(handRequest);

    expect(first).toEqual(repeated);
    expect(first).toEqual({
      ok: true,
      hand: {
        seed: 91,
        nextSeed: expect.any(Number),
        phraseIds: expect.any(Array),
      },
    });
    if (first.ok) {
      expect(first.hand.phraseIds).toHaveLength(2);
      expect(new Set(first.hand.phraseIds)).toHaveLength(2);
    }
  });

  test('returns the typed private-pool failure before it consumes randomness', () => {
    const request = roundRequest();
    let randomCalls = 0;
    const randomSource: RandomSource = {
      next(seed) {
        randomCalls += 1;
        return seededRandomSource.next(seed);
      },
    };
    const result = prepareDraftRound(
      {
        ...request,
        players: [
          { ...request.players[0], privatePhraseIds: ['still-echoes'] },
          request.players[1],
        ],
      },
      randomSource,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'private-hand-generation-error',
        code: 'impossible-private-hand',
        facts: {
          playerId: playerIds[0],
          sceneId: 'echo-chamber',
          requiredCount: 2,
          availableCount: 1,
        },
      },
    });
    expect(randomCalls).toBe(0);
  });
});

describe('draft round preparation and commands', () => {
  test('reproduces ordered hands, next seed, opening facts, and restored grammar', () => {
    const request = roundRequest();
    const first = expectPrepared(request);
    const repeated = expectPrepared(request);
    const secondRound = expectPrepared({
      ...request,
      round: 2,
      previousOpeningPlayerId: playerIds[0],
      players: [
        {
          ...request.players[0],
          restoredSteps: [
            {
              kind: 'phrase',
              phrase: {
                id: 'paper-promise',
                role: 'noun',
                defaultText: 'a paper promise',
                singularText: 'a paper promise',
                pluralText: 'paper promises',
              },
            },
            {
              kind: 'phrase',
              phrase: {
                id: 'before-lunch',
                role: 'predicate',
                defaultText: 'before lunch',
                singularText: 'before lunch',
                pluralText: 'before lunch',
              },
            },
          ],
        },
        request.players[1],
      ],
    });

    expect(repeated).toEqual(first);
    expect(first.playerStates[playerIds[0]]!.hand).toHaveLength(2);
    expect(first.playerStates[playerIds[1]]!.hand).toHaveLength(2);
    expect(first.seed).toBe(573_602_481);
    expect(
      first.playerStates[playerIds[0]]!.hand.map((card) => card.phraseId),
    ).toEqual(['still-echoes', 'with-the-receipt']);
    expect(
      first.playerStates[playerIds[1]]!.hand.map((card) => card.phraseId),
    ).toEqual(['and', 'in-an-empty-hall']);
    expect(first.banner).toEqual({
      kind: 'round-start',
      round: 1,
      openingPlayerId: playerIds[0],
    });
    expect(secondRound.openingPlayerId).toBe(playerIds[1]);
    expect(
      secondRound.playerStates[playerIds[0]]!.construction.previewText,
    ).toBe('A paper promise before lunch');
    expect(
      secondRound.playerStates[playerIds[0]]!.construction.analysis.complete,
    ).toBe(true);
  });

  test('selects a shared phrase, empties it for both players, and passes the turn', () => {
    const initial = expectPrepared();
    const card = initial.playerStates[playerIds[0]]!.legalCards.find(
      (reference) => reference.source === 'shared',
    )!;
    const selected = select(initial, playerIds[0], card);

    expect(
      selected.board.slots.find((slot) => slot.id === card.cardId)?.available,
    ).toBe(false);
    expect(selected.activePlayerId).toBe(playerIds[1]);
    expect(selected.turn.sequence).toBe(initial.turn.sequence + 1);
    expect(
      selected.playerStates[playerIds[0]]!.construction.previewText,
    ).not.toBe('');
  });

  test('redraws once without passing and returns neither discarded phrase', () => {
    const fixture = abundantPrivateFixture();
    const prepared = prepareDraftRound(fixture.request);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const state = prepared.state;
    const discarded = state.playerStates[playerIds[0]]!.hand.map(
      (card) => card.phraseId,
    );
    const result = createDraftReducer(fixture.context)(
      state,
      emptyCommand('redraw-hand', playerIds[0]),
      seededRandomSource,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const replacement = result.state.playerStates[playerIds[0]]!;
    expect(replacement.redrawUsed).toBe(true);
    expect(replacement.hand.map((card) => card.phraseId)).not.toEqual(
      expect.arrayContaining(discarded),
    );
    expect(result.state.activePlayerId).toBe(playerIds[0]);
    expect(result.state.turn.sequence).toBe(state.turn.sequence);
  });

  test('commits a complete sentence and skips an ended opponent', () => {
    const complete = completeFirstPlayer();
    const committed = run(
      complete,
      emptyCommand('commit-sentence', playerIds[0]),
    );

    expect(committed.phase).toBe('draft-complete');
    expect(
      committed.playerStates[playerIds[0]]!.construction.previewText,
    ).toMatch(/\.$/u);
    expect(committed.turn.activePlayerId).toBeNull();
  });

  test('consumes a continuation card and records carry intent only', () => {
    const complete = completeFirstPlayer();
    const continuationCard = {
      id: 'opaque-continuation-card',
      phraseId: 'still-echoes',
    };
    const withContinuation: DraftState = {
      ...complete,
      playerStates: {
        ...complete.playerStates,
        [playerIds[0]]: {
          ...complete.playerStates[playerIds[0]]!,
          hand: [
            ...complete.playerStates[playerIds[0]]!.hand,
            continuationCard,
          ],
        },
      },
    };
    const carried = run(withContinuation, {
      type: 'carry-continuation',
      source: 'user',
      actorId: playerIds[0],
      payload: {
        card: { source: 'private', cardId: continuationCard.id },
      },
    });

    expect(carried.playerStates[playerIds[0]]!.construction.carryIntent).toBe(
      true,
    );
    expect(
      carried.playerStates[playerIds[0]]!.hand.map((card) => card.id),
    ).not.toContain(continuationCard.id);
    expect(
      carried.playerStates[playerIds[0]]!.construction.analysis.state,
    ).toBe('CLAUSE_COMPLETE');
  });

  test('records an affordable comeback intent without resolving its later rules', () => {
    const complete = completeFirstPlayer();
    const selected = run(complete, {
      type: 'select-comeback',
      source: 'user',
      actorId: playerIds[0],
      payload: { tier: 'weak' },
    });

    expect(
      selected.playerStates[playerIds[0]]!.construction.selectedComebackTier,
    ).toBe('weak');
    expect(selected.playerStates[playerIds[0]]!.construction.status).toBe(
      'ended',
    );
  });

  test('consumes an owned illegal phrase as a deliberate fault', () => {
    const initial = expectPrepared();
    const faultCard = { id: 'opaque-fault-card', phraseId: 'before-lunch' };
    const withFaultCard: DraftState = {
      ...initial,
      playerStates: {
        ...initial.playerStates,
        [playerIds[0]]: {
          ...initial.playerStates[playerIds[0]]!,
          hand: [...initial.playerStates[playerIds[0]]!.hand, faultCard],
        },
      },
    };
    const faulted = run(withFaultCard, {
      type: 'deliberate-fault',
      source: 'user',
      actorId: playerIds[0],
      payload: { card: { source: 'private', cardId: faultCard.id } },
    });
    const construction = faulted.playerStates[playerIds[0]]!.construction;

    expect(construction.status).toBe('ended');
    expect(construction.analysis.resolution).toEqual({
      outgoingDamageIntent: 0,
      selfDamageIntent: 3,
      removedPhraseId: 'before-lunch',
      constructionEnded: true,
      feedback: 'strategic-foul',
    });
  });

  test('expires complete and incomplete constructions with the required outcomes', () => {
    const complete = completeFirstPlayer();
    const committed = run(complete, emptyCommand('expire-turn', playerIds[0]));
    const initial = expectPrepared();
    const incomplete = run(initial, emptyCommand('expire-turn', playerIds[0]));

    expect(
      committed.playerStates[playerIds[0]]!.construction.analysis.state,
    ).toBe('ENDED');
    expect(
      incomplete.playerStates[playerIds[0]]!.construction.analysis.resolution,
    ).toEqual(
      expect.objectContaining({
        outgoingDamageIntent: 0,
        selfDamageIntent: 0,
      }),
    );
    expect(incomplete.playerStates[playerIds[0]]!.construction.expired).toBe(
      true,
    );
  });
});

describe('draft failures, privacy, and invariants', () => {
  test('preserves the complete input for every stable rejection code', () => {
    const initial = expectPrepared();
    const complete = completeFirstPlayer();
    const unavailable = { source: 'private', cardId: 'missing-card' } as const;
    const opponentCard = initial.playerStates[playerIds[1]]!.hand[0]!;
    const legalCard = initial.playerStates[playerIds[0]]!.legalCards[0]!;
    const continuationHandCard = initial.playerStates[playerIds[0]]!.hand.find(
      (card) =>
        sampleContent.phrases.find((phrase) => phrase.id === card.phraseId)
          ?.role === 'continuation',
    )!;
    expect(continuationHandCard).toBeDefined();
    const nonContinuation = {
      id: 'opaque-non-continuation',
      phraseId: 'past-the-deadline',
    };
    const completeWithNonContinuation: DraftState = {
      ...complete,
      playerStates: {
        ...complete.playerStates,
        [playerIds[0]]: {
          ...complete.playerStates[playerIds[0]]!,
          hand: [...complete.playerStates[playerIds[0]]!.hand, nonContinuation],
        },
      },
    };
    const cases: readonly Readonly<{
      state: DraftState;
      command: DraftCommand;
      code: string;
    }>[] = [
      {
        state: { ...initial, phase: 'draft-complete' },
        command: emptyCommand('expire-turn', playerIds[0]),
        code: 'wrong-phase',
      },
      {
        state: initial,
        command: emptyCommand('expire-turn', playerIds[1]),
        code: 'wrong-actor',
      },
      {
        state: initial,
        command: {
          type: 'select-phrase',
          source: 'user',
          actorId: playerIds[0],
          payload: { card: unavailable },
        },
        code: 'card-unavailable',
      },
      {
        state: initial,
        command: {
          type: 'select-phrase',
          source: 'user',
          actorId: playerIds[0],
          payload: {
            card: { source: 'private', cardId: continuationHandCard.id },
          },
        },
        code: 'illegal-phrase',
      },
      {
        state: initial,
        command: {
          type: 'deliberate-fault',
          source: 'user',
          actorId: playerIds[0],
          payload: {
            card: { source: 'private', cardId: continuationHandCard.id },
          },
        },
        code: 'illegal-phrase',
      },
      {
        state: initial,
        command: {
          type: 'select-phrase',
          source: 'user',
          actorId: playerIds[0],
          payload: {
            card: { source: 'private', cardId: opponentCard.id },
          },
        },
        code: 'card-not-owned',
      },
      {
        state: initial,
        command: {
          type: 'deliberate-fault',
          source: 'user',
          actorId: playerIds[0],
          payload: { card: legalCard },
        },
        code: 'illegal-phrase',
      },
      {
        state: initial,
        command: emptyCommand('commit-sentence', playerIds[0]),
        code: 'sentence-incomplete',
      },
      {
        state: {
          ...initial,
          playerStates: {
            ...initial.playerStates,
            [playerIds[0]]: {
              ...initial.playerStates[playerIds[0]]!,
              redrawUsed: true,
            },
          },
        },
        command: emptyCommand('redraw-hand', playerIds[0]),
        code: 'redraw-already-used',
      },
      {
        state: initial,
        command: emptyCommand('redraw-hand', playerIds[0]),
        code: 'redraw-unavailable',
      },
      {
        state: {
          ...initial,
          playerStates: {
            ...initial.playerStates,
            [playerIds[0]]: {
              ...initial.playerStates[playerIds[0]]!,
              hand: [initial.playerStates[playerIds[0]]!.hand[0]!],
            },
          },
        },
        command: emptyCommand('redraw-hand', playerIds[0]),
        code: 'redraw-unavailable',
      },
      {
        state: completeWithNonContinuation,
        command: {
          type: 'carry-continuation',
          source: 'user',
          actorId: playerIds[0],
          payload: {
            card: { source: 'private', cardId: nonContinuation.id },
          },
        },
        code: 'continuation-unavailable',
      },
      {
        state: complete,
        command: {
          type: 'select-comeback',
          source: 'user',
          actorId: playerIds[0],
          payload: { tier: 'strong' },
        },
        code: 'comeback-unavailable',
      },
    ];

    for (const item of cases) {
      const snapshot = structuredClone(item.state);
      const result = createDraftReducer(context)(
        deepFreeze(item.state),
        item.command,
        seededRandomSource,
      );
      expect(result).toEqual({
        ok: false,
        error: {
          kind: 'rule-error',
          code: item.code,
          facts: {
            commandType: item.command.type,
            actorId: item.command.actorId ?? null,
          },
        },
      });
      expect(item.state).toEqual(snapshot);
    }
  });

  test('does not expose a selected private phrase to the opponent or public log', () => {
    const fixture = abundantPrivateFixture();
    const prepared = prepareDraftRound(fixture.request);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const initial = prepared.state;
    const privateReference = initial.playerStates[
      playerIds[0]
    ]!.legalCards.find((card) => card.source === 'private')!;
    const privatePhraseId = phraseIdForReference(
      initial,
      playerIds[0],
      privateReference,
    );
    const result = createDraftReducer(fixture.context)(
      initial,
      {
        type: 'select-phrase',
        source: 'user',
        actorId: playerIds[0],
        payload: { card: privateReference },
      },
      seededRandomSource,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const selected = result.state;
    const opponentSnapshot = snapshotDraftStateForPlayer(
      selected,
      playerIds[1],
    );
    const publicEvidence = JSON.stringify({
      snapshot: opponentSnapshot,
      log: selected.publicLog,
    });

    expect(opponentSnapshot.players[playerIds[0]]!.hand.cards).toBeUndefined();
    expect(
      opponentSnapshot.players[playerIds[0]]!.construction.previewText,
    ).toBeNull();
    expect(publicEvidence).not.toContain(privatePhraseId);
    expect(publicEvidence).not.toContain('Paper promise');
    expect(selected.commandHistory.at(-1)?.payload).toEqual({
      card: privateReference,
    });
  });

  test('preserves phase, ownership, turn, removal, and bounded actions for 2,000 runs', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.array(fc.integer({ min: 0, max: 6 }), { maxLength: 16 }),
        (seed, choices) => {
          let state = expectPrepared(roundRequest(seed));
          for (const choice of choices) {
            if (state.phase !== 'drafting') break;
            const actorId = state.activePlayerId;
            const player = state.playerStates[actorId]!;
            const firstCard =
              player.legalCards[0] ??
              ({ source: 'private', cardId: 'missing-card' } as const);
            const commands: readonly DraftCommand[] = [
              {
                type: 'select-phrase',
                source: 'ai',
                actorId,
                payload: { card: firstCard },
              },
              emptyCommand('redraw-hand', actorId),
              emptyCommand('commit-sentence', actorId),
              emptyCommand('expire-turn', actorId),
              {
                type: 'deliberate-fault',
                source: 'ai',
                actorId,
                payload: { card: firstCard },
              },
              {
                type: 'select-comeback',
                source: 'ai',
                actorId,
                payload: { tier: 'weak' },
              },
              {
                type: 'carry-continuation',
                source: 'ai',
                actorId,
                payload: { card: firstCard },
              },
            ];
            const before = structuredClone(state);
            const unavailableBefore = state.board.slots.filter(
              (slot) => !slot.available,
            ).length;
            const result = createDraftReducer(context)(
              state,
              commands[choice]!,
              seededRandomSource,
            );

            expect(state).toEqual(before);
            if (!result.ok) {
              expect(state.seed).toBe(before.seed);
              expect(state.commandHistory).toEqual(before.commandHistory);
              continue;
            }

            state = result.state;
            expect(state.commandHistory).toHaveLength(
              before.commandHistory.length + 1,
            );
            expect(
              state.board.slots.filter((slot) => !slot.available).length,
            ).toBeGreaterThanOrEqual(unavailableBefore);
            for (const playerId of state.playerOrder) {
              const hand = state.playerStates[playerId]!.hand;
              expect(new Set(hand.map((card) => card.phraseId)).size).toBe(
                hand.length,
              );
            }
            if (state.phase === 'drafting') {
              expect(
                state.playerStates[state.activePlayerId]!.construction.status,
              ).toBe('building');
              expect(state.turn.activePlayerId).toBe(state.activePlayerId);
            } else {
              expect(state.turn.activePlayerId).toBeNull();
            }
          }
        },
      ),
      { numRuns: 2_000, seed: 20_260_823 },
    );
  });
});
