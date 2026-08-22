import { describe, expect, test } from 'vitest';
import { contentCatalogSchema } from '../../src/content/content-catalog';
import { sampleContent } from '../../src/content/sample-content';
import type { EditorialSafetyFlag } from '../../src/content/schemas';

type MutableCatalog = ReturnType<typeof cloneCatalog>;

function cloneCatalog() {
  return structuredClone(sampleContent);
}

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
  test('accepts original sample content for two characters and one scene', () => {
    const result = contentCatalogSchema.parse(sampleContent);

    expect(result.characters).toHaveLength(2);
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

  test('rejects a directness value that cannot be summed safely', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.directness = 2 as 0;
    expectFailure(catalog, 'phrases.0.directness', /Invalid input/iu);
  });

  test('rejects duplicate tags at the phrase location', () => {
    const catalog = cloneCatalog();
    catalog.phrases[0]!.tags.push(catalog.phrases[0]!.tags[0]!);
    expectFailure(catalog, 'phrases.0.tags', /only once/iu);
  });

  test('rejects a missing cross-record reference', () => {
    const catalog = cloneCatalog();
    catalog.characters[0]!.phrasePools.public[0] = 'missing-phrase';
    expectFailure(catalog, 'characters.0.phrasePools.0', /existing phrase/iu);
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
    wrongCharacter.characters[1]!.phrasePools.private[0] = 'committee-kite';
    expectFailure(
      wrongCharacter,
      'characters.1.phrasePools.8',
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

  test('rejects a character pool that cannot reach every core role', () => {
    const catalog = cloneCatalog();
    catalog.characters[0]!.phrasePools = {
      public: ['paper-promise', 'velvet-megaphone'],
      private: ['committee-kite', 'paper-promise', 'velvet-megaphone'],
    };
    expectFailure(
      catalog,
      'characters.0.phrasePools',
      /Missing: verb, predicate/iu,
    );
  });

  test('rejects sample content that cannot reach a declared phrase role', () => {
    const catalog = cloneCatalog();
    catalog.phrases.find((phrase) => phrase.role === 'continuation')!.role =
      'ending';
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

  test('rejects an insufficient private phrase pool', () => {
    const catalog = cloneCatalog();
    catalog.characters[0]!.phrasePools.private = ['outshouts', 'before-lunch'];
    expectFailure(
      catalog,
      'characters.0.phrasePools.private',
      /at least 3 private phrases/iu,
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
