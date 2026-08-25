import type { BasicScoringBalance } from '../content/basic-scoring-balance';
import type {
  ComboChainState,
  ComboFinisherScore,
} from './combo-finisher-scoring';
import {
  resolveContinuationComebackRound,
  type ComebackTier,
  type ContinuationCarry,
} from './continuation-comeback-resolution';
import {
  createDraftReducer,
  grammarMistakeSelfDamage,
  prepareDraftRound,
  type DraftBoard,
  type DraftCommand,
  type DraftEngineContext,
  type DraftPlayerSetup,
  type DraftRuleError,
  type DraftState,
} from './draft-actions';
import type {
  GameCommand,
  GameReducer,
  GameState,
  ReducerResult,
  RuleError,
} from './game-contracts';
import { seededRandomSource, type RandomSource } from './random-source';

export const initialPride = 100;

export type MatchMode = 'ai' | 'hotseat';
export type MatchTimerSeconds = 15;
export type MatchPhase =
  | 'setup'
  | 'round-preparation'
  | 'drafting'
  | 'resolution'
  | 'sudden-death'
  | 'results';

export type MatchConfiguredPlayer = Omit<
  DraftPlayerSetup,
  'comebackCharge' | 'restoredCarry'
>;

export type MatchSetup = Readonly<{
  mode: MatchMode;
  players: readonly [MatchConfiguredPlayer, MatchConfiguredPlayer];
  sceneId: string;
  scenePhraseIds: readonly string[];
  generalPhraseIds: readonly string[];
  aiDifficulty: string | null;
  timerSeconds: MatchTimerSeconds;
  speechEnabled: boolean;
  privacyEnabled: boolean;
}>;

export type MatchPlayerState = MatchConfiguredPlayer &
  Readonly<{
    pride: number;
    comebackCharge: number;
    continuation: ContinuationCarry | null;
  }>;

export type BestInsult = Readonly<{
  playerId: string;
  text: string;
  damage: number;
  round: number;
}>;

export type MatchPlayerStatistics = Readonly<{
  score: number;
  bestInsult: BestInsult | null;
  highestRoundDamage: number;
  longestValidSentence: number;
  weaknesses: number;
  highestCombo: number;
  grammarMistakes: number;
  comebacks: number;
}>;

export type MatchStatistics = Readonly<{
  players: Readonly<Record<string, MatchPlayerStatistics>>;
  bestInsult: BestInsult | null;
  highestRoundDamage: number;
  longestValidSentence: number;
  weaknesses: number;
  highestCombo: number;
  grammarMistakes: number;
  comebacks: number;
}>;

export type MatchResolutionPlayer = Readonly<{
  playerId: string;
  constructionText: string;
  constructionStatus: 'carried' | 'incomplete' | 'valid';
  constructionPhrases: readonly Readonly<{
    phraseId: string;
    source: 'active' | 'carried';
  }>[];
  prideBefore: number;
  selfDamage: number;
  opponentOutgoingDamage: number;
  prideAfter: number;
  chargeBefore: number;
  chargeAfter: number;
  sentenceDamage: number;
  comebackBonus: number;
  outgoingDamage: number;
  sentenceSubtotal: number;
  phraseCount: number;
  completeValidInsult: boolean;
  insultText: string | null;
  weaknessActivated: boolean;
  comboMultiplier: number;
  comebackActivated: boolean;
  comebackTier: ComebackTier | null;
  comebackClosingLine: string | null;
  grammarMistakes: number;
  score: ComboFinisherScore | null;
  continuation: Readonly<{
    status: 'broken' | 'none' | 'survived';
    restoredCarry: ContinuationCarry | null;
  }>;
}>;

export type MatchResolution = Readonly<{
  round: number;
  openingPlayerId: string;
  suddenDeath: boolean;
  order: typeof matchResolutionOrder;
  players: Readonly<Record<string, MatchResolutionPlayer>>;
}>;

export const matchResolutionOrder = [
  'lock-constructions',
  'calculate-breakdowns',
  'apply-simultaneous-damage',
  'clamp-pride',
  'gain-charge-after-spending',
  'resolve-continuations',
  'check-knockout',
] as const;

