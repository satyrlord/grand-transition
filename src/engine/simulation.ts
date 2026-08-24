import type { ContentCatalog } from '../content/content-catalog';
import type { Phrase } from '../content/schemas';
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
  characterIds?: readonly [string, string];
  sceneId?: string;
  pride?: readonly [number, number];
  charge?: readonly [number, number];
}>;

export type SimulationOption = Readonly<{
  command: MatchCommand;
  utility: number;
  reason: string;
  phrase: Phrase | null;
}>;

export type SimulatedMatch = Readonly<{
  seed: number;
  replayPath: string;
  replay: ReplayDocument;
  replayBytes: string;
  matchLog: MatchLogDocument;
  matchLogBytes: string;
  finalState: MatchState;
}>;

export type SimulationMatchSummary = Readonly<{
  seed: number;
  replayPath: string;
  winner: string;
  rounds: number;
  commands: number;
}>;

export type SimulationReport = Readonly<{
  schemaVersion: 1;
  kind: typeof simulationKind;
  seed: number;
  matches: number;
  completedMatches: number;
  totalRounds: number;
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
    aiDifficulty: 'simulation-policy',
    timerSeconds: 10,
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

export function simulateMatch(
  seed: number,
  setup: ReplaySetup,
  context: ReplayContext,
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
  const maximumCommands = 20_000;

  while (state.phase !== 'results' && commands.length < maximumCommands) {
    const option = listSimulationOptions(state, engineContext)[0];
    if (!option) {
      throw simulationFailure(normalizedSeed, 'No simulation command exists.');
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
  return {
    seed: normalizedSeed,
    replayPath: replayPath(normalizedSeed),
    replay: completedReplay,
    replayBytes,
    matchLog,
    matchLogBytes: encodeMatchLog(matchLog),
    finalState: state,
  };
}

export function simulateMatches(
  seed: number,
  matches: number,
  setup: ReplaySetup,
  context: ReplayContext,
): SimulationReport {
  const normalizedSeed = normalizeSeed(seed);
  if (!Number.isSafeInteger(matches) || matches <= 0) {
    throw new Error('Simulation matches must be a positive integer.');
  }
  const results: SimulationMatchSummary[] = [];
  const winners: Record<string, number> = {};
  let totalRounds = 0;
  for (let index = 0; index < matches; index += 1) {
    const match = simulateMatch((normalizedSeed + index) >>> 0, setup, context);
    const winner = match.finalState.winner!;
    winners[winner] = (winners[winner] ?? 0) + 1;
    totalRounds += match.finalState.resolutionHistory.length;
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
  return `Simulated ${report.matches} match(es) from seed ${report.seed}; rounds=${report.totalRounds}; winners: ${winners}.`;
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
  return (
    weaknessMatches * 12 + (phrase.finisherBonus ?? 0) + phrase.tags.length
  );
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
