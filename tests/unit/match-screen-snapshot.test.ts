import { describe, expect, test } from 'vitest';
import { createMatchScreenSnapshot } from '../../src/app/match-screen-snapshot';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  createMatchReducer,
  createMatchSetupState,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchConfiguredPlayer,
  type MatchState,
} from '../../src/engine/match-lifecycle';

const reducer = createMatchReducer({
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
});

describe('match-screen snapshot', () => {
  test('projects one immutable viewer-scoped match snapshot', () => {
    const scene = sampleContent.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_823,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const snapshot = createMatchScreenSnapshot(state);

    expect(snapshot.activePlayerId).toBe(state.activePlayerId);
    expect(snapshot.sharedCards).toHaveLength(9);
    expect(snapshot.privateCards).toHaveLength(2);
    expect(snapshot.sceneLayers).toHaveLength(2);
    expect(snapshot.sceneLayers.map(({ depth }) => depth)).toEqual([0, 1]);
    expect(snapshot.sceneLayers.map(({ assetId }) => assetId)).toEqual([
      'transition-era-television-studio',
      'transition-era-television-studio-desks',
    ]);
    expect(snapshot.sceneLayers.every(({ url }) => url.endsWith('.png'))).toBe(
      true,
    );
    expect(snapshot.players.filter((player) => player.isActive)).toHaveLength(
      1,
    );
    expect(snapshot.timer.durationSeconds).toBe(30);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
    expect(Object.isFrozen(snapshot.privateCards[0])).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers)).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers[0])).toBe(true);
  });
});

function configuredPlayer(index: 0 | 1): MatchConfiguredPlayer {
  const character = sampleContent.characters[index]!;
  return {
    playerId: `player-${index + 1}`,
    characterId: character.id,
    characterPhraseIds: character.characterPhraseIds,
    weaknessTags: character.weaknessTags,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  };
}

function lifecycleCommand(type: 'prepare-round' | 'start-match'): MatchCommand {
  return { type, source: 'user', payload: {} } as MatchCommand;
}

function accept(state: MatchState, command: MatchCommand): MatchState {
  const result = reducer(state, command, defaultMatchRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}
