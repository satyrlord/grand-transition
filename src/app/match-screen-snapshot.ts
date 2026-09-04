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
import type {
  MatchResolution,
  MatchResolutionPlayer,
  MatchState,
} from '../engine/match-lifecycle';
import { characterSkins, sampleContent } from '../game-content';
import { deepFreeze } from './deep-freeze';
import {
  resolveSceneAsset,
  sceneImageSizes,
  type SceneAssetSource,
  type SceneFallbackAsset,
  type ScenePoint,
  type SceneRectangle,
} from './scene-assets';

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
  skinId: string;
  characterName: string;
  portraitUrl: string;
  portraitAvifSrcSet: string | null;
  portraitWebpSrcSet: string | null;
  portraitSizes: string;
  portraitWidth: 2048;
  portraitHeight: 2048;
  pride: number;
  isActive: boolean;
  sentence: string | null;
  comebackLine: string | null;
  status: 'building' | 'ended';
}>;

export type MatchScoreComponentView = Readonly<{
  kind: 'clause' | 'comeback' | 'finisher';
  phraseText: string;
  base: number;
  restrictionFactor: number;
  weaknessFactor: number;
  comboFactor: number;
  amount: number;
  weaknessTags: readonly string[];
}>;

type MatchSceneLayerBase = Readonly<{
  assetId: string;
  depth: number;
  url: string;
  width: number;
  height: number;
  sizes: string;
  webp: SceneAssetSource;
}>;

export type MatchManifestSceneLayerView = MatchSceneLayerBase & Readonly<{
  kind: 'manifest';
  width: 1920;
  height: 1080;
  sizes: typeof sceneImageSizes;
  avif: SceneAssetSource;
  sources: Readonly<{
    avif: SceneAssetSource;
    webp: SceneAssetSource;
  }>;
  focalPoint: ScenePoint;
  focalRectangles: Readonly<Record<string, SceneRectangle | null>>;
  sharedSafeRectangles: Readonly<Record<string, SceneRectangle>>;
  crop: Readonly<{
    core: SceneRectangle;
    strategy: string;
  }>;
}>;

export type MatchFallbackSceneLayerView = MatchSceneLayerBase & Readonly<{
  kind: 'fallback';
  assetId: SceneFallbackAsset['id'];
  width: 1672;
  height: 941;
  sizes: '100vw';
  avif: null;
  sources: Readonly<{
    webp: SceneAssetSource;
  }>;
}>;

export type MatchSceneLayerView =
  | MatchManifestSceneLayerView
  | MatchFallbackSceneLayerView;

export type MatchScreenSnapshot = Readonly<{
  revision: number;
  phase: MatchState['phase'];
  roundReview: boolean;
  victory: Readonly<{
    winnerId: string;
    winnerName: string;
    completedRounds: number;
    ladder: boolean;
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
          weaknessFactor: number;
          sentenceDamage: number;
          comebackBonus: number;
          scoreComponents: readonly MatchScoreComponentView[];
        }>
      >
    >;
  }>;
}>;

