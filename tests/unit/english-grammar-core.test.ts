import { describe, expect, test } from 'vitest';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter.ts';

const phrase = (id: string) =>
  prepareEnglishGrammarPhrase(
    gameCatalog.phrases.find((candidate) => candidate.id === id)!,
    englishGameLocale,
  );
const step = (prepared: GrammarPhrase): GrammarStep => ({
  kind: 'phrase',
  phrase: prepared,
});
const add = (id: string): GrammarStep => step(phrase(id));
const fixture = (
  id: string,
  role: GrammarPhrase['role'],
  text: string,
  forms: Partial<
    Pick<GrammarPhrase, 'pluralText' | 'personalSingularText' | 'secondPersonText'>
  > = {},
): GrammarPhrase => ({
  id,
  role,
  localeTag: 'en',
  defaultText: text,
  singularText: text,
  pluralText: text,
  personalSingularText: text,
  secondPersonText: text,
  ...forms,
});
// These small fixtures isolate agreement from editorial changes to card text.
const possessivePast = fixture('fixture-possessive-past', 'predicate', 'checked its own notes', {
  pluralText: 'checked their own notes',
  personalSingularText: 'checked their own notes',
  secondPersonText: 'checked your own notes',
});
const possessivePresent = fixture(
  'fixture-possessive-present',
  'predicate',
  'checks its own notes',
  {
    pluralText: 'check their own notes',
    personalSingularText: 'checks their own notes',
    secondPersonText: 'check your own notes',
  },
);
const possessiveFuture = fixture(
  'fixture-possessive-future',
  'predicate',
  'will check its own notes',
  {
    pluralText: 'will check their own notes',
    personalSingularText: 'will check their own notes',
    secondPersonText: 'will check your own notes',
  },
);
const secondPossessivePast = fixture('fixture-records-past', 'predicate', 'kept its own records', {
  pluralText: 'kept their own records',
  personalSingularText: 'kept their own records',
  secondPersonText: 'kept your own records',
});
const shippedRelations = gameCatalog.phrases
  .filter(({ role }) => role === 'verb' || role === 'predicate')
  .map(({ id }) => phrase(id));
const hasPossessiveAgreement = (relation: GrammarPhrase) =>
  [
    relation.singularText,
    relation.pluralText,
    relation.personalSingularText,
    relation.secondPersonText,
  ].some((text) => /\b(?:its|their|your) own\b/u.test(text));
const analyze = (steps: readonly GrammarStep[]) =>
  englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });

