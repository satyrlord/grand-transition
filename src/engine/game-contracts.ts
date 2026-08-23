import type { RandomSource } from './random-source';

export type ImmutableScalar = boolean | number | string | null;

export type ImmutableValue =
  ImmutableScalar | readonly ImmutableValue[] | ImmutableObject;

export interface ImmutableObject {
  readonly [key: string]: ImmutableValue;
}

export type DeepImmutable<Value> = Value extends ImmutableScalar
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepImmutable<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepImmutable<Value[Key]> }
      : Value;

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
  Board = ImmutableObject,
  PlayerState = ImmutableObject,
  PendingResolution = ImmutableObject,
> {
  readonly schemaVersion: number;
  readonly seed: number;
  readonly phase: Phase;
  readonly mode: Mode;
  readonly round: number;
  readonly openingPlayerId: PlayerId;
  readonly activePlayerId: PlayerId;
  readonly sceneId: SceneId;
  readonly board: DeepImmutable<Board>;
  readonly playerStates: Readonly<Record<PlayerId, DeepImmutable<PlayerState>>>;
  readonly pendingResolution?: DeepImmutable<PendingResolution>;
  readonly winner?: PlayerId;
  readonly commandHistory: readonly GameCommand[];
}

export type AnyGameState = GameState<string, string, unknown, unknown, unknown>;

export interface RuleError<
  Code extends string = string,
  Facts extends ImmutableObject = ImmutableObject,
> {
  readonly kind: 'rule-error';
  readonly code: Code;
  readonly facts: Facts;
}

export interface ReducerSuccess<State extends AnyGameState = GameState> {
  readonly ok: true;
  readonly state: State;
}

export interface ReducerFailure<Error extends RuleError = RuleError> {
  readonly ok: false;
  readonly error: Error;
}

export type ReducerResult<
  State extends AnyGameState = GameState,
  Error extends RuleError = RuleError,
> = ReducerSuccess<State> | ReducerFailure<Error>;

export type GameReducer<
  State extends AnyGameState = GameState,
  Command extends GameCommand = GameCommand,
  Error extends RuleError = RuleError,
> = (
  state: State,
  command: Command,
  randomSource: RandomSource,
) => ReducerResult<State, Error>;