export type MatchLifecycleCommand =
  | GameCommand<'start-match', Record<never, never>>
  | GameCommand<'prepare-round', Record<never, never>>
  | GameCommand<'resolve-round', Record<never, never>>;

export type MatchCommand = DraftCommand | MatchLifecycleCommand;

export type MatchRuleErrorCode = 'round-preparation-failed' | 'wrong-phase';

export type MatchRuleError = RuleError<
  MatchRuleErrorCode,
  {
    readonly commandType: MatchCommand['type'];
    readonly phase: MatchPhase;
    readonly causeCode: string | null;
  }
>;

export type MatchLifecycleError = DraftRuleError | MatchRuleError;

export type MatchState = GameState<
  MatchPhase,
  MatchMode,
  DraftBoard | null,
  MatchPlayerState,
  MatchResolution
> &
  Readonly<{
    playerOrder: readonly [string, string];
    setup: MatchSetup;
    firstOpeningPlayerId: string;
    draft: DraftState | null;
    comboState: ComboChainState;
    resolutionHistory: readonly MatchResolution[];
    statistics: MatchStatistics;
    suddenDeathActive: boolean;
  }>;

export type MatchEngineContext = DraftEngineContext &
  Readonly<{
    balance: BasicScoringBalance;
  }>;

export type MatchSetupRequest = Readonly<{
  schemaVersion: number;
  seed: number;
  players: readonly [MatchConfiguredPlayer, MatchConfiguredPlayer];
  sceneId: string;
  scenePhraseIds: readonly string[];
  generalPhraseIds: readonly string[];
  mode?: MatchMode;
  aiDifficulty?: string | null;
  speechEnabled?: boolean;
  privacyEnabled?: boolean;
  openingPlayerIndex?: 0 | 1;
}>;

export function createMatchSetupState(request: MatchSetupRequest): MatchState {
  const playerOrder = request.players.map((player) => player.playerId) as [
    string,
    string,
  ];
  if (playerOrder[0] === playerOrder[1]) {
    throw new Error('Match player IDs must be different.');
  }
  const setup: MatchSetup = {
    mode: request.mode ?? 'hotseat',
    players: request.players,
    sceneId: request.sceneId,
    scenePhraseIds: request.scenePhraseIds,
    generalPhraseIds: request.generalPhraseIds,
    aiDifficulty: request.aiDifficulty ?? null,
    timerSeconds: 15,
    speechEnabled: request.speechEnabled ?? false,
    privacyEnabled: request.privacyEnabled ?? true,
  };
  const playerStates = Object.fromEntries(
    request.players.map((player) => [player.playerId, resetPlayer(player)]),
  );

  return {
    schemaVersion: request.schemaVersion,
    seed: request.seed,
    phase: 'setup',
    mode: setup.mode,
    round: 1,
    openingPlayerId: playerOrder[request.openingPlayerIndex ?? 0],
    activePlayerId: playerOrder[request.openingPlayerIndex ?? 0],
    sceneId: setup.sceneId,
    board: null,
    playerStates,
    commandHistory: [],
    playerOrder,
    setup,
    firstOpeningPlayerId: playerOrder[request.openingPlayerIndex ?? 0],
    draft: null,
    comboState: {},
    resolutionHistory: [],
    statistics: emptyStatistics(playerOrder),
    suddenDeathActive: false,
  };
}

export function createMatchReducer(
  context: MatchEngineContext,
): GameReducer<MatchState, MatchCommand, MatchLifecycleError> {
  const draftReducer = createDraftReducer(context);
  return (state, command, randomSource) => {
    switch (command.type) {
      case 'start-match':
        return startMatch(state, command);
      case 'prepare-round':
        return prepareRound(state, command, context, randomSource);
      case 'resolve-round':
        return resolveRound(state, command, context);
      default:
        return reduceDraft(state, command, draftReducer, randomSource, context);
    }
  };
}

