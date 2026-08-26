import { describe, expect, test } from 'vitest';
import { englishGameLocale, sampleContent } from '../../src/game-content';
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
    const predicate = analyze([
      add('national-consensus'),
      add('before-the-next-election'),
    ]);
    const object = analyze([
      add('national-consensus'),
      add('repackages'),
      add('national-salvation-committee'),
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
      add('televised-revolution'),
      add('coalition-and'),
      add('national-salvation-committee'),
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
      add('televised-revolution'),
      add('coalition-and'),
      add('national-salvation-committee'),
      add('repackages'),
      add('national-consensus'),
    ]);
    expect(complete).toMatchObject({
      accepted: true,
      analysis: { complete: true },
    });
    if (complete.accepted) {
      expect(complete.analysis.renderedPhrases[3]?.text).toBe('repackage');
    }
  });

  test('accepts and after a complete clause with a new or shared subject', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
        add('coalition-and'),
        add('televised-revolution'),
        add('before-the-next-election'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
    expect(
      analyze([
        add('national-consensus'),
        add('before-the-next-election'),
        add('coalition-and'),
        add('repackages'),
        add('televised-revolution'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps a transitive clause complete when and adds another object', () => {
    const compoundObject = analyze([
      add('national-consensus'),
      add('denounces'),
      add('televised-revolution'),
      add('coalition-and'),
      add('national-salvation-committee'),
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
        add('national-consensus'),
        add('denounces'),
        add('televised-revolution'),
        add('coalition-and'),
        add('national-salvation-committee'),
        add('by-emergency-ordinance'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'ENDED' },
    });

    expect(
      analyze([
        add('national-consensus'),
        add('denounces'),
        add('televised-revolution'),
        add('coalition-and'),
        add('national-salvation-committee'),
        add('repackages'),
        add('national-consensus'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });

    expect(
      analyze([
        add('national-consensus'),
        add('denounces'),
        add('televised-revolution'),
        add('coalition-and'),
        add('national-salvation-committee'),
        add('before-the-next-election'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });
  });

  test('allows a player to end an incomplete sentence for zero damage', () => {
    const result = analyze([add('national-consensus'), { kind: 'end' }]);
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
    expect(analyze([add('repackages')])).toEqual({
      accepted: false,
      faults: [
        {
          kind: 'illegal-transition',
          code: 'unexpected-role',
          state: 'EXPECT_SUBJECT',
          attempted: 'verb',
          phraseId: 'repackages',
          stepIndex: 0,
          expectedRoles: ['noun', 'conjunction'],
        },
      ],
    });
  });

  test('a finisher ends a complete sentence immediately', () => {
    const result = analyze([
      add('national-consensus'),
      add('before-the-next-election'),
      add('by-emergency-ordinance'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        punctuation: '.',
        publicText:
          'A national consensus before the next election by emergency ordinance.',
      },
    });
  });
});
