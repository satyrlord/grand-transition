import { describe, expect, test } from 'vitest';
import { contentCatalogSchema } from '../../src/content/content-catalog';
import {
  buildPhraseCardCatalog,
  combinePhraseCardCorpora,
  parseCharacterCardFile,
  parsePhraseCardCorpus,
} from '../../src/content/phrase-card-catalog';
import type { EditorialSafetyFlag } from '../../src/content/schemas';
import {
  characterPortraitUrls,
  characterSkins,
  phraseCardCatalog,
  sampleContent,
} from '../../src/game-content';

type MutableCatalog = ReturnType<typeof cloneCatalog>;

const approvedReview = (notes: string) =>
  ({
    state: 'approved',
    originality: 'original',
    safetyFlags: [],
    notes,
  }) as const;

function cloneCatalog() {
  return structuredClone(sampleContent);
}

interface NumericBoundaryCase {
  readonly name: string;
  readonly pathPart: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly immediatelyBelow: number;
  readonly immediatelyAbove: number;
  readonly setValue: (catalog: MutableCatalog, value: number) => void;
}

const numericBoundaryCases: readonly NumericBoundaryCase[] = [
  {
    name: 'phrase custom score',
    pathPart: 'phrases.4.customScores.0.score',
    minimum: 0,
    maximum: 100,
    immediatelyBelow: -1,
    immediatelyAbove: 101,
    setValue: (catalog, value) => {
      catalog.phrases[4]!.customScores = [
        { leftNounId: 'national-consensus', score: value },
      ];
    },
  },
  {
    name: 'phrase finisher bonus',
    pathPart: 'finisherBonus',
    minimum: 1,
    maximum: 20,
    immediatelyBelow: 0,
    immediatelyAbove: 21,
    setValue: (catalog, value) => {
      catalog.phrases.find(
        (phrase) => phrase.id === 'by-emergency-ordinance',
      )!.finisherBonus = value;
    },
  },
  ...(['aggression', 'denial', 'risk'] as const).map(
    (field): NumericBoundaryCase => ({
      name: `AI personality ${field}`,
      pathPart: `characters.0.aiPersonality.${field}`,
      minimum: 0,
      maximum: 1,
      immediatelyBelow: -0.01,
      immediatelyAbove: 1.01,
      setValue: (catalog, value) => {
        catalog.characters[0]!.aiPersonality[field] = value;
      },
    }),
  ),
  {
    name: 'voice rate',
    pathPart: 'characters.0.voiceProfile.rate',
    minimum: 0.5,
    maximum: 2,
    immediatelyBelow: 0.49,
    immediatelyAbove: 2.01,
    setValue: (catalog, value) => {
      catalog.characters[0]!.voiceProfile.rate = value;
    },
  },
  {
    name: 'voice pitch',
    pathPart: 'characters.0.voiceProfile.pitch',
    minimum: 0,
    maximum: 2,
    immediatelyBelow: -0.01,
    immediatelyAbove: 2.01,
    setValue: (catalog, value) => {
      catalog.characters[0]!.voiceProfile.pitch = value;
    },
  },
  {
    name: 'scene layer depth',
    pathPart: 'scenes.0.backgroundLayers.0.depth',
    minimum: 0,
    maximum: 1,
    immediatelyBelow: -0.01,
    immediatelyAbove: 1.01,
    setValue: (catalog, value) => {
      catalog.scenes[0]!.backgroundLayers[0]!.depth = value;
    },
  },
];

function expectFailure(
  catalog: MutableCatalog,
  pathPart: string,
  messagePart: RegExp,
): void {
  const result = contentCatalogSchema.safeParse(catalog);
  expect(result.success).toBe(false);
  if (result.success) return;

  const issue = result.error.issues.find((candidate) =>
    candidate.path.join('.').includes(pathPart),
  );
  expect(issue, result.error.toString()).toBeDefined();
  expect(issue?.message).toMatch(messagePart);
}

