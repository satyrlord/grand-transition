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
      analyze([add('televised-revolution'), add('coalition-and')]),
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
    expect(analyze([add('ellipsis')])).toMatchObject({
      accepted: false,
      faults: [{ code: 'unexpected-role', attempted: 'continuation' }],
    });
  });

  test('accepts a front because clause followed by the main clause', () => {
    expect(
      analyze([
        add('archive-because'),
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
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
        add('archive-because'),
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('televised-revolution'),
        add('belongs-in-a-party-museum'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('because requires a noun before another connector or finisher', () => {
    expect(analyze([add('archive-because')])).toMatchObject({
      accepted: true,
      analysis: { state: 'EXPECT_SUBJECT', nextRoles: ['noun'] },
    });
    expect(
      analyze([add('archive-because'), add('archive-because')]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('national-consensus'),
        add('coalition-and'),
        add('archive-because'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('archive-because'),
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('by-emergency-ordinance'),
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
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('archive-because'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: false, nextRoles: ['noun'] },
    });
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('archive-because'),
        add('archive-because'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('archive-because'),
        add('televised-revolution'),
        add('belongs-in-a-party-museum'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps the required main clause after a subordinate-clause modifier', () => {
    expect(
      analyze([
        add('archive-because'),
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('before-the-next-election'),
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
        add('archive-because'),
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('before-the-next-election'),
        add('televised-revolution'),
        add('makes-own-voters-change-the-channel'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test.each(['coalition-and', 'televised-but', 'archive-because'])(
    'accepts %s after a complete front-because subordinate clause',
    (connector) => {
      expect(
        analyze([
          add('archive-because'),
          add('national-consensus'),
          add('belongs-in-a-party-museum'),
          add(connector),
          add('televised-revolution'),
          add('belongs-in-a-party-museum'),
          add('national-salvation-committee'),
          add('belongs-in-a-party-museum'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test.each(['coalition-and', 'televised-but'])(
    'accepts because after a completed clause plus %s',
    (connector) => {
      expect(
        analyze([
          add('national-consensus'),
          add('belongs-in-a-party-museum'),
          add(connector),
          add('archive-because'),
          add('televised-revolution'),
          add('belongs-in-a-party-museum'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('uses yet as a strong-contrast connector after a complete clause', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('chamber-yet'),
        add('televised-revolution'),
        add('makes-own-voters-change-the-channel'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('uses with to add a noun complement to a complete clause', () => {
    const result = analyze([
      add('my-opponent'),
      add('interrupts-the-debate'),
      add('with'),
      add('a-public-apology'),
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
      add('your-brother'),
      add('denounced'),
      add('your-concubine'),
      add('to-the-securitate'),
      { kind: 'end' },
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        publicText: 'Your brother denounced your concubine to the Securitate.',
      },
    });
  });

  test('accepts the passive camera predicate after a contrasted object clause', () => {
    const result = analyze([
      add('your-voters'),
      add('was-a-securitate-informer'),
      add('chamber-yet'),
      add('audits'),
      add('your-brother'),
      add('coalition-and'),
      add('will-drag-before-the-cameras'),
    ]);

    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        publicText:
          'Your voters were Securitate informers yet audit your brother and will be dragged before the cameras',
      },
    });
  });

  test.each([
    ['stole', 'EU funds'],
    ['appropriated', 'EU funds'],
    ['was-not', 'a state secretary'],
    ['is-not', 'a state secretary'],
    ['will-never-be', 'a state secretary'],
  ] as const)('accepts the requested verb card %s with %s', (verb, object) => {
    const objectId = object === 'EU funds' ? 'eu-funds' : 'a-state-secretary';
    expect(
      analyze([add('my-opponent'), add(verb), add(objectId)]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test.each(['consequence-so', 'explanation-for'])(
    '%s joins complete clauses and requires a new noun subject',
    (connector) => {
      expect(analyze([add(connector)])).toMatchObject({
        accepted: false,
        faults: [{ state: 'EXPECT_SUBJECT' }],
      });
      expect(
        analyze([
          add('national-consensus'),
          add('belongs-in-a-party-museum'),
          add(connector),
        ]),
      ).toMatchObject({
        accepted: true,
        analysis: { complete: false, nextRoles: ['noun'] },
      });
      expect(
        analyze([
          add('national-consensus'),
          add('belongs-in-a-party-museum'),
          add(connector),
          add('televised-revolution'),
          add('makes-own-voters-change-the-channel'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('reaches the during-the-night ending from a complete clause', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('under-the-national-banner'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED', punctuation: '.' },
    });
  });

  test('a later phrase cannot be appended after an ending', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('by-emergency-ordinance'),
        add('national-consensus'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'ENDED', code: 'unexpected-role' }],
    });
  });
});
