import { z } from 'zod';
import {
  characterSchema,
  editorialReviewSchema,
  identifierSchema,
  phraseDefinitionSchema,
  phraseSchema,
  type Character,
  type Phrase,
} from './schemas';

const manualPhraseCardSchema = phraseDefinitionSchema
  .omit({
    characterIds: true,
    editorialReview: true,
    numberForms: true,
    textKey: true,
  })
  .extend({
    text: z.string().trim().min(1),
    singularText: z.string().trim().min(1).optional(),
    pluralText: z.string().trim().min(1).optional(),
    personalSingularText: z.string().trim().min(1).optional(),
    secondPersonText: z.string().trim().min(1).optional(),
    editorialReview: editorialReviewSchema,
  })
  .strict()
  .superRefine((card, context) => {
    if (Boolean(card.singularText) !== Boolean(card.pluralText)) {
      context.addIssue({
        code: 'custom',
        message: 'Add both singularText and pluralText, or omit both.',
      });
    }
    if (Boolean(card.personalSingularText) !== Boolean(card.secondPersonText)) {
      context.addIssue({
        code: 'custom',
        message:
          'Add both personalSingularText and secondPersonText, or omit both.',
      });
    }
    if (
      (card.personalSingularText || card.secondPersonText) &&
      (!card.singularText || !card.pluralText)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Add singularText and pluralText before person-specific agreement forms.',
      });
    }
    if (card.role === 'ending' && !card.text.endsWith('.')) {
      context.addIssue({
        code: 'custom',
        path: ['text'],
        message: 'End each ending text with a full stop.',
      });
    }
  });

