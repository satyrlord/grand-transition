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
    pathPart: 'phrases.12.finisherBonus',
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
  test('loads 162 unique cards from the common and character JSON corpora', () => {
    expect(phraseCardCatalog.phrases).toHaveLength(162);
    expect(phraseCardCatalog.commonPhraseIds).toHaveLength(126);
    expect(
      Object.fromEntries(
        Object.entries(phraseCardCatalog.characterPhraseIds).map(
          ([characterId, phraseIds]) => [characterId, phraseIds.length],
        ),
      ),
    ).toEqual({
      'red-folded-chairman': 12,
      'thunder-tribune': 12,
      'black-sea-captain': 12,
    });
    expect(phraseCardCatalog.characterPhraseIds['red-folded-chairman']).toEqual(
      expect.arrayContaining([
        'national-salvation-committee',
        'your-red-stamped-family-album',
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
        'sided-with-the-terrorists-in-1989',
        'transports-voters-with-busses',
        'your-brother',
        'your-father',
        'your-cousin',
        'your-son-in-law',
        'your-mistress',
      ]),
    );
    expect(phraseCardCatalog.commonPhraseIds).not.toContain(
      'your-family-album',
    );
    expect(phraseCardCatalog.englishMessages).toMatchObject({
      'phrase.brought-the-miners-to-bucharest':
        'brought the miners to Bucharest',
      'phrase.sided-with-the-terrorists-in-1989':
        'sided with the terrorists in 1989',
      'phrase.transports-voters-with-busses': 'transports voters with busses',
      'phrase.your-brother': 'your brother',
      'phrase.your-father': 'your father',
      'phrase.your-cousin': 'your cousin',
      'phrase.your-son-in-law': 'your son-in-law',
      'phrase.your-mistress': 'your mistress',
    });
    expect(phraseCardCatalog.characterPhraseIds['black-sea-captain']).toEqual(
      expect.arrayContaining(['hands-on-presidency', 'your-leaking-flagship']),
    );
    expect(
      new Set(phraseCardCatalog.phrases.map((phrase) => phrase.id)),
    ).toHaveLength(162);
    expect(
      phraseCardCatalog.phrases.find(
        (phrase) => phrase.id === 'national-salvation-committee',
      )?.characterIds,
    ).toEqual(['red-folded-chairman']);
  });

  test('keeps the 126-card common corpus at its approved role totals', () => {
    const commonPhrases = phraseCardCatalog.phrases.filter((phrase) =>
      phraseCardCatalog.commonPhraseIds.includes(phrase.id),
    );
    const roleCounts = Object.fromEntries(
      [
        'noun',
        'verb',
        'predicate',
        'conjunction',
        'ending',
        'continuation',
      ].map((role) => [
        role,
        commonPhrases.filter((phrase) => phrase.role === role).length,
      ]),
    );

    expect(roleCounts).toEqual({
      noun: 46,
      verb: 28,
      predicate: 30,
      conjunction: 10,
      ending: 11,
      continuation: 1,
    });
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
    expect(somaldoacaIds).toEqual([
      'a-somaldoaca',
      'looks-like-a-somaldoaca-on-television',
    ]);
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
    expect(securitatePhrases).toHaveLength(2);
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
    const continuations = phraseCardCatalog.phrases.filter(
      (phrase) => phrase.role === 'continuation',
    );

    expect(continuations).toHaveLength(1);
    expect(continuations[0]).toMatchObject({
      id: 'ellipsis',
      characterIds: undefined,
    });
    expect(phraseCardCatalog.englishMessages[continuations[0]!.textKey]).toBe(
      '[...]',
    );
  });

  test('includes the sourced during-the-night ending without changing the corpus total', () => {
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
    expect(endings).not.toHaveLength(0);
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
    const connectorCounts = Object.fromEntries(
      ['and', 'but', 'because', 'yet', 'so', 'for'].map((kind) => [
        kind,
        commonConjunctions.filter((phrase) => phrase.connectorKind === kind)
          .length,
      ]),
    );

    expect(connectorCounts).toEqual({
      and: 2,
      but: 2,
      because: 2,
      yet: 2,
      so: 1,
      for: 1,
    });
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
      parsePhraseCardCorpus([{ ...source, singularText: 'a manual card' }]),
    ).toThrow(/both singularText and pluralText/iu);
    expect(() =>
      combinePhraseCardCorpora({
        common: loaded,
        byCharacter: { 'test-character': loaded },
      }),
    ).toThrow(/more than one corpus/iu);
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

  test('accepts original sample content for three characters and one scene', () => {
    const result = contentCatalogSchema.parse(sampleContent);

    expect(result.characters).toHaveLength(3);
    expect(
      result.characters.every((character) => character.species === 'human'),
    ).toBe(true);
    expect(result.scenes).toHaveLength(1);
    expect(new Set(result.phrases.map((phrase) => phrase.role))).toEqual(
      new Set([
        'noun',
        'verb',
        'predicate',
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
    expectFailure(catalog, 'phrases.0.numberForms', /different locale keys/iu);
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
    const predicateFinisher = cloneCatalog();
    predicateFinisher.phrases.find(
      (phrase) => phrase.id === 'before-the-next-election',
    )!.finisherBonus = 2;
    expectFailure(predicateFinisher, 'finisherBonus', /Only an ending/iu);

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
      (phrase) => phrase.id === 'before-the-next-election',
    )!;
    relation.scorePreferences = undefined;
    relation.customScores = [];
    expectFailure(emptyScores, 'customScores', /too small|at least 1/iu);

    const duplicateScores = cloneCatalog();
    duplicateScores.phrases.find(
      (phrase) => phrase.id === 'before-the-next-election',
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

  test('rejects unsafe HTML in game-locale text', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.messages['phrase.repackages'] =
      '<img src=x onerror=alert(1)>repackages';
    expectFailure(
      catalog,
      'locales.0.messages.phrase.repackages',
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
