import { z } from 'zod';

export const identifierSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u,
    'Use a lower-case kebab-case identifier, for example "test-character".',
  );

export const localeKeySchema = z
  .string()
  .regex(
    /^(?:title|phrase|character|scene|comeback)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/u,
    'Use a namespaced locale key, for example "phrase.national-consensus".',
  );

const uniqueArray = <T extends z.ZodTypeAny>(item: T, message: string) =>
  z.array(item).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: 'custom', message });
    }
  });

export const phraseRoles = [
  'noun',
  'verb',
  'predicate',
  'modifier',
  'conjunction',
  'ending',
  'continuation',
] as const;
export const sentencePoolRoles = ['noun', 'verb', 'predicate'] as const;
export const phraseRoleSchema = z.enum(phraseRoles);
export const connectorKindSchema = z.enum([
  'and',
  'because',
  'but',
  'for',
  'so',
  'yet',
  'with',
]);

export const editorialSafetyFlagSchema = z.enum([
  'real-person-reference',
  'real-party-reference',
  'protected-trait-insult',
  'sexual-humiliation',
  'threat',
]);

export const editorialReviewSchema = z
  .object({
    state: z.enum(['approved', 'needs-review', 'rejected']),
    originality: z.enum(['original', 'unknown', 'copied']),
    safetyFlags: uniqueArray(
      editorialSafetyFlagSchema,
      'List each editorial safety flag only once.',
    ),
    notes: z.string().trim().min(1, 'Add a concise editorial review note.'),
  })
  .strict();

export const mediaReferenceSchema = z
  .object({
    assetId: identifierSchema,
    realLogo: z.boolean(),
    copyrightedBroadcastGraphic: z.boolean(),
  })
  .strict();

const scoreGroupsSchema = z
  .object({
    substance: uniqueArray(
      identifierSchema,
      'List each substance group only once.',
    ),
    flavour: uniqueArray(
      identifierSchema,
      'List each flavour group only once.',
    ),
  })
  .strict();

const scorePreferenceSchema = z
  .object({
    left: uniqueArray(
      identifierSchema,
      'List each left score group only once.',
    ).min(1),
    right: uniqueArray(
      identifierSchema,
      'List each right score group only once.',
    )
      .min(1)
      .optional(),
  })
  .strict();

const scorePreferencesSchema = z
  .object({
    substance: z.array(scorePreferenceSchema),
    flavour: z.array(scorePreferenceSchema),
  })
  .strict();

const customScoresSchema = z
  .array(
    z
      .object({
        leftNounId: identifierSchema,
        rightNounId: identifierSchema.optional(),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
  )
  .min(1)
  .superRefine((scores, context) => {
    const seen = new Set<string>();
    scores.forEach((score, index) => {
      const key = `${score.leftNounId}\u0000${score.rightNounId ?? ''}`;
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message: 'Define each left-and-right noun custom score only once.',
        });
      }
      seen.add(key);
    });
  });

export const phraseDefinitionSchema = z
  .object({
    id: identifierSchema,
    role: phraseRoleSchema,
    textKey: localeKeySchema,
    connectorKind: connectorKindSchema.optional(),
    grammaticalNumber: z.enum(['singular', 'plural']).optional(),
    customScores: customScoresSchema.optional(),
    scoreGroups: scoreGroupsSchema.optional(),
    scorePreferences: scorePreferencesSchema.optional(),
    numberForms: z
      .object({
        singularKey: localeKeySchema,
        pluralKey: localeKeySchema,
      })
      .strict()
      .refine((forms) => forms.singularKey !== forms.pluralKey, {
        message: 'Use different locale keys for singular and plural forms.',
      })
      .optional(),
    tags: uniqueArray(identifierSchema, 'List each phrase tag only once.').min(
      1,
      'Add at least one phrase tag.',
    ),
    characterIds: uniqueArray(
      identifierSchema,
      'List each character restriction only once.',
    )
      .min(1)
      .optional(),
    sceneIds: uniqueArray(
      identifierSchema,
      'List each scene restriction only once.',
    )
      .min(1)
      .optional(),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    finisherBonus: z.number().int().min(1).max(20).optional(),
    editorialReview: editorialReviewSchema,
  })
  .strict();

