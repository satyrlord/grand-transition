import { z } from 'zod';
import commonSource from './common-phrase-cards.json' with { type: 'json' };
import blackSeaCaptainSource from './characters/black-sea-captain-phrase-cards.json' with { type: 'json' };
import redFoldedChairmanSource from './characters/red-folded-chairman-phrase-cards.json' with { type: 'json' };
import thunderTribuneSource from './characters/thunder-tribune-phrase-cards.json' with { type: 'json' };
import {
  identifierSchema,
  phraseDefinitionSchema,
  phraseSchema,
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
    reviewNotes: z.string().trim().min(1),
  })
  .strict()
  .superRefine((card, context) => {
    if (Boolean(card.singularText) !== Boolean(card.pluralText)) {
      context.addIssue({
        code: 'custom',
        message: 'Add both singularText and pluralText, or omit both.',
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

export type PhraseCardCorpus = Readonly<{
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
    const { text, singularText, pluralText, reviewNotes, ...definition } = card;
    const textKey = `phrase.${card.id}`;
    const singularKey = `${textKey}.singular`;
    const pluralKey = `${textKey}.plural`;
    phrases.push(
      phraseSchema.parse({
        ...definition,
        characterIds: owner ? [owner] : undefined,
        textKey,
        numberForms:
          singularText && pluralText ? { singularKey, pluralKey } : undefined,
        editorialReview: {
          state: 'approved',
          originality: 'original',
          safetyFlags: [],
          notes: reviewNotes,
        },
      }),
    );
    englishMessages[textKey] = text;
    if (singularText && pluralText) {
      englishMessages[singularKey] = singularText;
      englishMessages[pluralKey] = pluralText;
    }
  }

  return { phrases, englishMessages };
}

const common = parsePhraseCardCorpus(commonSource);
const redFoldedChairman = parsePhraseCardCorpus(
  redFoldedChairmanSource,
  'red-folded-chairman',
);
const thunderTribune = parsePhraseCardCorpus(
  thunderTribuneSource,
  'thunder-tribune',
);
const blackSeaCaptain = parsePhraseCardCorpus(
  blackSeaCaptainSource,
  'black-sea-captain',
);

export const phraseCardCatalog = combinePhraseCardCorpora({
  common,
  byCharacter: {
    'red-folded-chairman': redFoldedChairman,
    'thunder-tribune': thunderTribune,
    'black-sea-captain': blackSeaCaptain,
  },
});

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
