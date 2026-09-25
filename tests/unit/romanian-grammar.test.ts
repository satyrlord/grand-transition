import { describe, expect, test } from 'vitest';
import {
  englishGameLocale,
  romanianGameLocale,
  gameCatalog,
} from '../../src/game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import {
  grammarFor,
  type GrammarLocaleBinding,
} from '../../src/engine/grammar/grammar-locale';
import {
  prepareRomanianGrammarPhrase,
  romanianGrammarAdapter,
  romanianRenderedForms,
} from '../../src/engine/grammar/romanian-grammar-adapter';
import {
  romanianNestedObjectAnchorByFamily,
  romanianObjectGovernmentByFamily,
  romanianPersonalObjectByNounId,
} from '../../src/content/ro/grammar-metadata';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema';

const phraseById = new Map(
  gameCatalog.phrases.map((phrase) => [phrase.id, phrase]),
);
const phrase = (id: string) => phraseById.get(id)!;
const message = (locale: GameLocaleBundle, key: string) => {
  const value = locale.messages[key];
  if (!value) throw new Error(`Missing "${key}" in ${locale.locale}.`);
  return value;
};

const analyzeWith = (
  binding: GrammarLocaleBinding,
  locale: GameLocaleBundle,
  ids: readonly string[],
  options: Readonly<{ end?: boolean }> = {},
): ReturnType<GrammarLocaleBinding['adapter']['analyze']> =>
  binding.adapter.analyze({
    steps: [
      ...ids.map((id): GrammarStep => ({
        kind: 'phrase',
        phrase: binding.prepare(phrase(id), locale),
      })),
      ...(options.end ? [{ kind: 'end' } as const] : []),
    ],
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });

const englishGrammar = grammarFor(englishGameLocale);
const romanianGrammar = grammarFor(romanianGameLocale);

const singleSubjectClause = [
  'common-noun-001',
  'common-verb-010-present',
  'red-folded-chairman-noun-001',
] as const;
const compoundSubjectClause = [
  'common-noun-002',
  'common-conjunction-001',
  'red-folded-chairman-noun-001',
  'common-verb-010-present',
  'common-noun-001',
] as const;