export function reconstructMatchStatistics(
  playerOrder: readonly [string, string],
  commandHistory: readonly GameCommand[],
  resolutionHistory: readonly MatchResolution[],
): MatchStatistics {
  const playerStatistics: Record<string, MatchPlayerStatistics> =
    Object.fromEntries(
      playerOrder.map((playerId) => [playerId, emptyPlayerStatistics()]),
    );
  let bestInsult: BestInsult | null = null;

  for (const resolution of resolutionHistory) {
    for (const playerId of playerOrder) {
      const result = resolution.players[playerId]!;
      const current = playerStatistics[playerId]!;
      const candidateBest = result.completeValidInsult
        ? {
            playerId,
            text: result.insultText!,
            damage: result.outgoingDamage,
            round: resolution.round,
          }
        : null;
      bestInsult = chooseBestInsult(bestInsult, candidateBest);
      playerStatistics[playerId] = {
        ...current,
        score: current.score + result.outgoingDamage,
        bestInsult: chooseBestInsult(current.bestInsult, candidateBest),
        highestRoundDamage: Math.max(
          current.highestRoundDamage,
          result.outgoingDamage,
        ),
        longestValidSentence: Math.max(
          current.longestValidSentence,
          result.completeValidInsult ? result.phraseCount : 0,
        ),
        weaknesses: current.weaknesses + Number(result.weaknessActivated),
        highestCombo: Math.max(current.highestCombo, result.comboMultiplier),
        grammarMistakes: current.grammarMistakes + result.grammarMistakes,
      };
    }
  }

  for (const command of commandHistory) {
    const actorId = command.actorId;
    if (!actorId || !playerStatistics[actorId]) continue;
    if (command.type === 'select-comeback') {
      playerStatistics[actorId] = {
        ...playerStatistics[actorId],
        comebacks: playerStatistics[actorId].comebacks + 1,
      };
    }
  }
  return {
    players: playerStatistics,
    bestInsult,
    highestRoundDamage: Math.max(
      ...Object.values(playerStatistics).map(
        (statistics) => statistics.highestRoundDamage,
      ),
    ),
    longestValidSentence: Math.max(
      ...Object.values(playerStatistics).map(
        (statistics) => statistics.longestValidSentence,
      ),
    ),
    weaknesses: sumStatistic(playerStatistics, 'weaknesses'),
    highestCombo: Math.max(
      ...Object.values(playerStatistics).map(
        (statistics) => statistics.highestCombo,
      ),
    ),
    grammarMistakes: sumStatistic(playerStatistics, 'grammarMistakes'),
    comebacks: sumStatistic(playerStatistics, 'comebacks'),
  };
}

function startMatch(
  state: MatchState,
  command: MatchLifecycleCommand,
): ReducerResult<MatchState, MatchLifecycleError> {
  if (state.phase !== 'setup') return reject(state, command, 'wrong-phase');
  return accept(state, command, { phase: 'round-preparation' });
}

function prepareRound(
  state: MatchState,
  command: MatchLifecycleCommand,
  context: MatchEngineContext,
  randomSource: RandomSource,
): ReducerResult<MatchState, MatchLifecycleError> {
  if (
    state.phase !== 'round-preparation' &&
    !(state.phase === 'sudden-death' && state.draft === null)
  ) {
    return reject(state, command, 'wrong-phase');
  }
  const players = state.playerOrder.map((playerId) => {
    const player = state.playerStates[playerId]!;
    return {
      playerId: player.playerId,
      characterId: player.characterId,
      characterPhraseIds: player.characterPhraseIds,
      weaknessTags: player.weaknessTags,
      subjectNumber: player.subjectNumber,
      objectNumber: player.objectNumber,
      comebackCharge: player.comebackCharge,
      ...(player.continuation && !state.suddenDeathActive
        ? { restoredCarry: player.continuation }
        : {}),
    } satisfies DraftPlayerSetup;
  }) as [DraftPlayerSetup, DraftPlayerSetup];
  const draftPhrases = state.suddenDeathActive
    ? context.phrases.filter((phrase) => phrase.role !== 'continuation')
    : context.phrases;
  const prepared = prepareDraftRound(
    {
      schemaVersion: state.schemaVersion,
      mode: state.mode,
      round: state.round,
      seed: state.seed,
      sceneId: state.sceneId,
      scenePhraseIds: state.setup.scenePhraseIds,
      generalPhraseIds: state.setup.generalPhraseIds,
      phrases: draftPhrases,
      characters: context.characters,
      locale: context.locale,
      players,
      previousOpeningPlayerId:
        state.round === 1
          ? state.firstOpeningPlayerId === state.playerOrder[0]
            ? undefined
            : otherPlayerId(state.playerOrder, state.firstOpeningPlayerId)
          : state.openingPlayerId,
      timerSeconds: state.setup.timerSeconds,
      commandHistory: state.commandHistory,
    },
    randomSource,
  );
  if (!prepared.ok) {
    return reject(
      state,
      command,
      'round-preparation-failed',
      prepared.error.code,
    );
  }
  const commandHistory = [...state.commandHistory, command];
  const draft = { ...prepared.state, commandHistory };
  return {
    ok: true,
    state: {
      ...state,
      seed: draft.seed,
      phase: state.suddenDeathActive ? 'sudden-death' : 'drafting',
      openingPlayerId: draft.openingPlayerId,
      activePlayerId: draft.activePlayerId,
      board: draft.board,
      pendingResolution: undefined,
      draft,
      commandHistory,
    },
  };
}

