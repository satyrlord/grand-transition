import { z } from 'zod';
import {
  characterDefinitionSchema,
  characterSchema,
  identifierSchema,
  phraseDefinitionSchema,
  phraseSchema,
  validateCharacterSkinVoices,
  type Character,
  type Phrase,
} from './schemas';

const maximumPhraseWordCount = 11;
// A comeback line is delivered alone, with no card placed after it, so its
// guardrail sits above the phrase ceiling. It still stops real bloat.
const maximumComebackWordCount = 16;

// Guardrail ceilings by role. They only stop real bloat: a card may sit well
// above the measured source-game band when the length is the joke, and the
// English text may later grow again when Romanian localization adapts it.
// The soft editorial bands live in the private research record.
const roleWordCeilings: Record<Phrase['role'], number> = {
  conjunction: 6,
  continuation: 1,
  verb: 10,
  modifier: 9,
  noun: 10,
  predicate: 10,
  ending: 11,
};

function phraseWordCount(value: string): number {
  return value.trim().split(/\s+/u).length;
}

const comebackLineSchema = z
  .string()
  .trim()
  .min(1)
  .superRefine((value, context) => {
    if (phraseWordCount(value) > maximumComebackWordCount) {
      context.addIssue({
        code: 'custom',
        message: `Keep comeback text to ${maximumComebackWordCount} words or fewer.`,
      });
    }
  });

const manualPhraseCardSchema = phraseDefinitionSchema
  .omit({
    characterIds: true,
    numberForms: true,
    textKey: true,
  })
  .extend({
    text: z.string().trim().min(1),
    singularText: z.string().trim().min(1).optional(),
    pluralText: z.string().trim().min(1).optional(),
    personalSingularText: z.string().trim().min(1).optional(),
    secondPersonText: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((card, context) => {
    for (const field of [
      'text',
      'singularText',
      'pluralText',
      'personalSingularText',
      'secondPersonText',
    ] as const) {
      const value = card[field];
      if (value && phraseWordCount(value) > maximumPhraseWordCount) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `Keep player-visible phrase text to ${maximumPhraseWordCount} words or fewer.`,
        });
      }
      const ceiling = roleWordCeilings[card.role];
      if (value && phraseWordCount(value) > ceiling) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `Keep ${card.role} text to ${ceiling} words or fewer so the speech bubble stays readable.`,
        });
      }
    }
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
    const visibleTextOwner = new Map<string, string>();
    cards.forEach((card, index) => {
      if (seen.has(card.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Use each manual phrase identifier once. "${card.id}" is duplicated.`,
        });
      }
      seen.add(card.id);

      const visibleText = normalizeVisiblePhraseText(card.text);
      const previousOwner = visibleTextOwner.get(visibleText);
      if (previousOwner) {
        context.addIssue({
          code: 'custom',
          path: [index, 'text'],
          message: `Use unique player-visible phrase text. "${card.text}" duplicates phrase "${previousOwner}".`,
        });
      } else {
        visibleTextOwner.set(visibleText, card.id);
      }
    });
  });

const manualCharacterFileSchema = characterDefinitionSchema
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
        weak: comebackLineSchema,
        medium: comebackLineSchema,
        strong: comebackLineSchema,
      })
      .strict(),
    phrases: manualPhraseCardsSchema,
  })
  .strict()
  .superRefine(validateCharacterSkinVoices);

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
    phrases: _phrases,
    ...definition
  } = source;
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
  const englishMessages = Object.assign(
    {},
    ...corpora.map((corpus) => corpus.englishMessages),
  ) as Record<string, string>;
  const seen = new Set<string>();
  const visibleTextOwner = new Map<string, string>();
  for (const phrase of phrases) {
    if (seen.has(phrase.id)) {
      throw new Error(
        `Phrase card "${phrase.id}" occurs in more than one corpus.`,
      );
    }
    seen.add(phrase.id);

    const text = englishMessages[phrase.textKey];
    if (text === undefined) continue;
    const visibleText = normalizeVisiblePhraseText(text);
    const previousOwner = visibleTextOwner.get(visibleText);
    if (previousOwner) {
      throw new Error(
        `Phrase card "${phrase.id}" repeats player-visible text from "${previousOwner}". Use unique English phrase text.`,
      );
    }
    visibleTextOwner.set(visibleText, phrase.id);
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
    englishMessages,
  };
}

function normalizeVisiblePhraseText(text: string): string {
  return text.trim().replaceAll(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function fileName(sourceName: string): string {
  return sourceName.replaceAll('\\', '/').split('/').at(-1) ?? sourceName;
}
