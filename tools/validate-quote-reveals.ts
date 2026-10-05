// Reveal-record validation of Milestone 034.
//
// The content rules prove that each record is complete, refers to a shipped
// card, and carries no link or address. When the private research folder
// exists, the tool also compares each record with its provenance record.
//
// A provenance record is one row of a Markdown table in the research folder.
// The table has the columns `Card ID`, `Classification`, `Source language`, and
// `Year`. It can have more columns.
//
// Usage: node tools/validate-quote-reveals.ts [--list-missing]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import {
  isSourcedQuoteReveal,
  parseQuoteReveals,
  validateQuoteReveals,
  type QuoteRevealRecord,
} from '../src/content/quote-reveals.ts';
import { loadGameContent } from './load-game-content.ts';

export const quoteRevealsPath = path.join('src', 'content', 'quote-reveals.json');
export const researchFolder = 'research';

export type ProvenanceRecord = Readonly<{
  cardId: string;
  classification: string;
  sourceLanguage: string;
  year: string;
  /** The other columns of the row, by lower-case column name. They stay private. */
  cells: Readonly<Record<string, string>>;
}>;

export type QuoteRevealToolFailure = Readonly<{ path: string; code: string; message: string }>;

export type QuoteRevealValidation = Readonly<{
  records: number;
  failures: readonly QuoteRevealToolFailure[];
  /** `null` when the research folder does not exist, so no comparison occurred. */
  provenanceRecords: number | null;
}>;

const provenanceColumns = ['card id', 'classification', 'source language', 'year'] as const;

/** Reads each provenance table row in one Markdown document. */
export function parseProvenanceTables(markdown: string): readonly ProvenanceRecord[] {
  const records: ProvenanceRecord[] = [];
  let columns: readonly string[] | null = null;
  for (const line of markdown.split(/\r?\n/u)) {
    if (!line.trimStart().startsWith('|')) {
      columns = null;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/gu, '')
      .split(/(?<!\\)\|/u)
      .map((cell) => cell.trim());
    if (columns === null) {
      const header = cells.map((cell) => cell.toLowerCase());
      // A table without the provenance columns is a different table.
      columns = provenanceColumns.every((column) => header.includes(column)) ? header : [];
      continue;
    }
    if (columns.length === 0 || cells.every((cell) => /^:?-+:?$/u.test(cell))) continue;
    const row = Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']));
    records.push({
      cardId: row['card id']!.replaceAll('`', ''),
      classification: row.classification!,
      sourceLanguage: row['source language']!,
      year: row.year!,
      cells: row,
    });
  }
  return records;
}

/** Reads the provenance records of the research folder, or `null` when it does not exist. */
export function readProvenanceRecords(
  researchDirectory: string,
): readonly ProvenanceRecord[] | null {
  if (!existsSync(researchDirectory)) return null;
  return readdirSync(researchDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) =>
      parseProvenanceTables(readFileSync(path.join(researchDirectory, entry.name), 'utf8')),
    );
}

/** Finds each record that differs from its provenance record, or that has none. */
export function compareWithProvenance(
  records: readonly QuoteRevealRecord[],
  provenance: readonly ProvenanceRecord[],
): readonly QuoteRevealToolFailure[] {
  const failures: QuoteRevealToolFailure[] = [];
  const byCard = new Map<string, ProvenanceRecord>();
  for (const row of provenance) {
    if (byCard.has(row.cardId)) {
      failures.push({
        path: `provenance[${row.cardId}]`,
        code: 'provenance-duplicate',
        message: 'Give each card one provenance record only.',
      });
    }
    byCard.set(row.cardId, row);
  }

  for (const record of records) {
    const row = byCard.get(record.cardId);
    if (!row) {
      // An invented phrase has no source, so it has no provenance record.
      if (isSourcedQuoteReveal(record)) {
        failures.push({
          path: `quote-reveals[${record.cardId}]`,
          code: 'provenance-missing',
          message: 'No provenance record. A person cannot examine this record.',
        });
      }
      continue;
    }
    const fields: readonly (readonly [string, string, string])[] = [
      ['classification', record.classification, row.classification],
      ...(!isSourcedQuoteReveal(record)
        ? []
        : ([
            ['sourceLanguage', record.sourceLanguage, row.sourceLanguage],
            ['year', String(record.year), row.year],
          ] as const)),
    ];
    for (const [field, shipped, recorded] of fields) {
      if (shipped === recorded) continue;
      failures.push({
        path: `quote-reveals[${record.cardId}].${field}`,
        code: 'provenance-mismatch',
        message: `The record has "${shipped}", and its provenance record has "${recorded}".`,
      });
    }
  }
  return failures;
}