describe('content schemas', () => {
  test('loads unique cards from the common and character JSON corpora', () => {
    expect(phraseCardCatalog.phrases.length).toBeGreaterThan(0);
    expect(phraseCardCatalog.commonPhraseIds.length).toBeGreaterThan(0);
    expect(phraseCardCatalog.characterPhraseIds['red-folded-chairman']).toEqual(
      expect.arrayContaining([
        'national-salvation-committee',
        'the-nordic-model',
        'socialism-with-a-human-face',
        'a-free-thinker',
        'a-dictatorship',
        'the-working-class',
        'some-hooligans',
        'scientific-socialism',
        'a-screwdriver-between-the-ribs',
        'a-dumbass',
        'an-animal',
        'a-historical-blunder',
        'rich-and-dishonest',
        'a-rooster',
        'a-monkey',
        'a-naughty-boy',
        'the-dacs-that-come-from-the-tracs',
        'and-thats-the-synergy-of-facts',
      ]),
    );
    expect(phraseCardCatalog.characterPhraseIds['thunder-tribune']).toEqual(
      expect.arrayContaining([
        'tribunes-indictment',
        'a-somaldoaca',
        'a-cursed-gnome',
        'looks-like-a-somaldoaca-on-television',
        'bring-me-the-studio-phone',
      ]),
    );
    expect(phraseCardCatalog.englishMessages['phrase.a-cursed-gnome']).toBe(
      'a cursed gnome',
    );
    expect(phraseCardCatalog.commonPhraseIds).toEqual(
      expect.arrayContaining([
        'brought-the-miners-to-bucharest',
        'sided-with-terrorists',
        'transports-voters-with-busses',
        'your-brother',
        'your-father',
        'your-cousin',
        'your-son-in-law',
        'your-concubine',
        'stole',
        'eu-funds',
        'appropriated',
        'was-a-securitate-informer',
        'a-state-secretary',
        'was-not',
        'is-not',
        'will-never-be',
        'a-witch',
        'my-opponent',
        'with',
        'a-public-apology',
        'to-the-securitate',
      ]),
    );
    expect(phraseCardCatalog.commonPhraseIds).not.toContain(
      'your-family-album',
    );
    expect(phraseCardCatalog.englishMessages).toMatchObject({
      'phrase.brought-the-miners-to-bucharest':
        'brought the miners to Bucharest',
      'phrase.sided-with-terrorists': 'sided with the terrorists in 1989',
      'phrase.transports-voters-with-busses': 'transports voters with busses',
      'phrase.your-brother': 'your brother',
      'phrase.your-father': 'your father',
      'phrase.your-cousin': 'your cousin',
      'phrase.your-son-in-law': 'your son-in-law',
      'phrase.your-concubine': 'your concubine',
      'phrase.stole': 'stole',
      'phrase.eu-funds': 'EU funds',
      'phrase.appropriated': 'appropriated',
      'phrase.was-a-securitate-informer': 'was a Securitate informer',
      'phrase.a-state-secretary': 'a state secretary',
      'phrase.was-not': 'was not',
      'phrase.is-not': 'is not',
      'phrase.will-never-be': 'will never be',
      'phrase.a-witch': 'a witch',
      'phrase.my-opponent': 'my opponent',
      'phrase.with': 'with',
      'phrase.a-public-apology': 'a public apology',
      'phrase.to-the-securitate': 'to the Securitate',
    });
    expect(phraseCardCatalog.characterPhraseIds['black-sea-captain']).toEqual(
      expect.arrayContaining(['hands-on-presidency', 'your-leaking-flagship']),
    );
    expect(
      new Set(phraseCardCatalog.phrases.map((phrase) => phrase.id)),
    ).toHaveLength(phraseCardCatalog.phrases.length);
    for (const removedPhraseId of ['wont', 'did-not', 'does-not']) {
      expect(phraseCardCatalog.commonPhraseIds).not.toContain(removedPhraseId);
    }
    expect(
      phraseCardCatalog.phrases.find(
        (phrase) => phrase.id === 'national-salvation-committee',
      )?.characterIds,
    ).toEqual(['red-folded-chairman']);
  });

  test('loads the Chairman phrase expansion and comeback tiers', () => {
    const expectedPhrases = [
      ['the-nordic-model', 'the Nordic model'],
      ['socialism-with-a-human-face', 'socialism with a human face'],
      ['a-free-thinker', 'a free-thinker'],
      ['a-dictatorship', 'a dictatorship'],
      ['the-working-class', 'the working class'],
      ['some-hooligans', 'some hooligans'],
      ['scientific-socialism', 'scientific socialism'],
      ['a-screwdriver-between-the-ribs', 'a screwdriver between the ribs'],
      ['a-dumbass', 'a dumbass'],
      ['an-animal', 'an animal'],
      ['a-historical-blunder', 'a historical blunder'],
      ['rich-and-dishonest', 'rich and dishonest'],
      ['a-rooster', 'a rooster'],
      ['a-monkey', 'a monkey'],
      ['a-naughty-boy', 'a naughty boy'],
      [
        'the-dacs-that-come-from-the-tracs',
        'and the Dacs that come from the Tracs.',
      ],
      ['and-thats-the-synergy-of-facts', "and that's the synergy of facts."],
    ] as const;

    for (const [id, text] of expectedPhrases) {
      expect(
        phraseCardCatalog.characterPhraseIds['red-folded-chairman'],
      ).toContain(id);
      expect(phraseCardCatalog.englishMessages[`phrase.${id}`]).toBe(text);
    }
    expect(
      phraseCardCatalog.englishMessages['comeback.red-folded-chairman.weak'],
    ).toBe('My dear.');
    expect(
      phraseCardCatalog.englishMessages['comeback.red-folded-chairman.medium'],
    ).toBe('You animal.');
    expect(
      phraseCardCatalog.englishMessages['comeback.red-folded-chairman.strong'],
    ).toBe('And you have a servile mentality.');
    const dacsEnding = phraseCardCatalog.phrases.find(
      (phrase) => phrase.id === 'the-dacs-that-come-from-the-tracs',
    );
    expect(dacsEnding).toMatchObject({
      role: 'ending',
      finisherBonus: 3,
    });
    expect(dacsEnding?.scoreGroups).toBeUndefined();
  });

  test('loads the Thunder Tribune comeback tiers', () => {
    expect(
      phraseCardCatalog.englishMessages['comeback.thunder-tribune.weak'],
    ).toBe('And I have the dossiers to prove it!');
    expect(
      phraseCardCatalog.englishMessages['comeback.thunder-tribune.medium'],
    ).toBe('And even those NATO clowns know that!');
    expect(
      phraseCardCatalog.englishMessages['comeback.thunder-tribune.strong'],
    ).toBe('Now get this human bucket of vomit out of my sight!');
  });

  test('includes agreement-aware copulas and basic ideological noun cards', () => {
    const copulas = [
      ['is', 'is', 'are'],
      ['was', 'was', 'were'],
      ['will-be', 'will be', 'will be'],
      ['should-have-been', 'should have been', 'should have been'],
    ] as const;
    for (const [id, singularText, pluralText] of copulas) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === id,
      );
      expect(phrase).toMatchObject({ id, role: 'verb' });
      expect(phraseCardCatalog.englishMessages[`phrase.${id}`]).toBe(
        singularText,
      );
      expect(phraseCardCatalog.englishMessages[`phrase.${id}.singular`]).toBe(
        singularText,
      );
      expect(phraseCardCatalog.englishMessages[`phrase.${id}.plural`]).toBe(
        pluralText,
      );
    }

    for (const [id, text] of [
      ['a-communist', 'a communist'],
      ['a-liberal', 'a liberal'],
      ['a-globalist', 'a globalist'],
      ['a-sovereignist', 'a sovereignist'],
      ['a-fascist', 'a fascist'],
      ['a-pig', 'a pig'],
      ['a-nazi', 'a Nazi'],
    ] as const) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === id,
      );
      expect(phrase).toMatchObject({ id, role: 'noun' });
      expect(phraseCardCatalog.englishMessages[`phrase.${id}`]).toBe(text);
    }
  });

  test('loads person-aware nouns and subject agreement forms', () => {
    expect(
      phraseCardCatalog.phrases.find((phrase) => phrase.id === 'you'),
    ).toMatchObject({
      grammaticalNumber: 'singular',
      grammaticalPerson: 'second',
      referentKind: 'personal',
    });
    expect(
      phraseCardCatalog.phrases.find((phrase) => phrase.id === 'my-opponent'),
    ).toMatchObject({ referentKind: 'personal' });
    expect(
      phraseCardCatalog.phrases.find((phrase) => phrase.id === 'eu-funds'),
    ).toMatchObject({ grammaticalNumber: 'plural' });

    for (const id of [
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
    ]) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === id,
      );
      expect(phrase?.numberForms, id).toMatchObject({
        personalSingularKey: `phrase.${id}.personal-singular`,
        secondPersonKey: `phrase.${id}.second-person`,
      });
      expect(
        phraseCardCatalog.englishMessages[`phrase.${id}.personal-singular`],
        id,
      ).toMatch(/\btheir own\b/iu);
      expect(
        phraseCardCatalog.englishMessages[`phrase.${id}.second-person`],
        id,
      ).toMatch(/\byour own\b/iu);
    }

    for (const [id, personalSingularText, secondPersonText] of [
      [
        'were-communist-party-members',
        'was a Communist Party member',
        'were a Communist Party member',
      ],
      [
        'are-communist-party-members',
        'is a Communist Party member',
        'are a Communist Party member',
      ],
      [
        'will-be-communist-party-members',
        'will be a Communist Party member',
        'will be a Communist Party member',
      ],
      [
        'was-a-securitate-informer',
        'was a Securitate informer',
        'were a Securitate informer',
      ],
      [
        'is-a-securitate-informer',
        'is a Securitate informer',
        'are a Securitate informer',
      ],
      [
        'will-be-a-securitate-informer',
        'will be a Securitate informer',
        'will be a Securitate informer',
      ],
    ] as const) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === id,
      );
      expect(phrase?.numberForms, id).toMatchObject({
        personalSingularKey: `phrase.${id}.personal-singular`,
        secondPersonKey: `phrase.${id}.second-person`,
      });
      expect(
        phraseCardCatalog.englishMessages[`phrase.${id}.personal-singular`],
        id,
      ).toBe(personalSingularText);
      expect(
        phraseCardCatalog.englishMessages[`phrase.${id}.second-person`],
        id,
      ).toBe(secondPersonText);
    }
  });

  test('loads requested tense variants with valid number agreement', () => {
    const expected = [
      ['denounced', 'denounced', 'denounced'],
      ['negotiated', 'negotiated', 'negotiated'],
      ['consulted', 'consulted', 'consulted'],
      ['allocated', 'allocated', 'allocated'],
      ['contested', 'contested', 'contested'],
      ['promised', 'promised', 'promised'],
      ['unveiled', 'unveiled', 'unveiled'],
      ['coordinated', 'coordinated', 'coordinated'],
      ['stole', 'stole', 'stole'],
      ['appropriated', 'appropriated', 'appropriated'],
      ['was-not', 'was not', 'were not'],
      ['is-not', 'is not', 'are not'],
      ['will-never-be', 'will never be', 'will never be'],
    ] as const;

    for (const [id, singular, plural] of expected) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === id,
      );
      expect(phrase, id).toMatchObject({
        role: 'verb',
        numberForms: expect.anything(),
      });
      expect(phraseCardCatalog.englishMessages[`phrase.${id}.singular`]).toBe(
        singular,
      );
      expect(phraseCardCatalog.englishMessages[`phrase.${id}.plural`]).toBe(
        plural,
      );
    }
  });

  test('loads the requested social-media families and ending', () => {
    const requestedPredicates = [
      {
        id: 'was-posted-on-social-media',
        family: 'posted-on-social-media',
        tense: 'past',
        rarity: 'common',
        singular: 'was posted on social media',
        plural: 'were posted on social media',
        personalSingular: 'was posted on social media',
        secondPerson: 'were posted on social media',
      },
      {
        id: 'is-posted-on-social-media',
        family: 'posted-on-social-media',
        tense: 'present',
        rarity: 'uncommon',
        singular: 'is posted on social media',
        plural: 'are posted on social media',
        personalSingular: 'is posted on social media',
        secondPerson: 'are posted on social media',
      },
      {
        id: 'will-be-posted-on-social-media',
        family: 'posted-on-social-media',
        tense: 'future',
        rarity: 'rare',
        singular: 'will be posted on social media',
        plural: 'will be posted on social media',
        personalSingular: 'will be posted on social media',
        secondPerson: 'will be posted on social media',
      },
      {
        id: 'harassed-innocent-people-on-social-media',
        family: 'harasses-innocent-people-on-social-media',
        tense: 'past',
        rarity: 'common',
        singular: 'harassed innocent people on social media',
        plural: 'harassed innocent people on social media',
        personalSingular: 'harassed innocent people on social media',
        secondPerson: 'harassed innocent people on social media',
      },
      {
        id: 'harasses-innocent-people-on-social-media',
        family: 'harasses-innocent-people-on-social-media',
        tense: 'present',
        rarity: 'uncommon',
        singular: 'harasses innocent people on social media',
        plural: 'harass innocent people on social media',
        personalSingular: 'harasses innocent people on social media',
        secondPerson: 'harass innocent people on social media',
      },
      {
        id: 'will-harass-innocent-people-on-social-media',
        family: 'harasses-innocent-people-on-social-media',
        tense: 'future',
        rarity: 'rare',
        singular: 'will harass innocent people on social media',
        plural: 'will harass innocent people on social media',
        personalSingular: 'will harass innocent people on social media',
        secondPerson: 'will harass innocent people on social media',
      },
    ] as const;

    for (const expected of requestedPredicates) {
      const phrase = phraseCardCatalog.phrases.find(
        (candidate) => candidate.id === expected.id,
      );
      expect(phrase, expected.id).toMatchObject({
        role: 'predicate',
        tenseFamily: expected.family,
        tense: expected.tense,
        rarity: expected.rarity,
        numberForms: {
          singularKey: `phrase.${expected.id}.singular`,
          pluralKey: `phrase.${expected.id}.plural`,
          personalSingularKey: `phrase.${expected.id}.personal-singular`,
          secondPersonKey: `phrase.${expected.id}.second-person`,
        },
      });
      expect(phraseCardCatalog.englishMessages[`phrase.${expected.id}`]).toBe(
        expected.singular,
      );
      expect(
        phraseCardCatalog.englishMessages[`phrase.${expected.id}.singular`],
      ).toBe(expected.singular);
      expect(
        phraseCardCatalog.englishMessages[`phrase.${expected.id}.plural`],
      ).toBe(expected.plural);
      expect(
        phraseCardCatalog.englishMessages[
          `phrase.${expected.id}.personal-singular`
        ],
      ).toBe(expected.personalSingular);
      expect(
        phraseCardCatalog.englishMessages[
          `phrase.${expected.id}.second-person`
        ],
      ).toBe(expected.secondPerson);
    }

    expect(
      phraseCardCatalog.phrases.find(
        (phrase) => phrase.id === 'and-most-of-your-followers-are-bots',
      ),
    ).toMatchObject({ role: 'ending', finisherBonus: 4, rarity: 'rare' });
    expect(
      phraseCardCatalog.englishMessages[
        'phrase.and-most-of-your-followers-are-bots'
      ],
    ).toBe('and most of your followers are bots.');
  });

  test('keeps every required role in the common corpus', () => {
    const commonPhrases = phraseCardCatalog.phrases.filter((phrase) =>
      phraseCardCatalog.commonPhraseIds.includes(phrase.id),
    );
    expect(new Set(commonPhrases.map((phrase) => phrase.role))).toEqual(
      new Set([
        'noun',
        'verb',
        'predicate',
        'modifier',
        'conjunction',
        'ending',
        'continuation',
      ]),
    );
  });

  test('groups relations by each distinct supported English tense form', () => {
    const expectedRarity = {
      past: 'common',
      present: 'uncommon',
      future: 'rare',
    } as const;
    const families = new Map<string, typeof phraseCardCatalog.phrases>();

    for (const phrase of phraseCardCatalog.phrases) {
      if (phrase.role !== 'verb' && phrase.role !== 'predicate') continue;
      expect(phrase.tenseFamily, phrase.id).toBeTruthy();
      expect(phrase.tense, phrase.id).toBeTruthy();
      const owner = phrase.characterIds?.[0] ?? 'common';
      const key = owner + ':' + phrase.tenseFamily;
      families.set(key, [...(families.get(key) ?? []), phrase]);
    }

    for (const [family, members] of families) {
      const expectedTenses =
        family === 'common:should-have-been'
          ? ['past', 'present']
          : ['future', 'past', 'present'];
      expect(members, family).toHaveLength(expectedTenses.length);
      expect(new Set(members.map((member) => member.role))).toEqual(
        new Set([members[0]!.role]),
      );
      expect(
        members
          .map((member) => member.tense)
          .toSorted((a, b) => {
            return String(a).localeCompare(String(b));
          }),
      ).toEqual(expectedTenses);
      for (const member of members) {
        expect(member.rarity, family + ' ' + member.id).toBe(
          expectedRarity[member.tense!],
        );
      }
    }
  });

  test('classifies clause modifiers separately from predicates', () => {
    const commonModifierIds = phraseCardCatalog.phrases
      .filter(
        (phrase) =>
          phrase.role === 'modifier' &&
          phraseCardCatalog.commonPhraseIds.includes(phrase.id),
      )
      .map((phrase) => phrase.id)
      .toSorted();
    expect(commonModifierIds).toEqual(
      expect.arrayContaining([
        'across-county-capitals',
        'after-the-midnight-news',
        'at-victoria-palace',
        'before-a-confidence-vote',
        'before-the-next-election',
        'behind-closed-doors',
        'beneath-the-national-banner',
        'beside-an-unfinished-motorway',
        'during-a-coalition-crisis',
        'during-a-press-conference',
        'during-budget-season',
        'from-the-government-podium',
        'in-the-transition-archive',
        'on-public-television',
        'on-the-campaign-trail',
        'through-another-reform-cycle',
        'to-the-securitate',
        'under-an-emergency-ordinance',
        'under-the-studio-lights',
        'with-coalition-partners',
        'without-public-consultation',
      ]),
    );
    expect(
      phraseCardCatalog.phrases
        .filter(
          (phrase) =>
            phrase.role === 'modifier' && phrase.characterIds !== undefined,
        )
        .map((phrase) => phrase.id)
        .toSorted(),
    ).toEqual(
      expect.arrayContaining([
        'rich-and-dishonest',
        'through-a-gradual-transition',
        'through-troubled-waters',
      ]),
    );
    expect(
      phraseCardCatalog.phrases
        .filter((phrase) => phrase.role === 'modifier')
        .every(
          (phrase) =>
            phrase.scorePreferences === undefined &&
            phrase.customScores === undefined,
        ),
    ).toBe(true);
  });

  test('keeps every character predicate as a clause-completing verb phrase', () => {
    const predicates = phraseCardCatalog.phrases.filter(
      (phrase) =>
        phrase.role === 'predicate' && phrase.characterIds !== undefined,
    );
    expect(
      [...new Set(predicates.map((phrase) => phrase.tenseFamily))],
    ).toEqual(
      expect.arrayContaining([
        'asks-for-patience-again',
        'calls-every-delay-a-transition',
        'cannot-steer-own-party-from-puddle',
        'from-the-marble-rostrum',
        'looks-like-a-somaldoaca-on-television',
        'raises-the-volume-again',
        'returns-to-the-wheel',
      ]),
    );
    expect(
      predicates.every(
        (phrase) =>
          phrase.scorePreferences !== undefined ||
          phrase.customScores !== undefined,
      ),
    ).toBe(true);
  });

  test('covers the Red-Folded Chairman miners weakness with historical phrases', () => {
    const minerPhraseIds = phraseCardCatalog.phrases
      .filter((phrase) => phrase.tags.includes('miners'))
      .map((phrase) => phrase.id);

    expect(minerPhraseIds).toEqual(
      expect.arrayContaining([
        'televised-revolution',
        'brought-the-miners-to-bucharest',
      ]),
    );
    expect(
      sampleContent.characters.find(
        (character) => character.id === 'red-folded-chairman',
      )?.weaknessTags,
    ).toContain('miners');
  });

  test('reserves șomâldoacă for the Tribune and Securitate for the Captain weakness', () => {
    const somaldoacaIds = phraseCardCatalog.phrases
      .filter((phrase) =>
        phraseCardCatalog.englishMessages[phrase.textKey]?.includes(
          'șomâldoac',
        ),
      )
      .map((phrase) => phrase.id);
    expect(somaldoacaIds).toEqual(
      expect.arrayContaining([
        'a-somaldoaca',
        'looks-like-a-somaldoaca-on-television',
        'looked-like-a-somaldoaca-on-television',
        'will-look-like-a-somaldoaca-on-television',
      ]),
    );
    expect(
      somaldoacaIds.every((phraseId) =>
        phraseCardCatalog.characterPhraseIds['thunder-tribune']!.includes(
          phraseId,
        ),
      ),
    ).toBe(true);
    expect(
      somaldoacaIds.some((phraseId) =>
        phraseCardCatalog.commonPhraseIds.includes(phraseId),
      ),
    ).toBe(false);

    const securitatePhrases = phraseCardCatalog.phrases.filter((phrase) =>
      phraseCardCatalog.englishMessages[phrase.textKey]?.includes('Securitate'),
    );
    expect(securitatePhrases.length).toBeGreaterThan(0);
    expect(
      securitatePhrases.every((phrase) => phrase.tags.includes('securitate')),
    ).toBe(true);
    expect(
      sampleContent.characters.find(
        (character) => character.id === 'black-sea-captain',
      )?.weaknessTags,
    ).toContain('securitate');
  });

  test('ships one universal continuation with the canonical visible cue', () => {
    const continuation = phraseCardCatalog.phrases.find(
      (phrase) => phrase.id === 'ellipsis',
    );

    expect(continuation).toMatchObject({
      role: 'continuation',
      id: 'ellipsis',
      characterIds: undefined,
    });
    expect(phraseCardCatalog.englishMessages[continuation!.textKey]).toBe(
      '[...]',
    );
  });

  test('includes the sourced during-the-night ending with its approved definition', () => {
    const phrase = phraseCardCatalog.phrases.find(
      (candidate) => candidate.id === 'under-the-national-banner',
    );

    expect(phrase).toMatchObject({
      role: 'ending',
      tags: ['evidence', 'credibility'],
      rarity: 'rare',
      finisherBonus: 4,
    });
    expect(phraseCardCatalog.englishMessages[phrase!.textKey]).toBe(
      'during the night, as thieves.',
    );
    expect(phrase?.editorialReview.notes).toMatch(
      /2017 Romanian civic-protest slogan/iu,
    );
    expect(phraseCardCatalog.commonPhraseIds).toContain(
      'under-the-national-banner',
    );
  });

  test('requires every ending text to include a terminal full stop', () => {
    const endings = phraseCardCatalog.phrases.filter(
      (phrase) => phrase.role === 'ending',
    );
    expect(
      endings.every((phrase) =>
        phraseCardCatalog.englishMessages[phrase.textKey]?.endsWith('.'),
      ),
    ).toBe(true);

    expect(() =>
      parsePhraseCardCorpus([
        {
          id: 'unfinished-ending',
          role: 'ending',
          text: 'unfinished ending',
          tags: ['closing'],
          rarity: 'common',
          finisherBonus: 1,
          editorialReview: approvedReview('Original fictional ending fixture.'),
        },
      ]),
    ).toThrow(/full stop/iu);
  });

  test('ships each game-appropriate conjunction selected for the corpus', () => {
    const commonConjunctions = phraseCardCatalog.phrases.filter(
      (phrase) =>
        phrase.role === 'conjunction' &&
        phraseCardCatalog.commonPhraseIds.includes(phrase.id),
    );
    expect(new Set(commonConjunctions.map((phrase) => phrase.connectorKind))).toEqual(
      new Set(['and', 'but', 'because', 'yet', 'so', 'for', 'with']),
    );
  });

  test('records an original fictional rationale for every shipped phrase card', () => {
    const phraseById = new Map(
      phraseCardCatalog.phrases.map((phrase) => [phrase.id, phrase]),
    );
    for (const phraseId of phraseById.keys()) {
      const review = phraseById.get(phraseId)!.editorialReview;
      expect(review.state, phraseId).toBe('approved');
      expect(review.originality, phraseId).toBe('original');
      expect(review.safetyFlags, phraseId).toEqual([]);
      expect(review.notes, phraseId).toMatch(
        /Original|Standard English|Canonical/iu,
      );
    }
  });

  test('validates a manually authored JSON phrase before catalog loading', () => {
    const source = {
      id: 'manual-card',
      role: 'noun',
      text: 'a manual card',
      tags: ['paperwork'],
      scoreGroups: { substance: ['bureaucracy'], flavour: ['whimsy'] },
      rarity: 'uncommon',
      editorialReview: approvedReview(
        'Original test fixture. Review complete.',
      ),
    } as const;
    const loaded = parsePhraseCardCorpus([source]);
    expect(loaded.phrases[0]).toMatchObject({
      id: 'manual-card',
      textKey: 'phrase.manual-card',
    });
    expect(loaded.englishMessages).toEqual({
      'phrase.manual-card': 'a manual card',
    });
    expect(() => parsePhraseCardCorpus([source, source])).toThrow(
      /duplicated/iu,
    );
    expect(() =>
      parsePhraseCardCorpus([
        source,
        { ...source, id: 'manual-card-with-repeated-text' },
      ]),
    ).toThrow(/unique player-visible phrase text/iu);
    expect(() =>
      parsePhraseCardCorpus([{ ...source, singularText: 'a manual card' }]),
    ).toThrow(/both singularText and pluralText/iu);
    expect(() =>
      combinePhraseCardCorpora({
        common: loaded,
        byCharacter: { 'test-character': loaded },
      }),
    ).toThrow(/more than one corpus/iu);

    const repeatedText = parsePhraseCardCorpus([
      { ...source, id: 'character-card-with-repeated-text' },
    ]);
    expect(() =>
      combinePhraseCardCorpora({
        common: loaded,
        byCharacter: { 'test-character': repeatedText },
      }),
    ).toThrow(/repeats player-visible text/iu);
  });

  test('derives complete person-specific agreement messages', () => {
    const source = {
      id: 'manual-person-agreement',
      role: 'predicate',
      text: 'guards its own notes',
      singularText: 'guards its own notes',
      pluralText: 'guard their own notes',
      personalSingularText: 'guards their own notes',
      secondPersonText: 'guard your own notes',
      tense: 'present',
      tenseFamily: 'manual-person-agreement',
      tags: ['paperwork'],
      scorePreferences: {
        substance: [{ left: ['bureaucracy'] }],
        flavour: [],
      },
      rarity: 'uncommon',
      editorialReview: approvedReview(
        'Original person-agreement test fixture.',
      ),
    } as const;
    const loaded = parsePhraseCardCorpus([source]);

    expect(loaded.englishMessages).toMatchObject({
      'phrase.manual-person-agreement.personal-singular':
        'guards their own notes',
      'phrase.manual-person-agreement.second-person': 'guard your own notes',
    });
    expect(() =>
      parsePhraseCardCorpus([{ ...source, secondPersonText: undefined }]),
    ).toThrow(/both personalSingularText and secondPersonText/iu);
  });

  test('builds a complete character and locale messages from one JSON source', () => {
    const source = {
      id: 'test-character',
      rosterOrder: 99,
      species: 'human',
      name: 'The Test Character',
      description: 'An original fictional authoring fixture.',
      assets: {
        portrait: {
          assetId: 'test-character-portrait',
          realLogo: false,
          copyrightedBroadcastGraphic: false,
        },
        token: {
          assetId: 'test-character-token',
          realLogo: false,
          copyrightedBroadcastGraphic: false,
        },
      },
      palette: {
        primary: '#112233',
        secondary: '#445566',
        accent: '#778899',
      },
      weaknessTags: ['paperwork', 'whimsy'],
      comebacks: {
        weak: 'Your footnote is showing.',
        medium: 'Your argument failed its own review.',
        strong: 'Your entire mandate is an invalid fixture.',
      },
      editorialReview: approvedReview(
        'Original fictional composite character fixture.',
      ),
      aiPersonality: { aggression: 0.5, denial: 0.5, risk: 0.5 },
      voiceProfile: { voiceHint: 'measured', rate: 1, pitch: 1 },
      animationSet: {
        idle: 'test-character-idle',
        speak: 'test-character-speak',
        react: 'test-character-react',
      },
      phrases: [
        {
          id: 'test-character-card',
          role: 'noun',
          text: 'a test character card',
          tags: ['paperwork'],
          scoreGroups: {
            substance: ['bureaucracy'],
            flavour: ['whimsy'],
          },
          rarity: 'common',
          editorialReview: approvedReview(
            'Original fictional authoring fixture.',
          ),
        },
      ],
    } as const;
    const parsed = parseCharacterCardFile(
      source,
      'characters/test-character-phrase-cards.json',
    );
    expect(parsed.character).toMatchObject({
      id: 'test-character',
      nameKey: 'character.test-character.name',
      characterPhraseIds: ['test-character-card'],
      comebackLinesByTier: {
        weak: ['comeback.test-character.weak'],
        medium: ['comeback.test-character.medium'],
        strong: ['comeback.test-character.strong'],
      },
    });
    const catalog = buildPhraseCardCatalog(
      [
        {
          id: 'common-test-card',
          role: 'noun',
          text: 'a common test card',
          tags: ['paperwork'],
          scoreGroups: {
            substance: ['bureaucracy'],
            flavour: ['whimsy'],
          },
          rarity: 'common',
          editorialReview: approvedReview(
            'Original fictional authoring fixture.',
          ),
        },
      ],
      { 'characters/test-character-phrase-cards.json': source },
    );
    expect(catalog.characters).toHaveLength(1);
    expect(catalog.englishMessages).toMatchObject({
      'character.test-character.name': 'The Test Character',
      'comeback.test-character.strong':
        'Your entire mandate is an invalid fixture.',
      'phrase.test-character-card': 'a test character card',
    });
    expect(() =>
      parseCharacterCardFile(source, 'characters/wrong-name.json'),
    ).toThrow(/must be named "test-character-phrase-cards\.json"/iu);
    expect(() =>
      parseCharacterCardFile({
        ...source,
        editorialReview: {
          ...source.editorialReview,
          safetyFlags: ['real-person-reference'],
        },
      }),
    ).toThrow(/real-person-reference/iu);
    const { editorialReview: _editorialReview, ...withoutReview } = source;
    expect(() => parseCharacterCardFile(withoutReview)).toThrow(
      /editorialReview/iu,
    );
    expect(() =>
      parsePhraseCardCorpus([
        {
          ...source.phrases[0],
          editorialReview: {
            ...source.phrases[0].editorialReview,
            originality: 'copied',
          },
        },
      ]),
    ).toThrow(/original content/iu);
  });

  test('keeps discovered character portraits in catalog parity', () => {
    expect(Object.keys(characterPortraitUrls).toSorted()).toEqual(
      phraseCardCatalog.characters.map((character) => character.id).toSorted(),
    );
  });

  test('discovers one default and one alternate skin for every character', () => {
    expect(Object.keys(characterSkins).toSorted()).toEqual(
      phraseCardCatalog.characters.map((character) => character.id).toSorted(),
    );
    for (const character of phraseCardCatalog.characters) {
      expect(characterSkins[character.id]?.map(({ id }) => id)).toEqual([
        'default',
        'alternate',
      ]);
      expect(characterPortraitUrls[character.id]).toBe(
        characterSkins[character.id]?.[0]?.portraitUrl,
      );
    }
  });

  test('accepts original sample content for three characters and two scenes', () => {
    const result = contentCatalogSchema.parse(sampleContent);

    expect(result.characters).toHaveLength(3);
    expect(
      result.characters.every((character) => character.species === 'human'),
    ).toBe(true);
    expect(result.scenes.map((scene) => scene.id)).toEqual([
      'transition-era-television-studio',
      'modern-debate-studio',
    ]);
    expect(new Set(result.phrases.map((phrase) => phrase.role))).toEqual(
      new Set([
        'noun',
        'verb',
        'predicate',
        'modifier',
        'conjunction',
        'ending',
        'continuation',
      ]),
    );
    expect(result.locales[0]?.title.fictionalCompositeSatireDisclaimer).toMatch(
      /fictional composites/iu,
    );
  });

  test('rejects an invalid identifier at its source', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.id = 'Paper Promise';
    expectFailure(catalog, 'phrases.0.id', /kebab-case/iu);
  });

  test('rejects every non-human character', () => {
    const catalog = cloneCatalog();
    (catalog.characters[0] as { species: string }).species = 'animal';
    expectFailure(
      catalog,
      'characters.0.species',
      /Every character must be human/iu,
    );
  });

  test('rejects duplicate identifiers', () => {
    const catalog = cloneCatalog();
    catalog.phrases[1]!.id = catalog.phrases[0]!.id;
    expectFailure(catalog, 'phrases.1', /unique identifier/iu);
  });

  test('rejects invalid number forms with a corrective message', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.numberForms!.pluralKey =
      catalog.phrases[0]!.numberForms!.singularKey;
    expectFailure(catalog, 'phrases.0.numberForms', /different locale key/iu);
  });

  test('rejects incomplete or invalid person agreement metadata', () => {
    const incompleteForms = cloneCatalog();
    const relation = incompleteForms.phrases.find(
      (phrase) => phrase.id === 'made-own-voters-change-the-channel',
    )!;
    relation.numberForms!.secondPersonKey = undefined;
    expectFailure(
      incompleteForms,
      'numberForms',
      /both personal-singular and second-person keys/iu,
    );

    const invalidSecondPerson = cloneCatalog();
    const you = invalidSecondPerson.phrases.find(
      (phrase) => phrase.id === 'you',
    )!;
    you.referentKind = 'nonpersonal';
    expectFailure(
      invalidSecondPerson,
      'referentKind',
      /second-person noun.*personal referent/iu,
    );
  });

  test('requires one exclusive comeback line for every character and tier', () => {
    const tooMany = cloneCatalog();
    tooMany.characters[0]!.comebackLinesByTier.weak = [
      'comeback.red-folded-chairman.weak',
      'comeback.red-folded-chairman.medium',
    ];
    expectFailure(
      tooMany,
      'characters.0.comebackLinesByTier.weak',
      /exactly one weak-tier comeback/iu,
    );

    const shared = cloneCatalog();
    shared.characters[1]!.comebackLinesByTier.weak = [
      'comeback.red-folded-chairman.weak',
    ];
    expectFailure(
      shared,
      'characters.1.comebackLinesByTier.weak.0',
      /exclusive character comeback key|already owned/iu,
    );
  });

  test('rejects grammar and scoring fields on the wrong phrase role', () => {
    const modifierFinisher = cloneCatalog();
    modifierFinisher.phrases.find(
      (phrase) => phrase.id === 'before-the-next-election',
    )!.finisherBonus = 2;
    expectFailure(modifierFinisher, 'finisherBonus', /Only an ending/iu);

    const modifierRelation = cloneCatalog();
    modifierRelation.phrases.find(
      (phrase) => phrase.id === 'before-the-next-election',
    )!.scorePreferences = {
      substance: [{ left: ['bureaucracy'] }],
      flavour: [],
    };
    expectFailure(
      modifierRelation,
      'scorePreferences',
      /Only a verb or predicate/iu,
    );

    const endingWithoutScore = cloneCatalog();
    endingWithoutScore.phrases.find(
      (phrase) => phrase.id === 'by-emergency-ordinance',
    )!.finisherBonus = undefined;
    expectFailure(endingWithoutScore, 'finisherBonus', /each ending/iu);

    const nounConnector = cloneCatalog();
    nounConnector.phrases[0]!.connectorKind = 'and';
    expectFailure(nounConnector, 'connectorKind', /Only a conjunction/iu);
  });

  test('rejects empty restrictions, empty custom scores, and duplicate custom relations', () => {
    const emptyRestriction = cloneCatalog();
    emptyRestriction.phrases[0]!.characterIds = [];
    expectFailure(
      emptyRestriction,
      'phrases.0.characterIds',
      /too small|at least 1/iu,
    );

    const emptyScores = cloneCatalog();
    const relation = emptyScores.phrases.find(
      (phrase) => phrase.id === 'belongs-in-a-party-museum',
    )!;
    relation.scorePreferences = undefined;
    relation.customScores = [];
    expectFailure(emptyScores, 'customScores', /too small|at least 1/iu);

    const duplicateScores = cloneCatalog();
    duplicateScores.phrases.find(
      (phrase) => phrase.id === 'belongs-in-a-party-museum',
    )!.customScores = [
      { leftNounId: 'national-consensus', score: 4 },
      { leftNounId: 'national-consensus', score: 9 },
    ];
    expectFailure(
      duplicateScores,
      'customScores.1',
      /custom score only once/iu,
    );
  });

  test.each(numericBoundaryCases)(
    '$name accepts both endpoints and rejects values immediately outside them',
    ({
      pathPart,
      minimum,
      maximum,
      immediatelyBelow,
      immediatelyAbove,
      setValue,
    }) => {
      for (const value of [minimum, maximum]) {
        const catalog = cloneCatalog();
        setValue(catalog, value);
        expect(contentCatalogSchema.safeParse(catalog).success).toBe(true);
      }

      for (const value of [immediatelyBelow, immediatelyAbove]) {
        const catalog = cloneCatalog();
        setValue(catalog, value);
        expectFailure(catalog, pathPart, /number|Invalid input/iu);
      }
    },
  );

  test('rejects duplicate tags at the phrase location', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.tags.push(catalog.phrases[0]!.tags[0]!);
    expectFailure(catalog, 'phrases.0.tags', /only once/iu);
  });

  test('rejects a missing cross-record reference', () => {
    const catalog = cloneCatalog();
    const missingIndex = catalog.characters[0]!.characterPhraseIds.length;
    catalog.characters[0]!.characterPhraseIds.push('missing-phrase');
    expectFailure(
      catalog,
      `characters.0.characterPhraseIds.${missingIndex}`,
      /existing phrase/iu,
    );
  });

  test('rejects missing character and scene restriction references', () => {
    const missingCharacter = cloneCatalog();
    missingCharacter.phrases[0]!.characterIds = ['missing-character'];
    expectFailure(
      missingCharacter,
      'phrases.0.characterIds.0',
      /existing character/iu,
    );

    const missingScene = cloneCatalog();
    missingScene.phrases[0]!.sceneIds = ['missing-scene'];
    expectFailure(missingScene, 'phrases.0.sceneIds.0', /existing scene/iu);
  });

  test('rejects a phrase outside its character or scene restriction', () => {
    const wrongCharacter = cloneCatalog();
    wrongCharacter.phrases.find(
      (phrase) => phrase.id === 'national-salvation-committee',
    )!.characterIds = ['red-folded-chairman'];
    const wrongCharacterIndex =
      wrongCharacter.characters[1]!.characterPhraseIds.length;
    wrongCharacter.characters[1]!.characterPhraseIds.push(
      'national-salvation-committee',
    );
    expectFailure(
      wrongCharacter,
      `characters.1.characterPhraseIds.${wrongCharacterIndex}`,
      /not available to character/iu,
    );

    const wrongScene = cloneCatalog();
    wrongScene.phrases[0]!.sceneIds = ['other-scene'];
    wrongScene.scenes.push({
      ...structuredClone(wrongScene.scenes[0]!),
      id: 'other-scene',
    });
    expectFailure(
      wrongScene,
      'scenes.0.phrasePool.0',
      /not available in scene/iu,
    );
  });

  test('requires character and scene restriction membership in both directions', () => {
    const unrestrictedCharacterPhrase = cloneCatalog();
    const unrestrictedIndex =
      unrestrictedCharacterPhrase.characters[0]!.characterPhraseIds.length;
    unrestrictedCharacterPhrase.characters[0]!.characterPhraseIds.push(
      'national-consensus',
    );
    expectFailure(
      unrestrictedCharacterPhrase,
      `characters.0.characterPhraseIds.${unrestrictedIndex}`,
      /not available to character/iu,
    );

    const missingCharacterMembership = cloneCatalog();
    missingCharacterMembership.characters[0]!.characterPhraseIds = [];
    const characterPhraseIndex = missingCharacterMembership.phrases.findIndex(
      (phrase) => phrase.id === 'national-salvation-committee',
    );
    expectFailure(
      missingCharacterMembership,
      `phrases.${characterPhraseIndex}.characterIds.0`,
      /Add phrase "national-salvation-committee" to character/iu,
    );

    const missingSceneMembership = cloneCatalog();
    const restrictedIndex = missingSceneMembership.phrases.findIndex(
      (phrase) => phrase.id === 'during-a-coalition-crisis',
    );
    missingSceneMembership.scenes[0]!.phrasePool =
      missingSceneMembership.scenes[0]!.phrasePool.filter(
        (phraseId) => phraseId !== 'during-a-coalition-crisis',
      );
    expectFailure(
      missingSceneMembership,
      `phrases.${restrictedIndex}.sceneIds.0`,
      /Add phrase "during-a-coalition-crisis" to scene/iu,
    );
  });

  test('rejects sample content that cannot reach a declared phrase role', () => {
    const catalog = cloneCatalog();
    for (const phrase of catalog.phrases) {
      if (phrase.role === 'continuation') {
        phrase.role = 'ending';
        phrase.finisherBonus = 1;
      }
    }
    expectFailure(catalog, 'phrases', /Missing: continuation/iu);
  });

  test('rejects more than one continuation', () => {
    const catalog = cloneCatalog();
    const continuation = structuredClone(
      catalog.phrases.find((phrase) => phrase.role === 'continuation')!,
    );
    continuation.id = 'misleading-continuation';
    continuation.textKey = 'phrase.misleading-continuation';
    catalog.phrases.push(continuation);
    catalog.scenes[0]!.phrasePool.push(continuation.id);
    catalog.locales[0]!.messages[continuation.textKey] = '[...]';

    expectFailure(catalog, 'phrases', /exactly one universal continuation/iu);
  });

  test('rejects a continuation that looks like an ordinary phrase', () => {
    const catalog = cloneCatalog();
    const continuation = catalog.phrases.find(
      (phrase) => phrase.role === 'continuation',
    )!;
    catalog.locales[0]!.messages[continuation.textKey] = 'continue later';

    expectFailure(
      catalog,
      `locales.0.messages.${continuation.textKey}`,
      /visible continuation cue/iu,
    );
  });

  test('rejects locale bundles without key parity', () => {
    const catalog = cloneCatalog();
    const secondLocale = structuredClone(catalog.locales[0]!);
    secondLocale.locale = 'en-GB';
    delete secondLocale.messages['phrase.condemns'];
    catalog.locales.push(secondLocale);
    expectFailure(catalog, 'locales.1.messages', /phrase\.condemns/iu);
  });

  test('rejects a non-canonical BCP 47 locale tag', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.locale = 'EN_us';
    expectFailure(catalog, 'locales.0.locale', /BCP 47/iu);
  });

  test('rejects missing locale keys for number forms', () => {
    const catalog = cloneCatalog();
    delete catalog.locales[0]!.messages['phrase.national-consensus.plural'];
    expectFailure(
      catalog,
      'locales.0.messages.phrase.national-consensus.plural',
      /required locale message/iu,
    );
  });

  test('rejects a missing locale key for person agreement', () => {
    const catalog = cloneCatalog();
    delete catalog.locales[0]!.messages[
      'phrase.made-own-voters-change-the-channel.second-person'
    ];
    expectFailure(
      catalog,
      'locales.0.messages.phrase.made-own-voters-change-the-channel.second-person',
      /required locale message/iu,
    );
  });

  test('rejects unsafe HTML in game-locale text', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.messages['phrase.denounced'] =
      '<img src=x onerror=alert(1)>denounced';
    expectFailure(
      catalog,
      'locales.0.messages.phrase.denounced',
      /Remove HTML/iu,
    );
  });

  test('rejects a missing fictional-composite satire disclaimer', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.title.fictionalCompositeSatireDisclaimer =
      'A general note about this title.';
    expectFailure(
      catalog,
      'locales.0.title.fictionalCompositeSatireDisclaimer',
      /fictional composites created for satire/iu,
    );
  });

  test.each<EditorialSafetyFlag>([
    'real-person-reference',
    'real-party-reference',
    'protected-trait-insult',
    'sexual-humiliation',
    'threat',
  ])('rejects editorial safety class %s', (safetyFlag) => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.editorialReview.safetyFlags = [safetyFlag];
    expectFailure(
      catalog,
      'phrases.0.editorialReview.safetyFlags',
      new RegExp(safetyFlag, 'iu'),
    );
  });

  test('rejects copied or unverified prose', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.editorialReview.originality = 'copied';
    expectFailure(
      catalog,
      'phrases.0.editorialReview.originality',
      /original line/iu,
    );
  });

  test('rejects content that has not completed editorial review', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.editorialReview.state = 'needs-review';
    expectFailure(
      catalog,
      'phrases.0.editorialReview.state',
      /Approve the editorial review/iu,
    );
  });

  test('rejects real logos in referenced media', () => {
    const catalog = cloneCatalog();
    catalog.characters[0]!.assets.portrait.realLogo = true;
    expectFailure(
      catalog,
      'characters.0.assets.portrait.realLogo',
      /original fictional media/iu,
    );
  });

  test('rejects copyrighted broadcast graphics in referenced media', () => {
    const catalog = cloneCatalog();
    catalog.scenes[0]!.backgroundLayers[0]!.media.copyrightedBroadcastGraphic = true;
    expectFailure(
      catalog,
      'scenes.0.backgroundLayers.0.media.copyrightedBroadcastGraphic',
      /original media/iu,
    );
  });

  test('rejects weak weakness-tag coverage', () => {
    const catalog = cloneCatalog();
    catalog.characters[0]!.weaknessTags[0] = 'uncovered-flaw';
    expectFailure(
      catalog,
      'characters.0.weaknessTags.0',
      /at least 2 matching phrases/iu,
    );
  });

  test('rejects a scene pool without nouns, verbs, and predicates', () => {
    const catalog = cloneCatalog();
    catalog.scenes[0]!.phrasePool = [
      'national-consensus',
      'televised-revolution',
      'national-salvation-committee',
    ];
    expectFailure(catalog, 'scenes.0.phrasePool', /Missing: verb, predicate/iu);
  });
});
