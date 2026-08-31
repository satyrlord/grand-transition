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

  test('renders complete number, person, and referent agreement', () => {
    const cases = [
      [
        ['your-party', 'makes-own-voters-change-the-channel'],
        'Your party makes its own voters change the channel',
      ],
      [
        ['my-opponent', 'makes-own-voters-change-the-channel'],
        'My opponent makes their own voters change the channel',
      ],
      [
        ['you', 'makes-own-voters-change-the-channel'],
        'You make your own voters change the channel',
      ],
      [
        ['eu-funds', 'makes-own-voters-change-the-channel'],
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
      analyze([add('you'), add('rebrands'), add('national-consensus')]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You rebrand a national consensus' },
    });
    expect(
      analyze([add('my-opponent'), add('rebrands'), add('national-consensus')]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'My opponent rebrands a national consensus' },
    });

    for (const [predicateId, expected] of [
      ['were-communist-party-members', 'You were a Communist Party member'],
      ['are-communist-party-members', 'You are a Communist Party member'],
      [
        'will-be-communist-party-members',
        'You will be a Communist Party member',
      ],
      ['was-a-securitate-informer', 'You were a Securitate informer'],
      ['is-a-securitate-informer', 'You are a Securitate informer'],
      ['will-be-a-securitate-informer', 'You will be a Securitate informer'],
    ] as const) {
      expect(
        analyze([add('you'), add(predicateId)]),
        predicateId,
      ).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }
  });

  test('renders the requested social-media families and ending', () => {
    for (const [predicateId, expected] of [
      [
        'was-posted-on-social-media',
        'A liberal was posted on social media',
      ],
      ['is-posted-on-social-media', 'A liberal is posted on social media'],
      [
        'will-be-posted-on-social-media',
        'A liberal will be posted on social media',
      ],
      [
        'harassed-innocent-people-on-social-media',
        'A liberal harassed innocent people on social media',
      ],
      [
        'harasses-innocent-people-on-social-media',
        'A liberal harasses innocent people on social media',
      ],
      [
        'will-harass-innocent-people-on-social-media',
        'A liberal will harass innocent people on social media',
      ],
    ] as const) {
      expect(analyze([add('a-liberal'), add(predicateId)])).toMatchObject({
        accepted: true,
        analysis: { complete: true, publicText: expected },
      });
    }

    expect(
      analyze([add('you'), add('is-posted-on-social-media')]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You are posted on social media' },
    });
    expect(
      analyze([
        add('you'),
        add('harasses-innocent-people-on-social-media'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: { publicText: 'You harass innocent people on social media' },
    });
    expect(
      analyze([
        add('a-liberal'),
        add('is-posted-on-social-media'),
        add('and-most-of-your-followers-are-bots'),
      ]),
    ).toMatchObject({
      accepted: true,
      analysis: {
        state: 'ENDED',
        publicText:
          'A liberal is posted on social media and most of your followers are bots.',
      },
    });
  });

  test('renders every shipped possessive relation for every shipped noun', () => {
    const relationIds = [
      'could-not-win-own-stairwell',
      'cannot-win-own-stairwell',
      'will-not-win-own-stairwell',
      'was-rejected-by-own-voters',
      'is-rejected-by-own-voters',
      'will-be-rejected-by-own-voters',
      'makes-own-voters-change-the-channel',
      'made-own-voters-change-the-channel',
      'will-make-own-voters-change-the-channel',
      'cannot-steer-own-party-from-puddle',
      'could-not-steer-own-party-from-puddle',
      'will-not-steer-own-party-from-puddle',
    ] as const;
    const nouns = sampleContent.phrases.filter(
      (candidate) => candidate.role === 'noun',
    );

    for (const noun of nouns) {
      const expectedPossessive =
        noun.grammaticalPerson === 'second'
          ? 'your'
          : noun.grammaticalNumber === 'plural' ||
              noun.referentKind === 'personal'
            ? 'their'
            : 'its';
      for (const relationId of relationIds) {
        const result = analyze([add(noun.id), add(relationId)]);
        expect(result, `${noun.id} + ${relationId}`).toMatchObject({
          accepted: true,
          analysis: { complete: true },
        });
        if (result.accepted) {
          expect(
            result.analysis.renderedPhrases[1]?.text,
            `${noun.id} + ${relationId}`,
          ).toContain(`${expectedPossessive} own`);
        }
      }
    }
  });

  test('keeps second-person agreement through shared and compound subjects', () => {
    const shared = analyze([
      add('you'),
      add('made-own-voters-change-the-channel'),
      add('coalition-and'),
      add('could-not-win-own-stairwell'),
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
      add('my-opponent'),
      add('coalition-and'),
      add('you'),
      add('made-own-voters-change-the-channel'),
    ]);
    expect(compound).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        agreement: { subject: 'plural' },
        publicText:
          'My opponent and you made your own voters change the channel',
      },
    });
  });

  test('replaces person agreement when a conjunction starts a new subject', () => {
    const result = analyze([
      add('you'),
      add('made-own-voters-change-the-channel'),
      add('coalition-and'),
      add('my-opponent'),
      add('made-own-voters-change-the-channel'),
    ]);
    expect(result).toMatchObject({
      accepted: true,
      analysis: {
        complete: true,
        publicText:
          'You made your own voters change the channel and my opponent made their own voters change the channel',
      },
    });
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