const manualPhraseCardsSchema = z
  .array(manualPhraseCardSchema)
  .min(1)
  .superRefine((cards, context) => {
    const seen = new Set<string>();
    cards.forEach((card, index) => {
      if (seen.has(card.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Use each manual phrase identifier once. "${card.id}" is duplicated.`,
        });
      }
      seen.add(card.id);
    });
  });

const manualCharacterFileSchema = characterSchema
  .omit({
    nameKey: true,
    descriptionKey: true,
    characterPhraseIds: true,
    comebackLinesByTier: true,
  })
  .extend({
    rosterOrder: z.number().int().min(0),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    comebacks: z
      .object({
        weak: z.string().trim().min(1),
        medium: z.string().trim().min(1),
        strong: z.string().trim().min(1),
      })
      .strict(),
    editorialReview: editorialReviewSchema,
    phrases: manualPhraseCardsSchema,
  })
  .strict();

export type PhraseCardCorpus = Readonly<{
  phrases: readonly Phrase[];
  englishMessages: Readonly<Record<string, string>>;
}>;

export type CharacterCardFile = Readonly<{
  rosterOrder: number;
  character: Character;
  corpus: PhraseCardCorpus;
  englishMessages: Readonly<Record<string, string>>;
}>;

export type PhraseCardCatalog = Readonly<{
  commonPhraseIds: readonly string[];
  characterPhraseIds: Readonly<Record<string, readonly string[]>>;
  characters: readonly Character[];
  phrases: readonly Phrase[];
  englishMessages: Readonly<Record<string, string>>;
}>;

export function parsePhraseCardCorpus(
  input: unknown,
  characterId?: string,
): PhraseCardCorpus {
  const cards = manualPhraseCardsSchema.parse(input);
  const owner = characterId ? identifierSchema.parse(characterId) : undefined;
  const phrases: Phrase[] = [];
  const englishMessages: Record<string, string> = {};

  for (const card of cards) {
    const {
      text,
      singularText,
      pluralText,
      personalSingularText,
      secondPersonText,
      editorialReview,
      ...definition
    } = card;
    const textKey = `phrase.${card.id}`;
    const singularKey = `${textKey}.singular`;
    const pluralKey = `${textKey}.plural`;
    const personalSingularKey = `${textKey}.personal-singular`;
    const secondPersonKey = `${textKey}.second-person`;
    phrases.push(
      phraseSchema.parse({
        ...definition,
        characterIds: owner ? [owner] : undefined,
        textKey,
        numberForms:
          singularText && pluralText
            ? {
                singularKey,
                pluralKey,
                personalSingularKey:
                  personalSingularText && secondPersonText
                    ? personalSingularKey
                    : undefined,
                secondPersonKey:
                  personalSingularText && secondPersonText
                    ? secondPersonKey
                    : undefined,
              }
            : undefined,
        editorialReview: requireApprovedEditorialReview(
          editorialReview,
          `phrase "${card.id}"`,
        ),
      }),
    );
    englishMessages[textKey] = text;
    if (singularText && pluralText) {
      englishMessages[singularKey] = singularText;
      englishMessages[pluralKey] = pluralText;
    }
    if (personalSingularText && secondPersonText) {
      englishMessages[personalSingularKey] = personalSingularText;
      englishMessages[secondPersonKey] = secondPersonText;
    }
  }

  return { phrases, englishMessages };
}

export function parseCharacterCardFile(
  input: unknown,
  sourceName?: string,
): CharacterCardFile {
  const source = manualCharacterFileSchema.parse(input);
  const expectedFileName = `${source.id}-phrase-cards.json`;
  if (sourceName && fileName(sourceName) !== expectedFileName) {
    throw new Error(
      `Character file "${sourceName}" must be named "${expectedFileName}".`,
    );
  }
  const corpus = parsePhraseCardCorpus(source.phrases, source.id);
  const nameKey = `character.${source.id}.name`;
  const descriptionKey = `character.${source.id}.description`;
  const comebackLinesByTier = {
    weak: [`comeback.${source.id}.weak`],
    medium: [`comeback.${source.id}.medium`],
    strong: [`comeback.${source.id}.strong`],
  } as const;
  const {
    rosterOrder,
    name,
    description,
    comebacks,
    editorialReview,
    phrases: _phrases,
    ...definition
  } = source;
  requireApprovedEditorialReview(editorialReview, `character "${source.id}"`);
  const character = characterSchema.parse({
    ...definition,
    nameKey,
    descriptionKey,
    characterPhraseIds: corpus.phrases.map((phrase) => phrase.id),
    comebackLinesByTier,
  });
  const englishMessages = {
    ...corpus.englishMessages,
    [nameKey]: name,
    [descriptionKey]: description,
    [comebackLinesByTier.weak[0]]: comebacks.weak,
    [comebackLinesByTier.medium[0]]: comebacks.medium,
    [comebackLinesByTier.strong[0]]: comebacks.strong,
  };
  return { rosterOrder, character, corpus, englishMessages };
}

export function buildPhraseCardCatalog(
  commonSource: unknown,
  characterSources: Readonly<Record<string, unknown>>,
): PhraseCardCatalog {
  const common = parsePhraseCardCorpus(commonSource);
  const characterFiles = Object.entries(characterSources)
    .map(([sourceName, source]) => parseCharacterCardFile(source, sourceName))
    .toSorted(
      (left, right) =>
        left.rosterOrder - right.rosterOrder ||
        left.character.id.localeCompare(right.character.id),
    );
  const seenOrders = new Set<number>();
  for (const file of characterFiles) {
    if (seenOrders.has(file.rosterOrder)) {
      throw new Error(
        `Character roster order ${file.rosterOrder} occurs more than once.`,
      );
    }
    seenOrders.add(file.rosterOrder);
  }
  const byCharacter = Object.fromEntries(
    characterFiles.map((file) => [file.character.id, file.corpus]),
  );
  const combined = combinePhraseCardCorpora({ common, byCharacter });
  return {
    ...combined,
    characters: characterFiles.map((file) => file.character),
    englishMessages: Object.assign(
      {},
      combined.englishMessages,
      ...characterFiles.map((file) => file.englishMessages),
    ) as Record<string, string>,
  };
}

export function combinePhraseCardCorpora(input: {
  readonly common: PhraseCardCorpus;
  readonly byCharacter: Readonly<Record<string, PhraseCardCorpus>>;
}): Readonly<{
  commonPhraseIds: readonly string[];
  characterPhraseIds: Readonly<Record<string, readonly string[]>>;
  phrases: readonly Phrase[];
  englishMessages: Readonly<Record<string, string>>;
}> {
  const corpora = [input.common, ...Object.values(input.byCharacter)];
  const phrases = corpora.flatMap((corpus) => corpus.phrases);
  const seen = new Set<string>();
  for (const phrase of phrases) {
    if (seen.has(phrase.id)) {
      throw new Error(
        `Phrase card "${phrase.id}" occurs in more than one corpus.`,
      );
    }
    seen.add(phrase.id);
  }
  return {
    commonPhraseIds: input.common.phrases.map((phrase) => phrase.id),
    characterPhraseIds: Object.fromEntries(
      Object.entries(input.byCharacter).map(([characterId, corpus]) => [
        characterId,
        corpus.phrases.map((phrase) => phrase.id),
      ]),
    ),
    phrases,
    englishMessages: Object.assign(
      {},
      ...corpora.map((corpus) => corpus.englishMessages),
    ) as Record<string, string>,
  };
}

function fileName(sourceName: string): string {
  return sourceName.replaceAll('\\', '/').split('/').at(-1) ?? sourceName;
}

function requireApprovedEditorialReview(
  review: z.infer<typeof editorialReviewSchema>,
  owner: string,
): z.infer<typeof editorialReviewSchema> {
  if (review.state !== 'approved') {
    throw new Error(`Approve the editorial review for ${owner}.`);
  }
  if (review.originality !== 'original') {
    throw new Error(`Use original content for ${owner}.`);
  }
  if (review.safetyFlags.length > 0) {
    throw new Error(
      `Remove or replace ${owner} marked as ${review.safetyFlags.join(', ')}.`,
    );
  }
  return review;
}