function reduceDraft(
  state: MatchState,
  command: DraftCommand,
  draftReducer: GameReducer<DraftState, DraftCommand, DraftRuleError>,
  randomSource: RandomSource,
  context: MatchEngineContext,
): ReducerResult<MatchState, MatchLifecycleError> {
  if (
    (state.phase !== 'drafting' && state.phase !== 'sudden-death') ||
    !state.draft
  ) {
    return reject(state, command, 'wrong-phase');
  }
  const reduced = draftReducer(state.draft, command, randomSource);
  if (!reduced.ok) return reduced;
  const draft = reduced.state;
  const mistakeActorId = command.actorId;
  const mistakeCountBefore = mistakeActorId
    ? (state.draft.playerStates[mistakeActorId]?.construction.grammarMistakes ??
      0)
    : 0;
  const mistakeCountAfter = mistakeActorId
    ? (draft.playerStates[mistakeActorId]?.construction.grammarMistakes ?? 0)
    : 0;
  const grammarMistakeDamage =
    Math.max(0, mistakeCountAfter - mistakeCountBefore) *
    grammarMistakeSelfDamage;
  const timeoutDamageBefore = mistakeActorId
    ? (state.draft.playerStates[mistakeActorId]?.timeoutDamage ?? 0)
    : 0;
  const timeoutDamageAfter = mistakeActorId
    ? (draft.playerStates[mistakeActorId]?.timeoutDamage ?? 0)
    : 0;
  const immediateSelfDamage =
    grammarMistakeDamage +
    Math.max(0, timeoutDamageAfter - timeoutDamageBefore);
  const playerStates = Object.fromEntries(
    state.playerOrder.map((playerId) => [
      playerId,
      {
        ...state.playerStates[playerId]!,
        pride:
          playerId === mistakeActorId
            ? Math.max(
                0,
                state.playerStates[playerId]!.pride - immediateSelfDamage,
              )
            : state.playerStates[playerId]!.pride,
        comebackCharge: draft.playerStates[playerId]!.comebackCharge,
      },
    ]),
  );
  if (
    mistakeActorId &&
    immediateSelfDamage > 0 &&
    playerStates[mistakeActorId]!.pride === 0
  ) {
    const winner = state.playerOrder.find(
      (playerId) => playerId !== mistakeActorId,
    )!;
    const resolution = immediateSelfKnockoutResolution(
      state,
      draft,
      playerStates,
      mistakeActorId,
      immediateSelfDamage,
      context,
    );
    const commandHistory = draft.commandHistory;
    const resolutionHistory = [...state.resolutionHistory, resolution];
    return {
      ok: true,
      state: {
        ...state,
        seed: draft.seed,
        phase: 'results',
        activePlayerId: winner,
        board: null,
        playerStates,
        pendingResolution: resolution,
        winner,
        draft: null,
        commandHistory,
        resolutionHistory,
        statistics: reconstructMatchStatistics(
          state.playerOrder,
          commandHistory,
          resolutionHistory,
        ),
      },
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      seed: draft.seed,
      phase: draft.phase === 'draft-complete' ? 'resolution' : state.phase,
      activePlayerId: draft.activePlayerId,
      board: draft.board,
      playerStates,
      draft,
      commandHistory: draft.commandHistory,
    },
  };
}

