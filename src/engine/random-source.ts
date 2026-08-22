export interface RandomStep {
  readonly value: number;
  readonly nextSeed: number;
}

export interface RandomSource {
  next(seed: number): RandomStep;
}

const unsignedIntegerRange = 0x1_0000_0000;

export const seededRandomSource: RandomSource = {
  next(seed) {
    const currentSeed = Math.trunc(seed) >>> 0;
    const nextSeed = (Math.imul(currentSeed, 1_664_525) + 1_013_904_223) >>> 0;

    return {
      value: nextSeed / unsignedIntegerRange,
      nextSeed,
    };
  },
};