describe('Hollywood Roast English grammar', () => {
  test('accepts the two minimum sentence forms', () => {
    const predicate = analyze([add('common-noun-001'), add('common-predicate-010-present')]);
    const object = analyze([
      add('common-noun-001'),
      add('common-verb-010-present'),
      add('red-folded-chairman-noun-001'),
    ]);

    expect(predicate).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });
    expect(object).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });
  });

  test('accepts noun and noun as a compound subject before either completion form', () => {
    const prefix = analyze([
      add('common-noun-002'),
      add('common-conjunction-001'),
      add('red-folded-chairman-noun-001'),
    ]);
    expect(prefix).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'SUBJECT_READY',
        agreement: { subject: 'plural' },
        nextRoles: ['verb', 'predicate', 'conjunction'],
      },
    });

    const complete = analyze([
      add('common-noun-002'),
      add('common-conjunction-001'),
      add('red-folded-chairman-noun-001'),
      add('common-verb-010-present'),
      add('common-noun-001'),
    ]);
    expect(complete).toMatchObject({
      accepted: true,
      analysis: { complete: true },
    });
    if (complete.accepted) {
      expect(complete.analysis.renderedPhrases[3]?.text).toBe('reinvent');
    }
  });

  test('renders complete number, person, and referent agreement', () => {
    const cases = [
      ['common-noun-029', 'Your party checks its own notes'],
      ['common-noun-053', 'Holy Water from the Danube checks its own notes'],
      ['common-noun-036', 'Your brother checks their own notes'],
      ['common-noun-028', 'You check your own notes'],
      ['common-noun-050', 'EU funds check their own notes'],
    ] as const;

    for (const [subject, expected] of cases) {
      const result = analyze([add(subject), step(possessivePresent)]);
      expect(result, subject).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }

    expect(
      analyze([add('common-noun-028'), add('common-verb-010-present'), add('common-noun-001')]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You reinvent your unanimous disagreement' },
    });
    expect(
      analyze([add('common-noun-053'), add('common-verb-010-present'), add('common-noun-001')]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'Holy Water from the Danube reinvents your unanimous disagreement' },
    });

    for (const [predicateId, expected] of [
      ['common-predicate-005-past', 'You were a Communist Party member'],
      ['common-predicate-005-present', 'You are a Communist Party member'],
      ['common-predicate-005-future', 'You will be a Communist Party member'],
      ['common-predicate-015-past', 'You were a snitch'],
      ['common-predicate-015-present', 'You are a snitch'],
      ['common-predicate-015-future', 'You will be a snitch'],
    ] as const) {
      expect(analyze([add('common-noun-028'), add(predicateId)]), predicateId).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }
  });

  test('renders the quote-adapted tense families and ending', () => {
    for (const [predicateId, expected] of [
      ['common-predicate-003-past', 'A foreigner wanted to learn how to make pretzels'],
      ['common-predicate-003-present', 'A foreigner wants to learn how to make pretzels'],
      ['common-predicate-003-future', 'A foreigner will want to learn how to make pretzels'],
      ['common-predicate-004-past', 'A foreigner refused to comment on what rats said'],
      ['common-predicate-004-present', 'A foreigner refuses to comment on what rats say'],
      ['common-predicate-004-future', 'A foreigner will refuse to comment on what rats say'],
    ] as const) {
      expect(analyze([add('common-noun-044'), add(predicateId)])).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }

    expect(analyze([add('common-noun-028'), add('common-predicate-003-present')])).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You want to learn how to make pretzels' },
    });
    expect(analyze([add('common-noun-028'), add('common-predicate-004-present')])).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You refuse to comment on what rats say' },
    });
    expect(
      analyze([
        add('common-noun-044'),
        add('common-predicate-003-present'),
        add('common-ending-010'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        state: 'ENDED',
        publicText:
          'A foreigner wants to learn how to make pretzels and the sheep is a living statue.',
      },
    });
  });

  test('renders possessive fixtures and every shipped possessive relation for every shipped noun', () => {
    const relations = [
      possessivePast,
      possessivePresent,
      possessiveFuture,
      secondPossessivePast,
      ...shippedRelations.filter(hasPossessiveAgreement),
    ];
    const nouns = gameCatalog.phrases.filter((candidate) => candidate.role === 'noun');

    for (const noun of nouns) {
      const expectedPossessive =
        noun.grammaticalPerson === 'second'
          ? 'your'
          : noun.grammaticalNumber === 'plural' || noun.referentKind === 'personal'
            ? 'their'
            : 'its';
      for (const relation of relations) {
        const result = analyze([
          add(noun.id),
          step(relation),
          ...(relation.role === 'verb' ? [add('common-noun-001')] : []),
        ]);
        expect(result, `${noun.id} + ${relation.id}`).toMatchObject({
          accepted: true,
          analysis: { complete: true },
        });
        if (result.accepted) {
          expect(result.analysis.renderedPhrases[1]?.text, `${noun.id} + ${relation.id}`).toContain(
            `${expectedPossessive} own`,
          );
        }
      }
    }
  });

  test('keeps second-person agreement through shared and compound subjects', () => {
    const shared = analyze([
      add('common-noun-028'),
      step(possessivePast),
      add('common-conjunction-001'),
      step(secondPossessivePast),
      { kind: 'end' },
    ]);
    expect(shared).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText: 'You checked your own notes and kept your own records.',
      },
    });

    const compound = analyze([
      add('common-noun-053'),
      add('common-conjunction-001'),
      add('common-noun-028'),
      step(possessivePast),
    ]);
    expect(compound).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        agreement: { subject: 'plural' },
        publicText: 'Holy Water from the Danube and you checked your own notes',
      },
    });
  });

  test('replaces person agreement when a conjunction starts a new subject', () => {
    const result = analyze([
      add('common-noun-028'),
      step(possessivePast),
      add('common-conjunction-001'),
      add('common-noun-053'),
      step(possessivePast),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'You checked your own notes and Holy Water from the Danube checked its own notes',
      },
    });
  });

  test('accepts and after a complete clause with a new or shared subject', () => {
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-001'),
        add('common-noun-002'),
        add('common-predicate-010-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-001'),
        add('common-verb-010-present'),
        add('common-noun-002'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps a transitive clause complete when and adds another object', () => {
    const compoundObject = analyze([
      add('common-noun-001'),
      add('common-verb-001-past'),
      add('common-noun-002'),
      add('common-conjunction-001'),
      add('red-folded-chairman-noun-001'),
    ]);
    expect(compoundObject).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['verb', 'predicate', 'modifier', 'conjunction', 'ending'],
      },
    });

    expect(
      analyze([
        add('common-noun-001'),
        add('common-verb-001-past'),
        add('common-noun-002'),
        add('common-conjunction-001'),
        add('red-folded-chairman-noun-001'),
        add('common-ending-001'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED' },
    });

    expect(
      analyze([
        add('common-noun-001'),
        add('common-verb-001-past'),
        add('common-noun-002'),
        add('common-conjunction-001'),
        add('red-folded-chairman-noun-001'),
        add('common-verb-010-present'),
        add('common-noun-001'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });

    expect(
      analyze([
        add('common-noun-001'),
        add('common-verb-001-past'),
        add('common-noun-002'),
        add('common-conjunction-001'),
        add('red-folded-chairman-noun-001'),
        add('common-modifier-001'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });
  });

  test('allows a player to end an incomplete sentence for zero damage', () => {
    const result = analyze([add('common-noun-001'), { kind: 'end' }]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        sentenceStatus: 'incomplete',
        state: 'ENDED',
        resolution: {
          outgoingDamageIntent: 0,
          constructionEnded: true,
        },
      },
    });
  });

  test('accepts modifiers only after a complete clause and keeps construction open', () => {
    const firstModifier = fixture('fixture-modifier-first', 'modifier', 'during the meeting');
    const secondModifier = fixture('fixture-modifier-second', 'modifier', 'without interruption');
    const result = analyze([
      add('common-noun-001'),
      add('common-verb-010-present'),
      add('common-noun-002'),
      step(firstModifier),
      step(secondModifier),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['modifier', 'conjunction', 'ending'],
        publicText:
          'Your unanimous disagreement reinvents a televised revolution during the meeting without interruption',
      },
    });
    expect(analyze([add('common-noun-001'), step(firstModifier)])).toMatchObject({
      accepted: false,
      faults: [
        {
          state: 'SUBJECT_READY',
          attempted: 'modifier',
          expectedRoles: ['verb', 'predicate', 'conjunction'],
        },
      ],
    });
  });

  test('returns a typed grammar mistake for a role that does not fit', () => {
    expect(analyze([add('common-verb-010-present')])).toEqual({
      accepted: false,
      faults: [
        {
          kind: 'illegal-transition',
          code: 'unexpected-role',
          state: 'EXPECT_SUBJECT',
          attempted: 'verb',
          phraseId: 'common-verb-010-present',
          stepIndex: 0,
          expectedRoles: ['noun', 'conjunction'],
        },
      ],
    });
  });

  test('a finisher ends a complete sentence immediately', () => {
    const result = analyze([
      add('common-noun-001'),
      step(possessivePresent),
      step(fixture('fixture-ending', 'ending', 'and that is final.')),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        punctuation: '.',
        publicText: 'Your unanimous disagreement checks its own notes and that is final.',
      },
    });
  });
});

