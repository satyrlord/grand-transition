import type { Character, Phrase } from '../content/schemas';
import type { GameLocaleBundle } from '../localization/game-locale-schema';
import {
  generateBoard,
  type BoardGenerationFailure,
  type BoardGenerationRequest,
  type BoardSlot,
  type GeneratedBoard,
} from './board-generation';
import {
  availableComebackTiers,
  selectComebackTier,
  type ComebackSelection,
  type ComebackTier,
  type ContinuationCarry,
} from './continuation-comeback-resolution';
import type {
  GameCommand,
  GameReducer,
  GameState,
  ReducerResult,
  RuleError,
} from './game-contracts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarAnalysis,
  type EnglishGrammarRole,
  type EnglishGrammarStep,
  type GrammaticalNumber,
} from './grammar/english-grammar-adapter';
import {
  generatePrivateHand,
  type PrivateHandGenerationFailure,
  type PrivateHandGenerationRequest,
} from './private-hand-generation';
import { seededRandomSource, type RandomSource } from './random-source';

export const draftRuleErrorCodes = [
  'wrong-phase',
  'wrong-actor',
  'card-unavailable',
  'card-not-owned',
  'sentence-incomplete',
  'redraw-already-used',
  'redraw-unavailable',
  'comeback-already-selected',
  'comeback-unaffordable',
] as const;
export const grammarMistakeSelfDamage = 3;
const maximumRoundDealAttempts = 32;

export type DraftRuleErrorCode = (typeof draftRuleErrorCodes)[number];
export type { ComebackTier };
export type DraftCardSource = 'private' | 'shared';

export type DraftCardReference = Readonly<{
  source: DraftCardSource;
  cardId: string;
}>;

export type DraftCommand =
  | GameCommand<
      'select-phrase',
      {
        readonly card: DraftCardReference;
      }
    >
  | GameCommand<'redraw-hand', Record<never, never>>
  | GameCommand<'commit-sentence', Record<never, never>>
  | GameCommand<'select-comeback', Record<never, never>>
  | GameCommand<'expire-turn', Record<never, never>>;

export type DraftHandCard = Readonly<{
  id: string;
  phraseId: string;
}>;

export type DraftBoardSlot = BoardSlot & Readonly<{ available: boolean }>;
export type DraftBoard = Readonly<{
  seed: number;
  nextSeed: number;
  slots: readonly DraftBoardSlot[];
}>;

export type DraftConstruction = Readonly<{
  status: 'building' | 'ended';
  steps: readonly EnglishGrammarStep[];
  analysis: EnglishGrammarAnalysis;
  previewText: string;
  requiredRoles: readonly EnglishGrammarRole[];
  selectedCards: readonly Readonly<{
    phraseId: string;
    source: DraftCardSource | 'restored';
  }>[];
  carryIntent: boolean;
  selectedComebackTier: ComebackTier | null;
  selectedComeback: ComebackSelection | null;
  grammarMistakes: number;
  lastGrammarMistakePhraseId: string | null;
  expired: boolean;
}>;

export type DraftPlayerState = Readonly<{
  playerId: string;
  characterId: string;
  characterPhraseIds: readonly string[];
  weaknessTags: readonly string[];
  subjectNumber: GrammaticalNumber;
  objectNumber: GrammaticalNumber;
  hand: readonly DraftHandCard[];
  redrawUsed: boolean;
  consecutiveTimeouts: number;
  timeoutDamage: number;
  comebackCharge: number;
  availableComebackTiers: readonly ComebackTier[];
  construction: DraftConstruction;
  legalCards: readonly DraftCardReference[];
}>;

export type DraftBannerFact = Readonly<{
  kind: 'round-start';
  round: number;
  openingPlayerId: string;
}>;

export type DraftTurnFacts = Readonly<{
  sequence: number;
  durationSeconds: 10;
  activePlayerId: string | null;
}>;

export type DraftLogEntry = Readonly<{
  type: 'round-start' | DraftCommand['type'];
  actorId: string | null;
  cardSource?: DraftCardSource;
}>;

export type DraftState = GameState<
  'draft-complete' | 'drafting',
  string,
  DraftBoard,
  DraftPlayerState