export function validateShippedQuoteReveals(
  rootDirectory: string = process.cwd(),
  options: Readonly<{ researchDirectory?: string; currentYear?: number }> = {},
): QuoteRevealValidation {
  const input: unknown = JSON.parse(
    readFileSync(path.join(rootDirectory, quoteRevealsPath), 'utf8'),
  );
  const { gameCatalog } = loadGameContent(rootDirectory);
  const failures: QuoteRevealToolFailure[] = [
    ...validateQuoteReveals(
      input,
      gameCatalog.phrases,
      options.currentYear ?? new Date().getFullYear(),
    ),
  ];
  const provenance = readProvenanceRecords(
    options.researchDirectory ?? path.join(rootDirectory, researchFolder),
  );
  // The comparison needs records that have the correct shape.
  const shaped = failures.every(
    ({ code }) => code !== 'invalid-record' && code !== 'missing-field',
  );
  if (provenance !== null && shaped) {
    failures.push(...compareWithProvenance(parseQuoteReveals(input), provenance));
  }
  return {
    records: Array.isArray(input) ? input.length : 0,
    failures,
    provenanceRecords: provenance?.length ?? null,
  };
}

/** Counts the cards with no record for each owner: a character, a scene, or `common`. */
function missingRecordCounts(
  missing: readonly QuoteRevealToolFailure[],
  rootDirectory: string,
): readonly string[] {
  const { gameCatalog } = loadGameContent(rootDirectory);
  const ownerByPath = new Map(
    gameCatalog.phrases.map((phrase) => [
      `quote-reveals[${phrase.id}]`,
      phrase.characterIds?.[0] ?? phrase.sceneIds?.[0] ?? 'common',
    ]),
  );
  const counts = new Map<string, number>();
  for (const failure of missing) {
    const owner = ownerByPath.get(failure.path) ?? 'common';
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return [...counts].map(([owner, count]) => `  ${owner}: ${count}`);
}

function main(): void {
  const rootDirectory = process.cwd();
  const listMissing = process.argv.includes('--list-missing');
  const { records, failures, provenanceRecords } = validateShippedQuoteReveals(rootDirectory);
  const comparison =
    provenanceRecords === null
      ? 'the provenance comparison did not run, because the private research folder does not exist'
      : `compared with ${provenanceRecords} provenance record(s)`;
  if (failures.length === 0) {
    console.log(`quote-reveal validation passed: ${records} record(s) verified; ${comparison}.`);
    return;
  }

  const missing = failures.filter(({ code }) => code === 'missing-record');
  for (const failure of failures) {
    if (failure.code === 'missing-record' && !listMissing) continue;
    console.error(`${failure.path}: ${failure.code}: ${failure.message}`);
  }
  if (missing.length > 0 && !listMissing) {
    console.error(
      `quote-reveals: missing-record: ${missing.length} predicate, modifier, and ending card(s) have no record. Use --list-missing to show each card.`,
    );
    for (const line of missingRecordCounts(missing, rootDirectory)) console.error(line);
  }
  console.error(
    styleText(
      'red',
      `quote-reveal validation failed: ${failures.length} issue(s) in ${records} record(s); ${comparison}.`,
    ),
  );
  process.exitCode = 1;
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
