export interface RandomStep {
  readonly value: number;
  readonly nextSeed: number;
}

export interface RandomSource {
  next(seed: number): RandomStep;
}