> &
  Readonly<{
    playerOrder: readonly [string, string];
    generalPhraseIds: readonly string[];
    scenePhraseIds: readonly string[];
    reservedPhraseIds: readonly string[];
    banner: DraftBannerFact;
    turn: DraftTurnFacts;
    publicLog: readonly DraftLogEntry[];
  }>;

export type DraftRuleError = RuleError<
  DraftRuleErrorCode,
  {
    readonly commandType: DraftCommand['type'];
    readonly actorId: string | null;
  }
>;

export type DraftEngineContext = Readonly<{
  phrases: readonly Phrase[];
  characters: readonly Character[];
  locale: GameLocaleBundle;
}>;

export type DraftPlayerSetup = Readonly<{
  playerId: string;
  characterId: string;
  characterPhraseIds: readonly string[];
  weaknessTags: readonly string[];
  subjectNumber: GrammaticalNumber;
  objectNumber: GrammaticalNumber;
  comebackCharge?: number;
  restoredCarry?: ContinuationCarry;
}>;

export type DraftRoundPreparationRequest = Readonly<{
  schemaVersion: number;
  mode: string;
  round: number;
  seed: number;
  sceneId: string;
  scenePhraseIds: readonly string[];
  generalPhraseIds: readonly string[];
  phrases: readonly Phrase[];
  characters: readonly Character[];
  locale: GameLocaleBundle;
  players: readonly [DraftPlayerSetup, DraftPlayerSetup];
  previousOpeningPlayerId?: string;
  timerSeconds: 10;
  commandHistory?: readonly GameCommand[];
}>;

export type DraftPreparationFailure =
  BoardGenerationFailure | PrivateHandGenerationFailure;

export type DraftPreparationResult =
  | Readonly<{ ok: true; state: DraftState }>
  | Readonly<{ ok: false; error: DraftPreparationFailure }>;

export type DraftPlayerSnapshot = Readonly<{
  playerId: string;
  characterId: string;
  hand: Readonly<{
    count: number;
    cards?: readonly DraftHandCard[];
  }>;
  redrawUsed: boolean;
  comebackCharge: number;
  availableComebackTiers: readonly ComebackTier[];
  construction: Readonly<{
    status: 'building' | 'ended';
    previewText: string | null;
    complete: boolean;
    requiredRoles: readonly EnglishGrammarRole[];
    carryIntent: boolean;
    selectedComebackTier: ComebackTier | null;
    comebackClosingLine: string | null;
    expired: boolean;
  }>;
  legalCards: readonly DraftCardReference[];
}>;

export type DraftSnapshot = Readonly<{
  phase: DraftState['phase'];
  round: number;
  openingPlayerId: string;
  activePlayerId: string;
  board: DraftBoard;
  banner: DraftBannerFact;
  turn: DraftTurnFacts;
  players: Readonly<Record<string, DraftPlayerSnapshot>>;
  log: readonly DraftLogEntry[];
}>;

interface ResolvedCard {
  readonly reference: DraftCardReference;
  readonly phrase: Phrase;
}

