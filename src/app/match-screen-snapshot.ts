import { msg } from '@lit/localize';
import type { Phrase } from '../content/schemas';
import {
  snapshotDraftStateForPlayer,
  type ComebackTier,
  type DraftCardReference,
} from '../engine/draft-actions';
import type { ComboFinisherScore } from '../engine/combo-finisher-scoring';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
} from '../engine/grammar/english-grammar-adapter';
import type { MatchResolution, MatchState } from '../engine/match-lifecycle';
import { characterPortraitUrls, sampleContent } from '../game-content';
import { deepFreeze } from './deep-freeze';

const sceneMediaUrls: Readonly<Record<string, string>> = {
  'transition-era-television-studio': new URL(
    '../assets/scenes/transition-era-television-studio.png',
    import.meta.url,
  ).href,
  'transition-era-television-studio-desks': new URL(
    '../assets/scenes/transition-era-television-studio-desks.png',
    import.meta.url,
  ).href,
  'modern-debate-studio': new URL(
    '../assets/scenes/modern-debate-studio.png',
    import.meta.url,
  ).href,
  'modern-debate-studio-desks': new URL(
    '../assets/scenes/modern-debate-studio-desks.png',
    import.meta.url,
  ).href,
};

type MatchCardState = 'disabled' | 'empty' | 'legal' | 'selected';
type MatchCardAction = 'select' | null;

export type MatchArenaReaction = Readonly<{
  kind: 'grammar-mistake';
  playerId: string;
  damage: number;
  sequence: number;
}>;

export type MatchCardView = Readonly<{
  slotIndex: number;
  reference: DraftCardReference | null;
  phraseId: string | null;
  text: string;
  role: Phrase['role'] | null;
  rarity: Phrase['rarity'] | null;
  ownership: 'Private' | 'Shared';
  state: MatchCardState;
  stateLabel: string;
  knownWeaknesses: readonly string[];
  disabledReason: string | null;
  action: MatchCardAction;
  previewText: string;
}>;

export type MatchPlayerView = Readonly<{
  playerId: string;
  characterId: string;
  characterName: string;
  portraitUrl: string;
  pride: number;
  isActive: boolean;
  sentence: string | null;
  comebackLine: string | null;
  status: 'building' | 'ended';
}>;

export type MatchSceneLayerView = Readonly<{
  assetId: string;
  depth: number;
  url: string;
}>;

export type MatchScreenSnapshot = Readonly<{
  revision: number;
  phase: MatchState['phase'];
  roundReview: boolean;
  victory: Readonly<{
    winnerId: string;
    winnerName: string;
    completedRounds: number;
  }> | null;
  round: number;
  sceneName: string;
  sceneLayers: readonly MatchSceneLayerView[];
  activePlayerId: string;
  activePlayerName: string;
  sentenceText: string;
  sentenceComplete: boolean;
  sharedCards: readonly MatchCardView[];
  privateCards: readonly MatchCardView[];
  players: readonly [MatchPlayerView, MatchPlayerView];
  timer: Readonly<{
    sequence: number;
    durationSeconds: 30;
  }>;
  actions: Readonly<{
    canCommit: boolean;
    canRedraw: boolean;
    redrawUsed: boolean;
    comebackTiers: readonly ComebackTier[];
  }>;
  arenaReaction: Readonly<{
    kind: MatchArenaReaction['kind'];
    playerId: string;
    playerName: string;
    damage: number;
    sequence: number;
  }> | null;
  reaction: Readonly<{
    round: number | null;
    outcomeLabel: string;
    players: Readonly<
      Record<
        string,
        Readonly<{
          damage: number;
          selfDamage: number;
          comboFactor: number;
          comboBonusDamage: number;
          weaknesses: readonly string[];
        }>
      >
    >;
  }>;
}>;

