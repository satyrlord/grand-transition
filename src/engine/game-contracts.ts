import type { RandomSource } from './random-source';

export type ImmutableScalar = boolean | number | string | null;

export type ImmutableValue =
  ImmutableScalar | readonly ImmutableValue[] | ImmutableObject;

export interface ImmutableObject {
  readonly [key: string]: ImmutableValue;
}

export type PlayerId = string;
export type SceneId = string;

export interface GameCommand<
  Type extends string = string,
  Payload extends ImmutableObject = ImmutableObject,
> {
  readonly type: Type;
  readonly source: 'ai' | 'user';
  readonly actorId?: PlayerId;
  readonly payload: Payload;
}

export interface GameState<
  Phase extends string = string,
  Mode extends string = string,
  Board extends ImmutableValue = ImmutableObject,
  PlayerState extends ImmutableValue = ImmutableObject,
  PendingResolution extends ImmutableValue = ImmutableObject,
> {
  readonly schemaVersion: number;
  readonly seed: number;
  readonly phase: Phase;
  readonly mode: Mode;
  readonly round: number;
  readonly openingPlayerId: PlayerId;
  readonly activePlayerId: PlayerId;
  readonly sceneId: SceneId;
  readonly board: Board;
  readonly playerStates: Readonly<Record<PlayerId, PlayerState>>;
  readonly pendingResolution?: PendingResolution;
  readonly winner?: PlayerId;
  readonly commandHistory: readonly GameCommand[];
}

export interface RuleError<
  Code extends string = string,
  Facts extends ImmutableObject = ImmutableObject,
> {
  readonly kind: 'rule-error';
  readonly code: Code;
  readonly facts: Facts;
}

export interface ReducerSuccess<State extends GameState = GameState> {
  readonly ok: true;
  readonly state: State;
}

export interface ReducerFailure<Error extends RuleError = RuleError> {
  readonly ok: false;
  readonly error: Error;
}

export type ReducerResult<
  State extends GameState = GameState,
  Error extends RuleError = RuleError,
> = ReducerSuccess<State> | ReducerFailure<Error>;

export type GameReducer<
  State extends GameState = GameState,
  Command extends GameCommand = GameCommand,
  Error extends RuleError = RuleError,
> = (
  state: State,
  command: Command,
  randomSource: RandomSource,
) => ReducerResult<State, Error>;
