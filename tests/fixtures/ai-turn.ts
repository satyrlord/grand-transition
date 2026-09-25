import { MatchCoordinator } from '../../src/app/match-coordinator.ts';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import {
  createMatchSetupState,
  type MatchEngineContext,
  type MatchState,
} from '../../src/engine/match-lifecycle.ts';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import { LadderProgressRepository } from '../../src/persistence/ladder-progress.ts';
import { MatchHistoryRepository } from '../../src/persistence/match-history.ts';
import {
  createMemoryRecordStorage,
  createMemoryStorage,
} from '../../src/persistence/storage-port.ts';

export const context: MatchEngineContext = {
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

export function aiTurnState(): MatchState {
  const player = (index: number) => {
    const character = gameCatalog.characters[index]!;
    return {
      playerId: index === 0 ? 'player-one' : 'player-two',
      characterId: character.id,
      characterPhraseIds: character.characterPhraseIds,
      weaknessTags: character.weaknessTags,
      subjectNumber: 'singular' as const,
      objectNumber: 'singular' as const,
    };
  };
  const scene = gameCatalog.scenes[0]!;
  const coordinator = new MatchCoordinator({
    context,
    history: new MatchHistoryRepository(createMemoryRecordStorage(), createMemoryStorage()),
    ladder: new LadderProgressRepository(createMemoryStorage()),
    log: () => {},
    now: () => '2026-09-25T00:00:00.000Z',
    setTimeout: () => 0,
    clearTimeout: () => {},
  });
  return coordinator.start(
    createMatchSetupState({
      schemaVersion: 1,
      seed: 20260925,
      players: [player(0), player(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map(({ id }) => id),
      mode: 'ai',
      aiDifficulty: 'local-radio-caller',
      openingPlayerIndex: 1,
    }),
    englishGameLocale,
  );
}