export function createMatchScreenSnapshot(
  state: MatchState,
  arenaReaction: MatchArenaReaction | null = null,
  reviewResolution: MatchResolution | null = null,
  victory: Readonly<{ winnerId: string; completedRounds: number }> | null = null,
): MatchScreenSnapshot {
  if (!state.draft) {
    throw new Error('The match screen needs an active draft snapshot.');
  }

  const activePlayerId =
    reviewResolution === null
      ? state.activePlayerId
      : ([
          ...state.playerOrder.filter(
            (playerId) => reviewResolution.players[playerId]?.comebackActivated,
          ),
          state.activePlayerId,
          ...state.playerOrder,
        ].find(
          (playerId) => reviewResolution.players[playerId]?.completeValidInsult,
        ) ?? state.activePlayerId);
  const activePlayer = state.draft.playerStates[activePlayerId];
  if (!activePlayer) {
    throw new Error(`The active player "${activePlayerId}" is missing.`);
  }
  const opponentId = state.playerOrder.find(
    (playerId) => playerId !== activePlayerId,
  )!;
  const opponent = state.draft.playerStates[opponentId]!;
  const viewerSnapshot = snapshotDraftStateForPlayer(
    state.draft,
    activePlayerId,
  );
  const phraseById = new Map(
    sampleContent.phrases.map((phrase) => [phrase.id, phrase]),
  );
  const selectedPhraseIds = new Set(
    Object.values(state.draft.playerStates).flatMap((player) =>
      player.construction.selectedCards.map((card) => card.phraseId),
    ),
  );

  const sharedCards = state.draft.board.slots.map((slot, slotIndex) => {
    const phrase = phraseById.get(slot.phraseId)!;
    const reference: DraftCardReference = {
      source: 'shared',
      cardId: slot.id,
    };
    if (!slot.available) {
      return emptyCard(
        slotIndex,
        'Shared',
        selectedPhraseIds.has(phrase.id) ? 'selected' : 'empty',
        phrase,
      );
    }
    return availableCard(
      state,
      activePlayerId,
      phrase,
      reference,
      slotIndex,
      'Shared',
      opponent.weaknessTags,
    );
  });

  const privateSlots = Array.from<MatchCardView | undefined>({ length: 2 });
  for (const card of activePlayer.hand) {
    const parsedIndex = Number(card.id.match(/(\d+)$/u)?.[1] ?? 1) - 1;
    const slotIndex = parsedIndex === 1 ? 1 : 0;
    const phrase = phraseById.get(card.phraseId)!;
    const reference: DraftCardReference = {
      source: 'private',
      cardId: card.id,
    };
    privateSlots[slotIndex] = availableCard(
      state,
      activePlayerId,
      phrase,
      reference,
      slotIndex,
      'Private',
      opponent.weaknessTags,
    );
  }
  const privateCards = privateSlots.map(
    (card, slotIndex) => card ?? emptyCard(slotIndex, 'Private', 'empty'),
  );

  const players = state.playerOrder.map((playerId) => {
    const player = state.playerStates[playerId]!;
    const draftPlayer = viewerSnapshot.players[playerId]!;
    const currentPublicSentence =
      draftPlayer.construction.previewText?.trim() ?? '';
    return {
      playerId,
      characterId: player.characterId,
      characterName: characterName(player.characterId),
      portraitUrl: characterPortraitUrl(player.characterId),
      pride: reviewResolution?.players[playerId]?.prideAfter ?? player.pride,
      isActive: playerId === activePlayerId,
      sentence:
        reviewResolution?.players[playerId]?.constructionText ||
        currentPublicSentence ||
        latestPublicSentence(state, playerId) ||
        null,
      comebackLine: draftPlayer.construction.comebackClosingLine,
      status: draftPlayer.construction.status,
    } satisfies MatchPlayerView;
  }) as [MatchPlayerView, MatchPlayerView];

  const reactionPlayers = Object.fromEntries(
    state.playerOrder.map((playerId) => {
      const result = reviewResolution?.players[playerId];
      const combo = comboDamageDetails(result?.score ?? null);
      const weaknesses = weaknessDamageDetails(result?.score ?? null);
      return [
        playerId,
        {
          damage: result?.outgoingDamage ?? 0,
          selfDamage: result?.selfDamage ?? 0,
          comboFactor: combo.factor,
          comboBonusDamage: combo.bonusDamage,
          weaknesses,
        },
      ];
    }),
  );
  const activeName = characterName(activePlayer.characterId);
  const arenaReactionPlayer = arenaReaction
    ? state.playerStates[arenaReaction.playerId]
    : undefined;
  const reviewSentence =
    reviewResolution?.players[activePlayerId]?.constructionText?.trim() ||
    latestPublicSentence(state, activePlayerId);

  return deepFreeze({
    revision: state.commandHistory.length,
    phase: victory ? 'results' : state.phase,
    roundReview: reviewResolution !== null,
    victory: victory
      ? {
          winnerId: victory.winnerId,
          winnerName: characterName(
            state.playerStates[victory.winnerId]!.characterId,
          ),
          completedRounds: victory.completedRounds,
        }
      : null,
    round: state.round,
    sceneName: gameMessage(
      sampleContent.scenes.find((scene) => scene.id === state.sceneId)?.nameKey,
    ),
    sceneLayers: sceneLayerViews(state.sceneId),
    activePlayerId,
    activePlayerName: activeName,
    sentenceText:
      reviewSentence ||
      activePlayer.construction.previewText ||
      (reviewResolution
        ? msg('No public sentence was completed.')
        : msg('Select a noun to begin.')),
    sentenceComplete: activePlayer.construction.analysis.complete,
    sharedCards,
    privateCards,
    players,
    timer: {
      sequence: state.draft.turn.sequence,
      durationSeconds: state.draft.turn.durationSeconds,
    },
    actions: {
      canCommit:
        reviewResolution === null &&
        activePlayer.construction.status === 'building',
      canRedraw:
        reviewResolution === null &&
        activePlayer.construction.status === 'building' &&
        !activePlayer.redrawUsed,
      redrawUsed: activePlayer.redrawUsed,
      comebackTiers:
        reviewResolution === null ? activePlayer.availableComebackTiers : [],
    },
    arenaReaction:
      reviewResolution === null && arenaReaction && arenaReactionPlayer
        ? {
            ...arenaReaction,
            playerName: characterName(arenaReactionPlayer.characterId),
          }
        : null,
    reaction: {
      round: reviewResolution?.round ?? null,
      outcomeLabel: reviewResolution
        ? roundOutcomeLabel(state, reviewResolution)
        : msg('The chamber is waiting for its first exchange.'),
      players: reactionPlayers,
    },
  });
}