function immediateSelfKnockoutResolution(
  state: MatchState,
  draft: DraftState,
  playerStates: Readonly<Record<string, MatchPlayerState>>,
  actorId: string,
  selfDamage: number,
  context: MatchEngineContext,
): MatchResolution {
  const players = Object.fromEntries(
    state.playerOrder.map((playerId) => {
      const construction = draft.playerStates[playerId]!.construction;
      const player = state.playerStates[playerId]!;
      return [
        playerId,
        {
          playerId,
          constructionText: construction.previewText,
          constructionStatus: constructionStatus(construction),
          constructionPhrases: construction.selectedCards.flatMap((card) => {
            const phrase = context.phrases.find(
              (candidate) => candidate.id === card.phraseId,
            );
            return phrase?.role === 'continuation'
              ? []
              : [{ phraseId: card.phraseId, source: 'active' as const }];
          }),
          prideBefore: player.pride,
          selfDamage: playerId === actorId ? selfDamage : 0,
          opponentOutgoingDamage: 0,
          prideAfter: playerStates[playerId]!.pride,
          chargeBefore: player.comebackCharge,
          chargeAfter: player.comebackCharge,
          sentenceDamage: 0,
          comebackBonus: 0,
          outgoingDamage: 0,
          sentenceSubtotal: 0,
          phraseCount: 0,
          completeValidInsult: false,
          insultText: null,
          weaknessActivated: false,
          comboMultiplier: 0,
          comebackActivated: false,
          comebackTier: null,
          comebackClosingLine: null,
          grammarMistakes: construction.grammarMistakes,
          score: null,
          continuation: { status: 'none' as const, restoredCarry: null },
        },
      ];
    }),
  );
  return {
    round: state.round,
    openingPlayerId: state.openingPlayerId,
    suddenDeath: state.suddenDeathActive,
    order: matchResolutionOrder,
    players,
  };
}

