import { z } from 'zod';

export const basicScoringBalanceSchema = z.discriminatedUnion('version', [
  z
    .object({
      version: z.literal(1),
      basePointsMinimum: z.literal(1),
      basePointsMultiplier: z.literal(2),
      substanceGroupPoints: z.literal(2),
      flavourGroupPoints: z.literal(1),
      weaknessMultiplier: z.literal(2),
      restrictedPhraseMultiplier: z.literal(1.5),
      rounding: z.literal('ceil'),
    })
    .strict(),
  z
    .object({
      version: z.literal(2),
      basePointsMinimum: z.literal(5),
      basePointsMultiplier: z.literal(5),
      substanceGroupPoints: z.literal(2),
      flavourGroupPoints: z.literal(1),
      weaknessMultiplier: z.literal(1.5),
      restrictedPhraseMultiplier: z.literal(1),
      rounding: z.literal('ceil'),
    })
    .strict(),
]);

export type BasicScoringBalance = z.infer<typeof basicScoringBalanceSchema>;

export const basicScoringBalance: BasicScoringBalance =
  basicScoringBalanceSchema.parse({
    version: 2,
    basePointsMinimum: 5,
    basePointsMultiplier: 5,
    substanceGroupPoints: 2,
    flavourGroupPoints: 1,
    weaknessMultiplier: 1.5,
    restrictedPhraseMultiplier: 1,
    rounding: 'ceil',
  });

export const legacyBasicScoringBalance: BasicScoringBalance =
  basicScoringBalanceSchema.parse({
    version: 1,
    basePointsMinimum: 1,
    basePointsMultiplier: 2,
    substanceGroupPoints: 2,
    flavourGroupPoints: 1,
    weaknessMultiplier: 2,
    restrictedPhraseMultiplier: 1.5,
    rounding: 'ceil',
  });