export function prepareDraftRound(
  request: DraftRoundPreparationRequest,
  randomSource: RandomSource = seededRandomSource,
): DraftPreparationResult {
  const openingPlayerId = chooseOpeningPlayer(
    request.players,
    request.previousOpeningPlayerId,
  );
  const constructions = new Map(
    request.players.map((player) => [
      player.playerId,
      createConstruction(player),
    ]),
  );

  let seed = request.seed;
  let board: GeneratedBoard | null = null;
  let hands = new Map<string, readonly [string, string]>();
  let reservedPhraseIds: string[] = [];
  let lastBoardFailure: BoardGenerationFailure | null = null;
  for (let attempt = 0; attempt < maximumRoundDealAttempts; attempt += 1) {
    const attemptHands = new Map<string, readonly [string, string]>();
    const attemptReservedPhraseIds: string[] = [];
    let attemptSeed = seed;
    for (const player of request.players) {
      const handResult = generatePrivateHand(
        privateHandRequest(
          attemptSeed,
          request,
          player,
          attemptReservedPhraseIds,
        ),
        randomSource,
      );
      if (!handResult.ok) return handResult;
      attemptSeed = handResult.hand.nextSeed;
      attemptHands.set(player.playerId, handResult.hand.phraseIds);
      attemptReservedPhraseIds.push(...handResult.hand.phraseIds);
    }
    const boardResult = generateBoard(
      boardRequest(request, attemptSeed, attemptReservedPhraseIds),
      randomSource,
    );
    if (boardResult.ok) {
      board = boardResult.board;
      seed = board.nextSeed;
      hands = attemptHands;
      reservedPhraseIds = [
        ...attemptReservedPhraseIds,
        ...board.slots.map((slot) => slot.phraseId),
      ];
      break;
    }
    lastBoardFailure = boardResult.error;
    seed = randomSource.next(attemptSeed).nextSeed;
  }
  if (!board) {
    return { ok: false, error: lastBoardFailure! };
  }
  const playerStates: Record<string, DraftPlayerState> = {};

  for (const player of request.players) {
    const construction = constructions.get(player.playerId)!;
    const phraseIds = hands.get(player.playerId)!;
    playerStates[player.playerId] = {
      ...player,
      comebackCharge: player.comebackCharge ?? 0,
      availableComebackTiers: availableComebackTiers(
        player.comebackCharge ?? 0,
      ),
      hand: phraseIds.map((phraseId, cardIndex) => ({
        id: `hand-${request.round}-${player.playerId}-${cardIndex + 1}`,
        phraseId,
      })),
      redrawUsed: false,
      consecutiveTimeouts: 0,
      timeoutDamage: 0,
      construction,
      legalCards: [],
    };
  }

  const availableRoundBoard = availableBoard(board);
  const banner: DraftBannerFact = {
    kind: 'round-start',
    round: request.round,
    openingPlayerId,
  };
  const baseState: DraftState = {
    schemaVersion: request.schemaVersion,
    seed,
    phase: 'drafting',
    mode: request.mode,
    round: request.round,
    openingPlayerId,
    activePlayerId: openingPlayerId,
    sceneId: request.sceneId,
    board: availableRoundBoard,
    playerStates,
    commandHistory: request.commandHistory ?? [],
    playerOrder: request.players.map((player) => player.playerId) as [
      string,
      string,
    ],
    generalPhraseIds: request.generalPhraseIds,
    scenePhraseIds: request.scenePhraseIds,
    reservedPhraseIds,
    banner,
    turn: {
      sequence: 1,
      durationSeconds: request.timerSeconds,
      activePlayerId: openingPlayerId,
    },
    publicLog: [{ type: 'round-start', actorId: null }],
  };

  return {
    ok: true,
    state: recalculatePlayers(baseState, {
      phrases: request.phrases,
      characters: request.characters,
      locale: request.locale,
    }),
  };
}

export function createDraftReducer(
  context: DraftEngineContext,
): GameReducer<DraftState, DraftCommand, DraftRuleError> {
  return (state, command, randomSource) =>
    reduceDraftCommand(state, command, context, randomSource);
}

export function snapshotDraftStateForPlayer(
  state: DraftState,
  viewerId: string,
): DraftSnapshot {
  const players = Object.fromEntries(
    state.playerOrder.map((playerId) => {
      const player = state.playerStates[playerId]!;
      const isViewer = playerId === viewerId;
      const hasPrivateSelection = player.construction.selectedCards.some(
        (card) => card.source === 'private',
      );
      return [
        playerId,
        {
          playerId,
          characterId: player.characterId,
          hand: isViewer
            ? { count: player.hand.length, cards: player.hand }
            : { count: player.hand.length },
          redrawUsed: player.redrawUsed,
          comebackCharge: player.comebackCharge,
          availableComebackTiers: player.availableComebackTiers,
          construction: {
            status: player.construction.status,
            previewText:
              isViewer || !hasPrivateSelection
                ? player.construction.previewText
                : null,
            complete: player.construction.analysis.complete,
            requiredRoles: player.construction.requiredRoles,
            carryIntent: player.construction.carryIntent,
            selectedComebackTier: player.construction.selectedComebackTier,
            comebackClosingLine:
              player.construction.selectedComeback?.closingLine ?? null,
            expired: player.construction.expired,
          },
          legalCards: isViewer ? player.legalCards : [],
        } satisfies DraftPlayerSnapshot,
      ];
    }),
  );

  return {
    phase: state.phase,
    round: state.round,
    openingPlayerId: state.openingPlayerId,
    activePlayerId: state.activePlayerId,
    board: state.board,
    banner: state.banner,
    turn: state.turn,
    players,
    log: state.publicLog,
  };
}

