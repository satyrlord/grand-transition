import type { ContentCatalog } from '../content/content-catalog';
import type { Phrase } from '../content/schemas';
import { decideLocalRadioCaller } from '../ai/easy-ai';
import type { DraftCardReference, DraftCommand } from './draft-actions';
import {
  createMatchReducer,
  type MatchCommand,
  type MatchEngineContext,
  type MatchLifecycleCommand,
  type MatchState,
} from './match-lifecycle';
import { seededRandomSource } from './random-source';
import {
  createMatchLog,
  createReplayInitialState,
  encodeMatchLog,
  encodeReplay,
  normalizedJson,
  replayKind,
  replayMatch,
  replaySchemaVersion,
  type MatchLogDocument,
  type ReplayContext,
  type ReplayDocument,
  type ReplaySetup,
} from '../persistence/codecs/replay-codec';

export const simulationKind = 'grand-transition-simulation' as const;

export type SimulationSetupOptions = Readonly<{
  aiDifficulty?: string;
  characterIds?: readonly [string, string];
  sceneId?: string;
  pride?: readonly [number, number];
  charge?: readonly [number, number];
}>;

export type SimulationOption = Readonly<{
  command: MatchCommand;
  presentationDelayMs?: number;
  utility: number;
  reason: string;
  phrase: Phrase | null;
}>;

export type SimulationOptionProvider = (
  state: MatchState,
  context: MatchEngineContext,
) => readonly SimulationOption[];

export type SimulatedMatch = Readonly<{
  seed: number;
  replayPath: string;
  replay: ReplayDocument;
  replayBytes: string;
  matchLog: MatchLogDocument;
  matchLogBytes: string;
  finalState: MatchState;
  maximumPresentationDelayMs: number;
  privacyLeaks: number;
  timerOverruns: number;
}>;

export type SimulationMatchSummary = Readonly<{
  seed: number;
  replayPath: string;
  winner: string;
  rounds: number;
  commands: number;
}>;

export type SimulationReport = Readonly<{
  schemaVersion: typeof replaySchemaVersion;
  kind: typeof simulationKind;
  seed: number;
  matches: number;
  completedMatches: number;
  totalRounds: number;
  maximumPresentationDelayMs: number;
  privacyLeaks: number;
  timerOverruns: number;
  winners: Readonly<Record<string, number>>;
  results: readonly SimulationMatchSummary[];
}>;

export function createSimulationSetup(
  catalog: ContentCatalog,
  options: SimulationSetupOptions = {},
): ReplaySetup {
  const characterIds = options.characterIds ?? [
    catalog.characters[0]!.id,
    catalog.characters[1]!.id,
  ];
  const sceneId = options.sceneId ?? catalog.scenes[0]!.id;
  const pride = options.pride ?? [100, 100];
  const charge = options.charge ?? [0, 0];
  if (!catalog.scenes.some((scene) => scene.id === sceneId)) {
    throw new Error(`Unknown simulation scene: ${sceneId}`);
  }
  const players = characterIds.map((characterId, index) => {
    if (!catalog.characters.some((character) => character.id === characterId)) {
      throw new Error(`Unknown simulation character: ${characterId}`);
    }
    const playerPride = pride[index]!;
    const playerCharge = charge[index]!;
    if (
      !Number.isInteger(playerPride) ||
      playerPride < 0 ||
      playerPride > 100
    ) {
      throw new Error(`Invalid simulation Pride: ${String(playerPride)}`);
    }
    if (
      !Number.isInteger(playerCharge) ||
      playerCharge < 0 ||
      playerCharge > 60
    ) {
      throw new Error(`Invalid simulation charge: ${String(playerCharge)}`);
    }
    return {
      playerId: `player-${index + 1}`,
      characterId,
      subjectNumber: 'singular' as const,
      objectNumber: 'singular' as const,
      pride: playerPride,
      charge: playerCharge,
    };
  });
  return {
    mode: 'ai',
    players: [players[0]!, players[1]!],
    sceneId,
    aiDifficulty: options.aiDifficulty ?? 'simulation-policy',
    timerSeconds: 30,
    speechEnabled: false,
    privacyEnabled: true,
  };
}

