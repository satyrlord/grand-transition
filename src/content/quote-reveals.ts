import { z } from 'zod';
import type { CatalogBuildOptions } from './phrase-card-catalog.ts';
import { identifierSchema, type Phrase } from './schemas.ts';

// Milestone 034 reveal records: the public facts about the source of a phrase
// card. A record has only enumerated values and a year, so it carries no name,
// link, or source wording.

export const quoteRevealClassifications = [
  'exact-quote',
  'adapted-quote',
  'real-slogan',
  'invented',
] as const;
export const quoteRevealSourceLanguages = ['ro', 'en', 'other'] as const;
export const quoteRevealVenues = [
  'parliament',
  'government',
  'county-council',
  'local-council',
  'campaign',
  'press-conference',
  'television',
  'radio',
  'print',
  'social-media',
  'protest',
  'court',
] as const;
export const quoteRevealLevels = ['national', 'county', 'local', 'international'] as const;
export const earliestQuoteRevealYear = 1990;

export type QuoteRevealClassification = (typeof quoteRevealClassifications)[number];
export type QuoteRevealSourceLanguage = (typeof quoteRevealSourceLanguages)[number];
export type QuoteRevealVenue = (typeof quoteRevealVenues)[number];
export type QuoteRevealLevel = (typeof quoteRevealLevels)[number];

export type SourcedQuoteReveal = Readonly<{
  cardId: string;
  classification: Exclude<QuoteRevealClassification, 'invented'>;
  sourceLanguage: QuoteRevealSourceLanguage;
  venue: QuoteRevealVenue;
  level: QuoteRevealLevel;
  year: number;
}>;
export type InventedQuoteReveal = Readonly<{ cardId: string; classification: 'invented' }>;
export type QuoteRevealRecord = SourcedQuoteReveal | InventedQuoteReveal;

export type QuoteRevealFailureCode =
  | 'forbidden-text'
  | 'invalid-record'
  | 'missing-field'
  | 'unknown-card'
  | 'duplicate-card'
  | 'missing-record';

export type QuoteRevealFailure = Readonly<{
  path: string;
  code: QuoteRevealFailureCode;
  message: string;
}>;

const sourceFields = ['sourceLanguage', 'venue', 'level', 'year'] as const;
// Each card of these roles has a record. The record is `invented` when the card
// has no recorded source.
const sourcedRoles: ReadonlySet<Phrase['role']> = new Set(['predicate', 'modifier', 'ending']);
const forbiddenText = /http|www\.|@/iu;

const quoteRevealRecordSchema = z
  .object({
    cardId: identifierSchema,
    classification: z.enum(quoteRevealClassifications),
    sourceLanguage: z.enum(quoteRevealSourceLanguages).optional(),
    venue: z.enum(quoteRevealVenues).optional(),
    level: z.enum(quoteRevealLevels).optional(),
    year: z.number().int().min(earliestQuoteRevealYear).optional(),
  })
  .strict()
  .superRefine((record, context) => {
    for (const field of sourceFields) {
      const present = record[field] !== undefined;
      if (record.classification === 'invented' && present) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'An invented phrase has no source. Remove this field.',
        });
      } else if (record.classification !== 'invented' && !present) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `Give the ${field} of a record that is not invented.`,
          params: { missingField: true },
        });
      }
    }
  });

/**
 * Reads the shipped records. This checks only the shape of each record. The
 * rules that need the phrase catalog are in `validateQuoteReveals`.
 */
export function parseQuoteReveals(
  input: unknown,
  options: CatalogBuildOptions = {},
): readonly QuoteRevealRecord[] {
  return options.validate === false
    ? (input as readonly QuoteRevealRecord[])
    : (z.array(quoteRevealRecordSchema).parse(input) as readonly QuoteRevealRecord[]);
}

/** Finds each defect that `npm run content:validate` reports for the records. */
export function validateQuoteReveals(
  input: unknown,
  phrases: readonly Pick<Phrase, 'id' | 'role'>[],
  currentYear: number,
): readonly QuoteRevealFailure[] {
  if (!Array.isArray(input)) {
    return [failure('', 'invalid-record', 'Give the reveal records as one array.')];
  }
  const failures: QuoteRevealFailure[] = [];
  const roleById = new Map(phrases.map((phrase) => [phrase.id, phrase.role]));
  const recordedCardIds = new Set<string>();

  input.forEach((entry: unknown, index) => {
    const cardId =
      typeof entry === 'object' && entry !== null && 'cardId' in entry ? entry.cardId : undefined;
    const name = typeof cardId === 'string' ? cardId : String(index);
    for (const text of forbiddenStrings(entry)) {
      failures.push(
        failure(name, 'forbidden-text', `Remove "${text}". A record has no link or address.`),
      );
    }

    const parsed = quoteRevealRecordSchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const missing = issue.code === 'custom' && issue.params?.missingField === true;
        failures.push(
          failure(
            name,
            missing ? 'missing-field' : 'invalid-record',
            issue.message,
            issue.path.map(String).join('.'),
          ),
        );
      }
    } else if (parsed.data.year !== undefined && parsed.data.year > currentYear) {
      failures.push(
        failure(
          name,
          'invalid-record',
          `Use a year from ${earliestQuoteRevealYear} through ${currentYear}.`,
          'year',
        ),
      );
    }

    if (typeof cardId !== 'string') return;
    if (recordedCardIds.has(cardId)) {
      failures.push(failure(name, 'duplicate-card', 'Give each card one record only.'));
      return;
    }
    // A record with a defect still counts as the record of its card.
    recordedCardIds.add(cardId);
    if (!roleById.has(cardId)) {
      failures.push(failure(name, 'unknown-card', 'No phrase card has this identifier.'));
    }
  });

  for (const phrase of phrases) {
    if (!sourcedRoles.has(phrase.role)) continue;
    if (!recordedCardIds.has(phrase.id)) {
      failures.push(failure(phrase.id, 'missing-record', `Add the record of this ${phrase.role}.`));
    }
  }
  return failures;
}

function failure(
  name: string,
  code: QuoteRevealFailureCode,
  message: string,
  field = '',
): QuoteRevealFailure {
  const record = name ? `quote-reveals[${name}]` : 'quote-reveals';
  return { path: field ? `${record}.${field}` : record, code, message };
}

function forbiddenStrings(value: unknown): string[] {
  if (typeof value === 'string') return forbiddenText.test(value) ? [value] : [];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    ...forbiddenStrings(key),
    ...forbiddenStrings(nested),
  ]);
}
