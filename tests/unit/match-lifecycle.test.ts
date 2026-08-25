import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { sampleContent } from '../../src/content/sample-content';
import {
  createMatchReducer,
  createMatchSetupState,
  initialPride,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchEngineContext,
  type MatchState,
} from '../../src/engine/match-lifecycle';
import { seededRandomSource } from '../../src/engine/random-source';
import { englishGameLocale } from '../../src/localization/en-game-locale';

const playerIds = ['first-player', 'second-player'] as const;
const context: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const reducer = createMatchReducer(context);

function configuredPlayer(index: 0 | 1): MatchConfiguredPlayer {
  const character = sampleContent.characters[index]!;
  return {
    playerId: playerIds[index],
    characterId: character.id,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

function setup(): MatchState {
  const scene = sampleContent.scenes[0]!;
  return createMatchSetupState({
    schemaVersion: 1,
    seed: 2_026_082_4,
    players: [configuredPlayer(0), configuredPlayer(1)],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
  });
}

function run(state: MatchState, command: MatchCommand): MatchState {
  const result = reducer(state, command, seededRandomSource);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function lifecycle(
  state: MatchState,
  type: 'prepare-round' | 'rematch' | 'resolve-round' | 'start-match',
): MatchState {
  return run(state, { type, source: 'user', payload: {} });
}

function withPrivateCard(
  state: MatchState,
  playerId: string,
  phraseId: string,
  suffix: string,
): MatchState {
  const draft = state.draft!;
  return {
    ...state,
    draft: {
      ...draft,
      playerStates: {
        ...draft.playerStates,
        [playerId]: {
          ...draft.playerStates[playerId]!,
          hand: [
            ...draft.playerStates[playerId]!.hand,
            { id: `test-${suffix}`, phraseId },
          ],
        },
      },
    },
  };
}

function selectPrivate(
  state: MatchState,
  playerId: string,
  phraseId: string,
  suffix: string,
): MatchState {
  state = withPrivateCard(state, playerId, phraseId, suffix);
  return run(state, {
    type: 'select-phrase',
    source: 'user',
    actorId: playerId,
    payload: { card: { source: 'private', cardId: `test-${suffix}` } },
  });
}

function started(): MatchState {
  return lifecycle(lifecycle(setup(), 'start-match'), 'prepare-round');
}

function finishDraft(
  state: MatchState,
  predicateByPlayer: Readonly<Record<string, string>> = {
    [playerIds[0]]: 'before-the-next-election',
    [playerIds[1]]: 'before-the-next-election',
  },
  nounByPlayer: Readonly<Record<string, string>> = {
    [playerIds[0]]: 'national-consensus',
    [playerIds[1]]: 'televised-revolution',
  },
): MatchState {
  let index = 0;
  while (state.phase === 'drafting' || state.phase === 'sudden-death') {
    const actorId = state.activePlayerId;
    const construction = state.draft!.playerStates[actorId]!.construction;
    if (construction.steps.length === 0) {
      const noun = nounByPlayer[actorId]!;
      state = selectPrivate(state, actorId, noun, `noun-${index}`);
    } else if (!construction.analysis.complete) {
      state = selectPrivate(
        state,
        actorId,
        predicateByPlayer[actorId]!,
        `predicate-${index}`,
      );
    } else {
      state = run(state, {
        type: 'commit-sentence',
        source: 'user',
        actorId,
        payload: {},
      });
    }
    index += 1;
    if (index > 20) throw new Error('draft did not finish');
  }
  return state;
}

describe('Hollywood Roast match lifecycle', () => {
  test('starts both players at 100 Pride and uses fixed 15-second turns', () => {
    const state = started();
    expect(state.playerStates[playerIds[0]]!.pride).toBe(initialPride);
    expect(state.playerStates[playerIds[1]]!.pride).toBe(initialPride);
    expect(state.draft!.turn.durationSeconds).toBe(15);
  });

  test('a grammar mistake immediately costs 3 Pride without charging a comeback', () => {
    const state = selectPrivate(
      started(),
      playerIds[0],
      'before-the-next-election',
      'wrong',
    );
    expect(state.playerStates[playerIds[0]]!.pride).toBe(97);
    expect(state.playerStates[playerIds[0]]!.comebackCharge).toBe(0);
    expect(
      state.draft!.playerStates[playerIds[0]]!.construction.grammarMistakes,
    ).toBe(1);
  });

  test('a lethal grammar mistake ends the match immediately', () => {
    let state = started();
    state = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [playerIds[0]]: { ...state.playerStates[playerIds[0]]!, pride: 3 },
      },
    };
    state = selectPrivate(
      state,
      playerIds[0],
      'before-the-next-election',
      'lethal-wrong',
    );
    expect(state.phase).toBe('results');
    expect(state.winner).toBe(playerIds[1]);
    expect(state.pendingResolution?.players[playerIds[0]]!.selfDamage).toBe(3);
  });

  test('resolves both locked insults and charges only damage received from the opponent', () => {
    let state = finishDraft(started());
    expect(state.phase).toBe('resolution');
    state = lifecycle(state, 'resolve-round');
    const resolution = state.resolutionHistory[0]!;
    expect(resolution.players[playerIds[0]]!.outgoingDamage).toBeGreaterThan(0);
    expect(resolution.players[playerIds[1]]!.outgoingDamage).toBeGreaterThan(0);
    expect(state.playerStates[playerIds[0]]!.comebackCharge).toBeGreaterThan(0);
    expect(state.playerStates[playerIds[1]]!.comebackCharge).toBeGreaterThan(0);
  });

  test('a double knockout starts a cliffhanger with restored Pride and cleared resources', () => {
    let state = finishDraft(started());
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          {
            ...state.playerStates[playerId]!,
            pride: 1,
            comebackCharge: 60,
          },
        ]),
      ),
    };
    state = lifecycle(state, 'resolve-round');
    expect(state.phase).toBe('sudden-death');
    for (const playerId of state.playerOrder) {
      expect(state.playerStates[playerId]!.pride).toBe(100);
      expect(state.playerStates[playerId]!.comebackCharge).toBe(0);
      expect(state.playerStates[playerId]!.continuation).toBeNull();
    }
    expect(state.comboState).toEqual({});
    state = lifecycle(state, 'prepare-round');
    const dealtPhraseIds = [
      ...state.draft!.board.slots.map((slot) => slot.phraseId),
      ...state.playerOrder.flatMap((playerId) =>
        state.draft!.playerStates[playerId]!.hand.map((card) => card.phraseId),
      ),
    ];
    expect(
      dealtPhraseIds.every(
        (phraseId) =>
          sampleContent.phrases.find((phrase) => phrase.id === phraseId)
            ?.role !== 'continuation',
      ),
    ).toBe(true);
  });

  test('the higher cliffhanger score knocks out the opponent and takes proportional damage', () => {
    let state = finishDraft(started());
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          { ...state.playerStates[playerId]!, pride: 1 },
        ]),
      ),
    };
    state = lifecycle(state, 'resolve-round');
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          { ...state.playerStates[playerId]!, weaknessTags: [] },
        ]),
      ),
    };
    state = lifecycle(state, 'prepare-round');
    state = finishDraft(state);
    state = lifecycle(state, 'resolve-round');
    expect(state.phase).toBe('results');
    expect(state.winner).toBe(playerIds[0]);
    expect(state.playerStates[playerIds[0]]!.pride).toBeGreaterThan(0);
    expect(state.playerStates[playerIds[1]]!.pride).toBe(0);
  });

  test('equal nonzero cliffhanger scores restart the cliffhanger instead of using an invented tie-break', () => {
    let state = finishDraft(started());
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          { ...state.playerStates[playerId]!, pride: 1 },
        ]),
      ),
    };
    state = lifecycle(state, 'resolve-round');
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          { ...state.playerStates[playerId]!, weaknessTags: [] },
        ]),
      ),
    };
    state = lifecycle(state, 'prepare-round');
    state = finishDraft(
      state,
      {
        [playerIds[0]]: 'before-the-next-election',
        [playerIds[1]]: 'before-the-next-election',
      },
      {
        [playerIds[0]]: 'national-consensus',
        [playerIds[1]]: 'national-consensus',
      },
    );
    state = lifecycle(state, 'resolve-round');
    expect(state.phase).toBe('sudden-death');
    expect(state.winner).toBeUndefined();
  });

  test('equal zero cliffhanger scores start another cliffhanger round', () => {
    let state = finishDraft(started());
    state = {
      ...state,
      playerStates: Object.fromEntries(
        state.playerOrder.map((playerId) => [
          playerId,
          { ...state.playerStates[playerId]!, pride: 1 },
        ]),
      ),
    };
    state = lifecycle(state, 'resolve-round');
    state = lifecycle(state, 'prepare-round');
    for (let index = 0; index < 2; index += 1) {
      const actorId = state.activePlayerId;
      state = run(state, {
        type: 'commit-sentence',
        source: 'user',
        actorId,
        payload: {},
      });
    }
    expect(state.phase).toBe('resolution');
    state = lifecycle(state, 'resolve-round');
    expect(state.phase).toBe('sudden-death');
    expect(state.winner).toBeUndefined();
    expect(state.playerStates[playerIds[0]]!.pride).toBe(100);
    expect(state.playerStates[playerIds[1]]!.pride).toBe(100);
  });

  test('statistics record grammar mistakes', () => {
    let state = selectPrivate(
      started(),
      playerIds[0],
      'before-the-next-election',
      'mistake-stat',
    );
    state = finishDraft(state);
    state = lifecycle(state, 'resolve-round');
    expect(state.statistics.grammarMistakes).toBe(1);
  });

  test('rematch swaps the first opener and resets match resources', () => {
    let state = finishDraft(started());
    state = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [playerIds[1]]: { ...state.playerStates[playerIds[1]]!, pride: 1 },
      },
    };
    state = lifecycle(state, 'resolve-round');
    expect(state.phase).toBe('results');
    state = lifecycle(state, 'rematch');
    expect(state.phase).toBe('round-preparation');
    expect(state.firstOpeningPlayerId).toBe(playerIds[1]);
    expect(state.statistics.grammarMistakes).toBe(0);
  });

  test('rejects lifecycle commands in the wrong phase without changing state', () => {
    const state = setup();
    const before = structuredClone(state);
    const result = reducer(
      state,
      { type: 'resolve-round', source: 'user', payload: {} },
      seededRandomSource,
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'wrong-phase' } });
    expect(state).toEqual(before);
  });
});
