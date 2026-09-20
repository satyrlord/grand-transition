import { describe, expect, test } from 'vitest';
import { contentCatalogSchema } from '../../src/content/content-catalog';
import { finalContentVolumeIssues } from '../../tools/final-content-volumes';
import { createSampleContent } from '../../src/content/sample-content';
import { createEnglishGameLocale } from '../../src/localization/en-game-locale';
import {
  buildPhraseCardCatalog,
  combinePhraseCardCorpora,
  parseCharacterCardFile,
  parsePhraseCardCorpus,
} from '../../src/content/phrase-card-catalog';
import {
  characterPortraitUrls,
  characterSkins,
  phraseCardCatalog,
  sampleContent,
} from '../../src/game-content';

type MutableCatalog = ReturnType<typeof cloneCatalog>;

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
        { leftNounId: 'common-noun-001', score: value },
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
        (phrase) => phrase.id === 'common-ending-001',
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

  test('empty phrase tags are valid for every role while the field remains required', () => {
    const catalog = cloneCatalog();
    const tagged = new Set<string>();
    for (const phrase of catalog.phrases) {
      if (!tagged.has(phrase.role)) {
        phrase.tags = [];
        tagged.add(phrase.role);
      }
    }
    expect(contentCatalogSchema.safeParse(catalog).success).toBe(true);
    const missingTags = cloneCatalog();
    Reflect.deleteProperty(missingTags.phrases[0]!, 'tags');
    expectFailure(missingTags, 'phrases.0.tags', /array/iu);
  });

  test('limits every player-visible phrase form to its role ceiling', () => {
    const ceilings = new Map([
      ['conjunction', 6],
      ['continuation', 1],
      ['verb', 10],
      ['modifier', 9],
      ['noun', 10],
      ['predicate', 10],
      ['ending', 11],
    ]);
    for (const phrase of phraseCardCatalog.phrases) {
      const ceiling = ceilings.get(phrase.role)!;
      for (const key of [
        phrase.textKey,
        phrase.numberForms?.singularKey,
        phrase.numberForms?.pluralKey,
        phrase.numberForms?.personalSingularKey,
        phrase.numberForms?.secondPersonKey,
      ]) {
        const text = key ? phraseCardCatalog.englishMessages[key] : undefined;
        if (!text) continue;
        expect(text.trim().split(/\s+/u).length, `${phrase.id} ${phrase.role}`)
          .toBeLessThanOrEqual(ceiling);
      }
    }

    const overlongModifier = [{
      id: 'overlong-modifier-fixture',
      role: 'modifier',
      text: 'one two three four five six seven eight nine ten',
      tags: [],
      rarity: 'common',
    }];
    expect(() => parsePhraseCardCorpus(overlongModifier)).toThrow(
      /modifier text to 9 words or fewer/iu,
    );
  });

  test('keeps final comeback text within the 11-word guardrail', () => {
    const source = {
      id: 'test-character',
      rosterOrder: 99,
      species: 'human',
      name: 'The Test Character',
      description: 'An original fictional authoring fixture.',
      assets: {
        portrait: { assetId: 'test-portrait', realLogo: false, copyrightedBroadcastGraphic: false },
        token: { assetId: 'test-token', realLogo: false, copyrightedBroadcastGraphic: false },
      },
      palette: { primary: '#112233', secondary: '#445566', accent: '#778899' },
      weaknessTags: ['paperwork', 'whimsy'],
      comebacks: {
        weak: 'one two three four five six seven eight nine ten eleven',
        medium: 'one two three four five six seven eight nine ten eleven',
        strong: 'one two three four five six seven eight nine ten eleven',
      },
      aiPersonality: { aggression: 0.5, denial: 0.5, risk: 0.5 },
      voiceProfile: { voiceHint: 'measured', rate: 1, pitch: 1 },
      animationSet: { idle: 'test-idle', speak: 'test-speak', react: 'test-react' },
      phrases: [{
        id: 'test-noun', role: 'noun', text: 'a test noun', tags: ['paperwork'],
        scoreGroups: { substance: ['personal'], flavour: ['politics'] },
        rarity: 'common',
      }],
    } as const;

    expect(() => parseCharacterCardFile(
      source,
      'characters/test-character-phrase-cards.json',
    ))
      .not.toThrow();
    expect(() => parseCharacterCardFile({
      ...source,
      comebacks: {
        ...source.comebacks,
        medium: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen',
      },
    }, 'characters/test-character-phrase-cards.json'))
      .toThrow(/comeback text to 16 words or fewer/iu);
  });

  test('limits every player-visible phrase form to 11 words', () => {
    const visibleForms = Object.entries(phraseCardCatalog.englishMessages)
      .filter(([key]) => key.startsWith('phrase.'));
    for (const [key, value] of visibleForms) {
      expect(value.trim().split(/\s+/u).length, key).toBeLessThanOrEqual(11);
    }

    const source = [{
      id: 'overlong-fixture',
      role: 'noun',
      text: 'one two three four five six seven eight nine ten eleven twelve',
      tags: [],
      grammaticalNumber: 'singular',
      scoreGroups: { substance: ['personal'], flavour: ['politics'] },
      rarity: 'common',
    }];
    expect(() => parsePhraseCardCorpus(source)).toThrow(
      /11 words or fewer/iu,
    );
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
      const expectedTenses = ['future', 'past', 'present'];
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
        'common-modifier-019',
        'common-modifier-007',
        'common-modifier-004',
        'common-modifier-016',
        'common-modifier-001',
        'common-modifier-008',
        'common-modifier-020',
        'common-modifier-006',
        'common-modifier-003',
        'common-modifier-017',
        'common-modifier-009',
        'common-modifier-010',
        'common-modifier-011',
        'common-modifier-002',
        'common-modifier-012',
        'common-modifier-018',
        'common-modifier-021',
        'common-modifier-005',
        'common-modifier-013',
        'common-modifier-014',
        'common-modifier-015',
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
        'red-folded-chairman-modifier-002',
        'red-folded-chairman-modifier-001',
        'black-sea-captain-modifier-001',
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
        'red-folded-chairman-predicate-001',
        'red-folded-chairman-predicate-002',
        'black-sea-captain-predicate-002',
        'thunder-tribune-predicate-001',
        'thunder-tribune-predicate-003',
        'thunder-tribune-predicate-002',
        'black-sea-captain-predicate-001',
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

  test('keeps the Tribune Romanianism generic and name-free', () => {
    const phrase = phraseCardCatalog.phrases.find(
      (candidate) => candidate.id === 'thunder-tribune-noun-006',
    );
    expect(phrase).toBeDefined();
    if (!phrase) return;

    expect(phraseCardCatalog.englishMessages[phrase.textKey]).toBe(
      'a nosy do-gooder',
    );
    const related = phraseCardCatalog.phrases.filter((candidate) =>
      candidate.id.includes('somaldoaca'),
    );
    expect(
      related.every(
        (candidate) =>
          !phraseCardCatalog.englishMessages[candidate.textKey]?.includes(
            'Karen',
          ),
      ),
    ).toBe(true);
  });

  test('ships one universal continuation with the canonical visible cue', () => {
    const continuations = phraseCardCatalog.phrases.filter(
      (phrase) => phrase.role === 'continuation',
    );

    expect(continuations).toHaveLength(1);
    const continuation = continuations[0]!;
    expect(continuation.characterIds).toBeUndefined();
    expect(phraseCardCatalog.englishMessages[continuation.textKey]).toBe(
      '[...]',
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
        },
      ]),
    ).toThrow(/full stop/iu);
  });

  test('ships each game-appropriate conjunction selected for the corpus', () => {
    const commonConjunctions = phraseCardCatalog.phrases.filter(
      (phrase) =>
        phrase.role === 'conjunction' &&
        phrase.sceneIds === undefined &&
        phraseCardCatalog.commonPhraseIds.includes(phrase.id),
    );
    expect(new Set(commonConjunctions.map((phrase) => phrase.connectorKind))).toEqual(
      new Set(['and', 'but', 'because', 'so', 'with']),
    );
  });

  test('validates a manually authored JSON phrase before catalog loading', () => {
    const source = {
      id: 'manual-card',
      role: 'noun',
      text: 'a manual card',
      tags: ['paperwork'],
      scoreGroups: { substance: ['bureaucracy'], flavour: ['whimsy'] },
      rarity: 'uncommon',
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
      aiPersonality: { aggression: 0.5, denial: 0.5, risk: 0.5 },
      voiceProfile: { voiceHint: 'measured', rate: 1, pitch: 1 },
      animationSet: {
        idle: 'test-character-idle',
        speak: 'test-character-speak',
        react: 'test-character-react',
      },
      phrases: [
        {
          id: 'test-character-noun-001',
          role: 'noun',
          text: 'a test character card',
          tags: ['paperwork'],
          scoreGroups: {
            substance: ['bureaucracy'],
            flavour: ['whimsy'],
          },
          rarity: 'common',
        },
        {
          id: 'test-character-modifier-001',
          role: 'modifier',
          text: 'under a review-shaped umbrella',
          tags: ['whimsy'],
          rarity: 'common',
        },
        {
          id: 'test-character-ending-001',
          role: 'ending',
          text: 'and the footnote demanded its own umbrella.',
          tags: ['paperwork', 'whimsy'],
          finisherBonus: 1,
          rarity: 'common',
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
      characterPhraseIds: [
        'test-character-noun-001',
        'test-character-modifier-001',
        'test-character-ending-001',
      ],
      comebackLinesByTier: {
        weak: ['comeback.test-character.weak'],
        medium: ['comeback.test-character.medium'],
        strong: ['comeback.test-character.strong'],
      },
    });
    const catalog = buildPhraseCardCatalog(
      [
        {
          id: 'common-noun-999',
          role: 'noun',
          text: 'a common test card',
          tags: ['paperwork'],
          scoreGroups: {
            substance: ['bureaucracy'],
            flavour: ['whimsy'],
          },
          rarity: 'common',
        },
      ],
      { 'characters/test-character-phrase-cards.json': source },
    );
    expect(catalog.characters).toHaveLength(1);
    expect(catalog.englishMessages).toMatchObject({
      'character.test-character.name': 'The Test Character',
      'comeback.test-character.strong':
        'Your entire mandate is an invalid fixture.',
      'phrase.test-character-noun-001': 'a test character card',
    });
    const expandedCatalog = {
      ...phraseCardCatalog,
      characters: [...phraseCardCatalog.characters, parsed.character],
      phrases: [...phraseCardCatalog.phrases, ...parsed.corpus.phrases],
      characterPhraseIds: {
        ...phraseCardCatalog.characterPhraseIds,
        [parsed.character.id]: parsed.character.characterPhraseIds,
      },
      englishMessages: {
        ...phraseCardCatalog.englishMessages,
        ...parsed.englishMessages,
      },
    };
    const completeCatalog = createSampleContent(expandedCatalog, [
      createEnglishGameLocale(expandedCatalog.englishMessages),
    ]);
    expect(completeCatalog.characters).toHaveLength(
      sampleContent.characters.length + 1,
    );
    expect(completeCatalog.characters.at(-1)?.characterPhraseIds).toEqual([
      'test-character-noun-001',
      'test-character-modifier-001',
      'test-character-ending-001',
    ]);
    expect(() =>
      parseCharacterCardFile(source, 'characters/wrong-name.json'),
    ).toThrow(/must be named "test-character-phrase-cards\.json"/iu);
  });

  test('rejects text-derived phrase and tense-family identifiers', () => {
    const noun = {
      id: 'describes-the-visible-text',
      role: 'noun',
      text: 'a neutral identifier fixture',
      tags: [],
      scoreGroups: { substance: ['fixture'], flavour: ['fixture'] },
      rarity: 'common',
    } as const;
    expect(() => buildPhraseCardCatalog([noun], {})).toThrow(
      /content-neutral identifier/iu,
    );

    const verb = {
      id: 'common-verb-999-past',
      role: 'verb',
      text: 'tested',
      tense: 'past',
      tenseFamily: 'describes-the-visible-text',
      tags: [],
      scorePreferences: {
        substance: [{ left: ['fixture'] }],
        flavour: [],
      },
      rarity: 'common',
    } as const;
    expect(() => buildPhraseCardCatalog([verb], {})).toThrow(
      /content-neutral tense family/iu,
    );
  });

  test('keeps discovered character portraits in catalog parity', () => {
    expect(Object.keys(characterPortraitUrls).toSorted()).toEqual(
      phraseCardCatalog.characters.map((character) => character.id).toSorted(),
    );
  });

  test('discovers every default portrait and approved alternate skin', () => {
    expect(Object.keys(characterSkins).toSorted()).toEqual(
      phraseCardCatalog.characters.map((character) => character.id).toSorted(),
    );
    const alternateSkinIds = new Set([
      'red-folded-chairman',
      'thunder-tribune',
      'midnight-sensationalist',
      'government-ai',
      'retiring-cassandra',
      'oat-milk-reformist',
    ]);
    for (const character of phraseCardCatalog.characters) {
      expect(characterSkins[character.id]?.map(({ id }) => id)).toEqual(
        character.id === 'government-ai'
          ? ['default', 'alternate', 'schoolteacher']
          : character.id === 'velvet-mogul'
          ? [
              'default',
              'boardroom-patriarch',
              'silk-diplomat',
              'velvet-statesman',
            ]
          : character.id === 'retiring-cassandra'
            ? ['default', 'statesman']
            : character.id === 'county-baron'
              ? ['default', 'municipal-patron']
            : alternateSkinIds.has(character.id)
              ? ['default', 'alternate']
              : ['default'],
      );
      expect(characterPortraitUrls[character.id]).toBe(
        characterSkins[character.id]?.[0]?.portraitUrl,
      );
      const skinIds = new Set(
        characterSkins[character.id]?.map(({ id }) => id),
      );
      for (const voiceSkinId of Object.keys(
        character.voiceProfile.skinVoices ?? {},
      )) {
        expect(skinIds.has(voiceSkinId), `${character.id}:${voiceSkinId}`).toBe(
          true,
        );
      }
    }
  });

  test.each([
    ['human', 0, 'david', /George or Emma/u],
    ['robot', 17, 'george', /David, Mark, or Zira/u],
  ] as const)('rejects a %s skin voice from the wrong provider family', (
    _species,
    characterIndex,
    voice,
    message,
  ) => {
    const catalog = cloneCatalog();
    catalog.characters[characterIndex]!.voiceProfile.skinVoices = {
      default: voice,
    };
    expectFailure(
      catalog,
      `characters.${characterIndex}.voiceProfile.skinVoices.default`,
      message,
    );
  });

  test('accepts the ordered 19-character and seven-scene catalog', () => {
    const result = contentCatalogSchema.parse(sampleContent);

    expect(result.characters.map(({ id }) => id)).toEqual([
      'red-folded-chairman',
      'thunder-tribune',
      'midnight-sensationalist',
      'velvet-mogul',
      'black-sea-captain',
      'retiring-cassandra',
      'oat-milk-reformist',
      'marble-diplomat',
      'county-baron',
      'coalition-acrobat',
      'algorithmic-prophet',
      'spreadsheet-technocrat',
      'football-tycoon',
      'luxury-minister',
      'diaspora-oracle',
      'apartment-block-geopolitician',
      'eu-funds-alchemist',
      'government-ai',
      'reluctant-theorem',
    ]);
    const localBaron = result.characters.find(({ id }) => id === 'county-baron')!;
    expect(localBaron.nameKey).toBe('character.county-baron.name');
    expect(result.locales[0]!.messages[localBaron.nameKey]).toBe('Local Baron');
    expect(
      new Set(result.characters.map((character) => character.species)),
    ).toEqual(new Set(['human', 'robot']));
    expect(result.scenes.every((scene) => !('ambience' in scene))).toBe(true);
    expect(result.scenes.map((scene) => scene.id)).toEqual([
      'transition-era-television-studio',
      'modern-debate-studio',
      'county-council-ballroom',
      'midnight-call-in-studio',
      'palace-press-hall',
      'influencer-campaign-livestream',
      'civic-cypher-boxing-ring',
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

  test('rejects an unsupported character species', () => {
    const catalog = cloneCatalog();
    (catalog.characters[0] as { species: string }).species = 'animal';
    expectFailure(
      catalog,
      'characters.0.species',
      /supported character species/iu,
    );
  });

  test('rejects duplicate identifiers', () => {
    const catalog = cloneCatalog();
    catalog.phrases[1]!.id = catalog.phrases[0]!.id;
    expectFailure(catalog, 'phrases.1', /unique identifier/iu);
  });

  test('rejects invalid number forms with a corrective message', () => {
    const catalog = cloneCatalog();
    const phraseIndex = catalog.phrases.findIndex(
      (phrase) => phrase.id === 'common-verb-001-past',
    );
    const forms = catalog.phrases[phraseIndex]!.numberForms!;
    forms.pluralKey = forms.singularKey;
    expectFailure(catalog, 'phrases.' + phraseIndex + '.numberForms', /different locale key/iu);
  });

  test('rejects incomplete or invalid person agreement metadata', () => {
    const incompleteForms = cloneCatalog();
    const relation = incompleteForms.phrases.find(
      (phrase) => phrase.id === 'common-predicate-011-past',
    )!;
    relation.numberForms!.secondPersonKey = undefined;
    expectFailure(
      incompleteForms,
      'numberForms',
      /both personal-singular and second-person keys/iu,
    );

    const invalidSecondPerson = cloneCatalog();
    const you = invalidSecondPerson.phrases.find(
      (phrase) => phrase.id === 'common-noun-028',
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

  test.each(['characters', 'scenes'] as const)(
    'rejects duplicate normalized English %s names at the second locale key', (collection) => {
      const catalog = cloneCatalog();
      const first = catalog[collection][0]!;
      const duplicate = catalog[collection][1]!;
      catalog.locales[0]!.messages[duplicate.nameKey] = `  ${catalog.locales[0]!
        .messages[first.nameKey]!
        .toLocaleUpperCase('en-US')
        .replaceAll(' ', '   ')}  `;

      expectFailure(
        catalog,
        `locales.0.messages.${duplicate.nameKey}`,
        new RegExp(`${duplicate.nameKey}.*duplicates.*${first.nameKey}`, 'iu'),
      );
    },
  );

  test('rejects duplicate normalized comeback text at the second locale key', () => {
    const catalog = cloneCatalog();
    const firstKey = catalog.characters[0]!.comebackLinesByTier.weak[0]!;
    const duplicateKey = catalog.characters[1]!.comebackLinesByTier.strong[0]!;
    catalog.locales[0]!.messages[duplicateKey] = `  ${catalog.locales[0]!
      .messages[firstKey]!
      .toLocaleUpperCase('en-US')
      .replaceAll(' ', '   ')}  `;

    expectFailure(
      catalog,
      `locales.0.messages.${duplicateKey}`,
      new RegExp(`${duplicateKey}.*duplicates.*${firstKey}`, 'iu'),
    );
  });

  test('rejects grammar and scoring fields on the wrong phrase role', () => {
    const modifierFinisher = cloneCatalog();
    modifierFinisher.phrases.find(
      (phrase) => phrase.id === 'common-modifier-001',
    )!.finisherBonus = 2;
    expectFailure(modifierFinisher, 'finisherBonus', /Only an ending/iu);

    const modifierRelation = cloneCatalog();
    modifierRelation.phrases.find(
      (phrase) => phrase.id === 'common-modifier-001',
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
      (phrase) => phrase.id === 'common-ending-001',
    )!.finisherBonus = undefined;
    expectFailure(endingWithoutScore, 'finisherBonus', /each ending/iu);

    const nounConnector = cloneCatalog();
    nounConnector.phrases[0]!.connectorKind = 'and';
    expectFailure(nounConnector, 'connectorKind', /Only a conjunction/iu);

    const nounCopularComplement = cloneCatalog();
    nounCopularComplement.phrases[0]!.allowsCoordinatedNounComplement = true;
    expectFailure(
      nounCopularComplement,
      'allowsCoordinatedNounComplement',
      /Only a predicate/iu,
    );
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
      (phrase) => phrase.id === 'common-predicate-010-present',
    )!;
    relation.scorePreferences = undefined;
    relation.customScores = [];
    expectFailure(emptyScores, 'customScores', /too small|at least 1/iu);

    const duplicateScores = cloneCatalog();
    duplicateScores.phrases.find(
      (phrase) => phrase.id === 'common-predicate-010-present',
    )!.customScores = [
      { leftNounId: 'common-noun-001', score: 4 },
      { leftNounId: 'common-noun-001', score: 9 },
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
      (phrase) => phrase.id === 'red-folded-chairman-noun-001',
    )!.characterIds = ['red-folded-chairman'];
    const wrongCharacterIndex =
      wrongCharacter.characters[1]!.characterPhraseIds.length;
    wrongCharacter.characters[1]!.characterPhraseIds.push(
      'red-folded-chairman-noun-001',
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
      'common-noun-001',
    );
    expectFailure(
      unrestrictedCharacterPhrase,
      `characters.0.characterPhraseIds.${unrestrictedIndex}`,
      /not available to character/iu,
    );

    const missingCharacterMembership = cloneCatalog();
    missingCharacterMembership.characters[0]!.characterPhraseIds = [];
    const characterPhraseIndex = missingCharacterMembership.phrases.findIndex(
      (phrase) => phrase.id === 'red-folded-chairman-noun-001',
    );
    expectFailure(
      missingCharacterMembership,
      `phrases.${characterPhraseIndex}.characterIds.0`,
      /Add phrase "red-folded-chairman-noun-001" to character/iu,
    );

    const missingSceneMembership = cloneCatalog();
    const restrictedIndex = missingSceneMembership.phrases.findIndex(
      (phrase) => phrase.id === 'common-modifier-003',
    );
    missingSceneMembership.scenes[0]!.phrasePool =
      missingSceneMembership.scenes[0]!.phrasePool.filter(
        (phraseId) => phraseId !== 'common-modifier-003',
      );
    expectFailure(
      missingSceneMembership,
      `phrases.${restrictedIndex}.sceneIds.0`,
      /Add phrase "common-modifier-003" to scene/iu,
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
    // Derive both the key and the appended index from the catalog so this
    // fixture cannot go stale when the corpus or the shipped locale list is
    // revised.
    const requiredKey = catalog.phrases.find(
      (phrase) => phrase.numberForms,
    )!.numberForms!.singularKey;
    const appendedIndex = catalog.locales.length;
    delete secondLocale.messages[requiredKey];
    catalog.locales.push(secondLocale);
    expectFailure(
      catalog,
      `locales.${appendedIndex}.messages`,
      new RegExp(requiredKey.replaceAll('.', '\\.'), 'u'),
    );
  });

  test('rejects a non-canonical BCP 47 locale tag', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.locale = 'EN_us';
    expectFailure(catalog, 'locales.0.locale', /BCP 47/iu);
  });

  test('rejects missing locale keys for number forms', () => {
    const catalog = cloneCatalog();
    const pluralKey = catalog.phrases.find(
      (phrase) => phrase.id === 'common-verb-001-past',
    )!.numberForms!.pluralKey;
    delete catalog.locales[0]!.messages[pluralKey];
    expectFailure(
      catalog,
      'locales.0.messages.' + pluralKey,
      /required locale message/iu,
    );
  });

  test('rejects a missing locale key for person agreement', () => {
    const catalog = cloneCatalog();
    delete catalog.locales[0]!.messages[
      'phrase.common-predicate-011-past.second-person'
    ];
    expectFailure(
      catalog,
      'locales.0.messages.phrase.common-predicate-011-past.second-person',
      /required locale message/iu,
    );
  });

  test('requires Romanian-only polite and plural forms for relations without shared metadata', () => {
    for (const [id, suffix] of [
      ['common-verb-001-past', 'second-person'],
      ['common-verb-053-past', 'plural'],
    ] as const) {
      const catalog = cloneCatalog();
      const key = `phrase.${id}.${suffix}`;
      delete catalog.locales.find((locale) => locale.locale === 'ro-RO')!.messages[key];
      expectFailure(
        catalog,
        `locales.1.messages.${key}`,
        /required Romanian relation form/iu,
      );
    }
  });

  test('complete-action verb families leave a governed noun slot in both languages', () => {
    const families = [
      'common-verb-061',
      'common-verb-062',
      'common-verb-063',
      'common-verb-064',
      'common-verb-065',
      'common-verb-066',
      'common-verb-067',
      'common-verb-068',
    ];
    const english = sampleContent.locales.find((locale) => locale.locale === 'en')!;
    const romanian = sampleContent.locales.find((locale) => locale.locale === 'ro-RO')!;
    for (const family of families) {
      for (const tense of ['past', 'present', 'future']) {
        const phrase = phraseCardCatalog.phrases.find(
          (candidate) => candidate.id === `${family}-${tense}`,
        )!;
        expect(phrase.role).toBe('verb');
        expect(english.messages[phrase.textKey]).toMatch(/ for$/u);
        expect(romanian.messages[phrase.textKey]).toMatch(/ pentru$/u);
        for (const nounText of ['dumneavoastră', 'dezacordul vostru unanim']) {
          expect(`${romanian.messages[phrase.textKey]} ${nounText}`)
            .toMatch(/ pentru (?:dumneavoastră|dezacordul vostru unanim)$/u);
        }
      }
    }
  });

  test('rejects unsafe HTML in game-locale text', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.messages['phrase.common-verb-001-past'] =
      '<img src=x onerror=alert(1)>denounced';
    expectFailure(
      catalog,
      'locales.0.messages.phrase.common-verb-001-past',
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
      'common-noun-001',
      'common-noun-002',
      'red-folded-chairman-noun-001',
    ];
    expectFailure(catalog, 'scenes.0.phrasePool', /Missing: verb, predicate/iu);
  });
});


test.each(['modifier', 'ending', 'noun'] as const)('rejects a character missing its foundation %s', (role) => {
  const catalog = cloneCatalog();
  const characterIndex = catalog.characters.findIndex(({ id }) => id === 'algorithmic-prophet');
  const character = catalog.characters[characterIndex]!;
  const owned = catalog.phrases.filter((phrase) => character.characterPhraseIds.includes(phrase.id));
  const replacement = owned.find((phrase) => phrase.role !== role)!;
  catalog.phrases = catalog.phrases.map((phrase) => owned.includes(phrase) && phrase.role === role
    ? { ...replacement, id: phrase.id } : phrase);
  const result = contentCatalogSchema.safeParse(catalog);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({
    path: ['characters', characterIndex, 'characterPhraseIds'],
    message: expect.stringContaining(`Missing: ${role}`),
  }));
});

test('rejects a two-noun character pool at the owning character path', () => {
  const catalog = cloneCatalog();
  const characterIndex = catalog.characters.findIndex(({ id }) => id === 'algorithmic-prophet');
  const character = catalog.characters[characterIndex]!;
  const retained = new Set(catalog.phrases
    .filter((phrase) => character.characterPhraseIds.includes(phrase.id) && phrase.role === 'noun')
    .slice(0, 2)
    .map(({ id }) => id));
  expect(retained.size).toBe(2);
  const removed = new Set(character.characterPhraseIds.filter((id) => !retained.has(id)));
  character.characterPhraseIds = [...retained];
  catalog.phrases = catalog.phrases.filter(({ id }) => !removed.has(id));
  for (const scene of catalog.scenes) {
    scene.phrasePool = scene.phrasePool.filter((id) => !removed.has(id));
  }
  const result = contentCatalogSchema.safeParse(catalog);
  expect(result.success).toBe(false);
  if (!result.success) {
    for (const message of [
      'Supply 3 through 40 owned character phrases.',
      'Supply a foundation noun, modifier, and ending for each character. Missing: modifier, ending.',
    ]) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ['characters', characterIndex, 'characterPhraseIds'],
        message,
      }));
    }
  }
});

