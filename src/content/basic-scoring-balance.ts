import { z } from 'zod';

export const basicScoringBalanceSchema = z
  .object({
    lengthBonus: z
      .object({
        freePhraseCount: z.literal(3),
        perAdditionalPhrase: z.literal(1),
      })
      .strict(),
    weaknessMultiplier: z.literal(2),
    rounding: z.literal('nearest-half-up'),
  })
  .strict();

export type BasicScoringBalance = z.infer<typeof basicScoringBalanceSchema>;

export const basicScoringBalance: BasicScoringBalance =
  basicScoringBalanceSchema.parse({
    lengthBonus: {
      freePhraseCount: 3,
      perAdditionalPhrase: 1,
    },
    weaknessMultiplier: 2,
    rounding: 'nearest-half-up',
  });
