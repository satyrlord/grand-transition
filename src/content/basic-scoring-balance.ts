import { z } from 'zod';

export const basePointsMultiplierSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
]);

export type BasePointsMultiplier = z.infer<typeof basePointsMultiplierSchema>;

// One scoring balance exists at a time. The fields stay plain numbers so the
// scoring tests can probe a single rule by overriding one value; the shipped
// balance below is the only configuration the application uses.
export const basicScoringBalanceSchema = z
  .object({
    modifierPoints: z.number().min(0),
    basePointsMinimum: z.number().min(0),
    basePointsMultiplier: basePointsMultiplierSchema,
    substanceGroupPoints: z.number().min(0),
    flavourGroupPoints: z.number().min(0),
    weaknessMultiplier: z.number().min(1),
    restrictedPhraseMultiplier: z.number().min(1),
    rounding: z.literal('ceil'),
  })
  .strict();

export type BasicScoringBalance = z.infer<typeof basicScoringBalanceSchema>;

export const basicScoringBalance: BasicScoringBalance =
  basicScoringBalanceSchema.parse({
    modifierPoints: 2,
    basePointsMinimum: 5,
    basePointsMultiplier: 3,
    substanceGroupPoints: 2,
    flavourGroupPoints: 1,
    weaknessMultiplier: 1.5,
    restrictedPhraseMultiplier: 1,
    rounding: 'ceil',
  });

export function scoringBalanceForMultiplier(
  basePointsMultiplier: BasePointsMultiplier,
): BasicScoringBalance {
  return basicScoringBalanceSchema.parse({
    ...basicScoringBalance,
    basePointsMultiplier,
  });
}
