import { describe, expect, test } from 'vitest';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';

const add = (id: string): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: prepareEnglishGrammarPhrase(
    sampleContent.phrases.find((candidate) => candidate.id === id)!,
    englishGameLocale,
  ),
});
const analyze = (steps: readonly EnglishGrammarStep[]) =>
  englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });

describe('Hollywood Roast extended grammar', () => {
  test('and is legal immediately after the opening noun', () => {
    expect(
      analyze([add('common-noun-002'), add('common-conjunction-001')]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'EXPECT_SUBJECT',
        nextRoles: ['noun'],
      },
    });
  });

  test('a continuation remains a draft action instead of a grammar atom', () => {
    expect(analyze([add('common-continuation-001')])).toMatchObject({
      accepted: false,
      faults: [{ code: 'unexpected-role', attempted: 'continuation' }],
    });
  });

  test('accepts a front because clause followed by the main clause', () => {
    expect(
      analyze([
        add('common-conjunction-003'),
        add('common-noun-001'),
        add('common-predicate-010-present'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['noun', 'modifier', 'conjunction'],
      },
    });

    expect(
      analyze([
        add('common-conjunction-003'),
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-noun-002'),
        add('common-predicate-010-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('because requires a noun before another connector or finisher', () => {
    expect(analyze([add('common-conjunction-003')])).toMatchObject({
      accepted: true,
      analysis: { state: 'EXPECT_SUBJECT', nextRoles: ['noun'] },
    });
    expect(
      analyze([add('common-conjunction-003'), add('common-conjunction-003')]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-conjunction-001'),
        add('common-conjunction-003'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('common-conjunction-003'),
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-ending-001'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [
        {
          state: 'CLAUSE_COMPLETE',
          expectedRoles: ['noun', 'modifier', 'conjunction'],
        },
      ],
    });
  });

  test('accepts explanatory because only with its following noun clause', () => {
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-003'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: false, nextRoles: ['noun'] },
    });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-003'),
        add('common-conjunction-003'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-003'),
        add('common-noun-002'),
        add('common-predicate-010-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps the required main clause after a subordinate-clause modifier', () => {
    expect(
      analyze([
        add('common-conjunction-003'),
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-modifier-001'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['noun', 'modifier', 'conjunction'],
      },
    });
    expect(
      analyze([
        add('common-conjunction-003'),
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-modifier-001'),
        add('common-noun-002'),
        add('common-predicate-011-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test.each(['common-conjunction-001', 'common-conjunction-002', 'common-conjunction-003'])(
    'accepts %s after a complete front-because subordinate clause',
    (connector) => {
      expect(
        analyze([
          add('common-conjunction-003'),
          add('common-noun-001'),
          add('common-predicate-010-present'),
          add(connector),
          add('common-noun-002'),
          add('common-predicate-010-present'),
          add('red-folded-chairman-noun-001'),
          add('common-predicate-010-present'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test.each(['common-conjunction-001', 'common-conjunction-002'])(
    'accepts because after a completed clause plus %s',
    (connector) => {
      expect(
        analyze([
          add('common-noun-001'),
          add('common-predicate-010-present'),
          add(connector),
          add('common-conjunction-003'),
          add('common-noun-002'),
          add('common-predicate-010-present'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('uses yet as a strong-contrast connector after a complete clause', () => {
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('algorithmic-prophet-conjunction-001'),
        add('common-noun-002'),
        add('common-predicate-011-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('uses with to add a noun complement to a complete clause', () => {
    const result = analyze([
      add('common-noun-053'),
      add('common-predicate-001-present'),
      add('common-conjunction-005'),
      add('common-noun-054'),
      { kind: 'end' },
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        publicText: 'My opponent interrupts this debate with a public apology.',
      },
    });
  });

  test('keeps a past-tense insult composable with an institutional modifier', () => {
    const result = analyze([
      add('common-noun-036'),
      add('common-verb-001-past'),
      add('common-noun-040'),
      add('common-modifier-021'),
      { kind: 'end' },
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        publicText: 'Your brother denounced your partner with a reserved public office to the former secret police.',
      },
    });
  });

  test('accepts the passive camera predicate after a contrasted object clause', () => {
    const result = analyze([
      add('common-noun-031'),
      add('common-predicate-015-past'),
      add('algorithmic-prophet-conjunction-001'),
      add('common-verb-017-present'),
      add('common-noun-036'),
      add('common-conjunction-001'),
      add('common-predicate-002-future'),
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        publicText:
          'Your voters were snitches yet, even now, audit your brother and will be dragged before the cameras',
      },
    });
  });

  test('completes coordinated noun complements after a declared copular predicate', () => {
    const result = analyze([
      add('common-noun-036'),
      add('common-predicate-015-present'),
      add('common-conjunction-001'),
      add('common-noun-048'),
      { kind: 'end' },
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        publicText: 'Your brother is a snitch and a pig.',
        resolution: { outgoingDamageIntent: null },
      },
    });
  });

  test('preserves the new-subject branch after a copular noun-complement prefix', () => {
    expect(
      analyze([
        add('common-noun-036'),
        add('common-predicate-015-present'),
        add('common-conjunction-001'),
        add('common-noun-048'),
        add('common-predicate-010-present'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'Your brother is a snitch and a pig belongs in a history museum',
      },
    });
    expect(
      analyze([
        add('common-noun-036'),
        add('common-predicate-015-present'),
        add('common-conjunction-001'),
        add('common-noun-048'),
        add('common-verb-001-past'),
        add('common-noun-040'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'Your brother is a snitch and a pig denounced your partner with a reserved public office',
      },
    });
  });

  test('keeps and plus a noun incomplete after an unrelated predicate', () => {
    expect(
      analyze([
        add('common-noun-036'),
        add('common-predicate-001-present'),
        add('common-conjunction-001'),
        add('common-noun-048'),
        { kind: 'end' },
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        publicText: 'Your brother interrupts this debate and a pig',
        resolution: { outgoingDamageIntent: 0 },
      },
    });
  });

  test.each([
    ['common-verb-024-past', 'EU funds'],
    ['common-verb-025-past', 'EU funds'],
    ['common-verb-026-past', 'a state secretary'],
    ['common-verb-026-present', 'a state secretary'],
    ['common-verb-027-future', 'a state secretary'],
  ] as const)('accepts the requested verb card %s with %s', (verb, object) => {
    const objectId = object === 'EU funds' ? 'common-noun-050' : 'common-noun-051';
    expect(
      analyze([add('common-noun-053'), add(verb), add(objectId)]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('so joins complete clauses and requires a new noun subject', () => {
    expect(analyze([add('common-conjunction-004')])).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT' }],
    });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-004'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: false, nextRoles: ['noun'] },
    });
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-conjunction-004'),
        add('common-noun-002'),
        add('common-predicate-011-present'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('reaches the during-the-night ending from a complete clause', () => {
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-ending-008'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED', punctuation: '.' },
    });
  });

  test('a later phrase cannot be appended after an ending', () => {
    expect(
      analyze([
        add('common-noun-001'),
        add('common-predicate-010-present'),
        add('common-ending-001'),
        add('common-noun-001'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'ENDED', code: 'unexpected-role' }],
    });
  });
});