export function listSimulationOptions(
  state: MatchState,
  context: MatchEngineContext,
): readonly SimulationOption[] {
  const lifecycleType = lifecycleCommandForState(state);
  if (lifecycleType) {
    return [
      {
        command: lifecycleCommand(lifecycleType),
        utility: 1_000,
        reason: 'Advance the match lifecycle.',
        phrase: null,
      },
    ];
  }
  const player = state.draft?.playerStates[state.activePlayerId];
  if (!player) return [];
  const options: SimulationOption[] = player.legalCards.map((card) => {
    const phrase = phraseForCard(state, card, context);
    return {
      command: {
        type: 'select-phrase',
        source: 'ai',
        actorId: player.playerId,
        payload: { card },
      },
      utility: phrase ? phraseUtility(phrase, state, player.playerId) : 0,
      reason: phrase
        ? `${phrase.tags.length} scoring or weakness tag(s).`
        : 'The card has no matching content record.',
      phrase,
    };
  });
  if (player.hand.length === 0 && !player.redrawUsed) {
    options.push({
      command: {
        type: 'redraw-hand',
        source: 'ai',
        actorId: player.playerId,
        payload: {},
      },
      utility: 2_000,
      reason: 'Refresh an empty private hand.',
      phrase: null,
    });
  }
  options.push({
    command: actorCommand('commit-sentence', player.playerId),
    utility: player.construction.analysis.complete ? 500 : -100,
    reason: player.construction.analysis.complete
      ? 'End a complete sentence.'
      : 'End an incomplete sentence for zero damage.',
    phrase: null,
  });
  if (options.length === 0) {
    options.push({
      command: actorCommand('expire-turn', player.playerId),
      utility: -500,
      reason: 'End a turn that has no legal phrase.',
      phrase: null,
    });
  }
  return options.toSorted(
    (left, right) =>
      right.utility - left.utility ||
      commandKey(left.command).localeCompare(commandKey(right.command)),
  );
}

export function listLocalRadioCallerSimulationOptions(
  state: MatchState,
  context: MatchEngineContext,
): readonly SimulationOption[] {
  const lifecycleType = lifecycleCommandForState(state);
  if (lifecycleType) {
    return [
      {
        command: lifecycleCommand(lifecycleType),
        utility: 1_000,
        reason: 'Advance the match lifecycle.',
        phrase: null,
      },
    ];
  }
  const decision =
    decideLocalRadioCaller(state, context) ??
    decideLocalRadioCaller(state, context, { turnExpired: true });
  if (!decision) return [];
  const candidate = decision.candidates.find(
    ({ command }) => commandKey(command) === commandKey(decision.command),
  )!;
  return [
    {
      command: decision.command,
      presentationDelayMs: decision.delayMs,
      utility: candidate.utility,
      reason: 'Local Radio Caller normalized utility.',
      phrase:
        decision.command.type === 'select-phrase'
          ? phraseForCommand(state, decision.command, context)
          : null,
    },
  ];
}

export function simulateMatch(
  seed: number,
  setup: ReplaySetup,
  context: ReplayContext,
  optionProvider: SimulationOptionProvider = listSimulationOptions,
): SimulatedMatch {
  const normalizedSeed = normalizeSeed(seed);
  const replay: ReplayDocument = {
    schemaVersion: replaySchemaVersion,
    kind: replayKind,
    seed: normalizedSeed,
    setup,
    commands: [],
  };
  let state = createReplayInitialState(replay, context);
  if (!state) {
    throw simulationFailure(normalizedSeed, 'The setup is invalid.');
  }
  const engineContext: MatchEngineContext = {
    phrases: context.catalog.phrases,
    characters: context.catalog.characters,
    locale: context.locale,
    balance: context.balance,
  };
  const reducer = createMatchReducer(engineContext);
  const commands: ReplayDocument['commands'][number][] = [];
  const privateCards = new Map<string, string>();
  const selectedPrivateCardIds = new Set<string>();
  let maximumPresentationDelayMs = 0;
  let timerOverruns = 0;
  const maximumCommands = 20_000;

  while (state.phase !== 'results' && commands.length < maximumCommands) {
    collectPrivateCards(state, privateCards);
    const option = optionProvider(state, engineContext)[0];
    if (!option) {
      throw simulationFailure(normalizedSeed, 'No simulation command exists.');
    }
    if (
      option.command.type === 'select-phrase' &&
      option.command.payload.card.source === 'private'
    ) {
      selectedPrivateCardIds.add(option.command.payload.card.cardId);
    }
    if (option.presentationDelayMs !== undefined) {
      maximumPresentationDelayMs = Math.max(
        maximumPresentationDelayMs,
        option.presentationDelayMs,
      );
      const [minimumDelay, maximumDelay] = presentationDelayBounds(
        setup.aiDifficulty,
      );
      if (
        option.presentationDelayMs < minimumDelay ||
        option.presentationDelayMs > maximumDelay ||
        option.presentationDelayMs > setup.timerSeconds * 1_000
      ) {
        timerOverruns += 1;
      }
    }
    const result = reducer(state, option.command, seededRandomSource);
    if (!result.ok) {
      throw simulationFailure(
        normalizedSeed,
        `The simulation selected an invalid command: ${result.error.code}.`,
      );
    }
    state = result.state;
    commands.push(option.command as ReplayDocument['commands'][number]);
    assertStateInvariants(state, commands, normalizedSeed);
  }
  if (state.phase !== 'results' || !state.winner) {
    throw simulationFailure(
      normalizedSeed,
      `The match did not finish within ${maximumCommands} commands.`,
    );
  }

  const completedReplay: ReplayDocument = { ...replay, commands };
  const replayBytes = encodeReplay(completedReplay);
  const replayed = replayMatch(replayBytes, context);
  if (
    !replayed.ok ||
    normalizedJson(replayed.state) !== normalizedJson(state)
  ) {
    throw simulationFailure(
      normalizedSeed,
      'The replay did not reproduce the exact final state.',
    );
  }
  const matchLog = createMatchLog(completedReplay, state);
  const matchLogBytes = encodeMatchLog(matchLog);
  const privacyLeakFacts = findPrivateLeaks(
    privateCards,
    selectedPrivateCardIds,
    replayBytes,
    matchLogBytes,
  );
  const privacyLeaks = privacyLeakFacts.length;
  if (privacyLeaks > 0) {
    throw simulationFailure(
      normalizedSeed,
      `The simulation exposed private hand data: ${privacyLeakFacts[0]}.`,
    );
  }
  if (timerOverruns > 0) {
    throw simulationFailure(normalizedSeed, 'The AI presentation delay exceeded its bounds.');
  }
  return {
    seed: normalizedSeed,
    replayPath: replayPath(normalizedSeed),
    replay: completedReplay,
    replayBytes,
    matchLog,
    matchLogBytes,
    finalState: state,
    maximumPresentationDelayMs,
    privacyLeaks,
    timerOverruns,
  };
}

