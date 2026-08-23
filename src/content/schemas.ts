import { z } from 'zod';

export const identifierSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u,
    'Use a lower-case kebab-case identifier, for example "civic-fox".',
  );

export const localeKeySchema = z
  .string()
  .regex(
    /^(?:title|phrase|character|scene|comeback)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/u,
    'Use a namespaced locale key, for example "phrase.paper-promise".',
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
  'conjunction',
  'ending',
  'continuation',
] as const;
export const sentencePoolRoles = ['noun', 'verb', 'predicate'] as const;
export const phraseRoleSchema = z.enum(phraseRoles);

export const editorialSafetyFlagSchema = z.enum([
  'copied-line',
  'protected-trait-insult',
  'unsupported-crime-claim',
  'unsupported-private-health-claim',
  'private-target',
  'reusable-harassment',
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

export const phraseSchema = z
  .object({
    id: identifierSchema,
    role: phraseRoleSchema,
    textKey: localeKeySchema,
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
    baseValue: z.number().int().min(1).max(20),
    directness: z.union([z.literal(0), z.literal(1)]),
    tags: uniqueArray(identifierSchema, 'List each phrase tag only once.').min(
      1,
      'Add at least one phrase tag.',
    ),
    characterIds: uniqueArray(
      identifierSchema,
      'List each character restriction only once.',
    ).optional(),
    sceneIds: uniqueArray(
      identifierSchema,
      'List each scene restriction only once.',
    ).optional(),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    finisherBonus: z.number().int().min(1).max(20).optional(),
    contentRating: z.enum(['everyone-10-plus', 'teen']),
    editorialReview: editorialReviewSchema,
  })
  .strict();

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

const phrasePoolSchema = z
  .object({
    public: uniqueArray(identifierSchema, 'List each public phrase only once.'),
    private: uniqueArray(
      identifierSchema,
      'List each private phrase only once.',
    ),
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
      .max(3),
    phrasePools: phrasePoolSchema,
    comebackLinesByTier: z
      .object({
        weak: uniqueArray(
          localeKeySchema,
          'List each weak-tier comeback only once.',
        ).min(1),
        medium: uniqueArray(
          localeKeySchema,
          'List each medium-tier comeback only once.',
        ).min(1),
        strong: uniqueArray(
          localeKeySchema,
          'List each strong-tier comeback only once.',
        ).min(1),
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
