import { describe, expect, test } from 'vitest';
import { contentCatalogSchema } from '../../src/content/content-catalog';
import {
  combinePhraseCardCorpora,
  parsePhraseCardCorpus,
  phraseCardCatalog,
} from '../../src/content/phrase-card-catalog';
import { sampleContent } from '../../src/content/sample-content';
import type { EditorialSafetyFlag } from '../../src/content/schemas';

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
        { leftNounId: 'paper-promise', score: value },
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
        (phrase) => phrase.id === 'with-the-receipt',
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
  test('loads 32 unique cards from the common and character JSON corpora', () => {
    expect(phraseCardCatalog.phrases).toHaveLength(32);
    expect(phraseCardCatalog.commonPhraseIds).toHaveLength(30);
    expect(phraseCardCatalog.characterPhraseIds).toEqual({
      'civic-fox': ['committee-kite'],
      'brass-peacock': ['polishes'],
    });
    expect(
      new Set(phraseCardCatalog.phrases.map((phrase) => phrase.id)),
    ).toHaveLength(32);
    expect(
      phraseCardCatalog.phrases.find((phrase) => phrase.id === 'committee-kite')
        ?.characterIds,
    ).toEqual(['civic-fox']);
  });

  test('validates a manually authored JSON phrase before catalog loading', () => {
    const source = {
      id: 'manual-card',
      role: 'noun',
      text: 'a manual card',
      tags: ['paperwork'],
      scoreGroups: { substance: ['bureaucracy'], flavour: ['whimsy'] },
      rarity: 'uncommon',
      reviewNotes: 'Original test fixture. Review complete.',
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

  test('accepts original sample content for two characters and one scene', () => {
    const result = contentCatalogSchema.parse(sampleContent);

    expect(result.characters).toHaveLength(2);
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

  test('rejects grammar and scoring fields on the wrong phrase role', () => {
    const predicateFinisher = cloneCatalog();
    predicateFinisher.phrases.find(
      (phrase) => phrase.id === 'before-lunch',
    )!.finisherBonus = 2;
    expectFailure(predicateFinisher, 'finisherBonus', /Only an ending/iu);

    const endingWithoutScore = cloneCatalog();
    endingWithoutScore.phrases.find(
      (phrase) => phrase.id === 'with-the-receipt',
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
      (phrase) => phrase.id === 'before-lunch',
    )!;
    relation.scorePreferences = undefined;
    relation.customScores = [];
    expectFailure(emptyScores, 'customScores', /too small|at least 1/iu);

    const duplicateScores = cloneCatalog();
    duplicateScores.phrases.find(
      (phrase) => phrase.id === 'before-lunch',
    )!.customScores = [
      { leftNounId: 'paper-promise', score: 4 },
      { leftNounId: 'paper-promise', score: 9 },
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
    catalog.characters[0]!.characterPhraseIds.push('missing-phrase');
    expectFailure(
      catalog,
      'characters.0.characterPhraseIds.1',
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
      (phrase) => phrase.id === 'committee-kite',
    )!.characterIds = ['civic-fox'];
    wrongCharacter.characters[1]!.characterPhraseIds.push('committee-kite');
    expectFailure(
      wrongCharacter,
      'characters.1.characterPhraseIds.1',
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
    unrestrictedCharacterPhrase.characters[0]!.characterPhraseIds.push(
      'paper-promise',
    );
    expectFailure(
      unrestrictedCharacterPhrase,
      'characters.0.characterPhraseIds.1',
      /not available to character/iu,
    );

    const missingCharacterMembership = cloneCatalog();
    missingCharacterMembership.characters[0]!.characterPhraseIds = [];
    expectFailure(
      missingCharacterMembership,
      'phrases.30.characterIds.0',
      /Add phrase "committee-kite" to character/iu,
    );

    const missingSceneMembership = cloneCatalog();
    const restrictedIndex = missingSceneMembership.phrases.findIndex(
      (phrase) => phrase.id === 'past-the-deadline',
    );
    missingSceneMembership.scenes[0]!.phrasePool =
      missingSceneMembership.scenes[0]!.phrasePool.filter(
        (phraseId) => phraseId !== 'past-the-deadline',
      );
    expectFailure(
      missingSceneMembership,
      `phrases.${restrictedIndex}.sceneIds.0`,
      /Add phrase "past-the-deadline" to scene/iu,
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

  test('rejects locale bundles without key parity', () => {
    const catalog = cloneCatalog();
    const secondLocale = structuredClone(catalog.locales[0]!);
    secondLocale.locale = 'en-GB';
    delete secondLocale.messages['phrase.polishes'];
    catalog.locales.push(secondLocale);
    expectFailure(catalog, 'locales.1.messages', /phrase\.polishes/iu);
  });

  test('rejects a non-canonical BCP 47 locale tag', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.locale = 'EN_us';
    expectFailure(catalog, 'locales.0.locale', /BCP 47/iu);
  });

  test('rejects missing locale keys for number forms', () => {
    const catalog = cloneCatalog();
    delete catalog.locales[0]!.messages['phrase.paper-promise.plural'];
    expectFailure(
      catalog,
      'locales.0.messages.phrase.paper-promise.plural',
      /required locale message/iu,
    );
  });

  test('rejects unsafe HTML in game-locale text', () => {
    const catalog = cloneCatalog();
    catalog.locales[0]!.messages['phrase.folds'] =
      '<img src=x onerror=alert(1)>folds';
    expectFailure(catalog, 'locales.0.messages.phrase.folds', /Remove HTML/iu);
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
    'copied-line',
    'protected-trait-insult',
    'unsupported-crime-claim',
    'unsupported-private-health-claim',
    'private-target',
    'reusable-harassment',
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
      'paper-promise',
      'velvet-megaphone',
      'committee-kite',
    ];
    expectFailure(catalog, 'scenes.0.phrasePool', /Missing: verb, predicate/iu);
  });
});
