import { describe, expect, test } from 'vitest';
import {
  isSourcedQuoteReveal,
  parseQuoteReveals,
  validateQuoteReveals,
} from '../../src/content/quote-reveals.ts';
import type { Phrase } from '../../src/content/schemas.ts';
import { loadGameContent, loadQuoteReveals } from '../../tools/load-game-content.ts';
import { validateShippedQuoteReveals } from '../../tools/validate-quote-reveals.ts';

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
  test('accepts ordinary language without invented source metadata', () => {
    expect(
      codes([...completeRecords(), { cardId: 'test-noun-001', classification: 'generic-phrase' }]),
    ).toEqual([]);
    expect(
      codes([
        ...completeRecords(),
        { cardId: 'test-noun-001', classification: 'generic-phrase', year: 2020 },
      ]),
    ).toEqual(['quote-reveals[test-noun-001].year: invalid-record']);
  });

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
  test('classifies at least half of all shipped cards as sourced or everyday language', () => {
    const { gameCatalog } = loadGameContent();
    const sourcedIds = new Set(
      loadQuoteReveals()
        .filter(({ classification }) => classification !== 'invented')
        .map(({ cardId }) => cardId),
    );
    const count = gameCatalog.phrases.filter(({ id }) => sourcedIds.has(id)).length;
    expect(count).toBeGreaterThanOrEqual(Math.ceil(gameCatalog.phrases.length / 2));
  });

  test('counts ordinary pronouns and family members as real without an attribution', () => {
    const { phraseCardCatalog, gameCatalog } = loadGameContent();
    const records = new Map(loadQuoteReveals().map((record) => [record.cardId, record]));
    for (const text of ['you', 'your brother', 'your father', 'your cousin', 'your son-in-law']) {
      const phrase = gameCatalog.phrases.find(
        ({ textKey }) => phraseCardCatalog.englishMessages[textKey] === text,
      )!;
      expect(records.get(phrase.id)).toEqual({
        cardId: phrase.id,
        classification: 'generic-phrase',
      });
    }
  });

  test('have no defect other than the open coverage of required cards', () => {
    // Milestone 034 requires a record for each predicate, modifier, and ending.
    // `npm run content:validate` reports the cards that have none.
    const { records, failures } = validateShippedQuoteReveals(process.cwd());
    expect(records).toBeGreaterThan(0);
    expect(failures.filter(({ code }) => code !== 'missing-record')).toEqual([]);
  });

  test('use a year from 1990 through the current year, and each card one time', () => {
    const shipped = loadQuoteReveals();
    expect(new Set(shipped.map(({ cardId }) => cardId)).size).toBe(shipped.length);
    for (const record of shipped) {
      if (isSourcedQuoteReveal(record)) {
        expect(record.year).toBeGreaterThanOrEqual(1990);
        expect(record.year).toBeLessThanOrEqual(new Date().getFullYear());
      }
    }
  });
});