function reduceDraftCommand(
  state: DraftState,
  command: DraftCommand,
  context: DraftEngineContext,
  randomSource: RandomSource,
): ReducerResult<DraftState, DraftRuleError> {
  if (state.phase !== 'drafting') return reject(command, 'wrong-phase');
  if (!command.actorId || command.actorId !== state.activePlayerId) {
    return reject(command, 'wrong-actor');
  }

  const player = state.playerStates[command.actorId];
  if (!player || player.construction.status !== 'building') {
    return reject(command, 'wrong-actor');
  }

  switch (command.type) {
    case 'select-phrase':
      return selectPhrase(state, player, command, context);
    case 'redraw-hand':
      return redrawHand(state, player, command, context, randomSource);
    case 'commit-sentence':
      return commitSentence(state, player, command, context);
    case 'select-comeback':
      return selectComeback(state, player, command, context, randomSource);
    case 'expire-turn':
      return expireTurn(state, player, command, context);
  }
}

function selectPhrase(
  state: DraftState,
  player: DraftPlayerState,
  command: Extract<DraftCommand, { readonly type: 'select-phrase' }>,
  context: DraftEngineContext,
): ReducerResult<DraftState, DraftRuleError> {
  const resolved = resolveCard(state, player, command.payload.card, context);
  if ('code' in resolved) return reject(command, resolved.code);
  if (resolved.phrase.role === 'continuation') {
    const construction: DraftConstruction = {
      ...player.construction,
      status: 'ended',
      carryIntent: true,
      selectedCards: [
        ...player.construction.selectedCards,
        { phraseId: resolved.phrase.id, source: resolved.reference.source },
      ],
    };
    return acceptCardAction(
      state,
      player,
      command,
      resolved,
      construction,
      context,
    );
  }

  const step: EnglishGrammarStep = {
    kind: 'phrase',
    phrase: prepareEnglishGrammarPhrase(resolved.phrase, context.locale),
  };
  const analysis = englishGrammarAdapter.analyze({
    steps: [...player.construction.steps, step],
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!analysis.accepted) {
    const construction: DraftConstruction = {
      ...player.construction,
      grammarMistakes: player.construction.grammarMistakes + 1,
      lastGrammarMistakePhraseId: resolved.phrase.id,
    };
    return acceptCardAction(
      state,
      player,
      command,
      resolved,
      construction,
      context,
    );
  }

  const construction = constructionWithAnalysis(
    player.construction,
    [...player.construction.steps, step],
    analysis.analysis,
    {
      selectedCards: [
        ...player.construction.selectedCards,
        { phraseId: resolved.phrase.id, source: resolved.reference.source },
      ],
      status:
        analysis.analysis.state === 'ENDED' || resolved.phrase.role === 'ending'
          ? 'ended'
          : 'building',
    },
  );
  return acceptCardAction(
    state,
    player,
    command,
    resolved,
    construction,
    context,
  );
}

function redrawHand(
  state: DraftState,
  player: DraftPlayerState,
  command: Extract<DraftCommand, { readonly type: 'redraw-hand' }>,
  context: DraftEngineContext,
  randomSource: RandomSource,
): ReducerResult<DraftState, DraftRuleError> {
  if (player.redrawUsed) return reject(command, 'redraw-already-used');
  const handResult = generatePrivateHand(
    {
      seed: state.seed,
      playerId: player.playerId,
      characterId: player.characterId,
      sceneId: state.sceneId,
      phrases: context.phrases,
      characterPhraseIds: player.characterPhraseIds,
      scenePhraseIds: state.scenePhraseIds,
      generalPhraseIds: state.generalPhraseIds,
      excludedPhraseIds: state.reservedPhraseIds,
    },
    randomSource,
  );
  if (!handResult.ok) return reject(command, 'redraw-unavailable');

  const nextPlayer: DraftPlayerState = {
    ...player,
    hand: handResult.hand.phraseIds.map((phraseId, index) => ({
      id: `redraw-${state.round}-${player.playerId}-${index + 1}`,
      phraseId,
    })),
    redrawUsed: true,
  };
  return accept(
    {
      ...state,
      seed: handResult.hand.nextSeed,
      reservedPhraseIds: [
        ...state.reservedPhraseIds,
        ...handResult.hand.phraseIds,
      ],
      playerStates: { ...state.playerStates, [player.playerId]: nextPlayer },
    },
    command,
    context,
    true,
  );
}

function commitSentence(
  state: DraftState,
  player: DraftPlayerState,
  command: Extract<DraftCommand, { readonly type: 'commit-sentence' }>,
  context: DraftEngineContext,
): ReducerResult<DraftState, DraftRuleError> {
  const construction = endCompleteConstruction(player);
  return acceptPlayerAction(state, player, command, construction, context);
}

function selectComeback(
  state: DraftState,
  player: DraftPlayerState,
  command: Extract<DraftCommand, { readonly type: 'select-comeback' }>,
  context: DraftEngineContext,
  randomSource: RandomSource,
): ReducerResult<DraftState, DraftRuleError> {
  if (!player.construction.analysis.complete) {
    return reject(command, 'sentence-incomplete');
  }
  if (player.construction.selectedComeback) {
    return reject(command, 'comeback-already-selected');
  }
  const tier = player.availableComebackTiers.at(-1);
  if (!tier) return reject(command, 'comeback-unaffordable');
  const character = context.characters.find(
    (candidate) => candidate.id === player.characterId,
  );
  if (!character) throw new Error(`Unknown character "${player.characterId}".`);
  const selection = selectComebackTier({
    playerId: player.playerId,
    character,
    tier,
    phase: state.phase,
    constructionComplete: player.construction.analysis.complete,
    selectedComeback: player.construction.selectedComeback,
    charge: player.comebackCharge,
    seed: state.seed,
    commandHistory: state.commandHistory,
    locale: context.locale,
    randomSource,
  });
  if (!selection.ok) return reject(command, selection.error.code);
  const construction = {
    ...endCompleteConstruction(player),
    selectedComebackTier: tier,
    selectedComeback: selection.selection,
  };
  return acceptPlayerAction(
    { ...state, seed: selection.nextSeed },
    {
      ...player,
      comebackCharge: selection.charge,
      availableComebackTiers: availableComebackTiers(selection.charge),
    },
    command,
    construction,
    context,
  );
}

function expireTurn(
  state: DraftState,
  player: DraftPlayerState,
  command: Extract<DraftCommand, { readonly type: 'expire-turn' }>,
  context: DraftEngineContext,
): ReducerResult<DraftState, DraftRuleError> {
  const opponent =
    state.playerStates[
      state.playerOrder.find((playerId) => playerId !== player.playerId)!
    ]!;
  const shouldPenalize = opponent.construction.status === 'ended';
  const consecutiveTimeouts = shouldPenalize
    ? player.consecutiveTimeouts + 1
    : player.consecutiveTimeouts;
  const damage = shouldPenalize ? 3 * 2 ** (consecutiveTimeouts - 1) : 0;
  return accept(
    {
      ...state,
      playerStates: {
        ...state.playerStates,
        [player.playerId]: {
          ...player,
          consecutiveTimeouts,
          timeoutDamage: player.timeoutDamage + damage,
        },
      },
    },
    command,
    context,
    false,
  );
}

function acceptCardAction(
  state: DraftState,
  player: DraftPlayerState,
  command: DraftCommand,
  resolved: ResolvedCard,
  construction: DraftConstruction,
  context: DraftEngineContext,
): ReducerResult<DraftState, DraftRuleError> {
  const board =
    resolved.reference.source === 'shared'
      ? {
          ...state.board,
          slots: state.board.slots.map((slot) =>
            slot.id === resolved.reference.cardId
              ? { ...slot, available: false }
              : slot,
          ),
        }
      : state.board;
  const hand =
    resolved.reference.source === 'private'
      ? player.hand.filter((card) => card.id !== resolved.reference.cardId)
      : player.hand;
  const nextPlayer: DraftPlayerState = {
    ...player,
    hand,
    construction,
    consecutiveTimeouts: 0,
  };
  return accept(
    {
      ...state,
      board,
      playerStates: { ...state.playerStates, [player.playerId]: nextPlayer },
    },
    command,
    context,
    false,
    resolved.reference.source,
  );
}

function acceptPlayerAction(
  state: DraftState,
  player: DraftPlayerState,
  command: DraftCommand,
  construction: DraftConstruction,
  context: DraftEngineContext,
): ReducerResult<DraftState, DraftRuleError> {
  return accept(
    {
      ...state,
      playerStates: {
        ...state.playerStates,
        [player.playerId]: { ...player, construction },
      },
    },
    command,
    context,
    false,
  );
}

function accept(
  state: DraftState,
  command: DraftCommand,
  context: DraftEngineContext,
  keepTurn: boolean,
  cardSource?: DraftCardSource,
): ReducerResult<DraftState, DraftRuleError> {
  const turnState = keepTurn ? state : passTurn(state, command.actorId!);
  const acceptedState: DraftState = {
    ...turnState,
    commandHistory: [...turnState.commandHistory, command],
    publicLog: [
      ...turnState.publicLog,
      { type: command.type, actorId: command.actorId ?? null, cardSource },
    ],
  };
  return { ok: true, state: recalculatePlayers(acceptedState, context) };
}

function passTurn(state: DraftState, actorId: string): DraftState {
  const allEnded = state.playerOrder.every(
    (playerId) => state.playerStates[playerId]?.construction.status === 'ended',
  );
  if (allEnded) {
    return {
      ...state,
      phase: 'draft-complete',
      turn: {
        ...state.turn,
        sequence: state.turn.sequence + 1,
        activePlayerId: null,
      },
    };
  }

  const actorIndex = state.playerOrder.indexOf(actorId);
  const candidates = [
    state.playerOrder[(actorIndex + 1) % state.playerOrder.length]!,
    actorId,
  ];
  const activePlayerId = candidates.find(
    (playerId) =>
      state.playerStates[playerId]?.construction.status === 'building',
  )!;
  return {
    ...state,
    activePlayerId,
    turn: {
      ...state.turn,
      sequence: state.turn.sequence + 1,
      activePlayerId,
    },
  };
}

function recalculatePlayers(
  state: DraftState,
  context: DraftEngineContext,
): DraftState {
  const playerStates = Object.fromEntries(
    state.playerOrder.map((playerId) => {
      const player = state.playerStates[playerId]!;
      return [
        playerId,
        {
          ...player,
          legalCards:
            player.construction.status === 'building'
              ? collectLegalCards(state, player, context)
              : [],
        },
      ];
    }),
  );
  return { ...state, playerStates };
}

function collectLegalCards(
  state: DraftState,
  player: DraftPlayerState,
  context: DraftEngineContext,
): readonly DraftCardReference[] {
  const cards: ResolvedCard[] = [];
  const phrases = new Map(context.phrases.map((phrase) => [phrase.id, phrase]));

  for (const slot of state.board.slots) {
    const phrase = phrases.get(slot.phraseId);
    if (slot.available && phrase) {
      cards.push({
        reference: { source: 'shared', cardId: slot.id },
        phrase,
      });
    }
  }
  for (const card of player.hand) {
    const phrase = phrases.get(card.phraseId);
    if (phrase) {
      cards.push({
        reference: { source: 'private', cardId: card.id },
        phrase,
      });
    }
  }

  return cards
    .filter(({ phrase }) => {
      if (phrase.role === 'continuation') return true;
      const result = englishGrammarAdapter.analyze({
        steps: [
          ...player.construction.steps,
          {
            kind: 'phrase',
            phrase: prepareEnglishGrammarPhrase(phrase, context.locale),
          },
        ],
        subjectNumber: player.subjectNumber,
        objectNumber: player.objectNumber,
      });
      return result.accepted && result.analysis.legal;
    })
    .map((card) => card.reference);
}

function resolveCard(
  state: DraftState,
  player: DraftPlayerState,
  reference: DraftCardReference,
  context: DraftEngineContext,
): ResolvedCard | { readonly code: 'card-not-owned' | 'card-unavailable' } {
  const phraseById = new Map(
    context.phrases.map((phrase) => [phrase.id, phrase]),
  );
  if (reference.source === 'shared') {
    const slot = state.board.slots.find((item) => item.id === reference.cardId);
    if (!slot?.available) return { code: 'card-unavailable' };
    const phrase = phraseById.get(slot.phraseId);
    return phrase ? { reference, phrase } : { code: 'card-unavailable' };
  }

  const ownedCard = player.hand.find((card) => card.id === reference.cardId);
  if (!ownedCard) {
    const ownedByOtherPlayer = state.playerOrder.some(
      (playerId) =>
        playerId !== player.playerId &&
        state.playerStates[playerId]?.hand.some(
          (card) => card.id === reference.cardId,
        ),
    );
    return { code: ownedByOtherPlayer ? 'card-not-owned' : 'card-unavailable' };
  }
  const phrase = phraseById.get(ownedCard.phraseId);
  return phrase ? { reference, phrase } : { code: 'card-unavailable' };
}

function endCompleteConstruction(player: DraftPlayerState): DraftConstruction {
  const steps: readonly EnglishGrammarStep[] = [
    ...player.construction.steps,
    { kind: 'end' },
  ];
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!result.accepted) {
    throw new Error('A complete construction must accept an end step.');
  }
  return constructionWithAnalysis(player.construction, steps, result.analysis, {
    status: 'ended',
  });
}

