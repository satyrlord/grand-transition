import { describe, expect, test } from 'vitest';
import { englishGameLocale, gameCatalog } from '../../src/game-content.ts';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type GrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter.ts';

const phrase = (id: string) =>
  prepareEnglishGrammarPhrase(
    gameCatalog.phrases.find((candidate) => candidate.id === id)!,
    englishGameLocale,
  );
const add = (id: string): GrammarStep => ({
  kind: 'phrase',
  phrase: phrase(id),
});
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
      [
        ['common-noun-029', 'common-predicate-011-present'],
        'Your party makes its own voters change the channel',
      ],
      [
        ['common-noun-053', 'common-predicate-011-present'],
        'Holy Water from the Danube makes its own voters change the channel',
      ],
      [
        ['common-noun-028', 'common-predicate-011-present'],
        'You make your own voters change the channel',
      ],
      [
        ['common-noun-050', 'common-predicate-011-present'],
        'EU funds make their own voters change the channel',
      ],
    ] as const;

    for (const [ids, expected] of cases) {
      const result = analyze(ids.map(add));
      expect(result, ids.join(' + ')).toMatchObject({
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

  test('renders the requested social-media families and ending', () => {
    for (const [predicateId, expected] of [
      ['common-predicate-003-past', 'A foreigner cheered for a Russian attack'],
      ['common-predicate-003-present', 'A foreigner cheers for a Russian attack'],
      ['common-predicate-003-future', 'A foreigner will cheer for a Russian attack'],
      ['common-predicate-004-past', 'A foreigner harassed innocent people on social media'],
      ['common-predicate-004-present', 'A foreigner harasses innocent people on social media'],
      ['common-predicate-004-future', 'A foreigner will harass innocent people on social media'],
    ] as const) {
      expect(analyze([add('common-noun-044'), add(predicateId)])).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }

    expect(analyze([add('common-noun-028'), add('common-predicate-003-present')])).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You cheer for a Russian attack' },
    });
    expect(analyze([add('common-noun-028'), add('common-predicate-004-present')])).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You harass innocent people on social media' },
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
        publicText: 'A foreigner cheers for a Russian attack and most of your followers are bots.',
      },
    });
  });

  test('renders every shipped possessive relation for every shipped noun', () => {
    const relationIds = [
      'common-predicate-007-past',
      'common-predicate-007-present',
      'common-predicate-007-future',
      'common-predicate-009-past',
      'common-predicate-009-present',
      'common-predicate-009-future',
      'common-predicate-011-present',
      'common-predicate-011-past',
      'common-predicate-011-future',
      'black-sea-captain-predicate-002-present',
      'black-sea-captain-predicate-002-past',
      'black-sea-captain-predicate-002-future',
    ] as const;
    const nouns = gameCatalog.phrases.filter((candidate) => candidate.role === 'noun');

    for (const noun of nouns) {
      const expectedPossessive =
        noun.grammaticalPerson === 'second'
          ? 'your'
          : noun.grammaticalNumber === 'plural' || noun.referentKind === 'personal'
            ? 'their'
            : 'its';
      for (const relationId of relationIds) {
        const result = analyze([add(noun.id), add(relationId)]);
        expect(result, `${noun.id} + ${relationId}`).toMatchObject({
          accepted: true,
          analysis: { complete: true },
        });
        if (result.accepted) {
          expect(result.analysis.renderedPhrases[1]?.text, `${noun.id} + ${relationId}`).toContain(
            `${expectedPossessive} own`,
          );
        }
      }
    }
  });

  test('keeps second-person agreement through shared and compound subjects', () => {
    const shared = analyze([
      add('common-noun-028'),
      add('common-predicate-011-past'),
      add('common-conjunction-001'),
      add('common-predicate-007-past'),
      { kind: 'end' },
    ]);
    expect(shared).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'You made your own voters change the channel and could not win an election in your own stairwell.',
      },
    });

    const compound = analyze([
      add('common-noun-053'),
      add('common-conjunction-001'),
      add('common-noun-028'),
      add('common-predicate-011-past'),
    ]);
    expect(compound).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        agreement: { subject: 'plural' },
        publicText: 'Holy Water from the Danube and you made your own voters change the channel',
      },
    });
  });

  test('replaces person agreement when a conjunction starts a new subject', () => {
    const result = analyze([
      add('common-noun-028'),
      add('common-predicate-011-past'),
      add('common-conjunction-001'),
      add('common-noun-053'),
      add('common-predicate-011-past'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'You made your own voters change the channel and Holy Water from the Danube made its own voters change the channel',
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
    const result = analyze([
      add('common-noun-001'),
      add('common-verb-010-present'),
      add('common-noun-002'),
      add('common-modifier-001'),
      add('common-modifier-008'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['modifier', 'conjunction', 'ending'],
        publicText:
          'Your unanimous disagreement reinvents a televised revolution before the promises lose their warranty behind doors transparent only in the brochure',
      },
    });
    expect(analyze([add('common-noun-001'), add('common-modifier-001')])).toMatchObject({
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
      add('common-predicate-010-present'),
      add('common-ending-001'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        punctuation: '.',
        publicText:
          'Your unanimous disagreement belongs in a history museum by emergency ordinance; even Tuesday needs approval.',
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

test('completes the approved cemetery-turnout sentence as a modifier', () => {
  const result = analyze([
    add('common-noun-053'),
    add('thunder-tribune-predicate-001-present'),
    add('thunder-tribune-modifier-001'),
  ]);
  expect(result).toMatchObject({
    accepted: true,
    analysis: {
      complete: true,
      publicText:
        'Holy Water from the Danube can lose an election to an empty ballot with 110% turnout at the cemetery',
    },
  });
});

// Catalog-wide guarantees. These read whatever the shipped catalog contains, so
// adding or removing a card never needs an edit here. They fail only when an
// authored card cannot reach a complete sentence.
describe('catalog-wide clause coverage', () => {
  test.each([
    ['red-folded-chairman-predicate-003', 'was', 'were'],
    ['red-folded-chairman-predicate-004', 'was', 'were'],
    ['thunder-tribune-predicate-004', 'was', 'were'],
    ['football-tycoon-predicate-002', 'was', 'were'],
    ['football-tycoon-predicate-003', 'was', 'were'],
    ['football-tycoon-predicate-004', 'was', 'were'],
  ])(
    'agrees with singular, plural, and second-person subjects in %s',
    (family, singular, plural) => {
      for (const [subject, copula] of [
        ['common-noun-001', singular],
        ['common-noun-031', plural],
        ['common-noun-028', plural],
      ]) {
        const result = analyze([add(subject!), add(`${family}-past`), { kind: 'end' }]);
        expect(result).toMatchObject({ accepted: true, analysis: { complete: true } });
        if (result.accepted) {
          expect(result.analysis.renderedPhrases[1]?.text).toMatch(new RegExp(`^${copula} `, 'u'));
        }
      }
    },
  );

  test.each([
    'red-folded-chairman-predicate-004-present',
    'thunder-tribune-predicate-004-present',
    'football-tycoon-predicate-003-present',
    'football-tycoon-predicate-004-present',
  ])('uses the second-person copula in %s', (id) => {
    const result = analyze([add('common-noun-028'), add(id), { kind: 'end' }]);
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