function resolveRound(
  state: MatchState,
  command: MatchLifecycleCommand,
  context: MatchEngineContext,
): ReducerResult<MatchState, MatchLifecycleError> {
  if (state.phase !== 'resolution' || state.draft?.phase !== 'draft-complete') {
    return reject(state, command, 'wrong-phase');
  }
  const before = state;
  const draft = before.draft!;
  const resolutionPlayer = (playerId: string, defenderId: string) => {
    const player = before.playerStates[playerId]!;
    const draftPlayer = draft.playerStates[playerId]!;
    const defender = before.playerStates[defenderId]!;
    return {
      playerId,
      characterId: player.characterId,
      construction: {
        steps: draftPlayer.construction.steps,
        analysis: draftPlayer.construction.analysis,
        publicText: draftPlayer.construction.previewText,
        carryIntent: draftPlayer.construction.carryIntent,
        selectedComeback: draftPlayer.construction.selectedComeback,
      },
      comebackCharge: player.comebackCharge,
      phrases: context.phrases,
      defenderWeaknessTags: defender.weaknessTags,
      balance: context.balance,
    };
  };
  const roundResolution = resolveContinuationComebackRound({
    players: [
      resolutionPlayer(before.playerOrder[0], before.playerOrder[1]),
      resolutionPlayer(before.playerOrder[1], before.playerOrder[0]),
    ],
    comboState: before.comboState,
  });
  const players: Record<string, MatchResolutionPlayer> = {};
  const nextPlayerStates: Record<string, MatchPlayerState> = {};
  for (const [index, playerId] of before.playerOrder.entries()) {
    const player = before.playerStates[playerId]!;
    const attack = roundResolution.players[playerId]!;
    const opponentId = before.playerOrder[index === 0 ? 1 : 0];
    const opponentAttack = roundResolution.players[opponentId]!;
    const prideAfter = Math.max(
      0,
      player.pride - attack.selfDamage - opponentAttack.outgoingDamage,
    );
    const construction = draft.playerStates[playerId]!.construction;
    const completeValidInsult =
      !construction.carryIntent &&
      construction.analysis.legal &&
      construction.analysis.complete &&
      construction.analysis.sentenceStatus === 'complete';
    players[playerId] = {
      playerId,
      constructionText: construction.previewText,
      constructionStatus: constructionStatus(construction),
      constructionPhrases: construction.selectedCards.flatMap((card) => {
        const phrase = context.phrases.find(
          (candidate) => candidate.id === card.phraseId,
        );
        return phrase?.role === 'continuation'
          ? []
          : [
              {
                phraseId: card.phraseId,
                source: card.source === 'restored' ? 'carried' : 'active',
              } as const,
            ];
      }),
      prideBefore: player.pride,
      selfDamage: attack.selfDamage,
      opponentOutgoingDamage: opponentAttack.outgoingDamage,
      prideAfter,
      chargeBefore: player.comebackCharge,
      chargeAfter: attack.comebackCharge,
      sentenceDamage: attack.sentenceDamage,
      comebackBonus: attack.comebackBonus,
      outgoingDamage: attack.outgoingDamage,
      sentenceSubtotal: sentenceSubtotal(attack.score),
      phraseCount: completeValidInsult
        ? construction.analysis.renderedPhrases.length
        : 0,
      completeValidInsult,
      insultText: completeValidInsult ? construction.analysis.publicText : null,
      weaknessActivated:
        attack.score?.breakdown.some(
          (item) => item.kind === 'weakness-multiplier' && item.factor > 1,
        ) ?? false,
      comboMultiplier: attack.score?.combo?.chain ?? 0,
      comebackActivated: construction.selectedComeback !== null,
      comebackTier: construction.selectedComeback?.tier ?? null,
      comebackClosingLine: construction.selectedComeback?.closingLine ?? null,
      grammarMistakes: construction.grammarMistakes,
      score: attack.score,
      continuation: attack.continuation,
    };
    nextPlayerStates[playerId] = {
      ...player,
      pride: prideAfter,
      comebackCharge: attack.comebackCharge,
      continuation: attack.continuation.restoredCarry,
    };
  }

  if (before.suddenDeathActive) {
    const [firstId, secondId] = before.playerOrder;
    const firstScore = players[firstId]!.outgoingDamage;
    const secondScore = players[secondId]!.outgoingDamage;
    let damageToFirst = 0;
    let damageToSecond = 0;
    if (firstScore === 0 && secondScore > 0) {
      damageToFirst = initialPride;
    } else if (secondScore === 0 && firstScore > 0) {
      damageToSecond = initialPride;
    } else if (firstScore > secondScore) {
      damageToSecond = initialPride;
      damageToFirst = Math.floor(initialPride * (secondScore / firstScore));
    } else if (secondScore > firstScore) {
      damageToFirst = initialPride;
      damageToSecond = Math.floor(initialPride * (firstScore / secondScore));
    } else if (firstScore > 0) {
      damageToFirst = initialPride;
      damageToSecond = initialPride;
    }
    players[firstId] = {
      ...players[firstId]!,
      opponentOutgoingDamage: damageToFirst,
      prideAfter: Math.max(0, initialPride - damageToFirst),
    };
    players[secondId] = {
      ...players[secondId]!,
      opponentOutgoingDamage: damageToSecond,
      prideAfter: Math.max(0, initialPride - damageToSecond),
    };
    nextPlayerStates[firstId] = {
      ...nextPlayerStates[firstId]!,
      pride: players[firstId]!.prideAfter,
    };
    nextPlayerStates[secondId] = {
      ...nextPlayerStates[secondId]!,
      pride: players[secondId]!.prideAfter,
    };
  }

  const commandHistory = [...before.commandHistory, command];
  let resolution: MatchResolution = {
    round: before.round,
    openingPlayerId: before.openingPlayerId,
    suddenDeath: before.suddenDeathActive,
    order: matchResolutionOrder,
    players,
  };
  const knockedOut = before.playerOrder.filter(
    (playerId) => players[playerId]!.prideAfter === 0,
  );
  let winner: string | undefined;
  let phase: MatchPhase;
  let round = before.round;
  let suddenDeathActive = before.suddenDeathActive;

  if (before.suddenDeathActive) {
    if (knockedOut.length === 1) {
      winner = before.playerOrder.find((id) => id !== knockedOut[0])!;
      phase = 'results';
    } else {
      phase = 'sudden-death';
      round += 1;
      for (const playerId of before.playerOrder) {
        nextPlayerStates[playerId] = {
          ...nextPlayerStates[playerId]!,
          pride: initialPride,
          comebackCharge: 0,
          continuation: null,
        };
      }
    }
  } else if (knockedOut.length === 2) {
    phase = 'sudden-death';
    round += 1;
    suddenDeathActive = true;
    for (const playerId of before.playerOrder) {
      nextPlayerStates[playerId] = {
        ...nextPlayerStates[playerId]!,
        pride: initialPride,
        comebackCharge: 0,
        continuation: null,
      };
    }
  } else if (knockedOut.length === 1) {
    winner = before.playerOrder.find((id) => id !== knockedOut[0])!;
    phase = 'results';
  } else {
    phase = 'round-preparation';
    round += 1;
  }

  const resolutionHistory = [...before.resolutionHistory, resolution];
  const statistics = reconstructMatchStatistics(
    before.playerOrder,
    commandHistory,
    resolutionHistory,
  );
  return {
    ok: true,
    state: {
      ...before,
      phase,
      round,
      activePlayerId: winner ?? before.activePlayerId,
      board: null,
      playerStates: nextPlayerStates,
      pendingResolution: resolution,
      ...(winner ? { winner } : {}),
      commandHistory,
      draft: null,
      comboState: suddenDeathActive ? {} : roundResolution.comboState,
      resolutionHistory,
      statistics,
      suddenDeathActive,
    },
  };
}

