import { describe, expect, test } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mergeRomanianMessageFiles } from '../../src/localization/ro-game-locale.ts';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema.ts';
import {
  validateGameLocaleBundleText,
  validateGameLocaleBundles,
  validateLocaleNameParity,
  validateSentenceTails,
  type GameLocaleFailure,
} from '../../src/localization/game-locale-validation.ts';
import { validateGameLocales } from '../../tools/validate-game-locales.ts';

const englishDisclaimer = 'All characters and events are fictional composites created for satire.';
const romanianDisclaimer =
  'Toate personajele și evenimentele sunt compoziții fictive create pentru satiră.';

function bundle(
  locale: string,
  messages: Record<string, string>,
  disclaimer = locale === 'en' ? englishDisclaimer : romanianDisclaimer,
): GameLocaleBundle {
  return {
    locale,
    title: {
      name: 'Grand Transition: A Verbal Republic',
      fictionalCompositeSatireDisclaimer: disclaimer,
    },
    messages,
  };
}

function pathsAndCodes(failures: readonly GameLocaleFailure[]) {
  return failures.map(({ path, code }) => ({ path, code }));
}

describe('game-locale bundle validation', () => {
  test('accepts a matching pair of complete bundles', () => {
    const english = bundle('en', { 'phrase.a': 'your disagreement' });
    const romanian = bundle('ro-RO', { 'phrase.a': 'dezacordul vostru' });
    expect(validateGameLocaleBundles([english, romanian], 'en')).toEqual([]);
  });

  test('fails at the field path of a missing translation', () => {
    const english = bundle('en', {
      'phrase.a': 'your disagreement',
      'phrase.b': 'a televised revolution',
    });
    const romanian = bundle('ro-RO', { 'phrase.a': 'dezacordul vostru' });
    expect(pathsAndCodes(validateGameLocaleBundles([english, romanian], 'en'))).toEqual([
      { path: 'messages.phrase.b', code: 'missing-translation' },
    ]);
  });

  test('fails at the field path of an unexpected extra translation', () => {
    const english = bundle('en', { 'phrase.a': 'your disagreement' });
    const romanian = bundle('ro-RO', {
      'phrase.a': 'dezacordul vostru',
      'phrase.extra': 'o expresie în plus',
    });
    expect(pathsAndCodes(validateGameLocaleBundles([english, romanian], 'en'))).toEqual([
      { path: 'messages.phrase.extra', code: 'unexpected-message' },
    ]);
  });

  test('refuses a catalog without its reference locale', () => {
    const romanian = bundle('ro-RO', { 'phrase.a': 'dezacordul vostru' });
    expect(pathsAndCodes(validateGameLocaleBundles([romanian], 'en'))).toEqual([
      { path: 'locales', code: 'missing-reference-locale' },
    ]);
  });

  test('fails incomplete, denormalized, cedilla, foreign, and unsafe text at its field path', () => {
    const cases: readonly (readonly [string, string | null])[] = [
      ['   ', 'incomplete-translation'],
      ['dezacordul   vostru', null],
      ['un cuvânt'.normalize('NFD'), 'not-normalized'],
      ['Şedinţa voastră', 'legacy-diacritic'],
      ['un café', 'non-standard-letter'],
      ['un discurs <b>lung</b>', 'unsafe-text'],
      ['javascript:alert(1)', 'unsafe-text'],
    ];
    for (const [text, code] of cases) {
      const failures = validateGameLocaleBundleText(bundle('ro-RO', { 'phrase.a': text }), 'ro-RO');
      if (code === null) {
        expect(failures).toEqual([]);
        continue;
      }
      expect(failures).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'messages.phrase.a', code })]),
      );
    }
  });

  test('accepts every Latin letter in English text but not in Romanian text', () => {
    const english = bundle('en', { 'phrase.a': 'a résumé for the summit' });
    expect(validateGameLocaleBundleText(english, 'en')).toEqual([]);
    const romanian = bundle('ro-RO', { 'phrase.a': 'un café' });
    expect(pathsAndCodes(validateGameLocaleBundleText(romanian, 'ro-RO'))).toEqual([
      { path: 'messages.phrase.a', code: 'non-standard-letter' },
    ]);
  });

  test('fails duplicate visible text inside a group but allows agreement forms', () => {
    const duplicated = validateGameLocaleBundleText(
      bundle('ro-RO', {
        'phrase.alpha': 'dezacordul vostru',
        'phrase.beta': 'Dezacordul vostru ',
      }),
      'ro-RO',
    );
    expect(pathsAndCodes(duplicated)).toEqual([
      { path: 'messages.phrase.beta', code: 'duplicate-visible-text' },
    ]);

    const agreementForms = validateGameLocaleBundleText(
      bundle('ro-RO', {
        'phrase.verb': 'a denunțat',
        'phrase.verb.singular': 'a denunțat',
        'phrase.verb.plural': 'a denunțat',
      }),
      'ro-RO',
    );
    expect(agreementForms).toEqual([]);

    const uniqueNames = validateGameLocaleBundleText(
      bundle('ro-RO', {
        'character.a.name': 'Profetul algoritmic',
        'scene.a.name': 'Profetul algoritmic',
      }),
      'ro-RO',
    );
    expect(uniqueNames).toEqual([]);

    const repeatedComebacks = validateGameLocaleBundleText(
      bundle('ro-RO', {
        'comeback.a.weak': 'Ai spus asta deja.',
        'comeback.b.medium': 'Ai spus asta deja.',
      }),
      'ro-RO',
    );
    expect(pathsAndCodes(repeatedComebacks)).toEqual([
      { path: 'messages.comeback.b.medium', code: 'duplicate-visible-text' },
    ]);
  });

  test('reports a missing or unsafe disclaimer at its own field path', () => {
    expect(
      pathsAndCodes(
        validateGameLocaleBundleText(bundle('ro-RO', { 'phrase.a': 'ceva' }, '   '), 'ro-RO'),
      ),
    ).toEqual([
      {
        path: 'title.fictionalCompositeSatireDisclaimer',
        code: 'incomplete-translation',
      },
    ]);
  });

  test('fails a verb card that would force the next noun card into the genitive', () => {
    const messages = {
      'phrase.a': 'a denunțat',
      'phrase.b': 'o dovadă a',
      'phrase.c': 'merge pentru',
    };
    const relations = new Set(['phrase.a', 'phrase.b', 'phrase.c']);
    expect(pathsAndCodes(validateSentenceTails(messages, relations))).toEqual([
      { path: 'messages.phrase.b', code: 'case-governing-tail' },
    ]);
    // A key outside the verb and predicate roles is never inspected.
    expect(validateSentenceTails(messages, new Set(['phrase.a', 'phrase.c']))).toEqual([]);
  });

  test('fails a name that diverges from the displayed-name table', () => {
    const messages = {
      'character.one.name': 'Profetul algoritmic',
      'character.two.name': 'Alt nume',
      'scene.hall.name': 'Sala de presă a Palatului',
    };
    const failures = validateLocaleNameParity(messages, {
      character: { one: 'Profetul algoritmic', two: 'Baronul local' },
      scene: { hall: 'Sala de presă a Palatului' },
    });
    expect(pathsAndCodes(failures)).toEqual([
      { path: 'messages.character.two.name', code: 'name-mismatch' },
    ]);
  });

  test('rejects duplicate Romanian keys across authored files', () => {
    expect(() =>
      mergeRomanianMessageFiles({
        'first.json': { 'phrase.a': 'prima variantă' },
        'second.json': { 'phrase.a': 'a doua variantă' },
      }),
    ).toThrow(/Duplicate Romanian game message "phrase.a" in "second.json"/u);
  });

  test('the shipped-locale gate reports name mismatch and relation tails', () => {
    const tmpRoot = path.resolve(process.cwd(), 'tmp');
    const fixtureRoot = mkdtempSync(path.join(tmpRoot, 'locale-gate-'));
    expect(fixtureRoot.startsWith(`${tmpRoot}${path.sep}`)).toBe(true);
    try {
      cpSync(path.join(process.cwd(), 'src', 'content'), path.join(fixtureRoot, 'src', 'content'), {
        recursive: true,
      });
      const change = (relativeFile: string, key: string, value: string) => {
        const file = path.join(fixtureRoot, 'src', 'content', 'ro', relativeFile);
        const json = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
        json[key] = value;
        writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
      };
      change(
        'characters/algorithmic-prophet.json',
        'character.algorithmic-prophet.name',
        'Alt profet',
      );
      change('common-verb.json', 'phrase.common-verb-001-past', 'o dovadă a');
      change(
        'relation-inflections.json',
        'phrase.common-verb-001-past.second-person',
        'o dovadă a',
      );
      expect(pathsAndCodes(validateGameLocales(fixtureRoot))).toEqual(
        expect.arrayContaining([
          { path: 'messages.character.algorithmic-prophet.name', code: 'name-mismatch' },
          { path: 'messages.phrase.common-verb-001-past', code: 'case-governing-tail' },
          {
            path: 'messages.phrase.common-verb-001-past.second-person',
            code: 'case-governing-tail',
          },
        ]),
      );
    } finally {
      if (fixtureRoot.startsWith(`${tmpRoot}${path.sep}`)) {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    }
  });

  test('passes every shipped bundle', () => {
    expect(validateGameLocales(process.cwd())).toEqual([]);
  });
});
