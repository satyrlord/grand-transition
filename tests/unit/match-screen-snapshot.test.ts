import { describe, expect, test } from 'vitest';
import { createMatchScreenSnapshot } from '../../src/app/match-screen-snapshot';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, gameCatalog } from '../../src/game-content';
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
  phrases: gameCatalog.phrases,
  characters: gameCatalog.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
});

describe('match-screen snapshot', () => {
  test('marks exactly the next grammar-accepted phrases without changing state or selection rules', () => {
    const scene = gameCatalog.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1, seed: 20_260_823,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id, scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat', openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(accept(state, lifecycleCommand('start-match')), lifecycleCommand('prepare-round'));
    let checked = 0;
    let rejected = 0;
    for (let pick = 0; pick < 8 && state.phase === 'drafting'; pick += 1) {
      const before = JSON.stringify(state);
      const snapshot = createMatchScreenSnapshot(state, englishGameLocale);
      const cards = [...snapshot.sharedCards, ...snapshot.privateCards];
      for (const card of cards) {
        if (!card.reference || card.role === 'continuation') {
          expect(card.grammarAccepted).toBe(false);
          continue;
        }
        const result = accept(state, {
          type: 'select-phrase', source: 'user', actorId: state.activePlayerId,
          payload: { card: card.reference },
        });
        const mistakes = state.draft!.playerStates[state.activePlayerId]!.construction.grammarMistakes;
        const nextMistakes = result.draft!.playerStates[state.activePlayerId]!.construction.grammarMistakes;
        expect(card.grammarAccepted).toBe(nextMistakes === mistakes);
        expect(card.action).toBe('select');
        checked += 1;
        if (!card.grammarAccepted) rejected += 1;
      }
      expect(JSON.stringify(state)).toBe(before);
      const next = cards.find((card) => card.grammarAccepted);
      if (!next?.reference) break;
      state = accept(state, {
        type: 'select-phrase', source: 'user', actorId: state.activePlayerId,
        payload: { card: next.reference },
      });
    }
    expect(checked).toBeGreaterThan(20);
    expect(rejected).toBeGreaterThan(0);
  });

  test('projects one immutable viewer-scoped match snapshot', () => {
    const scene = gameCatalog.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_823,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const snapshot = createMatchScreenSnapshot(state, englishGameLocale, null, null, null, {
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
      width: 3840,
      height: 2160,
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
    expect(snapshot.players.map(({ comeback }) => comeback)).toEqual([
      { charge: 0, cap: 60, segments: 3 },
      { charge: 0, cap: 60, segments: 3 },
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
    expect(Object.isFrozen(snapshot.privateCards[0])).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers)).toBe(true);
    expect(Object.isFrozen(snapshot.sceneLayers[0])).toBe(true);
  });

  test('projects charge for the segmented comeback action and optional approved sidekicks', () => {
    const scene = gameCatalog.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_823,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const [first, second] = state.playerOrder;
    state = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [first!]: { ...state.playerStates[first!]!, comebackCharge: 40 },
        [second!]: { ...state.playerStates[second!]!, comebackCharge: 60 },
      },
      draft: {
        ...state.draft!,
        playerStates: {
          ...state.draft!.playerStates,
          [first!]: {
            ...state.draft!.playerStates[first!]!,
            comebackCharge: 40,
            availableComebackTiers: ['weak', 'medium'],
          },
          [second!]: {
            ...state.draft!.playerStates[second!]!,
            comebackCharge: 60,
            availableComebackTiers: ['weak', 'medium', 'strong'],
          },
        },
      },
    };
    const snapshot = createMatchScreenSnapshot(state, englishGameLocale);
    expect(snapshot.players.map(({ comeback }) => comeback)).toEqual([
      { charge: 40, cap: 60, segments: 3 },
      { charge: 60, cap: 60, segments: 3 },
    ]);
    expect(snapshot.players.map(({ comebackSidekickUrl }) => comebackSidekickUrl))
      .toEqual([expect.stringMatching(/red-folded-chairman.*\.png/u),
        expect.stringMatching(/thunder-tribune.*\.png/u)]);
    expect(snapshot.actions).toMatchObject(
      state.activePlayerId === first
        ? { comebackTier: 'medium', comebackDamageBonus: 10 }
        : { comebackTier: 'strong', comebackDamageBonus: 18 },
    );
  });

  test('conceals the active AI hand from the human viewer', () => {
    const scene = gameCatalog.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 21,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'ai',
      aiDifficulty: 'local-radio-caller',
      openingPlayerIndex: 1,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    expect(state.activePlayerId).toBe('player-2');

    const snapshot = createMatchScreenSnapshot(
      state,
      englishGameLocale,
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
    const scene = gameCatalog.scenes.find(
      (candidate) => candidate.id === 'modern-debate-studio',
    )!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_828,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const snapshot = createMatchScreenSnapshot(state, englishGameLocale);

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
    const scene = gameCatalog.scenes.find(
      (candidate) => candidate.id === 'county-council-ballroom',
    )!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_830,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));

    const layer = createMatchScreenSnapshot(state, englishGameLocale).sceneLayers[0]!;
    expect(layer).toMatchObject({
      kind: 'manifest',
      assetId: 'county-council-ballroom',
      depth: 0,
      width: 3840,
      height: 2160,
      url: expect.stringContaining('county-council-ballroom'),
    });
    expect(layer.sources).toEqual({ avif: layer.avif, webp: layer.webp });
    expect(layer.focalRectangles.moderatorFace).toBeNull();
    expect(layer.crop.core).toEqual({ x: 0.125, y: 0, width: 0.75, height: 1 });
    expect(Object.isFrozen(layer)).toBe(true);
  });

  test('clears an incomplete sentence from the next round bubble', () => {
    const scene = gameCatalog.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_829,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    const nounSlot = state.draft!.board.slots.find((slot) => {
      const phrase = gameCatalog.phrases.find(
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

    const snapshot = createMatchScreenSnapshot(state, englishGameLocale);
    const waitingPlayer = snapshot.players.find((player) => !player.isActive)!;
    expect(waitingPlayer.playerId).toBe(firstSpeakerId);
    expect(waitingPlayer.sentence).toBeNull();
    expect(snapshot.sentenceText).not.toBe(previousPublicSentence);
  });

  test('shows the new construction instead of a sentence from the previous round', () => {
    const scene = gameCatalog.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_831,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, firstSpeakerId, 'common-noun-037');
    state = selectPrivateCard(state, firstSpeakerId, 'common-noun-037');

    const secondSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, secondSpeakerId, 'common-noun-001');
    state = selectPrivateCard(state, secondSpeakerId, 'common-noun-001');
    state = withPrivateCard(state, firstSpeakerId, 'common-predicate-009-present');
    state = selectPrivateCard(
      state,
      firstSpeakerId,
      'common-predicate-009-present',
    );
    state = withPrivateCard(
      state,
      secondSpeakerId,
      'common-predicate-009-present',
    );
    state = selectPrivateCard(
      state,
      secondSpeakerId,
      'common-predicate-009-present',
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
    expect(createMatchScreenSnapshot(state, englishGameLocale).sentenceText).toBe(
      'Select a noun to begin.',
    );

    state = withPrivateCard(state, secondSpeakerId, 'common-noun-040');
    state = selectPrivateCard(state, secondSpeakerId, 'common-noun-040');
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstSpeakerId,
      payload: {},
    });
    const currentSentence =
      state.draft!.playerStates[secondSpeakerId]!.construction.previewText;
    const snapshot = createMatchScreenSnapshot(state, englishGameLocale);

    expect(snapshot.sentenceText).toBe(currentSentence);
    expect(snapshot.sentenceText).toBe('Your partner with a reserved public office');
  });

  test('keeps a private-card sentence public after its speaker ends the turn', () => {
    const scene = gameCatalog.scenes[0]!;
    const players = [configuredPlayer(0), configuredPlayer(1)] as const;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_830,
      players,
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, firstSpeakerId, 'common-noun-037');
    state = selectPrivateCard(state, firstSpeakerId, 'common-noun-037');

    const secondSpeakerId = state.activePlayerId;
    state = withPrivateCard(state, secondSpeakerId, 'common-noun-001');
    state = selectPrivateCard(state, secondSpeakerId, 'common-noun-001');
    state = accept(state, {
      type: 'commit-sentence',
      source: 'user',
      actorId: firstSpeakerId,
      payload: {},
    });

    const publicSentence =
      state.draft!.playerStates[firstSpeakerId]!.construction.previewText;
    const snapshot = createMatchScreenSnapshot(state, englishGameLocale);
    const waitingPlayer = snapshot.players.find((player) => !player.isActive)!;
    expect(waitingPlayer.playerId).toBe(firstSpeakerId);
    expect(waitingPlayer.sentence).toBe(publicSentence);
  });

  test('projects clause, finisher, weakness, combo, and comeback score components', () => {
    const scene = gameCatalog.scenes[0]!;
    let state = createMatchSetupState({
      schemaVersion: 1,
      seed: 20_260_832,
      players: [configuredPlayer(0), configuredPlayer(1)],
      sceneId: scene.id,
      scenePhraseIds: scene.phrasePool,
      generalPhraseIds: gameCatalog.phrases.map((phrase) => phrase.id),
      mode: 'hotseat',
      openingPlayerIndex: scene.openingPlayerIndex,
    });
    state = accept(state, lifecycleCommand('start-match'));
    state = accept(state, lifecycleCommand('prepare-round'));
    const firstId = state.playerOrder[0];
    const secondId = state.playerOrder[1];
    for (const [playerId, phraseId] of [
      [firstId, 'common-noun-001'],
      [secondId, 'common-noun-002'],
      [firstId, 'common-predicate-010-present'],
      [secondId, 'common-predicate-011-present'],
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
              phraseId: 'common-noun-001',
              text: 'National consensus',
              source: 'active',
            },
            {
              phraseId: 'common-predicate-010-present',
              text: 'belongs in a party museum',
              source: 'active',
            },
            {
              phraseId: 'common-ending-001',
              text: 'by emergency ordinance.',
              source: 'active',
            },
          ],
          sentenceDamage: 62,
          comebackBonus: 18,
          outgoingDamage: 80,
          weaknessActivated: true,
          comboMultiplier: 2,
          comebackActivated: true,
          comebackTier: 'strong',
          comebackClosingLine: 'And that closes the record.',
          score: {
            unroundedTotal: 62,
            finalDamage: 62,
            combo: {
              nounPhraseId: 'common-noun-001',
              phraseIndex: 0,
              chain: 2,
            },
            breakdown: [
              {
                kind: 'clause-base',
                operation: 'note',
                phraseIds: [
                  'common-noun-001',
                  'common-predicate-010-present',
                ],
                amount: 15,
              },
              {
                kind: 'weakness-match',
                operation: 'note',
                defenderTag: 'restraint',
                phraseId: 'common-noun-001',
                phraseIndex: 0,
              },
              {
                kind: 'weakness-multiplier',
                operation: 'note',
                factor: 2,
              },
              {
                kind: 'combo-multiplier',
                operation: 'note',
                nounPhraseIds: ['common-noun-001'],
                factor: 2,
              },
              {
                kind: 'clause-score',
                operation: 'add',
                phraseIds: [
                  'common-noun-001',
                  'common-predicate-010-present',
                ],
                amount: 60,
              },
              {
                kind: 'combo-chain',
                operation: 'note',
                nounPhraseId: 'common-noun-001',
                phraseIndex: 0,
                chain: 2,
              },
              {
                kind: 'finisher-bonus',
                operation: 'add',
                phraseId: 'common-ending-001',
                amount: 2,
              },
              {
                kind: 'unrounded-total',
                operation: 'total',
                amount: 62,
              },
              {
                kind: 'final-damage',
                operation: 'ceil',
                amount: 62,
              },
            ],
          },
        },
      },
    } as MatchResolution;

    const snapshot = createMatchScreenSnapshot(
      reviewState,
      englishGameLocale,
      null,
      reviewResolution,
    );

    expect(snapshot.reaction.players[firstId]!.scoreComponents).toEqual([
      {
        kind: 'clause',
        narrationIndex: 1,
        phraseText: 'National consensus belongs in a party museum',
        base: 15,
        restrictionFactor: 1,
        weaknessFactor: 2,
        comboFactor: 2,
        amount: 60,
        weaknessTags: ['restraint'],
      },
      {
        kind: 'finisher',
        narrationIndex: 2,
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
        narrationIndex: 3,
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
      comboBonusDamage: 30,
      weaknessFactor: 2,
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
  const character = gameCatalog.characters[index]!;
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
