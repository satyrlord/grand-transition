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
  type MatchResolution,
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
    expect(
      snapshot.sceneLayers.every(({ url }) => /\.webp(?:$|\?)/u.test(url)),
    ).toBe(true);
    expect(snapshot.sceneLayers[0]).toMatchObject({
      width: 1920,
      height: 1080,
      sizes: '(max-aspect-ratio: 4/3) 134vw, 100vw',
      avif: {
        format: 'avif',
        srcSet: expect.stringMatching(/640w.*1280w.*1920w/u),
      },
      webp: {
        format: 'webp',
        srcSet: expect.stringMatching(/640w.*1280w.*1920w/u),
      },
      crop: {
        core: { x: 0.125, y: 0, width: 0.75, height: 1 },
        strategy: 'symmetric-horizontal-bleed-to-four-by-three-core',
      },
    });
    const firstLayer = snapshot.sceneLayers[0]!;
    expect(firstLayer.kind).toBe('manifest');
    if (firstLayer.kind === 'manifest') {
      expect(firstLayer.focalRectangles).toHaveProperty('moderatorFace');
      expect(firstLayer.sharedSafeRectangles).toHaveProperty(
        'centralInteraction',
      );
    }
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

  test('conceals the active AI hand from the human viewer', () => {
    const scene = sampleContent.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 21,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'ai',
      aiDifficulty: 'local-radio-caller',
      openingPlayerIndex: 1,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    expect(state.activePlayerId).toBe('player-2');

    const snapshot = createMatchScreenSnapshot(
      state,
      null,
      null,
      null,
      {},
      'player-1',
    );
    expect(snapshot.privateCards.every(({ state }) => state === 'empty')).toBe(
      true,
    );
    expect(snapshot.actions.canCommit).toBe(false);
    expect(snapshot.actions.canRedraw).toBe(false);
    expect(snapshot.actions.comebackTiers).toEqual([]);
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
    expect(
      snapshot.sceneLayers.every(({ url }) => /\.webp(?:$|\?)/u.test(url)),
    ).toBe(true);
  });

  test('projects the foundation scene through its own manifest and crop contract', () => {
    const scene = sampleContent.scenes.find(
      (candidate) => candidate.id === 'county-council-ballroom',
    )!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_830,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const layer = createMatchScreenSnapshot(state).sceneLayers[0]!;
    expect(layer).toMatchObject({
      kind: 'manifest',
      assetId: 'county-council-ballroom',
      depth: 0,
      width: 1920,
      height: 1080,
      url: expect.stringContaining('county-council-ballroom'),
    });
    expect(layer.sources).toEqual({ avif: layer.avif, webp: layer.webp });
    expect(layer.focalRectangles.moderatorFace).toBeNull();
    expect(layer.crop.core).toEqual({ x: 0.125, y: 0, width: 0.75, height: 1 });
    expect(Object.isFrozen(layer)).toBe(true);
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

  test('projects clause, finisher, weakness, combo, and comeback score components', () => {
    const scene = sampleContent.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_832,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: sampleContent.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstId = state.playerOrder[0];
    const secondId = state.playerOrder[1];
    for (const [playerId, phraseId] of [
      [firstId, 'national-consensus'],
      [secondId, 'televised-revolution'],
      [firstId, 'belongs-in-a-party-museum'],
      [secondId, 'makes-own-voters-change-the-channel'],
    ] as const) {
      state = withPrivateCard(state, playerId, phraseId);
      state = selectPrivateCard(state, playerId, phraseId);
    }
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstId,
      payload: {},
    });
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: secondId,
      payload: {},
    });
    const reviewState = state;
    const resolved = accept(state, lifecycleCommand('resolve-round'));
    const resolution = resolved.pendingResolution!;
    const original = resolution.players[firstId]!;
    const reviewResolution = {
      ...resolution,
      players: {
        ...resolution.players,
        [firstId]: {
          ...original,
          constructionPhrases: [
            {
              phraseId: 'national-consensus',
              text: 'National consensus',
              source: 'active',
            },
            {
              phraseId: 'belongs-in-a-party-museum',
              text: 'belongs in a party museum',
              source: 'active',
            },
            {
              phraseId: 'by-emergency-ordinance',
              text: 'by emergency ordinance.',
              source: 'active',
            },
          ],
          sentenceDamage: 47,
          comebackBonus: 18,
          outgoingDamage: 65,
          weaknessActivated: true,
          comboMultiplier: 2,
          comebackActivated: true,
          comebackTier: 'strong',
          comebackClosingLine: 'And that closes the record.',
          score: {
            unroundedTotal: 47,
            finalDamage: 47,
            combo: {
              nounPhraseId: 'national-consensus',
              phraseIndex: 0,
              chain: 2,
            },
            breakdown: [
              {
                kind: 'clause-base',
                operation: 'note',
                phraseIds: [
                  'national-consensus',
                  'belongs-in-a-party-museum',
                ],
                amount: 15,
              },
              {
                kind: 'weakness-match',
                operation: 'note',
                defenderTag: 'restraint',
                phraseId: 'national-consensus',
                phraseIndex: 0,
              },
              {
                kind: 'weakness-multiplier',
                operation: 'note',
                factor: 1.5,
              },
              {
                kind: 'combo-multiplier',
                operation: 'note',
                nounPhraseIds: ['national-consensus'],
                factor: 2,
              },
              {
                kind: 'clause-score',
                operation: 'add',
                phraseIds: [
                  'national-consensus',
                  'belongs-in-a-party-museum',
                ],
                amount: 45,
              },
              {
                kind: 'combo-chain',
                operation: 'note',
                nounPhraseId: 'national-consensus',
                phraseIndex: 0,
                chain: 2,
              },
              {
                kind: 'finisher-bonus',
                operation: 'add',
                phraseId: 'by-emergency-ordinance',
                amount: 2,
              },
              {
                kind: 'unrounded-total',
                operation: 'total',
                amount: 47,
              },
              {
                kind: 'final-damage',
                operation: 'ceil',
                amount: 47,
              },
            ],
          },
        },
      },
    } as MatchResolution;

    const snapshot = createMatchScreenSnapshot(
      reviewState,
      null,
      reviewResolution,
    );

    expect(snapshot.reaction.players[firstId]!.scoreComponents).toEqual([
      {
        kind: 'clause',
        phraseText: 'National consensus belongs in a party museum',
        base: 15,
        restrictionFactor: 1,
        weaknessFactor: 1.5,
        comboFactor: 2,
        amount: 45,
        weaknessTags: ['restraint'],
      },
      {
        kind: 'finisher',
        phraseText: 'by emergency ordinance.',
        base: 2,
        restrictionFactor: 1,
        weaknessFactor: 1,
        comboFactor: 1,
        amount: 2,
        weaknessTags: [],
      },
      {
        kind: 'comeback',
        phraseText: 'And that closes the record.',
        base: 18,
        restrictionFactor: 1,
        weaknessFactor: 1,
        comboFactor: 1,
        amount: 18,
        weaknessTags: [],
      },
    ]);
    expect(snapshot.reaction.players[firstId]).toMatchObject({
      comboBonusDamage: 22.5,
      weaknessFactor: 1.5,
      weaknesses: ['restraint'],
    });
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
