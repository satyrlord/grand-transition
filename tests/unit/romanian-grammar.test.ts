import { describe, expect, test } from 'vitest';
import {
  englishGameLocale,
  romanianGameLocale,
  sampleContent,
} from '../../src/game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';
import {
  grammarFor,
  type GrammarLocaleBinding,
} from '../../src/engine/grammar/grammar-locale';
import {
  prepareRomanianGrammarPhrase,
  romanianGrammarAdapter,
} from '../../src/engine/grammar/romanian-grammar-adapter';
import {
  romanianNestedObjectAnchorByFamily,
  romanianObjectGovernmentByFamily,
  romanianPersonalObjectByNounId,
} from '../../src/content/ro/grammar-metadata';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema';

const phraseById = new Map(
  sampleContent.phrases.map((phrase) => [phrase.id, phrase]),
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
      ...ids.map((id): EnglishGrammarStep => ({
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
  'national-consensus',
  'rebrands',
  'national-salvation-committee',
] as const;
const compoundSubjectClause = [
  'televised-revolution',
  'and',
  'national-salvation-committee',
  'rebrands',
  'national-consensus',
] as const;

describe('Romanian grammar binding', () => {
  test('renders Romanian text and picks the singular or plural form by subject number', () => {
    const singular = analyzeWith(romanianGrammar, romanianGameLocale, singleSubjectClause, { end: true });
    const plural = analyzeWith(romanianGrammar, romanianGameLocale, compoundSubjectClause, { end: true });
    expect(singular.accepted).toBe(true);
    expect(plural.accepted).toBe(true);
    if (!singular.accepted || !plural.accepted) return;

    const subjectText = message(romanianGameLocale, phrase('national-consensus').textKey);
    const objectText = message(
      romanianGameLocale,
      phrase('national-salvation-committee').textKey,
    );
    const singularVerb = message(romanianGameLocale, 'phrase.rebrands.singular');
    const pluralVerb = message(romanianGameLocale, 'phrase.rebrands.plural');
    expect(singularVerb).not.toBe(pluralVerb);

    expect(singular.analysis.renderedPhrases[1]?.text).toBe(singularVerb);
    expect(singular.analysis.publicText).toBe(
      `${subjectText.charAt(0).toLocaleUpperCase('ro-RO')}${subjectText.slice(1)} ${singularVerb} ${objectText}.`,
    );

    expect(plural.analysis.renderedPhrases[3]?.text).toBe(pluralVerb);
    expect(plural.analysis.publicText).toContain(pluralVerb);
    expect(plural.analysis.publicText).not.toContain(singularVerb);

    // The same semantic clause picks the same number forms in English.
    const englishPlural = analyzeWith(englishGrammar, englishGameLocale, compoundSubjectClause, { end: true });
    expect(englishPlural.accepted).toBe(true);
    if (englishPlural.accepted) {
      expect(englishPlural.analysis.renderedPhrases[3]?.text).toBe(
        message(englishGameLocale, 'phrase.rebrands.plural'),
      );
    }
  });

  test('uses Romanian second-person forms where English has no separate key', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['you', 'denounced', 'national-consensus'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toBe(
      'Dumneavoastră ați denunțat dezacordul vostru unanim.',
    );
  });

  test.each([
    ['denounces', 'vă denunță'],
    ['denounced', 'v-a denunțat'],
    ['will-denounce', 'vă va denunța'],
  ] as const)('marks a direct personal object in %s', (verbId, expectedVerb) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', verbId, 'you'],
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
      ['national-consensus', 'is', 'your-voters'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toBe(
      'Dezacordul vostru unanim sunt votanții voștri.',
    );
  });

  test('agrees with a plural noun subject', () => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['public-your-ceremonial-scissors-in-business-class', 'public-press-release-present'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[0]?.grammaticalNumber).toBe('plural');
    expect(result.analysis.publicText).toBe(
      'Foarfecile voastre de ceremonie la clasa business sunt comunicate de presă fără evenimente.',
    );
  });

  test.each([
    [englishGameLocale, 'Your breaking news on a repeat schedule is a press release without an event.'],
    [romanianGameLocale, 'Fluxul vostru de știri de ultimă oră în reluare este un comunicat de presă fără eveniment.'],
  ] as const)('keeps singular agreement for the news noun in $0.locale', (locale, expected) => {
    const result = analyzeWith(
      grammarFor(locale),
      locale,
      ['public-your-breaking-news-on-a-repeat-schedule', 'public-press-release-present'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (result.accepted) expect(result.analysis.publicText).toBe(expected);
  });

  test.each([
    ['palace-press-hall-is-a-statement-without-a-verb', 'o propoziție fără verb'],
    ['influencer-campaign-livestream-is-a-prophecy-with-a-discount-code', 'o profeție la reducere'],
  ])('preserves the predicate meaning for polite subjects in %s', (family, complement) => {
    for (const [tense, copula] of [['past', 'erați'], ['present', 'sunteți'], ['future', 'veți fi']]) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['you', `${family}-${tense}`],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.publicText).toBe(`Dumneavoastră ${copula} ${complement}.`);
      }
    }
  });

  test.each([
    ['apartment-block-geopolitician-contract-verb-maps-crisis-from-third-floor-present', 'privesc dezbaterea cu', 'priviți dezbaterea cu'],
    ['luxury-minister-contract-verb-measures-service-in-marble-present', 'croiesc harta după', 'croiți harta după'],
    ['marble-diplomat-contract-verb-serves-luxury-as-protocol-present', 'felicită exit-pollul înainte de', 'felicitați exit-pollul înainte de'],
  ])('distinguishes third-person plural from polite second person in %s', (id, plural, polite) => {
    for (const [subject, expected] of [['your-voters', plural], ['you', polite]]) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        [subject!, id, 'national-consensus'],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.analysis.renderedPhrases[1]?.text).toBe(expected);
    }
  });

  test.each(['past', 'present', 'future'])('ends the prestige predicate with a complete complement in %s', (tense) => {
    for (const subject of ['national-consensus', 'your-voters', 'you']) {
      const result = analyzeWith(romanianGrammar, romanianGameLocale,
        [subject, `marble-diplomat-predicate-1-${tense}`], { end: true });
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.complete).toBe(true);
        expect(result.analysis.publicText).toMatch(/prestigiul național în frunze căzute\.$/u);
      }
    }
  });

  test.each(['past', 'present', 'future'])('keeps the consultation complement across persons in %s', (tense) => {
    for (const subject of ['national-consensus', 'your-voters', 'you']) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        [subject, `public-consultation-fee-${tense}`, 'national-consensus'],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.analysis.publicText).toContain('drept consultație dezacordul vostru unanim.');
      }
    }
  });

  test.each([
    ['was-a-snitch', 'au fost turnători'],
    ['will-be-a-snitch', 'vor fi turnători'],
    [
      'football-tycoon-contract-predicate-predicate-1-future',
      'vor fi o victorie în care cel mai mare merit va fi al meu',
    ],
  ] as const)('agrees inside a plural predicate in %s', (predicateId, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['televised-revolution', 'and', 'national-salvation-committee', predicateId],
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
      ['you', 'football-tycoon-contract-predicate-predicate-1-future'],
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
      ['national-consensus', 'outshouted', 'you'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(
      'a tunat și v-a denunțat',
    );
  });

  test.each([
    ['is', 'sunteți'],
    ['was', 'ați fost'],
    ['will-be', 'veți fi'],
  ] as const)('agrees with a polite copular complement in %s', (verbId, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', verbId, 'you'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toBe(expected);
    expect(result.analysis.renderedPhrases[2]?.text).toBe('dumneavoastră');
  });

  test.each([
    ['public-missing-report-past', 'a depus'],
    ['public-missing-report-present', 'depune'],
    ['public-missing-report-future', 'va depune'],
  ] as const)('leaves a final noun slot in %s', (verbId, prefix) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', verbId, 'a-thief'],
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
      ['your-brother', 'l-a denunțat', 'pe fratele vostru'],
      ['your-voters', 'i-a denunțat', 'pe votanții voștri'],
      ['tribunes-indictment', 'a denunțat-o', 'pe acea sperietoare de la ora de maximă audiență'],
    ] as const;
    for (const [nounId, expectedVerb, expectedNoun] of cases) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['national-consensus', 'denounced', nounId],
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
      ['national-salvation-committee', 'and', 'you'],
      'v-a denunțat o comisie de salvare a poporului cu parcare rezervată și pe dumneavoastră.',
    ],
    [
      ['you', 'and', 'national-salvation-committee'],
      'v-a denunțat pe dumneavoastră și o comisie de salvare a poporului cu parcare rezervată.',
    ],
  ] as const)('marks a coordinated personal object in either order', (objects, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', 'denounced', ...objects],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.publicText).toContain(expected);
  });

  test.each([
    [['your-brother', 'and', 'you'], 'v-a denunțat pe fratele vostru și pe dumneavoastră.'],
    [['you', 'and', 'your-brother'], 'v-a denunțat pe dumneavoastră și pe fratele vostru.'],
    [['your-brother', 'and', 'your-father'], 'i-a denunțat pe fratele vostru și pe tatăl vostru.'],
    [
      ['tribunes-indictment', 'and', 'that-powdered-scarecrow'],
      'le-a denunțat pe acea sperietoare de la ora de maximă audiență și pe acea sperietoare pudrată din balconul oficial.',
    ],
  ] as const)('agrees with a coordinated marked group', (objects, expected) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', 'denounced', ...objects],
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
        'national-consensus',
        'denounced',
        'your-brother',
        'and',
        'you',
        'denounced',
        'national-salvation-committee',
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
        'general-audits-the-ceremony-present',
        'a-thief',
        'dintr-un hoț',
      ],
      [
        'velvet-mogul-verb-2-present',
        'a-sow',
        'într-o scroafă',
      ],
      [
        'general-relabels-the-pothole-present',
        'a-thief',
        'drept un hoț',
      ],
    ] as const;
    for (const [verbId, nounId, expected] of cases) {
      const result = analyzeWith(
        romanianGrammar,
        romanianGameLocale,
        ['national-consensus', verbId, nounId],
        { end: true },
      );
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.analysis.publicText).toContain(expected);
    }
  });

  test.each([
    'public-outsourced-explanation-past',
    'public-outsourced-explanation-present',
    'public-outsourced-explanation-future',
  ])('marks an object on the final subordinate verb in %s', (verbId) => {
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      ['national-consensus', verbId, 'you'],
      { end: true },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.analysis.renderedPhrases[1]?.text).toContain('să vă explice');
    expect(result.analysis.renderedPhrases[2]?.text).toBe('pe dumneavoastră');
  });

  test('governs every shipped verb family and personal noun pairing', () => {
    const verbs = sampleContent.phrases.filter((card) => card.role === 'verb');
    const personalNouns = sampleContent.phrases.filter(
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
          ['national-consensus', verb.id, noun.id],
          { end: true },
        );
        expect(result.accepted).toBe(true);
        if (!result.accepted) continue;
        const government = romanianObjectGovernmentByFamily[verb.tenseFamily!];
        if (government === 'direct' || government === 'nested-direct') {
          expect(result.analysis.renderedPhrases[2]?.text).toBe(
            romanianPersonalObjectByNounId[noun.id]!.directText,
          );
          if (government === 'nested-direct' && noun.id === 'you') {
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
    for (const card of sampleContent.phrases) {
      if (card.role === 'verb' || card.role === 'predicate') {
        expect(() => romanianGrammar.prepare(card, romanianGameLocale)).not.toThrow();
      }
    }
  });

  test('uses Romanian plural forms for cards whose English form needs no number metadata', () => {
    const id = 'general-audits-the-ceremony-past';
    expect(phrase(id).numberForms).toBeUndefined();
    const result = analyzeWith(
      romanianGrammar,
      romanianGameLocale,
      [
        'televised-revolution',
        'and',
        'national-salvation-committee',
        id,
        'national-consensus',
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
      ['national-consensus', 'rebrands'],
      singleSubjectClause,
      compoundSubjectClause,
      [
        'because',
        'national-consensus',
        'belongs-in-a-party-museum',
        'televised-revolution',
        'belongs-in-a-party-museum',
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
      romanianGrammar.prepare(phrase('national-consensus'), romanianGameLocale)
        .localeTag,
    ).toBe('ro-RO');
    expect(
      englishGrammar.prepare(phrase('national-consensus'), englishGameLocale)
        .localeTag,
    ).toBe('en');
  });

  test('rejects a bundle from the other game locale', () => {
    expect(() =>
      prepareRomanianGrammarPhrase(phrase('national-consensus'), englishGameLocale),
    ).toThrow(/Romanian game-locale bundle/u);
    expect(() =>
      prepareEnglishGrammarPhrase(phrase('national-consensus'), romanianGameLocale),
    ).toThrow(/English game-locale bundle/u);
  });

  test('rejects a game locale with no grammar support', () => {
    const unsupported: GameLocaleBundle = {
      locale: 'fr',
      title: {
        name: 'Le Grand Transition',
        fictionalCompositeSatireDisclaimer: 'Une fiction composite pour la satire.',
      },
      messages: { 'phrase.national-consensus': 'le consensus national' },
    };
    expect(() => grammarFor(unsupported)).toThrow(/has no grammar support/u);
  });

  test('keeps the English public text byte-identical', () => {
    const english = analyzeWith(
      englishGrammar,
      englishGameLocale,
      ['national-consensus', 'belongs-in-a-party-museum'],
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
