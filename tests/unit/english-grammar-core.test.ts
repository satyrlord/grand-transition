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
      add('belongs-in-a-party-museum'),
    ]);
    const object = analyze([
      add('national-consensus'),
      add('rebrands'),
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
      add('rebrands'),
      add('national-consensus'),
    ]);
    expect(complete).toMatchObject({
      accepted: true,
      analysis: { complete: true },
    });
    if (complete.accepted) {
      expect(complete.analysis.renderedPhrases[3]?.text).toBe('rebrand');
    }
  });

  test('accepts and after a complete clause with a new or shared subject', () => {
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('coalition-and'),
        add('televised-revolution'),
        add('belongs-in-a-party-museum'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
    expect(
      analyze([
        add('national-consensus'),
        add('belongs-in-a-party-museum'),
        add('coalition-and'),
        add('rebrands'),
        add('televised-revolution'),
      ]),
    ).toMatchObject({ accepted: true, analysis: { complete: true } });
  });

  test('keeps a transitive clause complete when and adds another object', () => {
    const compoundObject = analyze([
      add('national-consensus'),
      add('denounced'),
      add('televised-revolution'),
      add('coalition-and'),
      add('national-salvation-committee'),
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
        add('national-consensus'),
        add('denounced'),
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
        add('denounced'),
        add('televised-revolution'),
        add('coalition-and'),
        add('national-salvation-committee'),
        add('rebrands'),
        add('national-consensus'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { complete: true, state: 'CLAUSE_COMPLETE' },
    });

    expect(
      analyze([
        add('national-consensus'),
        add('denounced'),
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

  test('accepts modifiers only after a complete clause and keeps construction open', () => {
    const result = analyze([
      add('national-consensus'),
      add('rebrands'),
      add('televised-revolution'),
      add('before-the-next-election'),
      add('behind-closed-doors'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'CLAUSE_COMPLETE',
        nextRoles: ['modifier', 'conjunction', 'ending'],
        publicText:
          'A national consensus rebrands a televised revolution before the next election behind closed doors',
      },
    });
    expect(
      analyze([add('national-consensus'), add('before-the-next-election')]),
    ).toMatchObject({
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
    expect(analyze([add('rebrands')])).toEqual({
      accepted: false,
      faults: [
        {
          kind: 'illegal-transition',
          code: 'unexpected-role',
          state: 'EXPECT_SUBJECT',
          attempted: 'verb',
          phraseId: 'rebrands',
          stepIndex: 0,
          expectedRoles: ['noun', 'conjunction'],
        },
      ],
    });
  });

  test('a finisher ends a complete sentence immediately', () => {
    const result = analyze([
      add('national-consensus'),
      add('belongs-in-a-party-museum'),
      add('by-emergency-ordinance'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        state: 'ENDED',
        punctuation: '.',
        publicText:
          'A national consensus belongs in a history museum by emergency ordinance.',
      },
    });
  });
});