export const phraseSchema = phraseDefinitionSchema.superRefine(
  (phrase, context) => {
    const issue = (field: string, message: string) =>
      context.addIssue({ code: 'custom', path: [field], message });
    const relation = phrase.role === 'verb' || phrase.role === 'predicate';

    if (phrase.role === 'noun' && !phrase.scoreGroups) {
      issue(
        'scoreGroups',
        'Give each noun substance and flavour score groups.',
      );
    } else if (phrase.role !== 'noun' && phrase.scoreGroups) {
      issue('scoreGroups', 'Only a noun can declare noun score groups.');
    }

    if (relation && !phrase.scorePreferences && !phrase.customScores) {
      issue(
        'scorePreferences',
        'Give each relation score preferences or a custom score.',
      );
    } else if (!relation && (phrase.scorePreferences || phrase.customScores)) {
      issue(
        phrase.scorePreferences ? 'scorePreferences' : 'customScores',
        'Only a verb or predicate can declare relation scoring data.',
      );
    }

    if (phrase.role === 'conjunction' && !phrase.connectorKind) {
      issue(
        'connectorKind',
        'Declare and, because, but, for, so, or yet for each conjunction.',
      );
    } else if (phrase.role !== 'conjunction' && phrase.connectorKind) {
      issue(
        'connectorKind',
        'Only a conjunction can declare a connector kind.',
      );
    }

    if (phrase.role === 'ending' && phrase.finisherBonus === undefined) {
      issue('finisherBonus', 'Give each ending its configured finisher score.');
    } else if (phrase.role !== 'ending' && phrase.finisherBonus !== undefined) {
      issue('finisherBonus', 'Only an ending can declare a finisher score.');
    }

    if (phrase.role !== 'noun' && phrase.grammaticalNumber) {
      issue('grammaticalNumber', 'Only a noun can declare grammatical number.');
    }
  },
);

const paletteSchema = z
  .object({
    primary: z
      .string()
      .regex(/^#[0-9a-f]{6}$/u, 'Use a six-digit lower-case hex color.'),
    secondary: z
      .string()
      .regex(/^#[0-9a-f]{6}$/u, 'Use a six-digit lower-case hex color.'),
    accent: z
      .string()
      .regex(/^#[0-9a-f]{6}$/u, 'Use a six-digit lower-case hex color.'),
  })
  .strict();

export const characterSchema = z
  .object({
    id: identifierSchema,
    species: z.literal('human', {
      error: 'Every character must be human.',
    }),
    nameKey: localeKeySchema,
    descriptionKey: localeKeySchema,
    assets: z
      .object({
        portrait: mediaReferenceSchema,
        token: mediaReferenceSchema,
      })
      .strict(),
    palette: paletteSchema,
    weaknessTags: uniqueArray(
      identifierSchema,
      'List each weakness tag only once.',
    )
      .min(2)
      .max(4),
    characterPhraseIds: uniqueArray(
      identifierSchema,
      'List each character phrase only once.',
    ),
    comebackLinesByTier: z
      .object({
        weak: uniqueArray(
          localeKeySchema,
          'List each weak-tier comeback only once.',
        ).length(1, 'Give the character exactly one weak-tier comeback.'),
        medium: uniqueArray(
          localeKeySchema,
          'List each medium-tier comeback only once.',
        ).length(1, 'Give the character exactly one medium-tier comeback.'),
        strong: uniqueArray(
          localeKeySchema,
          'List each strong-tier comeback only once.',
        ).length(1, 'Give the character exactly one strong-tier comeback.'),
      })
      .strict(),
    aiPersonality: z
      .object({
        aggression: z.number().min(0).max(1),
        denial: z.number().min(0).max(1),
        risk: z.number().min(0).max(1),
      })
      .strict(),
    voiceProfile: z
      .object({
        voiceHint: z.enum(['bright', 'grounded', 'measured', 'sharp']),
        rate: z.number().min(0.5).max(2),
        pitch: z.number().min(0).max(2),
      })
      .strict(),
    animationSet: z
      .object({
        idle: identifierSchema,
        speak: identifierSchema,
        react: identifierSchema,
      })
      .strict(),
  })
  .strict();

export const sceneSchema = z
  .object({
    id: identifierSchema,
    openingPlayerIndex: z.union([z.literal(0), z.literal(1)]),
    nameKey: localeKeySchema,
    descriptionKey: localeKeySchema,
    backgroundLayers: z
      .array(
        z
          .object({
            media: mediaReferenceSchema,
            depth: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
    animationId: identifierSchema,
    music: mediaReferenceSchema,
    ambience: mediaReferenceSchema,
    phrasePool: uniqueArray(
      identifierSchema,
      'List each scene phrase only once.',
    ).min(3),
    effectIds: uniqueArray(
      identifierSchema,
      'List each scene effect only once.',
    ),
  })
  .strict();

export type Phrase = z.infer<typeof phraseSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type EditorialSafetyFlag = z.infer<typeof editorialSafetyFlagSchema>;
