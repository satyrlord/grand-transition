import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  parseQuoteReveals,
  validateQuoteReveals,
  type QuoteRevealRecord,
} from '../../src/content/quote-reveals.ts';
import type { Phrase } from '../../src/content/schemas.ts';
import { loadQuoteReveals } from '../../tools/load-game-content.ts';
import {
  compareWithProvenance,
  parseProvenanceTables,
  readProvenanceRecords,
  validateShippedQuoteReveals,
} from '../../tools/validate-quote-reveals.ts';

const currentYear = 2026;
const phrases: readonly Pick<Phrase, 'id' | 'role'>[] = [
  { id: 'test-predicate-001-past', role: 'predicate' },
  { id: 'test-modifier-001', role: 'modifier' },
  { id: 'test-ending-001', role: 'ending' },
  { id: 'test-noun-001', role: 'noun' },
  { id: 'test-continuation-001', role: 'continuation' },
];

const sourced = (cardId: string, change: Record<string, unknown> = {}) => ({
  cardId,
  classification: 'adapted-quote',
  sourceLanguage: 'ro',
  venue: 'county-council',
  level: 'county',
  year: 2014,
  ...change,
});

const completeRecords = () => [
  sourced('test-predicate-001-past', { classification: 'exact-quote' }),
  sourced('test-modifier-001'),
  sourced('test-ending-001', {
    classification: 'real-slogan',
    venue: 'protest',
    level: 'national',
  }),
];

const codes = (input: unknown) =>
  validateQuoteReveals(input, phrases, currentYear).map(({ path: at, code }) => `${at}: ${code}`);

describe('reveal-record rules (AC-034-01)', () => {
  test('accepts a record for each required predicate, modifier, and ending', () => {
    expect(codes(completeRecords())).toEqual([]);
  });

  test('lets a card of a different role have each classification', () => {
    for (const classification of ['exact-quote', 'adapted-quote', 'real-slogan'] as const) {
      expect(codes([...completeRecords(), sourced('test-noun-001', { classification })])).toEqual(
        [],
      );
    }
    expect(
      codes([...completeRecords(), { cardId: 'test-noun-001', classification: 'invented' }]),
    ).toEqual([]);
  });

  test('finds a record for a card that does not exist', () => {
    expect(codes([...completeRecords(), sourced('test-ending-404')])).toEqual([
      'quote-reveals[test-ending-404]: unknown-card',
    ]);
  });

  test('finds two records for one card', () => {
    expect(codes([...completeRecords(), sourced('test-modifier-001')])).toEqual([
      'quote-reveals[test-modifier-001]: duplicate-card',
    ]);
  });

  test.each(['test-predicate-001-past', 'test-modifier-001', 'test-ending-001'])(
    'finds %s with no record, and accepts its invented record',
    (cardId) => {
      const others = completeRecords().filter((record) => record.cardId !== cardId);
      expect(codes(others)).toEqual([`quote-reveals[${cardId}]: missing-record`]);
      expect(codes([...others, { cardId, classification: 'invented' }])).toEqual([]);
    },
  );

  test.each(['sourceLanguage', 'venue', 'level', 'year'])(
    'finds a %s that is missing for a classification with a source',
    (field) => {
      for (const classification of ['exact-quote', 'adapted-quote', 'real-slogan']) {
        const record: Record<string, unknown> = sourced('test-modifier-001', { classification });
        delete record[field];
        const others = completeRecords().filter(({ cardId }) => cardId !== 'test-modifier-001');
        expect(codes([...others, record])).toEqual([
          `quote-reveals[test-modifier-001].${field}: missing-field`,
        ]);
      }
    },
  );

  test('does not let an invented record give a source', () => {
    expect(
      codes([
        ...completeRecords(),
        { cardId: 'test-noun-001', classification: 'invented', year: 2014 },
      ]),
    ).toEqual(['quote-reveals[test-noun-001].year: invalid-record']);
  });

  test.each(['http://example.test/a', 'see https://example.test', 'www.example.test', 'a@b'])(
    'finds the string "%s" in a value and in a field name',
    (text) => {
      const inValue = codes([...completeRecords(), sourced('test-noun-001', { venue: text })]);
      expect(inValue).toContain('quote-reveals[test-noun-001]: forbidden-text');
      const inName = codes([...completeRecords(), sourced('test-noun-001', { [text]: 'print' })]);
      expect(inName).toContain('quote-reveals[test-noun-001]: forbidden-text');
    },
  );

  test('does not accept an unknown field or an unknown value', () => {
    for (const change of [
      { speaker: 'a name' },
      { classification: 'true-story' },
      { sourceLanguage: 'fr' },
      { venue: 'kitchen' },
      { level: 'regional' },
      { year: '2014' },
      { year: 2014.5 },
    ]) {
      const failures = validateQuoteReveals(
        [...completeRecords(), sourced('test-noun-001', change)],
        phrases,
        currentYear,
      );
      expect(failures.map(({ code }) => code)).toEqual(['invalid-record']);
      expect(failures[0]!.path).toMatch(/^quote-reveals\[test-noun-001\]/u);
    }
  });

  test('accepts each year from 1990 through the current year, and no other year', () => {
    const withYear = (year: number) => [...completeRecords(), sourced('test-noun-001', { year })];
    expect(codes(withYear(1990))).toEqual([]);
    expect(codes(withYear(currentYear))).toEqual([]);
    expect(codes(withYear(1989))).toEqual(['quote-reveals[test-noun-001].year: invalid-record']);
    expect(codes(withYear(currentYear + 1))).toEqual([
      'quote-reveals[test-noun-001].year: invalid-record',
    ]);
  });

  test('does not accept records that are not one array', () => {
    expect(codes({ records: [] })).toEqual(['quote-reveals: invalid-record']);
  });

  test('reads records of the correct shape, and rejects other records', () => {
    expect(parseQuoteReveals(completeRecords())).toEqual(completeRecords());
    expect(() => parseQuoteReveals([sourced('test-noun-001', { link: 'x' })])).toThrow();
    expect(() => parseQuoteReveals([{ cardId: 'test-noun-001' }])).toThrow();
  });
});

