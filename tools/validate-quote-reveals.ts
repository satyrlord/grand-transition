// Reveal-record validation of Milestone 034.
//
// The content rules prove that each record is complete, refers to a shipped
// card, and carries no link or address. The tool reads only shipped content.
// It does not read the private research folder.
//
// Usage: node tools/validate-quote-reveals.ts [--list-missing]

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';
import { validateQuoteReveals } from '../src/content/quote-reveals.ts';
import { loadGameContent } from './load-game-content.ts';

export const quoteRevealsPath = path.join('src', 'content', 'quote-reveals.json');

export type QuoteRevealToolFailure = Readonly<{ path: string; code: string; message: string }>;

export type QuoteRevealValidation = Readonly<{
  records: number;
  failures: readonly QuoteRevealToolFailure[];
}>;

export function validateShippedQuoteReveals(
  rootDirectory: string = process.cwd(),
  options: Readonly<{ currentYear?: number }> = {},
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
  return { records: Array.isArray(input) ? input.length : 0, failures };
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
  const { records, failures } = validateShippedQuoteReveals(rootDirectory);
  if (failures.length === 0) {
    console.log(`quote-reveal validation passed: ${records} record(s) verified.`);
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
      `quote-reveal validation failed: ${failures.length} issue(s) in ${records} record(s).`,
    ),
  );
  process.exitCode = 1;
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