export function createMatchScreenSnapshot(
  state: MatchState,
  arenaReaction: MatchArenaReaction | null = null,
  reviewResolution: MatchResolution | null = null,
  victory: Readonly<{
    winnerId: string;
    completedRounds: number;
    ladder?: boolean;
  }> | null = null,
  skinIdsByPlayer: Readonly<Record<string, string>> = {},
  viewerId: string = state.activePlayerId,
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
    viewerId,
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
  for (const card of viewerSnapshot.players[activePlayerId]!.hand.cards ?? []) {
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
    const skin = characterSkin(player.characterId, skinIdsByPlayer[playerId]);
    const currentPublicSentence =
      draftPlayer.construction.previewText?.trim() ?? '';
    return {
      playerId,
      characterId: player.characterId,
      skinId: skin.id,
      characterName: characterName(player.characterId),
      portraitUrl: skin.portraitUrl,
      portraitAvifSrcSet: skin.avif?.srcSet ?? null,
      portraitWebpSrcSet: skin.webp?.srcSet ?? null,
      portraitSizes: skin.sizes,
      portraitWidth: skin.width,
      portraitHeight: skin.height,
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
      const weakness = weaknessDamageDetails(result?.score ?? null);
      return [
        playerId,
        {
          damage: result?.outgoingDamage ?? 0,
          selfDamage: result?.selfDamage ?? 0,
          comboFactor: combo.factor,
          comboBonusDamage: combo.bonusDamage,
          weaknesses: weakness.tags,
          weaknessFactor: weakness.factor,
          sentenceDamage: result?.sentenceDamage ?? 0,
          comebackBonus: result?.comebackBonus ?? 0,
          scoreComponents: scoreComponentViews(result),
        },
      ];
    }),
  );
  const activeName = characterName(activePlayer.characterId);
  const arenaReactionPlayer = arenaReaction
    ? state.playerStates[arenaReaction.playerId]
    : undefined;
  const reviewSentence = reviewResolution
    ? reviewResolution.players[activePlayerId]?.constructionText?.trim() ||
      latestPublicSentence(state, activePlayerId)
    : null;

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
          ladder: victory.ladder ?? false,
        }
      : null,
    round: state.round,
    sceneName: gameMessage(
      sampleContent.scenes.find((scene) => scene.id === state.sceneId)?.nameKey,
    ),
    sceneLayers: sceneLayerViews(state.sceneId),
    activePlayerId,
    activePlayerName: activeName,
    sentenceText: reviewResolution
      ? reviewSentence || msg('No public sentence was completed.')
      : activePlayer.construction.previewText || msg('Select a noun to begin.'),
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
        viewerId === activePlayerId &&
        activePlayer.construction.status === 'building',
      canRedraw:
        reviewResolution === null &&
        viewerId === activePlayerId &&
        activePlayer.construction.status === 'building' &&
        !activePlayer.redrawUsed,
      redrawUsed: activePlayer.redrawUsed,
      comebackTiers:
        reviewResolution === null && viewerId === activePlayerId
          ? activePlayer.availableComebackTiers
          : [],
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

function scoreComponentViews(
  result: MatchResolutionPlayer | undefined,
): readonly MatchScoreComponentView[] {
  if (!result) return [];
  const phraseTextById = new Map(
    result.constructionPhrases.map((phrase) => [phrase.phraseId, phrase.text]),
  );
  const phraseById = new Map(
    sampleContent.phrases.map((phrase) => [phrase.id, phrase]),
  );
  const components: MatchScoreComponentView[] = [];
  let clause:
    | {
        phraseIds: readonly string[];
        base: number;
        restrictionFactor: number;
        weaknessFactor: number;
        comboFactor: number;
        weaknessTags: string[];
      }
    | undefined;
  let finisherRestrictionFactor = 1;
  let finisherWeaknessFactor = 1;
  let finisherWeaknessTags: string[] = [];

  for (const item of result.score?.breakdown ?? []) {
    switch (item.kind) {
      case 'clause-base':
        clause = {
          phraseIds: item.phraseIds,
          base: item.amount,
          restrictionFactor: 1,
          weaknessFactor: 1,
          comboFactor: 1,
          weaknessTags: [],
        };
        break;
      case 'restriction-multiplier':
        if (clause) clause.restrictionFactor = item.factor;
        else finisherRestrictionFactor = item.factor;
        break;
      case 'weakness-match':
        if (clause) clause.weaknessTags.push(item.defenderTag);
        else finisherWeaknessTags.push(item.defenderTag);
        break;
      case 'weakness-multiplier':
        if (clause) clause.weaknessFactor = item.factor;
        else finisherWeaknessFactor = item.factor;
        break;
      case 'combo-multiplier':
        if (clause) clause.comboFactor = item.factor;
        break;
      case 'clause-score':
        if (!clause) break;
        components.push({
          kind: 'clause',
          phraseText: scorePhraseText(clause.phraseIds, phraseTextById),
          base: clause.base,
          restrictionFactor: clause.restrictionFactor,
          weaknessFactor: clause.weaknessFactor,
          comboFactor: clause.comboFactor,
          amount: item.amount,
          weaknessTags: [...new Set(clause.weaknessTags)],
        });
        clause = undefined;
        break;
      case 'finisher-bonus': {
        const phrase = phraseById.get(item.phraseId);
        components.push({
          kind: 'finisher',
          phraseText:
            phraseTextById.get(item.phraseId) ??
            (phrase ? gameMessage(phrase.textKey) : msg('Finisher')),
          base: phrase?.finisherBonus ?? item.amount,
          restrictionFactor: finisherRestrictionFactor,
          weaknessFactor: finisherWeaknessFactor,
          comboFactor: 1,
          amount: item.amount,
          weaknessTags: [...new Set(finisherWeaknessTags)],
        });
        finisherRestrictionFactor = 1;
        finisherWeaknessFactor = 1;
        finisherWeaknessTags = [];
        break;
      }
      default:
        break;
    }
  }

  if (result.comebackBonus > 0) {
    components.push({
      kind: 'comeback',
      phraseText: result.comebackClosingLine ?? msg('Comeback'),
      base: result.comebackBonus,
      restrictionFactor: 1,
      weaknessFactor: 1,
      comboFactor: 1,
      amount: result.comebackBonus,
      weaknessTags: [],
    });
  }
  return components;
}

