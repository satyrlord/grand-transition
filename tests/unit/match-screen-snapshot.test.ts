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

    const snapshot = createMatchScreenSnapshot(state, null, null, null, {
      'player-1': 'alternate',
      'player-2': 'default',
    });

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
    expect(snapshot.players[0].skinId).toBe('alternate');
    expect(snapshot.players[0].portraitUrl).toContain(
      'red-folded-chairman--alternate',
    );
    expect(snapshot.players[1].skinId).toBe('default');
    expect(snapshot.timer.durationSeconds).toBe(30);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
    expect(Object.isFrozen(snapshot.privateCards[0])).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers)).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers[0])).toBe(true);
  });

  test('projects the modern debate studio asset layers', () => {
    const scene = sampleContent.scenes.find(
      (candidate) => candidate.id === 'modern-debate-studio',
    )!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_828,
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

    expect(snapshot.sceneName).toBe('Modern Debate Studio');
    expect(snapshot.sceneLayers).toEqual([
      expect.objectContaining({
        assetId: 'modern-debate-studio',
        depth: 0,
      }),
      expect.objectContaining({
        assetId: 'modern-debate-studio-desks',
        depth: 1,
      }),
    ]);
    expect(snapshot.sceneLayers.every(({ url }) => url.endsWith('.png'))).toBe(
      true,
    );
  });

  test('clears an incomplete sentence from the next round bubble', () => {
    const scene = sampleContent.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_829,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    const nounSlot = state.draft!.board.slots.find((slot) => {
      const phrase = sampleContent.phrases.find(
        (candidate) => candidate.id === slot.phraseId,
      );
      return slot.available && phrase?.role === 'noun';
    })!;
    state = accept(state, {
      type: 'select-phrase',
      source: 'user',
      actorId: firstSpeakerId,
      payload: { card: { source: 'shared', cardId: nounSlot.id } },
    });
    const previousPublicSentence =
      state.draft!.playerStates[firstSpeakerId]!.construction.previewText;
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: state.activePlayerId,
      payload: {},
    });
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: state.activePlayerId,
      payload: {},
    });
    state = accept(state, lifecycleCommand('resolve-round'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const snapshot = createMatchScreenSnapshot(state);
    const waitingPlayer = snapshot.players.find((player) => !player.isActive)!;
    expect(waitingPlayer.playerId).toBe(firstSpeakerId);
    expect(waitingPlayer.sentence).toBeNull();
    expect(snapshot.sentenceText).not.toBe(previousPublicSentence);
  });

  test('shows the new construction instead of a sentence from the previous round', () => {
    const scene = sampleContent.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_831,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, firstSpeakerId, 'your-father');
    state = selectPrivateCard(state, firstSpeakerId, 'your-father');

    const secondSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, secondSpeakerId, 'national-consensus');
    state = selectPrivateCard(state, secondSpeakerId, 'national-consensus');
    state = withPrivateCard(state, firstSpeakerId, 'is-rejected-by-own-voters');
    state = selectPrivateCard(
      state,
      firstSpeakerId,
      'is-rejected-by-own-voters',
    );
    state = withPrivateCard(
      state,
      secondSpeakerId,
      'is-rejected-by-own-voters',
    );
    state = selectPrivateCard(
      state,
      secondSpeakerId,
      'is-rejected-by-own-voters',
    );
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstSpeakerId,
      payload: {},
    });
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: secondSpeakerId,
      payload: {},
    });
    state = accept(state, lifecycleCommand('resolve-round'));
    state = accept(state, lifecycleCommand('prepare-round'));

    expect(state.activePlayerId).toBe(secondSpeakerId);
    expect(createMatchScreenSnapshot(state).sentenceText).toBe(
      'Select a noun to begin.',
    );

    state = withPrivateCard(state, secondSpeakerId, 'your-concubine');
    state = selectPrivateCard(state, secondSpeakerId, 'your-concubine');
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstSpeakerId,
      payload: {},
    });
    const currentSentence =
      state.draft!.playerStates[secondSpeakerId]!.construction.previewText;
    const snapshot = createMatchScreenSnapshot(state);

    expect(snapshot.sentenceText).toBe(currentSentence);
    expect(snapshot.sentenceText).toBe('Your concubine');
  });

  test('keeps a private-card sentence public after its speaker ends the turn', () => {
    const scene = sampleContent.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_830,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, firstSpeakerId, 'your-father');
    state = selectPrivateCard(state, firstSpeakerId, 'your-father');

    const secondSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, secondSpeakerId, 'national-consensus');
    state = selectPrivateCard(state, secondSpeakerId, 'national-consensus');
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstSpeakerId,
      payload: {},
    });

    const publicSentence =
      state.draft!.playerStates[firstSpeakerId]!.construction.previewText;
    const snapshot = createMatchScreenSnapshot(state);
    const waitingPlayer = snapshot.players.find((player) => !player.isActive)!;
    expect(waitingPlayer.playerId).toBe(firstSpeakerId);
    expect(waitingPlayer.sentence).toBe(publicSentence);
  });
});

function withPrivateCard(
  state: MatchState,
  playerId: string,
  phraseId: string,
): MatchState {
  const draft = state.draft!;
  const player = draft.playerStates[playerId]!;
  const card = { id: `regression-${playerId}-${phraseId}`, phraseId };
  return {
    ...state,
    draft: {
      ...draft,
      playerStates: {
        ...draft.playerStates,
        [playerId]: {
          ...player,
          hand: [...player.hand, card],
          legalCards: [
            ...player.legalCards,
            { source: 'private', cardId: card.id },
          ],
        },
      },
    },
  };
}

function selectPrivateCard(
  state: MatchState,
  actorId: string,
  phraseId: string,
): MatchState {
  const card = state.draft!.playerStates[actorId]!.legalCards.find(
    (reference) =>
      reference.source === 'private' &&
      reference.cardId === `regression-${actorId}-${phraseId}`,
  )!;
  return accept(state, {
    type: 'select-phrase',
    source: 'user',
    actorId,
    payload: { card },
  });
}

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

function lifecycleCommand(
  type: 'prepare-round' | 'resolve-round' | 'start-match',
): MatchCommand {
  return { type, source: 'user', payload: {} } as MatchCommand;
}

function accept(state: MatchState, command: MatchCommand): MatchState {
  const result = reducer(state, command, defaultMatchRandomSource);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}