function comboDamageDetails(
  score: ComboFinisherScore | null,
): Readonly<{ factor: number; bonusDamage: number }> {
  if (!score) return { factor: 1, bonusDamage: 0 };
  let clauseFactor = 1;
  let factor = 1;
  let bonusDamage = 0;
  for (const item of score.breakdown) {
    if (item.kind === 'clause-base') clauseFactor = 1;
    if (item.kind === 'combo-multiplier') {
      clauseFactor = item.factor;
      factor = Math.max(factor, item.factor);
    }
    if (item.kind === 'clause-score' && clauseFactor > 1) {
      bonusDamage += item.amount - item.amount / clauseFactor;
      clauseFactor = 1;
    }
  }
  return { factor, bonusDamage: Math.max(0, Math.round(bonusDamage)) };
}

function weaknessDamageDetails(
  score: ComboFinisherScore | null,
): readonly string[] {
  if (!score) return [];
  return [
    ...new Set(
      score.breakdown.flatMap((item) =>
        item.kind === 'weakness-match' ? [item.defenderTag] : [],
      ),
    ),
  ];
}

function roundOutcomeLabel(
  state: MatchState,
  resolution: MatchResolution,
): string {
  const [firstId, secondId] = state.playerOrder;
  const firstDamage = resolution.players[firstId]!.outgoingDamage;
  const secondDamage = resolution.players[secondId]!.outgoingDamage;
  if (firstDamage === secondDamage)
    return msg(`Round ${resolution.round} result: tie`);
  const winnerId = firstDamage > secondDamage ? firstId : secondId;
  return msg(
    `Round ${resolution.round} winner: ${characterName(state.playerStates[winnerId]!.characterId)}`,
  );
}

function availableCard(
  state: MatchState,
  activePlayerId: string,
  phrase: Phrase,
  reference: DraftCardReference,
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  opponentWeaknessTags: readonly string[],
): MatchCardView {
  const construction = state.draft!.playerStates[activePlayerId]!.construction;
  const knownWeaknesses = weaknessMatches(phrase, opponentWeaknessTags);
  if (phrase.role === 'continuation') {
    return createCardView({
      slotIndex,
      reference,
      phrase,
      ownership,
      state: 'legal',
      action: 'select',
      previewText: msg(
        `${construction.previewText || 'Empty sentence'} — continue in the next round.`,
      ),
      knownWeaknesses,
      disabledReason: null,
    });
  }
  return createCardView({
    slotIndex,
    reference,
    phrase,
    ownership,
    state: 'legal',
    action: 'select',
    previewText:
      legalPreview(state, activePlayerId, phrase) || construction.previewText,
    knownWeaknesses,
    disabledReason: null,
  });
}

