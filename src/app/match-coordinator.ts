import { decideLocalRadioCaller } from '../ai/easy-ai';
import { decidePalaceOperator, decidePartyStrategist } from '../ai/advanced-ai';
import {
  createMatchReducer,
  defaultMatchRandomSource,
  type MatchCommand,
  type MatchEngineContext,
  type MatchLifecycleCommand,
  type MatchResolution,
  type MatchState,
} from '../engine/match-lifecycle';
import { recordLadderResult } from '../engine/ladder';
import { createMatchHistoryEntry, type MatchHistoryRepository, type MatchHistorySettings } from '../persistence/match-history';
import type { LadderProgressRepository } from '../persistence/ladder-progress';

export type MatchArenaReaction = Readonly<{
  kind: 'grammar-mistake';
  playerId: string;
  damage: number;
  sequence: number;
}>;

export type MatchCommandLog = Readonly<{
  initialSeed: number;
  action: string;
  actorId?: string | null;
  outcome: 'accepted' | 'rejected';
  errorCode?: string;
  command: MatchCommand | null;
  before: MatchState | null;
  after: MatchState;
}>;

type MatchIdentity = Readonly<{
  initialSeed: number;
  id: string;
  ladder: boolean;
  settings: MatchHistorySettings;
}>;

export type MatchTransition = Readonly<{
  state: MatchState;
  reaction: MatchArenaReaction | null;
  review: Readonly<{
    state: MatchState;
    resolution: MatchResolution;
    victory: Readonly<{ winnerId: string; completedRounds: number; ladder: boolean }> | null;
  }> | null;
}>;

type CoordinatorDependencies = Readonly<{
  context: MatchEngineContext;
  history: MatchHistoryRepository;
  ladder: LadderProgressRepository;
  log: (entry: MatchCommandLog) => void;
  now: () => string;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
}>;

type AiTurnRequest = Readonly<{
  currentState: () => MatchState | null;
  reducedDelay: boolean;
  thinking: (value: boolean) => void;
  apply: (command: MatchCommand) => void;
}>;

/** Coordinates application effects without owning the shell's active snapshot. */
export class MatchCoordinator {
  private readonly reducer: ReturnType<typeof createMatchReducer>;
  private aiTimerId: number | undefined;
  private aiRequest: AiTurnRequest | undefined;

  constructor(private readonly dependencies: CoordinatorDependencies) {
    this.reducer = createMatchReducer(dependencies.context);
  }

  start(state: MatchState): MatchState {
    const initialSeed = state.seed;
    return this.continueRound(this.lifecycle(state, 'start-match', initialSeed), initialSeed);
  }

  continueRound(state: MatchState, initialSeed: number): MatchState {
    return this.lifecycle(state, 'prepare-round', initialSeed);
  }

  apply(before: MatchState, command: MatchCommand, identity: MatchIdentity): MatchTransition {
    const result = this.reducer(before, command, defaultMatchRandomSource);
    if (!result.ok) {
      this.dependencies.log({
        initialSeed: identity.initialSeed, action: command.type,
        actorId: command.actorId ?? null, outcome: 'rejected',
        errorCode: result.error.code, command, before, after: before,
      });
      throw new Error(`Match command ${command.type} failed: ${result.error.code}.`);
    }
    const reduced = result.state;
    this.logAccepted(identity.initialSeed, command, before, reduced);
    const state = reduced.phase === 'resolution'
      ? this.lifecycle(reduced, 'resolve-round', identity.initialSeed)
      : reduced;
    const resolution = state.resolutionHistory.at(-1) ?? null;
    const victory = state.phase === 'results' && state.winner
      ? { winnerId: state.winner, completedRounds: state.resolutionHistory.length, ladder: identity.ladder }
      : null;
    const reviewState = reduced.phase === 'resolution' && reduced.draft
      ? reduced
      : victory && reduced.draft ? reduced : victory && before.draft ? before : null;
    if (victory) this.complete(state, identity);
    return {
      state,
      reaction: grammarMistakeReaction(before, reduced, command),
      review: reviewState && resolution ? { state: reviewState, resolution, victory } : null,
    };
  }