function presentationDelayBounds(difficulty: string | null): readonly [number, number] {
  if (difficulty === 'party-strategist') return [700, 1_500];
  if (difficulty === 'palace-operator') return [900, 1_800];
  return [500, 1_100];
}

export function simulateMatches(
  seed: number,
  matches: number,
  setup: ReplaySetup,
  context: ReplayContext,
  optionProvider: SimulationOptionProvider = listSimulationOptions,
): SimulationReport {
  const normalizedSeed = normalizeSeed(seed);
  if (!Number.isSafeInteger(matches) || matches <= 0) {
    throw new Error('Simulation matches must be a positive integer.');
  }
  const results: SimulationMatchSummary[] = [];
  const winners: Record<string, number> = {};
  let totalRounds = 0;
  let maximumPresentationDelayMs = 0;
  let privacyLeaks = 0;
  let timerOverruns = 0;
  for (let index = 0; index < matches; index += 1) {
    const match = simulateMatch(
      (normalizedSeed + index) >>> 0,
      setup,
      context,
      optionProvider,
    );
    const winner = match.finalState.winner!;
    winners[winner] = (winners[winner] ?? 0) + 1;
    totalRounds += match.finalState.resolutionHistory.length;
    maximumPresentationDelayMs = Math.max(
      maximumPresentationDelayMs,
      match.maximumPresentationDelayMs,
    );
    privacyLeaks += match.privacyLeaks;
    timerOverruns += match.timerOverruns;
    results.push({
      seed: match.seed,
      replayPath: match.replayPath,
      winner,
      rounds: match.finalState.resolutionHistory.length,
      commands: match.replay.commands.length,
    });
  }
  return {
    schemaVersion: replaySchemaVersion,
    kind: simulationKind,
    seed: normalizedSeed,
    matches,
    completedMatches: results.length,
    totalRounds,
    maximumPresentationDelayMs,
    privacyLeaks,
    timerOverruns,
    winners: Object.fromEntries(
      Object.entries(winners).toSorted(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    results,
  };
}

export function encodeSimulationReport(report: SimulationReport): string {
  return normalizedJson(report);
}

export function summarizeSimulation(report: SimulationReport): string {
  const winners = Object.entries(report.winners)
    .map(([playerId, count]) => `${playerId}=${count}`)
    .join(', ');
  return `Simulated ${report.matches} match(es) from seed ${report.seed}; rounds=${report.totalRounds}; winners: ${winners}; privacy-leaks=${report.privacyLeaks}; timer-overruns=${report.timerOverruns}; maximum-delay=${report.maximumPresentationDelayMs} ms.`;
}

function lifecycleCommandForState(
  state: MatchState,
): MatchLifecycleCommand['type'] | null {
  if (state.phase === 'setup') return 'start-match';
  if (
    state.phase === 'round-preparation' ||
    (state.phase === 'sudden-death' && state.draft === null)
  ) {
    return 'prepare-round';
  }
  if (state.phase === 'resolution') return 'resolve-round';
  return null;
}

function lifecycleCommand(
  type: MatchLifecycleCommand['type'],
): MatchLifecycleCommand {
  return { type, source: 'ai', payload: {} } as MatchLifecycleCommand;
}

function actorCommand(
  type: 'commit-sentence' | 'expire-turn',
  actorId: string,
): DraftCommand {
  return { type, source: 'ai', actorId, payload: {} } as DraftCommand;
}

function phraseForCard(
  state: MatchState,
  card: DraftCardReference,
  context: MatchEngineContext,
): Phrase | null {
  const phraseId =
    card.source === 'shared'
      ? state.board?.slots.find((slot) => slot.id === card.cardId)?.phraseId
      : state.draft?.playerStates[state.activePlayerId]?.hand.find(
          (item) => item.id === card.cardId,
        )?.phraseId;
  return context.phrases.find((phrase) => phrase.id === phraseId) ?? null;
}

function phraseUtility(
  phrase: Phrase,
  state: MatchState,
  playerId: string,
): number {
  const opponentId = state.playerOrder.find((id) => id !== playerId)!;
  const weaknessTags = state.playerStates[opponentId]!.weaknessTags;
  const weaknessMatches = phrase.tags.filter((tag) =>
    weaknessTags.includes(tag),
  ).length;
  return weaknessMatches * 12 + (phrase.finisherBonus ?? 0) + phrase.tags.length;
}

function collectPrivateCards(
  state: MatchState,
  cards: Map<string, string>,
): void {
  if (!state.draft) return;
  for (const player of Object.values(state.draft.playerStates)) {
    for (const card of player.hand) cards.set(card.id, card.phraseId);
  }
}

function findPrivateLeaks(
  privateCards: ReadonlyMap<string, string>,
  selectedPrivateCardIds: ReadonlySet<string>,
  replayBytes: string,
  matchLogBytes: string,
): readonly string[] {
  const replayStrings = new Set(collectStrings(JSON.parse(replayBytes)));
  const logStrings = new Set(collectStrings(JSON.parse(matchLogBytes)));
  const leaks: string[] = [];
  for (const cardId of privateCards.keys()) {
    if (selectedPrivateCardIds.has(cardId)) continue;
    if (replayStrings.has(cardId) || logStrings.has(cardId)) {
      leaks.push(`card ID ${cardId}`);
    }
  }
  return leaks;
}

function collectStrings(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function phraseForCommand(
  state: MatchState,
  command: Extract<MatchCommand, { readonly type: 'select-phrase' }>,
  context: MatchEngineContext,
): Phrase | null {
  const card = command.payload.card;
  const phraseId =
    card.source === 'shared'
      ? state.board?.slots.find((slot) => slot.id === card.cardId)?.phraseId
      : state.draft?.playerStates[state.activePlayerId]?.hand.find(
          (item) => item.id === card.cardId,
        )?.phraseId;
  return context.phrases.find((phrase) => phrase.id === phraseId) ?? null;
}

function assertStateInvariants(
  state: MatchState,
  commands: readonly MatchCommand[],
  seed: number,
): void {
  if (normalizedJson(state.commandHistory) !== normalizedJson(commands)) {
    throw simulationFailure(seed, 'Command history is not exact.');
  }
  for (const playerId of state.playerOrder) {
    const player = state.playerStates[playerId]!;
    if (player.pride < 0 || player.pride > 100) {
      throw simulationFailure(seed, `Pride is invalid for ${playerId}.`);
    }
    if (player.comebackCharge < 0 || player.comebackCharge > 60) {
      throw simulationFailure(seed, `Charge is invalid for ${playerId}.`);
    }
  }
  if (state.draft) {
    const reserved = state.draft.reservedPhraseIds;
    if (new Set(reserved).size !== reserved.length) {
      throw simulationFailure(seed, 'A round reserved one phrase twice.');
    }
    const visiblePhraseIds = [
      ...state.draft.board.slots.map((slot) => slot.phraseId),
      ...state.playerOrder.flatMap((playerId) =>
        state.draft!.playerStates[playerId]!.hand.map((card) => card.phraseId),
      ),
    ];
    if (
      new Set(visiblePhraseIds).size !== visiblePhraseIds.length ||
      visiblePhraseIds.some((phraseId) => !reserved.includes(phraseId))
    ) {
      throw simulationFailure(seed, 'A visible round phrase is not unique.');
    }
  }
}

function normalizeSeed(seed: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new Error('Simulation seed must be an unsigned 32-bit integer.');
  }
  return seed >>> 0;
}

function replayPath(seed: number): string {
  return `replays/simulation-${seed}.json`;
}

function simulationFailure(seed: number, message: string): Error {
  return new Error(
    `${message} Seed: ${seed}. Replay path: ${replayPath(seed)}.`,
  );
}

function commandKey(command: MatchCommand): string {
  return JSON.stringify(command);
}
