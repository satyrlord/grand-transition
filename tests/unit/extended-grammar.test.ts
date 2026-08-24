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
    expect(analyze([add('velvet-megaphone'), add('and')])).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        state: 'EXPECT_SUBJECT',
        nextRoles: ['noun'],
      },
    });
  });

  test('a continuation remains a draft action instead of a grammar atom', () => {
    expect(analyze([add('still-echoes')])).toMatchObject({
      accepted: false,
      faults: [{ code: 'unexpected-role', attempted: 'continuation' }],
    });
  });

  test('accepts a front because clause followed by the main clause', () => {
    expect(
      analyze([add('because'), add('paper-promise'), add('before-lunch')]),
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
        add('because'),
        add('paper-promise'),
        add('before-lunch'),
        add('velvet-megaphone'),
        add('before-lunch'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('because requires a noun before another connector or finisher', () => {
    expect(analyze([add('because')])).toMatchObject({
      accepted: true,
      analysis: { state: 'EXPECT_SUBJECT', nextRoles: ['noun'] },
    });
    expect(analyze([add('because'), add('because')])).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([add('paper-promise'), add('and'), add('because')]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('because'),
        add('paper-promise'),
        add('before-lunch'),
        add('with-the-receipt'),
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
      analyze([add('paper-promise'), add('before-lunch'), add('because')]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: false, nextRoles: ['noun'] },
    });
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('because'),
        add('because'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'EXPECT_SUBJECT', expectedRoles: ['noun'] }],
    });
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('because'),
        add('velvet-megaphone'),
        add('before-lunch'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test.each(['and', 'but', 'because'])(
    'accepts %s after a complete front-because subordinate clause',
    (connector) => {
      expect(
        analyze([
          add('because'),
          add('paper-promise'),
          add('before-lunch'),
          add(connector),
          add('velvet-megaphone'),
          add('before-lunch'),
          add('committee-kite'),
          add('before-lunch'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test.each(['and', 'but'])(
    'accepts because after a completed clause plus %s',
    (connector) => {
      expect(
        analyze([
          add('paper-promise'),
          add('before-lunch'),
          add(connector),
          add('because'),
          add('velvet-megaphone'),
          add('before-lunch'),
        ]),
      ).toMatchObject({ accepted: true, analysis: { complete: true } });
    },
  );

  test('a later phrase cannot be appended after an ending', () => {
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('with-the-receipt'),
        add('paper-promise'),
      ]),
    ).toMatchObject({
      accepted: false,
      faults: [{ state: 'ENDED', code: 'unexpected-role' }],
    });
  });
});