test('with requires its noun before another connector can start a clause', () => {
  const prefix = ['common-noun-053', 'common-predicate-001-present', 'common-conjunction-005'];
  expect(analyze(prefix.map(add))).toMatchObject({ accepted: true, analysis: { complete: false } });
  for (const ids of [
    [...prefix, 'common-conjunction-003'],
    [...prefix, 'common-conjunction-003', 'common-noun-001', 'common-predicate-010-present'],
  ]) {
    expect(analyze(ids.map(add))).toMatchObject({ accepted: false });
  }
  expect(analyze([...prefix, 'common-noun-001'].map(add))).toMatchObject({
    accepted: true,
    analysis: { complete: true },
  });
});

test('completes a character predicate with its owned modifier', () => {
  const result = analyze([
    add('common-noun-053'),
    add('thunder-tribune-predicate-001-present'),
    add('thunder-tribune-modifier-001'),
  ]);
  expect(result).toMatchObject({
    accepted: true,
    analysis: {
      complete: true,
      state: 'CLAUSE_COMPLETE',
      publicText:
        'Holy Water from the Danube promises to keep everything within the rules without politically correct packaging',
    },
  });
});

// Catalog-wide guarantees. These read whatever the shipped catalog contains, so
// adding or removing a card never needs an edit here. They check clause
// completion and the agreement required by the current authored forms.
describe('catalog-wide clause coverage', () => {
  const pastCopulas = [
    fixture('fixture-copula-past', 'predicate', 'was ready', {
      pluralText: 'were ready',
      secondPersonText: 'were ready',
    }),
    ...shippedRelations.filter(
      (relation) => relation.role === 'predicate' && /^was\b/u.test(relation.singularText),
    ),
  ];
  const presentCopulas = [
    fixture('fixture-copula-present', 'predicate', 'is ready', {
      pluralText: 'are ready',
      secondPersonText: 'are ready',
    }),
    ...shippedRelations.filter(
      (relation) => relation.role === 'predicate' && /^is\b/u.test(relation.singularText),
    ),
  ];

  test.each(pastCopulas)(
    'agrees with singular, plural, and second-person subjects in $id',
    (relation) => {
      for (const [subject, copula] of [
        ['common-noun-001', 'was'],
        ['common-noun-031', 'were'],
        ['common-noun-028', 'were'],
      ]) {
        const result = analyze([add(subject!), step(relation), { kind: 'end' }]);
        expect(result).toMatchObject({ accepted: true, analysis: { complete: true } });
        if (result.accepted) {
          expect(result.analysis.renderedPhrases[1]?.text).toMatch(new RegExp(`^${copula} `, 'u'));
        }
      }
    },
  );

  test.each(presentCopulas)('uses the second-person copula in $id', (relation) => {
    const result = analyze([add('common-noun-028'), step(relation), { kind: 'end' }]);
    expect(result).toMatchObject({ accepted: true, analysis: { complete: true } });
    if (result.accepted) expect(result.analysis.publicText).toMatch(/^You are /u);
  });

  test('every shipped ending completes personal, nonpersonal, and plural clauses', () => {
    for (const ending of gameCatalog.phrases.filter(({ role }) => role === 'ending')) {
      for (const subject of ['common-noun-028', 'common-noun-019', 'common-noun-031']) {
        const result = analyze([add(subject), add('common-predicate-010-present'), add(ending.id)]);
        expect(result, `${subject} + ${ending.id}`).toMatchObject({
          accepted: true,
          analysis: { complete: true, state: 'ENDED' },
        });
        if (!result.accepted) continue;
        expect(result.analysis.publicText, ending.id).toMatch(/\.$/u);
        expect(result.analysis.publicText, ending.id).not.toMatch(/\.\.|undefined|\s{2}/u);
      }
    }
  });

  test('every shipped noun and modifier stays reachable in a complete clause', () => {
    for (const entry of gameCatalog.phrases) {
      const ids =
        entry.role === 'noun'
          ? [entry.id, 'common-predicate-010-present', 'common-ending-008']
          : entry.role === 'modifier'
            ? ['common-noun-028', 'common-predicate-010-present', entry.id, 'common-ending-008']
            : null;
      if (!ids) continue;
      expect(analyze(ids.map(add)), entry.id).toMatchObject({
        accepted: true,
        analysis: { complete: true, state: 'ENDED' },
      });
    }
  });
});