function constructionWithAnalysis(
  construction: DraftConstruction,
  steps: readonly EnglishGrammarStep[],
  analysis: EnglishGrammarAnalysis,
  overrides: Partial<DraftConstruction>,
): DraftConstruction {
  return {
    ...construction,
    ...overrides,
    steps,
    analysis,
    previewText: analysis.publicText,
    requiredRoles: analysis.nextRoles,
  };
}

function createConstruction(player: DraftPlayerSetup): DraftConstruction {
  const steps = player.restoredCarry?.steps ?? [];
  const result = englishGrammarAdapter.analyze({
    steps,
    subjectNumber: player.subjectNumber,
    objectNumber: player.objectNumber,
  });
  if (!result.accepted) {
    throw new Error(
      'A restored continuation must contain legal grammar steps.',
    );
  }
  if (
    player.restoredCarry &&
    (JSON.stringify(player.restoredCarry.analysis) !==
      JSON.stringify(result.analysis) ||
      player.restoredCarry.publicText !== result.analysis.publicText)
  ) {
    throw new Error(
      'A restored continuation must match its grammar steps and public text.',
    );
  }
  const analysis = player.restoredCarry?.analysis ?? result.analysis;
  const publicText =
    player.restoredCarry?.publicText ?? result.analysis.publicText;
  return {
    status: 'building',
    steps,
    analysis,
    previewText: publicText,
    requiredRoles: analysis.nextRoles,
    selectedCards: steps
      .filter((step) => step.kind === 'phrase')
      .map((step) => ({
        phraseId: step.phrase.id,
        source: 'restored' as const,
      })),
    carryIntent: false,
    selectedComebackTier: null,
    selectedComeback: null,
    grammarMistakes: 0,
    lastGrammarMistakePhraseId: null,
    expired: false,
  };
}