test('rejects more than 40 character phrases at the character path', () => {
  const catalog = cloneCatalog();
  const character = catalog.characters[0]!;
  const source = catalog.phrases.find((phrase) => phrase.id === character.characterPhraseIds[0])!;
  while (character.characterPhraseIds.length < 41) {
    const id = `overflow-phrase-${character.characterPhraseIds.length}`;
    catalog.phrases.push({ ...source, id });
    character.characterPhraseIds.push(id);
  }
  const result = contentCatalogSchema.safeParse(catalog);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ['characters', 0, 'characterPhraseIds'], message: 'Supply 3 through 40 owned character phrases.' }));
});

const finalRoles = [
  ['noun', 300],
  ['verb', 150],
  ['predicate', 99],
  ['modifier', 50],
  ['conjunction', 5],
  ['ending', 50],
  ['continuation', 1],
] as const;

test('the production catalog meets every Milestone 028 final volume', () => {
  expect(finalContentVolumeIssues(sampleContent)).toEqual([]);
});

test.each(finalRoles)('rejects general %s one below and above its final total', (role, required) => {
  for (const target of [required - 1, required + 1]) {
    const catalog = cloneCatalog();
    const general = catalog.phrases.filter((phrase) =>
      !phrase.characterIds && !phrase.sceneIds && phrase.role === role);
    const template = general[0]!;
    catalog.phrases = catalog.phrases.filter((phrase) => !general.includes(phrase));
    catalog.phrases.push(...Array.from({ length: target }, (_, index) => ({
      ...template,
      id: `final-volume-${role}-${index}`,
    })));
    expect(finalContentVolumeIssues(catalog)).toContainEqual(
      expect.stringMatching(new RegExp(`^General ${role}: found ${target};`)),
    );
  }
});