describe('shipped reveal records', () => {
  test('have no defect other than the open coverage of required cards', () => {
    // Milestone 034 requires a record for each predicate, modifier, and ending.
    // `npm run content:validate` reports the cards that have none.
    const { records, failures, provenanceRecords } = validateShippedQuoteReveals(process.cwd(), {
      researchDirectory: path.join(os.tmpdir(), 'grand-transition-no-research-folder'),
    });
    expect(records).toBeGreaterThan(0);
    expect(provenanceRecords).toBeNull();
    expect(failures.filter(({ code }) => code !== 'missing-record')).toEqual([]);
  });

  test('use a year from 1990 through the current year, and each card one time', () => {
    const shipped = loadQuoteReveals();
    expect(new Set(shipped.map(({ cardId }) => cardId)).size).toBe(shipped.length);
    for (const record of shipped) {
      if (record.classification !== 'invented') {
        expect(record.year).toBeGreaterThanOrEqual(1990);
        expect(record.year).toBeLessThanOrEqual(new Date().getFullYear());
      }
    }
  });
});

describe('provenance comparison (AC-034-08)', () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
  });

  const records: readonly QuoteRevealRecord[] = [
    {
      cardId: 'test-ending-001',
      classification: 'adapted-quote',
      sourceLanguage: 'ro',
      venue: 'television',
      level: 'national',
      year: 2014,
    },
    { cardId: 'test-noun-001', classification: 'invented' },
  ];
  const table = (row: string) =>
    [
      '| Card ID | Classification | Source language | Year | Source URL |',
      '| --- | --- | --- | --- | --- |',
      row,
    ].join('\n');
  const compare = (row: string) =>
    compareWithProvenance(records, parseProvenanceTables(table(row))).map(
      ({ path: at, code }) => `${at}: ${code}`,
    );

  test('passes when the record agrees with its provenance record', () => {
    expect(compare('| `test-ending-001` | adapted-quote | ro | 2014 | private |')).toEqual([]);
  });

  test('finds a changed year, classification, and source language', () => {
    expect(compare('| `test-ending-001` | adapted-quote | ro | 2015 | private |')).toEqual([
      'quote-reveals[test-ending-001].year: provenance-mismatch',
    ]);
    expect(compare('| `test-ending-001` | exact-quote | ro | 2014 | private |')).toEqual([
      'quote-reveals[test-ending-001].classification: provenance-mismatch',
    ]);
    expect(compare('| `test-ending-001` | adapted-quote | en | 2014 | private |')).toEqual([
      'quote-reveals[test-ending-001].sourceLanguage: provenance-mismatch',
    ]);
  });

  test('finds a record with a source and no provenance record', () => {
    expect(compare('| `test-ending-002` | adapted-quote | ro | 2014 | private |')).toEqual([
      'quote-reveals[test-ending-001]: provenance-missing',
    ]);
  });

  test('finds an invented record whose provenance record gives a source', () => {
    expect(
      compareWithProvenance(
        records,
        parseProvenanceTables(
          [
            table('| `test-ending-001` | adapted-quote | ro | 2014 | private |'),
            '| `test-noun-001` | real-slogan | ro | 2017 | private |',
          ].join('\n'),
        ),
      ).map(({ path: at, code }) => `${at}: ${code}`),
    ).toEqual(['quote-reveals[test-noun-001].classification: provenance-mismatch']);
  });

  test('finds two provenance records for one card', () => {
    const rows = parseProvenanceTables(
      [
        table('| `test-ending-001` | adapted-quote | ro | 2014 | private |'),
        '| `test-ending-001` | adapted-quote | ro | 2014 | private |',
      ].join('\n'),
    );
    expect(compareWithProvenance(records, rows).map(({ code }) => code)).toEqual([
      'provenance-duplicate',
    ]);
  });

  test('does not put private source text into a failure', () => {
    const failures = compareWithProvenance(
      records,
      parseProvenanceTables(
        table('| `test-ending-001` | adapted-quote | ro | 2015 | https://private.test/a-name |'),
      ),
    );
    expect(JSON.stringify(failures)).not.toContain('private.test');
  });

  test('reads only the tables that have the provenance columns', () => {
    const rows = parseProvenanceTables(
      [
        '# Notes',
        '',
        '| Card ID | Card text |',
        '| --- | --- |',
        '| `test-noun-001` | not a provenance record |',
        '',
        '| Year | Card ID | Source language | Classification | Speaker |',
        '| :--- | --- | --- | ---: | --- |',
        '| 2014 | `test-ending-001` | ro | adapted-quote | a name |',
      ].join('\r\n'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cardId: 'test-ending-001',
      classification: 'adapted-quote',
      sourceLanguage: 'ro',
      year: '2014',
    });
    expect(rows[0]!.cells.speaker).toBe('a name');
  });

  test('compares the shipped records with a research folder, and finds a changed year', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'grand-transition-research-'));
    directories.push(directory);
    const shipped = loadQuoteReveals();
    const rows = (changedCardId?: string) =>
      shipped.map((record) =>
        record.classification === 'invented'
          ? `| \`${record.cardId}\` | invented | | |`
          : `| \`${record.cardId}\` | ${record.classification} | ${record.sourceLanguage} | ${
              record.cardId === changedCardId ? record.year - 1 : record.year
            } |`,
      );
    const write = (changedCardId?: string) =>
      writeFileSync(
        path.join(directory, 'provenance.md'),
        [
          '| Card ID | Classification | Source language | Year |',
          '| --- | --- | --- | --- |',
          ...rows(changedCardId),
        ].join('\n'),
      );
    const mismatches = () =>
      validateShippedQuoteReveals(process.cwd(), { researchDirectory: directory }).failures.filter(
        ({ code }) => code.startsWith('provenance-'),
      );

    write();
    expect(readProvenanceRecords(directory)).toHaveLength(shipped.length);
    expect(mismatches()).toEqual([]);

    const changed = shipped.find(({ classification }) => classification !== 'invented')!;
    write(changed.cardId);
    expect(mismatches().map(({ path: at, code }) => `${at}: ${code}`)).toEqual([
      `quote-reveals[${changed.cardId}].year: provenance-mismatch`,
    ]);
  });

  test('reports that it did no comparison when the research folder does not exist', () => {
    const missing = path.join(os.tmpdir(), 'grand-transition-no-research-folder');
    expect(readProvenanceRecords(missing)).toBeNull();
    expect(
      validateShippedQuoteReveals(process.cwd(), { researchDirectory: missing }).provenanceRecords,
    ).toBeNull();
  });
});