function scorePhraseText(
  phraseIds: readonly string[],
  phraseTextById: ReadonlyMap<string, string>,
): string {
  return phraseIds
    .map((phraseId) => phraseTextById.get(phraseId) ?? phraseId)
    .join(' ');
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
  return { factor, bonusDamage: Math.max(0, bonusDamage) };
}

function weaknessDamageDetails(
  score: ComboFinisherScore | null,
): Readonly<{ factor: number; tags: readonly string[] }> {
  if (!score) return { factor: 1, tags: [] };
  return {
    factor: score.breakdown.reduce(
      (factor, item) =>
        item.kind === 'weakness-multiplier'
          ? Math.max(factor, item.factor)
          : factor,
      1,
    ),
    tags: [
      ...new Set(
        score.breakdown.flatMap((item) =>
          item.kind === 'weakness-match' ? [item.defenderTag] : [],
        ),
      ),
    ],
  };
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
    const player = state.resolutionHistory[index]?.players[playerId];
    const sentence =
      player?.constructionStatus === 'valid'
        ? player.constructionText.trim()
        : '';
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

function characterSkin(characterId: string, skinId?: string) {
  const skins = characterSkins[characterId];
  const skin = skins?.find((candidate) => candidate.id === skinId) ?? skins?.[0];
  if (!skin) throw new Error(`Character "${characterId}" has no match skin.`);
  return skin;
}

function sceneLayerViews(sceneId: string): readonly MatchSceneLayerView[] {
  const scene = sampleContent.scenes.find(
    (candidate) => candidate.id === sceneId,
  );
  if (!scene) throw new Error(`Unknown match scene "${sceneId}".`);

  return scene.backgroundLayers.map(({ depth, media }) => {
    const asset = resolveSceneAsset(media.assetId);
    if (asset.kind === 'fallback') {
      return fallbackSceneLayerView(asset, depth);
    }
    return {
      kind: 'manifest',
      assetId: asset.id,
      depth,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      sizes: sceneImageSizes,
      avif: asset.avif,
      webp: asset.webp,
      sources: {
        avif: asset.avif,
        webp: asset.webp,
      },
      focalPoint: asset.focalPoint,
      focalRectangles: asset.focalRectangles,
      sharedSafeRectangles: asset.sharedSafeRectangles,
      crop: asset.crop,
    };
  });
}

function fallbackSceneLayerView(
  asset: SceneFallbackAsset,
  depth: number,
): MatchFallbackSceneLayerView {
  return {
    kind: 'fallback',
    assetId: asset.id,
    depth,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    sizes: asset.sizes,
    avif: null,
    webp: asset.webp,
    sources: {
      webp: asset.webp,
    },
  };
}

function gameMessage(key: string | undefined): string {
  return key ? (sampleContent.locales[0]?.messages[key] ?? key) : '';
}