test.each([
  ['character', 'apartment-block-geopolitician', 40],
  ['scene', 'transition-era-television-studio', 34],
] as const)('rejects %s phrase totals one below and above the final total', (kind, owner, required) => {
  for (const target of [required - 1, required + 1]) {
    const catalog = cloneCatalog();
    const owned = catalog.phrases.filter((phrase) => kind === 'character'
      ? phrase.characterIds?.includes(owner)
      : phrase.sceneIds?.includes(owner));
    const template = owned.find((phrase) => phrase.role === 'noun')!;
    catalog.phrases = catalog.phrases.filter((phrase) => !owned.includes(phrase));
    catalog.phrases.push(...Array.from({ length: target }, (_, index) => ({
      ...template,
      id: `final-volume-${kind}-${index}`,
    })));
    expect(finalContentVolumeIssues(catalog)).toContainEqual(
      expect.stringMatching(new RegExp(`^${owner} ${kind === 'scene' ? 'scene-owned ' : ''}phrases: found ${target};`)),
    );
  }
});

test.each([
  ['character', 'apartment-block-geopolitician', 'noun', 10],
  ['character', 'apartment-block-geopolitician', 'verb', 9],
  ['character', 'apartment-block-geopolitician', 'predicate', 12],
  ['character', 'apartment-block-geopolitician', 'modifier', 3],
  ['character', 'apartment-block-geopolitician', 'conjunction', 1],
  ['character', 'apartment-block-geopolitician', 'ending', 5],
  ['scene', 'transition-era-television-studio', 'noun', 10],
  ['scene', 'transition-era-television-studio', 'verb', 9],
  ['scene', 'transition-era-television-studio', 'predicate', 6],
  ['scene', 'transition-era-television-studio', 'modifier', 3],
  ['scene', 'transition-era-television-studio', 'conjunction', 3],
  ['scene', 'transition-era-television-studio', 'ending', 3],
] as const)('rejects %s %s below its %s role total', (kind, owner, role, required) => {
  const catalog = cloneCatalog();
  const owned = catalog.phrases.filter((phrase) => kind === 'character'
    ? phrase.characterIds?.includes(owner)
    : phrase.sceneIds?.includes(owner));
  const selected = owned.filter((phrase) => phrase.role === role);
  const remove = selected.slice(0, selected.length - (required - 1));
  catalog.phrases = catalog.phrases.filter((phrase) => !remove.includes(phrase));
  expect(finalContentVolumeIssues(catalog)).toContainEqual(
    expect.stringMatching(new RegExp(`^${owner} ${role}: found ${required - 1};`)),
  );
});
