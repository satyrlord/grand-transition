import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/content/sample-content';
import { englishGameLocale } from '../../src/localization/en-game-locale';
import {
  englishGrammarAdapter,
  prepareEnglishGrammarPhrase,
  type EnglishGrammarStep,
} from '../../src/engine/grammar/english-grammar-adapter';

const phrase = (id: string) =>
  prepareEnglishGrammarPhrase(
    sampleContent.phrases.find((candidate) => candidate.id === id)!,
    englishGameLocale,
  );
const add = (id: string): EnglishGrammarStep => ({
  kind: 'phrase',
  phrase: phrase(id),
});
const analyze = (steps: readonly EnglishGrammarStep[]) =>
  englishGrammarAdapter.analyze({
    steps,
    subjectNumber: 'singular',
    objectNumber: 'singular',
  });

describe('Hollywood Roast English grammar', () => {
  test('accepts the two minimum sentence forms', () => {
    const predicate = analyze([add('paper-promise'), add('before-lunch')]);
    const object = analyze([
      add('paper-promise'),
      add('folds'),
      add('committee-kite'),
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
      add('velvet-megaphone'),
      add('and'),
      add('committee-kite'),
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
      add('velvet-megaphone'),
      add('and'),
      add('committee-kite'),
      add('folds'),
      add('paper-promise'),
    ]);
    expect(complete).toMatchObject({
      accepted: true,
      analysis: { complete: true },
    });
    if (complete.accepted) {
      expect(complete.analysis.renderedPhrases[3]?.text).toBe('fold');
    }
  });

  test('accepts and after a complete clause with a new or shared subject', () => {
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('and'),
        add('velvet-megaphone'),
        add('before-lunch'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
    expect(
      analyze([
        add('paper-promise'),
        add('before-lunch'),
        add('and'),
        add('folds'),
        add('velvet-megaphone'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps a transitive clause complete when and adds another object', () => {
    const compoundObject = analyze([
      add('paper-promise'),
      add('outshouts'),
      add('velvet-megaphone'),
      add('and'),
      add('committee-kite'),
    ]);
    expect(compoundObject).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['verb', 'predicate', 'conjunction', 'ending'],
      },
    });

    expect(
      analyze([
        add('paper-promise'),
        add('outshouts'),
        add('velvet-megaphone'),
        add('and'),
        add('committee-kite'),
        add('with-the-receipt'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED' },
    });

    expect(
      analyze([
        add('paper-promise'),
        add('outshouts'),
        add('velvet-megaphone'),
        add('and'),
        add('committee-kite'),
        add('folds'),
        add('paper-promise'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });

    expect(
      analyze([
        add('paper-promise'),
        add('outshouts'),
        add('velvet-megaphone'),
        add('and'),
        add('committee-kite'),
        add('before-lunch'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });
  });

  test('allows a player to end an incomplete sentence for zero damage', () => {
    const result = analyze([add('paper-promise'), { kind: 'end' }]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: false,
        sentenceStatus: 'incomplete',
        state: 'ENDED',
        resolution: {
          outgoingDamageIntent: 0,
          selfDamageIntent: 0,
          constructionEnded: true,
        },
      },
    });
  });

  test('returns a typed grammar mistake for a role that does not fit', () => {
    expect(analyze([add('folds')])).toEqual({
      accepted: false,
      faults: [
        {
          kind: 'illegal-transition',
          code: 'unexpected-role',
          state: 'EXPECT_SUBJECT',
          attempted: 'verb',
          phraseId: 'folds',
          stepIndex: 0,
          expectedRoles: ['noun', 'conjunction'],
        },
      ],
    });
  });

  test('a finisher ends a complete sentence immediately', () => {
    const result = analyze([
      add('paper-promise'),
      add('before-lunch'),
      add('with-the-receipt'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED', punctuation: '.' },
    });
  });
});