  scheduleAiTurn(request: AiTurnRequest): void {
    this.cancelAiTurn();
    const state = request.currentState();
    if (!isAiTurn(state)) return;
    const decide = state.setup.aiDifficulty === 'party-strategist'
      ? decidePartyStrategist
      : state.setup.aiDifficulty === 'palace-operator' ? decidePalaceOperator : decideLocalRadioCaller;
    const decision = decide(state, this.dependencies.context, { reducedDelay: request.reducedDelay });
    if (!decision) return;
    this.aiRequest = request;
    request.thinking(true);
    const stillPending = () => {
      if (this.aiRequest !== request) return false;
      if (request.currentState() !== state) {
        this.cancelAiTurn();
        return false;
      }
      return true;
    };
    this.aiTimerId = this.dependencies.setTimeout(() => {
      if (!stillPending()) return;
      this.aiTimerId = undefined;
      // Keep one task between presentation and command application so that
      // an in-flight browser Back traversal can cancel the turn.
      this.aiTimerId = this.dependencies.setTimeout(() => {
        if (!stillPending()) return;
        this.aiTimerId = undefined;
        this.aiRequest = undefined;
        request.thinking(false);
        request.apply(decision.command);
      }, 0);
    }, decision.delayMs);
  }

  cancelAiTurn(): void {
    if (this.aiTimerId !== undefined) {
      this.dependencies.clearTimeout(this.aiTimerId);
      this.aiTimerId = undefined;
    }
    this.aiRequest?.thinking(false);
    this.aiRequest = undefined;
  }

  private lifecycle(state: MatchState, type: MatchLifecycleCommand['type'], initialSeed: number): MatchState {
    const command = { type, source: 'user', payload: {} } as MatchCommand;
    const result = this.reducer(state, command, defaultMatchRandomSource);
    if (!result.ok) throw new Error(`Match lifecycle ${type} failed: ${result.error.code}.`);
    this.logAccepted(initialSeed, command, state, result.state);
    return result.state;
  }

  private logAccepted(initialSeed: number, command: MatchCommand, before: MatchState, after: MatchState): void {
    this.dependencies.log({ initialSeed, action: command.type, actorId: command.actorId ?? null,
      outcome: 'accepted', command, before, after });
  }

  private complete(state: MatchState, identity: MatchIdentity): void {
    const progress = this.dependencies.ladder.snapshot().progress;
    if (identity.ladder && progress) {
      this.dependencies.ladder.replace(recordLadderResult(progress, state.winner === 'player-one' ? 'win' : 'loss'));
    }
    this.dependencies.history.append(createMatchHistoryEntry(state, {
      id: identity.id, initialSeed: identity.initialSeed,
      completedAt: this.dependencies.now(), settings: identity.settings,
    }));
  }
}

function isAiTurn(state: MatchState | null): state is MatchState {
  return Boolean(state?.draft && state.setup.mode === 'ai' &&
    state.activePlayerId === 'player-two' &&
    (state.phase === 'drafting' || state.phase === 'sudden-death'));
}

function grammarMistakeReaction(
  before: MatchState,
  after: MatchState,
  command: MatchCommand,
): MatchArenaReaction | null {
  if (command.type !== 'select-phrase' || !command.actorId) return null;
  const beforePlayer = before.draft?.playerStates[command.actorId];
  const afterPlayer = after.draft?.playerStates[command.actorId];
  if (!beforePlayer || !afterPlayer) return null;
  if (
    afterPlayer.construction.grammarMistakes <=
    beforePlayer.construction.grammarMistakes
  ) {
    return null;
  }
  return Object.freeze({
    kind: 'grammar-mistake',
    playerId: command.actorId,
    damage: Math.max(
      0,
      before.playerStates[command.actorId]!.pride -
        after.playerStates[command.actorId]!.pride,
    ),
    sequence: after.commandHistory.length,
  });
}