function privateHandRequest(
  seed: number,
  request: DraftRoundPreparationRequest,
  player: DraftPlayerSetup,
  excludedPhraseIds: readonly string[] = [],
): PrivateHandGenerationRequest {
  return {
    seed,
    playerId: player.playerId,
    characterId: player.characterId,
    sceneId: request.sceneId,
    phrases: request.phrases,
    characterPhraseIds: player.characterPhraseIds,
    scenePhraseIds: request.scenePhraseIds,
    generalPhraseIds: request.generalPhraseIds,
    excludedPhraseIds,
  };
}

function boardRequest(
  request: DraftRoundPreparationRequest,
  seed: number,
  excludedPhraseIds: readonly string[],
): BoardGenerationRequest {
  return {
    seed,
    phrases: request.phrases,
    sceneId: request.sceneId,
    scenePhraseIds: request.scenePhraseIds,
    excludedPhraseIds,
  };
}

function availableBoard(board: GeneratedBoard): DraftBoard {
  return {
    seed: board.seed,
    nextSeed: board.nextSeed,
    slots: board.slots.map((slot) => ({ ...slot, available: true })),
  };
}

function chooseOpeningPlayer(
  players: readonly [DraftPlayerSetup, DraftPlayerSetup],
  previousOpeningPlayerId: string | undefined,
): string {
  if (!previousOpeningPlayerId) return players[0].playerId;
  return players.find((player) => player.playerId !== previousOpeningPlayerId)!
    .playerId;
}

function reject(
  command: DraftCommand,
  code: DraftRuleErrorCode,
): ReducerResult<DraftState, DraftRuleError> {
  return {
    ok: false,
    error: {
      kind: 'rule-error',
      code,
      facts: {
        commandType: command.type,
        actorId: command.actorId ?? null,
      },
    },
  };
}
