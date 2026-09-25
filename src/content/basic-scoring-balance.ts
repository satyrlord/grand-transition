import { z } from 'zod';

export const basePointsMultiplierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export type BasePointsMultiplier = z.infer<typeof basePointsMultiplierSchema>;

// Matches use the default balance below with their selected base-points
// multiplier. Scoring tests can override individual values to isolate rules.
export const basicScoringBalanceSchema = z
  .object({
    modifierPoints: z.number().int().min(0),
    basePointsMinimum: z.number().int().min(0),
    basePointsMultiplier: basePointsMultiplierSchema,
    substanceGroupPoints: z.number().int().min(0),
    flavourGroupPoints: z.number().int().min(0),
    weaknessMultiplier: z.number().int().min(1),
    restrictedPhraseMultiplier: z.number().int().min(1),
    rounding: z.literal('ceil'),
  })
  .strict();

export type BasicScoringBalance = z.infer<typeof basicScoringBalanceSchema>;

export const basicScoringBalance: BasicScoringBalance = basicScoringBalanceSchema.parse({
  modifierPoints: 2,
  basePointsMinimum: 5,
  basePointsMultiplier: 3,
  substanceGroupPoints: 2,
  flavourGroupPoints: 1,
  weaknessMultiplier: 2,
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