describe('Romanian grammar binding', () => {
  test('keeps the triplicate drinks plural and a quoted claim inside its noun slot', () => {
    for (const [noun, expected] of [
      ['common-noun-217', 'Băuturi răcoritoare în trei exemplare sunt comunicate de presă fără evenimente.'],
      ['football-tycoon-noun-007', 'Afirmația că cel mai mare merit este al meu este un comunicat de presă fără eveniment.'],
    ]) {
      expect(analyzeWith(romanianGrammar, romanianGameLocale,
        [noun!, 'common-predicate-019-present'], { end: true })).toMatchObject({
        accepted: true, analysis: { complete: true, publicText: expected },
      });
    }
  });

  test.each([
    'red-folded-chairman-predicate-003',
    'red-folded-chairman-predicate-004',
    'thunder-tribune-predicate-004',
    'football-tycoon-predicate-002',
    'football-tycoon-predicate-003',
    'football-tycoon-predicate-004',
  ])('preserves Romanian past agreement after adding English forms to %s', (family) => {
    for (const [subject, copula] of [
      ['common-noun-001', 'era'], ['common-noun-031', 'erau'], ['common-noun-028', 'erați'],
    ]) {
      const result = analyzeWith(romanianGrammar, romanianGameLocale,
        [subject!, `${family}-past`], { end: true });
      expect(result).toMatchObject({ accepted: true, analysis: { complete: true } });
      if (result.accepted) {
        expect(result.analysis.renderedPhrases[1]?.text).toMatch(new RegExp(`^${copula} `, 'u'));
      }
    }
  });

  test.each([
    ['common-conjunction-014', 'so, with radius squared,', 'deci, cu raza la pătrat,', 'common-conjunction-004'],
    ['common-conjunction-016', 'so, with a clean slate,', 'deci, cu o pagină albă,', 'common-conjunction-004'],
    ['common-conjunction-018', "so, after the source's break,", 'așa că, după pauza sursei,', 'common-conjunction-004'],
    ['common-conjunction-020', "so, after the protocol's silence,", 'așa că, după tăcerea protocolului,', 'common-conjunction-004'],
    ['common-conjunction-021', 'so, after monetizing the prophecy,', 'așa că, după monetizarea profeției,', 'common-conjunction-004'],
    ['common-conjunction-022', 'with the hotline open beside', 'cu linia fierbinte deschisă lângă', 'common-conjunction-005'],
    ['common-conjunction-023', 'with the sponsor standing beside', 'cu sponsorul lângă', 'common-conjunction-005'],
  ])('leaves the required noun or clause slot open after %s', (id, english, romanian, kind) => {
    for (const [locale, connector, prefix, noun, predicate] of [
      [englishGameLocale, english, 'You are Holy Water from the Danube', 'your unanimous disagreement', 'belongs in a history museum'],
      [romanianGameLocale, romanian, 'Dumneavoastră sunteți apa sfântă a Dunării', 'dezacordul vostru unanim', 'are locul într-un muzeu de istorie'],
    ] as const) {
      const ids = ['common-noun-028', 'common-verb-023-present', 'common-noun-053', id, 'common-noun-001',
        ...(kind === 'common-conjunction-004' ? ['common-predicate-010-present'] : [])];
      expect(analyzeWith(grammarFor(locale), locale, ids, { end: true })).toMatchObject({
        accepted: true,
        analysis: {
          complete: true,
          publicText: `${prefix} ${connector} ${noun}${kind === 'common-conjunction-004' ? ` ${predicate}` : ''}.`,
        },
      });
    }
  });

  test('renders the press-arrival ending with a grammatical Romanian preposition', () => {
    expect(analyzeWith(romanianGrammar, romanianGameLocale,
      ['common-noun-028', 'common-predicate-010-present', 'common-ending-004'])).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText: 'Dumneavoastră aveți locul într-un muzeu de istorie înaintea apariției presei.',
      },
    });
  });

  test('renders Romanian text and picks the singular or plural form by subject number', () => {
    // `common-verb-010-present` no longer splits number in Romanian (`reinventează` in both
    // forms), so this agreement check uses `common-verb-014-present`, which splits in both
    // locales (`common-verb-014-present`/`promise`, `promite`/`promit`).
    const singularIds = [
      'common-noun-001',
      'common-verb-014-present',
      'red-folded-chairman-noun-001',
    ] as const;
    const pluralIds = [
      'common-noun-002',
      'common-conjunction-001',
      'red-folded-chairman-noun-001',
      'common-verb-014-present',
      'common-noun-001',
    ] as const;
    const singular = analyzeWith(romanianGrammar, romanianGameLocale, singularIds, { end: true });
    const plural = analyzeWith(romanianGrammar, romanianGameLocale, pluralIds, { end: true });
    expect(singular.accepted).toBe(true);
    expect(plural.accepted).toBe(true);
    if (!singular.accepted || !plural.accepted) return;

    const subjectText = message(romanianGameLocale, phrase('common-noun-001').textKey);
    const objectText = message(
      romanianGameLocale,
      phrase('red-folded-chairman-noun-001').textKey,
    );
    const singularVerb = message(romanianGameLocale, 'phrase.common-verb-014-present.singular');
    const pluralVerb = message(romanianGameLocale, 'phrase.common-verb-014-present.plural');
    expect(singularVerb).not.toBe(pluralVerb);

    expect(singular.analysis.renderedPhrases[1]?.text).toBe(singularVerb);
    expect(singular.analysis.publicText).toBe(
      `${subjectText.charAt(0).toLocaleUpperCase('ro-RO')}${subjectText.slice(1)} ${singularVerb} ${objectText}.`,
    );

    expect(plural.analysis.renderedPhrases[3]?.text).toBe(pluralVerb);
    expect(plural.analysis.publicText).toContain(pluralVerb);
    expect(plural.analysis.publicText).not.toContain(singularVerb);

    // The same semantic clause picks the same number forms in English.
    const englishPlural = analyzeWith(englishGrammar, englishGameLocale, pluralIds, { end: true });
    expect(englishPlural.accepted).toBe(true);
    if (englishPlural.accepted) {
      expect(englishPlural.analysis.renderedPhrases[3]?.text).toBe(
        message(englishGameLocale, 'phrase.common-verb-014-present.plural'),
      );
    }
  });

  test('uses Romanian second-person forms where English has no separate key', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-028', 'common-verb-001-past', 'common-noun-001'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toBe(
      'Dumneavoastră ați denunțat dezacordul vostru unanim.',
    );
  });

  test.each([
    ['common-verb-001-present', 'vă denunță'],
    ['common-verb-001-past', 'v-a denunțat'],
    ['common-verb-001-future', 'vă va denunța'],
  ] as const)('marks a direct personal object in %s', (verbId, expectedVerb) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', verbId, 'common-noun-028'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(expectedVerb);
    expect(result.analysis.renderedPhrases[2]?.text).toBe('pe dumneavoastră');
    expect(result.analysis.publicText).toContain(`${expectedVerb} pe dumneavoastră.`);
  });

  test('agrees with a plural copular complement', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', 'common-verb-023-present', 'common-noun-031'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toBe(
      'Dezacordul vostru unanim sunt votanții voștri.',
    );
  });

  test.each([
    [englishGameLocale, 'are'],
    [romanianGameLocale, 'sunt'],
  ] as const)('agrees with the boxing-gloves subject in $0.locale', (locale, expected) => {
    const result = analyzeWith(
      grammarFor(locale),
      locale,
      ['common-noun-367', 'common-verb-023-present', 'common-noun-001'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[0]?.grammaticalNumber).toBe('plural');
    expect(result.analysis.renderedPhrases[1]?.text).toBe(expected);
  });

  test.each(['past', 'present', 'future'])('contracts the crowd-noise verb with indefinite objects in %s', (tense) => {
    for (const [nounId, expected] of [
      ['common-noun-042', 'într-un nomenclaturist de cartier'],
      ['common-noun-032', 'într-o scroafă'],
    ]) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['common-noun-028', `common-verb-071-${tense}`, nounId],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.analysis.publicText).toContain(expected);
    }
  });

  test('agrees with a plural noun subject', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-093', 'common-predicate-019-present'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[0]?.grammaticalNumber).toBe('plural');
    expect(result.analysis.publicText).toBe(
      'Zborurile private pentru tăieri de panglici sunt comunicate de presă fără evenimente.',
    );
  });

  test.each([
    [englishGameLocale, 'Your breaking news on a repeat schedule is a press release without an event.'],
    [romanianGameLocale, 'Fluxul vostru de știri de ultimă oră în reluare este un comunicat de presă fără eveniment.'],
  ] as const)('keeps singular agreement for the news noun in $0.locale', (locale, expected) => {
    const result = analyzeWith(
      grammarFor(locale),
      locale,
      ['common-noun-079', 'common-predicate-019-present'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (result.accepted) expect(result.analysis.publicText).toBe(expected);
  });

  test.each([
    ['common-predicate-044', 'o propoziție fără verb'],
    ['common-predicate-045', 'o profeție la reducere'],
  ])('preserves the predicate meaning for polite subjects in %s', (family, complement) => {
    for (const [tense, copula] of [['past', 'erați'], ['present', 'sunteți'], ['future', 'veți fi']]) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['common-noun-028', `${family}-${tense}`],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.publicText).toBe(`Dumneavoastră ${copula} ${complement}.`);
      }
    }
  });

  test.each([
    ['apartment-block-geopolitician-verb-003-present', 'privesc dezbaterea cu', 'priviți dezbaterea cu'],
    ['red-folded-chairman-verb-003-present', 'ancorează afirmații universale în', 'ancorați afirmații universale în'],
    ['thunder-tribune-verb-003-present', 'anunță dovezile prin', 'anunțați dovezile prin'],
    ['football-tycoon-verb-003-present', 'revendică meritul pentru', 'revendicați meritul pentru'],
    ['luxury-minister-verb-003-present', 'croiesc harta după', 'croiți harta după'],
    ['marble-diplomat-verb-003-present', 'felicită exit-pollul înainte de', 'felicitați exit-pollul înainte de'],
  ])('distinguishes third-person plural from polite second person in %s', (id, plural, polite) => {
    for (const [subject, expected] of [['common-noun-031', plural], ['common-noun-028', polite]]) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        [subject!, id, 'common-noun-001'],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.analysis.renderedPhrases[1]?.text).toBe(expected);
    }
  });

  test.each(['past', 'present', 'future'])('ends the prestige predicate with a complete complement in %s', (tense) => {
    for (const subject of ['common-noun-001', 'common-noun-031', 'common-noun-028']) {
      const result = analyzeWith(romanianGrammar, romanianGameLocale,
        [subject, `marble-diplomat-predicate-001-${tense}`], { end: true });
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.complete).toBe(true);
        expect(result.analysis.publicText).toMatch(/prestigiul național în frunze căzute\.$/u);
      }
    }
  });

  test.each(['past', 'present', 'future'])('keeps the consultation complement across persons in %s', (tense) => {
    for (const subject of ['common-noun-001', 'common-noun-031', 'common-noun-028']) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        [subject, `common-verb-036-${tense}`, 'common-noun-001'],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.publicText).toContain('drept consultație dezacordul vostru unanim.');
      }
    }
  });

  test.each([
    ['common-predicate-015-past', 'au fost turnători'],
    ['common-predicate-015-future', 'vor fi turnători'],
    [
      'football-tycoon-predicate-002-future',
      'vor fi o victorie în care cel mai mare merit va fi al meu',
    ],
  ] as const)('agrees inside a plural predicate in %s', (predicateId, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-002', 'common-conjunction-001', 'red-folded-chairman-noun-001', predicateId],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[3]?.text).toBe(expected);
  });

  test('keeps an embedded singular subject in a polite future predicate', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-028', 'football-tycoon-predicate-002-future'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(
      'veți fi o victorie în care cel mai mare merit va fi al meu',
    );
  });

  test('contracts a past auxiliary after a nested clause anchor', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', 'thunder-tribune-verb-001-past', 'common-noun-028'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(
      'a tunat și v-a denunțat',
    );
  });

  test.each([
    ['common-verb-023-present', 'sunteți'],
    ['common-verb-023-past', 'ați fost'],
    ['common-verb-023-future', 'veți fi'],
  ] as const)('agrees with a polite copular complement in %s', (verbId, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', verbId, 'common-noun-028'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(expected);
    expect(result.analysis.renderedPhrases[2]?.text).toBe('dumneavoastră');
  });

  test.each([
    ['common-verb-029-past', 'a depus'],
    ['common-verb-029-present', 'depune'],
    ['common-verb-029-future', 'va depune'],
  ] as const)('leaves a final noun slot in %s', (verbId, prefix) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', verbId, 'common-noun-033'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toContain(
      `${prefix} o sesizare de dispariție pentru un hoț.`,
    );
  });

  test('marks definite masculine, plural, and feminine direct objects', () => {
    const cases = [
      ['common-noun-036', 'l-a denunțat', 'pe fratele vostru'],
      ['common-noun-031', 'i-a denunțat', 'pe votanții voștri'],
      ['thunder-tribune-noun-001', 'a denunțat-o', 'pe acea sperietoare de la ora de maximă audiență'],
    ] as const;
    for (const [nounId, expectedVerb, expectedNoun] of cases) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['common-noun-001', 'common-verb-001-past', nounId],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (!result.accepted) continue;
      expect(result.analysis.renderedPhrases[1]?.text).toBe(expectedVerb);
      expect(result.analysis.renderedPhrases[2]?.text).toBe(expectedNoun);
    }
  });

  test.each([
    [
      ['red-folded-chairman-noun-001', 'common-conjunction-001', 'common-noun-028'],
      'v-a denunțat o comisie de salvare a poporului cu parcare rezervată și pe dumneavoastră.',
    ],
    [
      ['common-noun-028', 'common-conjunction-001', 'red-folded-chairman-noun-001'],
      'v-a denunțat pe dumneavoastră și o comisie de salvare a poporului cu parcare rezervată.',
    ],
  ] as const)('marks a coordinated personal object in either order', (objects, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', 'common-verb-001-past', ...objects],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toContain(expected);
  });

  test.each([
    [['common-noun-036', 'common-conjunction-001', 'common-noun-028'], 'v-a denunțat pe fratele vostru și pe dumneavoastră.'],
    [['common-noun-028', 'common-conjunction-001', 'common-noun-036'], 'v-a denunțat pe dumneavoastră și pe fratele vostru.'],
    [['common-noun-036', 'common-conjunction-001', 'common-noun-037'], 'i-a denunțat pe fratele vostru și pe tatăl vostru.'],
    [
      ['thunder-tribune-noun-001', 'common-conjunction-001', 'thunder-tribune-noun-002'],
      'le-a denunțat pe acea sperietoare de la ora de maximă audiență și pe acea sperietoare pudrată din balconul oficial.',
    ],
  ] as const)('agrees with a coordinated marked group', (objects, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', 'common-verb-001-past', ...objects],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (result.accepted) expect(result.analysis.publicText).toContain(expected);
  });

  test('keeps a subject after and out of the preceding direct object', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      [
        'common-noun-001',
        'common-verb-001-past',
        'common-noun-036',
        'common-conjunction-001',
        'common-noun-028',
        'common-verb-001-past',
        'red-folded-chairman-noun-001',
      ],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toContain(
      'l-a denunțat pe fratele vostru și dumneavoastră ați denunțat',
    );
  });

  test('contracts prepositions before indefinite objects and keeps predicate complements', () => {
    const cases = [
      [
        'common-verb-053-present',
        'common-noun-033',
        'dintr-un hoț',
      ],
      [
        'velvet-mogul-verb-002-present',
        'common-noun-032',
        'într-o scroafă',
      ],
      [
        'common-verb-055-present',
        'common-noun-033',
        'drept un hoț',
      ],
    ] as const;
    for (const [verbId, nounId, expected] of cases) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['common-noun-001', verbId, nounId],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.analysis.publicText).toContain(expected);
    }
  });

  test.each([
    'common-verb-028-past',
    'common-verb-028-present',
    'common-verb-028-future',
  ])('marks an object on the final subordinate verb in %s', (verbId) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['common-noun-001', verbId, 'common-noun-028'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toContain('să vă explice');
    expect(result.analysis.renderedPhrases[2]?.text).toBe('pe dumneavoastră');
  });

  test('governs every shipped verb family and personal noun pairing', () => {
    const verbs = gameCatalog.phrases.filter((card) => card.role === 'verb');
    const personalNouns = gameCatalog.phrases.filter(
      (card) => card.role === 'noun' && card.referentKind === 'personal',
    );
    expect(new Set(verbs.map((card) => card.tenseFamily))).toEqual(
      new Set(Object.keys(romanianObjectGovernmentByFamily)),
    );
    expect(
      new Set(
        Object.entries(romanianObjectGovernmentByFamily)
          .filter(([, government]) => government === 'nested-direct')
          .map(([family]) => family),
      ),
    ).toEqual(new Set(Object.keys(romanianNestedObjectAnchorByFamily)));
    expect(Object.values(romanianObjectGovernmentByFamily)).not.toContain(
      'needs-editorial-slot',
    );
    expect(new Set(personalNouns.map((card) => card.id))).toEqual(
      new Set(Object.keys(romanianPersonalObjectByNounId)),
    );
    for (const noun of personalNouns) {
      const objectForm = romanianPersonalObjectByNounId[noun.id]!;
      expect(objectForm.directText).toBe(
        `${objectForm.clitic ? 'pe ' : ''}${message(romanianGameLocale, noun.textKey)}`,
      );
    }
    for (const verb of verbs) {
      for (const noun of personalNouns) {
        const result = analyzeWith(
          romanianGrammar,
          romanianGameLocale,
          ['common-noun-001', verb.id, noun.id],
          { end: true },
        );
        expect(result.accepted).toBe(true);
        if (!result.accepted) continue;
        const government = romanianObjectGovernmentByFamily[verb.tenseFamily!];
        if (government === 'direct' || government === 'nested-direct') {
          expect(result.analysis.renderedPhrases[2]?.text).toBe(
            romanianPersonalObjectByNounId[noun.id]!.directText,
          );
          if (government === 'nested-direct' && noun.id === 'common-noun-028') {
            const anchor = romanianNestedObjectAnchorByFamily[verb.tenseFamily!]!;
            expect(result.analysis.renderedPhrases[1]?.text).toMatch(
              new RegExp(`${anchor}(?:vă |v-)`, 'u'),
            );
          }
        }
      }
    }
  }, 30_000);

  test('prepares every Romanian relation card with a second-person form', () => {
    for (const card of gameCatalog.phrases) {
      if (card.role === 'verb' || card.role === 'predicate') {
        expect(() => romanianGrammar.prepare(card, romanianGameLocale)).not.toThrow();
      }
    }
  });

  test('owns every rendered form emitted by representative Romanian clauses', () => {
    for (const ids of [
      ['common-noun-028', 'common-verb-001-past', 'common-noun-036'],
      ['common-noun-001', 'common-verb-028-past', 'common-noun-028'],
      ['common-noun-001', 'common-verb-053-present', 'common-noun-033'],
      compoundSubjectClause,
    ] as const) {
      const result = analyzeWith(romanianGrammar, romanianGameLocale, ids, {
        end: true,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) continue;
      for (const rendered of result.analysis.renderedPhrases) {
        expect(
          romanianRenderedForms(phrase(rendered.phraseId), romanianGameLocale),
        ).toContain(rendered.text);
      }
    }
  });

  test('uses Romanian plural forms for cards whose English form needs no number metadata', () => {
    const id = 'common-verb-053-past';
    expect(phrase(id).numberForms).toBeUndefined();
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      [
        'common-noun-002',
        'common-conjunction-001',
        'red-folded-chairman-noun-001',
        id,
        'common-noun-001',
      ],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[3]?.text).toBe(
      message(romanianGameLocale, `phrase.${id}.plural`),
    );
  });

  test('matches the English grammar contract over the same semantic clauses', () => {
    const clauses = [
      ['common-noun-001', 'common-verb-010-present'],
      singleSubjectClause,
      compoundSubjectClause,
      [
        'common-conjunction-003',
        'common-noun-001',
        'common-predicate-010-present',
        'common-noun-002',
        'common-predicate-010-present',
      ],
    ] as const;
    for (const ids of clauses) {
      const english = analyzeWith(englishGrammar, englishGameLocale, ids, { end: true });
      const romanian = analyzeWith(romanianGrammar, romanianGameLocale, ids, {
        end: true,
      });
      expect(romanian.accepted).toBe(english.accepted);
      if (!english.accepted || !romanian.accepted) continue;
      expect(romanian.analysis.state).toBe(english.analysis.state);
      expect(romanian.analysis.nextRoles).toEqual(english.analysis.nextRoles);
      expect(romanian.analysis.complete).toBe(english.analysis.complete);
      expect(romanian.analysis.sentenceStatus).toBe(english.analysis.sentenceStatus);
    }
  });

  test('binds each locale to its prepared phrase text and its own prepare function', () => {
    expect(grammarFor(englishGameLocale).prepare).toBe(
      prepareEnglishGrammarPhrase,
    );
    expect(grammarFor(romanianGameLocale).prepare).toBe(
      prepareRomanianGrammarPhrase,
    );
    expect(romanianGrammar.adapter).toBe(romanianGrammarAdapter);
    expect(romanianGrammarAdapter).not.toBe(englishGrammarAdapter);
    expect(
      romanianGrammar.prepare(phrase('common-noun-001'), romanianGameLocale)
        .localeTag,
    ).toBe('ro-RO');
    expect(
      englishGrammar.prepare(phrase('common-noun-001'), englishGameLocale)
        .localeTag,
    ).toBe('en');
  });

  test('rejects a bundle from the other game locale', () => {
    expect(() =>
      prepareRomanianGrammarPhrase(phrase('common-noun-001'), englishGameLocale),
    ).toThrow(/Romanian game-locale bundle/u);
    expect(() =>
      prepareEnglishGrammarPhrase(phrase('common-noun-001'), romanianGameLocale),
    ).toThrow(/English game-locale bundle/u);
  });

  test('rejects a game locale with no grammar support', () => {
    const unsupported: GameLocaleBundle = {
      locale: 'fr',
      title: {
        name: 'Le Grand Transition',
        fictionalCompositeSatireDisclaimer: 'Une fiction composite pour la satire.',
      },
      messages: { 'phrase.common-noun-001': 'le consensus national' },
    };
    expect(() => grammarFor(unsupported)).toThrow(/has no grammar support/u);
  });

  test('keeps the English public text byte-identical', () => {
    const english = analyzeWith(
      englishGrammar,
      englishGameLocale,
      ['common-noun-001', 'common-predicate-010-present'],
      { end: true },
    );
    expect(english.accepted).toBe(true);
    if (english.accepted) {
      expect(english.analysis.publicText).toBe(
        'Your unanimous disagreement belongs in a history museum.',
      );
    }
  });
});
