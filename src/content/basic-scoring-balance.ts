import { z } from 'zod';

export const basicScoringBalanceSchema = z
  .object({
    basePointsMultiplier: z.literal(2),
    substanceGroupPoints: z.literal(2),
    flavourGroupPoints: z.literal(1),
    weaknessMultiplier: z.literal(2),
    restrictedPhraseMultiplier: z.literal(1.5),
    rounding: z.literal('ceil'),
  })
  .strict();

export type BasicScoringBalance = z.infer<typeof basicScoringBalanceSchema>;

export const basicScoringBalance: BasicScoringBalance =
  basicScoringBalanceSchema.parse({
    basePointsMultiplier: 2,
    substanceGroupPoints: 2,
    flavourGroupPoints: 1,
    weaknessMultiplier: 2,
    restrictedPhraseMultiplier: 1.5,
    rounding: 'ceil',
  });
