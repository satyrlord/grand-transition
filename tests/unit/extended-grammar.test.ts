import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/content/sample-content';
import { englishGameLocale } from '../../src/localization/en-game-locale';
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
    expect(analyze([add('the-transition-continues')])).toMatchObject({
      accepted: false,
      faults: [{ code: 'unexpected-role', attempted: 'continuation' }],
    });
  });

  test('accepts a front because clause followed by the main clause', () => {
    expect(
      analyze([
        add('archive-because'),
        add('national-consensus'),
        add('before-the-next-election'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['noun', 'conjunction'],
      },
    });

    expect(
      analyze([
        add('archive-because'),
        add('national-consensus'),
        add('before-the-next-election'),
        add('televised-revolution'),
        add('before-the-next-election'),
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
        add('before-the-next-election'),
        add('by-emergency-ordinance'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [
        {
          state: 'CLAUSE_COMPLETE',
          expectedRoles: ['noun', 'conjunction'],
        },
      ],
    });
  });

  test('accepts explanatory because only with its following noun clause', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
        add('archive-because'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: false, nextRoles: ['noun'] },
    });
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
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
        add('before-the-next-election'),
        add('archive-because'),
        add('televised-revolution'),
        add('before-the-next-election'),
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
          add('before-the-next-election'),
          add(connector),
          add('televised-revolution'),
          add('before-the-next-election'),
          add('national-salvation-committee'),
          add('before-the-next-election'),
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
          add('before-the-next-election'),
          add(connector),
          add('archive-because'),
          add('televised-revolution'),
          add('before-the-next-election'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('uses yet as a strong-contrast connector after a complete clause', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
        add('chamber-yet'),
        add('televised-revolution'),
        add('on-public-television'),
      ]),
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
          add('before-the-next-election'),
          add(connector),
        ]),
      ).toMatchObject({
        accepted: true,
        analysis: { complete: false, nextRoles: ['noun'] },
      });
      expect(
        analyze([
          add('national-consensus'),
          add('before-the-next-election'),
          add(connector),
          add('televised-revolution'),
          add('on-public-television'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('reaches the during-the-night ending from a complete clause', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
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
        add('before-the-next-election'),
        add('by-emergency-ordinance'),
        add('national-consensus'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'ENDED', code: 'unexpected-role' }],
    });
  });
});
