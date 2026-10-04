import { z } from 'zod';
import { deepFreeze, isRecord } from '../../engine/plain-values.ts';
import { quoteGuessLimit, type QuoteGuessScore } from '../../engine/quote-receipts.ts';
import { normalizedJson } from './replay-codec.ts';

export const quoteArchiveSchemaVersion = 1;

/** The Milestone 034 archive. It holds only card IDs and the best guess score. */
export type QuoteArchiveDocument = Readonly<{
  schemaVersion: 1;
  cardIds: readonly string[];
  bestGuess: QuoteGuessScore | null;
}>;

export type QuoteArchiveCodecFailure = Readonly<{
  ok: false;
  code: 'invalid-data' | 'unsupported-version';
  path: string;
}>;

export type QuoteArchiveCodecResult =
  Readonly<{ ok: true; value: QuoteArchiveDocument }> | QuoteArchiveCodecFailure;

const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

// Keep this field order: the encoded bytes follow it.
const schema = z
  .object({
    schemaVersion: z.literal(quoteArchiveSchemaVersion),
    cardIds: z.array(identifier).refine((values) => new Set(values).size === values.length),
    bestGuess: z
      .object({
        correct: z.number().int().min(0),
        total: z.number().int().min(1).max(quoteGuessLimit),
      })
      .strict()
      .refine((score) => score.correct <= score.total, { path: ['correct'] })
      .nullable(),
  })
  .strict();

const fields = new Set(['schemaVersion', 'cardIds', 'bestGuess']);

export const emptyQuoteArchive: QuoteArchiveDocument = deepFreeze({
  schemaVersion: quoteArchiveSchemaVersion,
  cardIds: [],
  bestGuess: null,
});

export function encodeQuoteArchive(archive: QuoteArchiveDocument): string {
  const parsed = parse(archive);
  if (!parsed.ok) {
    throw new Error(`The quote archive is invalid at ${parsed.path}.`);
  }
  return normalizedJson(parsed.value);
}

export function decodeQuoteArchive(serialized: string): QuoteArchiveCodecResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return invalid('$');
  }
  if (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion !== quoteArchiveSchemaVersion
  ) {
    return { ok: false, code: 'unsupported-version', path: 'schemaVersion' };
  }
  return parse(value);
}

function parse(value: unknown): QuoteArchiveCodecResult {
  if (!isRecord(value)) return invalid('$');
  const unknown = Object.keys(value).find((field) => !fields.has(field));
  if (unknown) return invalid(unknown);
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path ?? [];
    return invalid(path.length > 0 ? path.map(String).join('.') : '$');
  }
  return { ok: true, value: deepFreeze(parsed.data) };
}

function invalid(path: string): QuoteArchiveCodecFailure {
  return { ok: false, code: 'invalid-data', path };
}