function createCardView(
  config: Readonly<{
    slotIndex: number;
    reference: DraftCardReference;
    phrase: Phrase;
    ownership: MatchCardView['ownership'];
    state: MatchCardState;
    action: MatchCardAction;
    previewText: string;
    knownWeaknesses: readonly string[];
    disabledReason: string | null;
  }>,
): MatchCardView {
  const text = gameMessage(config.phrase.textKey);
  const stateLabel = cardStateLabel(config.state);
  return {
    slotIndex: config.slotIndex,
    reference: config.reference,
    phraseId: config.phrase.id,
    text,
    role: config.phrase.role,
    rarity: config.phrase.rarity,
    ownership: config.ownership,
    state: config.state,
    stateLabel,
    knownWeaknesses: config.knownWeaknesses,
    disabledReason: config.disabledReason,
    action: config.action,
    previewText: config.previewText,
  };
}

function emptyCard(
  slotIndex: number,
  ownership: MatchCardView['ownership'],
  state: Extract<MatchCardState, 'empty' | 'selected'>,
  phrase?: Phrase,
): MatchCardView {
  const stateLabel = state === 'selected' ? msg('Selected') : msg('Empty');
  return {
    slotIndex,
    reference: null,
    phraseId: phrase?.id ?? null,
    text: '',
    role: phrase?.role ?? null,
    rarity: phrase?.rarity ?? null,
    ownership,
    state,
    stateLabel,
    knownWeaknesses: [],
    disabledReason: msg('This slot is empty.'),
    action: null,
    previewText: '',
  };
}

function legalPreview(
  state: MatchState,
  activePlayerId: string,
  phrase: Phrase,
): string {
  const player = state.draft!.playerStates[activePlayerId]!;
  const result = englishGrammarAdapter.analyze({
    steps: [
      ...player.construction.steps,
      {
        kind: 'phrase',
        phrase: prepareEnglishGrammarPhrase(phrase, sampleContent.locales[0]!),
      },
    ],
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  return result.accepted
    ? result.analysis.publicText
    : player.construction.previewText;
}

function latestPublicSentence(
  state: MatchState,
  playerId: string,
): string | null {
  for (let index = state.resolutionHistory.length - 1; index >= 0; index -= 1) {
    const sentence =
      state.resolutionHistory[index]?.players[
        playerId
      ]?.constructionText.trim();
    if (sentence) return sentence;
  }
  return null;
}

function weaknessMatches(
  phrase: Phrase,
  weaknessTags: readonly string[],
): readonly string[] {
  return weaknessTags.filter((tag) => phrase.tags.includes(tag));
}

function cardStateLabel(state: MatchCardState): string {
  switch (state) {
    case 'legal':
      return msg('Available');
    case 'selected':
      return msg('Selected');
    case 'empty':
      return msg('Empty');
    case 'disabled':
      return msg('Disabled');
  }
}

function characterName(characterId: string): string {
  return gameMessage(
    sampleContent.characters.find((character) => character.id === characterId)
      ?.nameKey,
  );
}

function characterPortraitUrl(characterId: string): string {
  const portraitUrl = characterPortraitUrls[characterId];
  if (!portraitUrl) {
    throw new Error(`Character "${characterId}" has no match portrait.`);
  }
  return portraitUrl;
}

function sceneLayerViews(sceneId: string): readonly MatchSceneLayerView[] {
  const scene = sampleContent.scenes.find(
    (candidate) => candidate.id === sceneId,
  );
  if (!scene) throw new Error(`Unknown match scene "${sceneId}".`);

  return scene.backgroundLayers.map(({ depth, media }) => {
    const url = sceneMediaUrls[media.assetId];
    if (!url) {
      throw new Error(
        `Scene "${sceneId}" layer "${media.assetId}" has no match asset.`,
      );
    }
    return { assetId: media.assetId, depth, url };
  });
}

function gameMessage(key: string | undefined): string {
  return key ? (sampleContent.locales[0]?.messages[key] ?? key) : '';
}
