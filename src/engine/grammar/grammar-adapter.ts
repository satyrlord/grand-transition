import type { ImmutableValue } from '../game-contracts';

export interface GrammarAccepted<Analysis extends ImmutableValue> {
  readonly accepted: true;
  readonly analysis: Analysis;
}

export interface GrammarRejected<Fault extends ImmutableValue> {
  readonly accepted: false;
  readonly faults: readonly Fault[];
}

export type GrammarResult<
  Analysis extends ImmutableValue,
  Fault extends ImmutableValue,
> = GrammarAccepted<Analysis> | GrammarRejected<Fault>;

export interface GrammarAdapter<
  Input extends ImmutableValue = ImmutableValue,
  Analysis extends ImmutableValue = ImmutableValue,
  Fault extends ImmutableValue = ImmutableValue,
> {
  analyze(input: Input): GrammarResult<Analysis, Fault>;
}