function sentenceSubtotal(score: ComboFinisherScore | null): number {
  if (!score) return 0;
  return score.breakdown.reduce(
    (total, item) => (item.operation === 'add' ? total + item.amount : total),
    0,
  );
}

function constructionStatus(
  construction: DraftState['playerStates'][string]['construction'],
): MatchResolutionPlayer['constructionStatus'] {
  if (construction.carryIntent) return 'carried';
  return construction.analysis.legal &&
    construction.analysis.complete &&
    construction.analysis.sentenceStatus === 'complete'
    ? 'valid'
    : 'incomplete';
}

function chooseBestInsult(
  current: BestInsult | null,
  candidate: BestInsult | null,
): BestInsult | null {
  if (!candidate) return current;
  if (!current || candidate.damage > current.damage) return candidate;
  return current;
}

function resetPlayer(player: MatchConfiguredPlayer): MatchPlayerState {
  return {
    ...player,
    pride: initialPride,
    comebackCharge: 0,
    continuation: null,
  };
}

function emptyStatistics(
  playerOrder: readonly [string, string],
): MatchStatistics {
  const players = Object.fromEntries(
    playerOrder.map((playerId) => [playerId, emptyPlayerStatistics()]),
  );
  return {
    players,
    bestInsult: null,
    highestRoundDamage: 0,
    longestValidSentence: 0,
    weaknesses: 0,
    highestCombo: 0,
    grammarMistakes: 0,
    comebacks: 0,
  };
}

function emptyPlayerStatistics(): MatchPlayerStatistics {
  return {
    score: 0,
    bestInsult: null,
    highestRoundDamage: 0,
    longestValidSentence: 0,
    weaknesses: 0,
    highestCombo: 0,
    grammarMistakes: 0,
    comebacks: 0,
  };
}

function sumStatistic(
  statistics: Readonly<Record<string, MatchPlayerStatistics>>,
  key: 'comebacks' | 'grammarMistakes' | 'weaknesses',
): number {
  return Object.values(statistics).reduce(
    (total, player) => total + player[key],
    0,
  );
}

function otherPlayerId(
  playerOrder: readonly [string, string],
  playerId: string,
): string {
  return playerOrder.find((candidate) => candidate !== playerId)!;
}

function accept(
  state: MatchState,
  command: MatchCommand,
  changes: Partial<MatchState>,
): ReducerResult<MatchState, MatchLifecycleError> {
  return {
    ok: true,
    state: {
      ...state,
      ...changes,
      commandHistory: [...state.commandHistory, command],
    },
  };
}

function reject(
  state: MatchState,
  command: MatchCommand,
  code: MatchRuleErrorCode,
  causeCode: string | null = null,
): ReducerResult<MatchState, MatchLifecycleError> {
  return {
    ok: false,
    error: {
      kind: 'rule-error',
      code,
      facts: {
        commandType: command.type,
        phase: state.phase,
        causeCode,
      },
    },
  };
}

export const defaultMatchRandomSource = seededRandomSource;
