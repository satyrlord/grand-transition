import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import {
  createMatchReducer,
  createMatchSetupState,
  type MatchCommand,
  type MatchState,
} from '../../src/engine/match-lifecycle.ts';
import { seededRandomSource } from '../../src/engine/random-source.ts';

export const reviewContext = {
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

export function reduceReviewState(state: MatchState, command: MatchCommand): MatchState {
  const result = createMatchReducer(reviewContext)(state, command, seededRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

export function preparedReviewState(seed: number, reversedPlayers = false): MatchState {
  const scene = gameCatalog.scenes[0]!;
  const players = gameCatalog.characters.slice(0, 2).map((character, index) => ({
    playerId: (index === 0) !== reversedPlayers ? 'player-one' : 'player-two',
    characterId: character.id,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular' as const,
    objectNumber: 'singular' as const,
  }));
  let state = createMatchSetupState({
    schemaVersion: 1,
    seed,
    mode: 'ai',
    aiDifficulty: 'local-radio-caller',
    players: [players[0]!, players[1]!],
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    generalPhraseIds: gameCatalog.phrases.map(({ id }) => id),
    openingPlayerIndex: scene.openingPlayerIndex,
  });
  for (const type of ['start-match', 'prepare-round'] as const) {
    state = reduceReviewState(state, { type, source: 'ai', payload: {} });
  }
  return state;
}

export function selfKnockoutReviewState(reversedPlayers = false): MatchState {
  let state = preparedReviewState(5, reversedPlayers);
  for (let turn = 0; turn < 8; turn += 1) {
    const card = state.draft!.playerStates[state.activePlayerId]!.legalCards[0];
    state = reduceReviewState(
      state,
      card
        ? { type: 'select-phrase', source: 'ai', actorId: state.activePlayerId, payload: { card } }
        : { type: 'commit-sentence', source: 'ai', actorId: state.activePlayerId, payload: {} },
    );
  }
  return {
    ...state,
    playerStates: {
      ...state.playerStates,
      [state.activePlayerId]: {
        ...state.playerStates[state.activePlayerId]!,
        pride: 3,
      },
    },
  };
}
