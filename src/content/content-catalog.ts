import { z } from 'zod';
import {
  characterSchema,
  phraseRoles,
  phraseSchema,
  sentencePoolRoles,
  sceneSchema,
  type Phrase,
} from './schemas';
import { gameLocaleBundleSchema } from '../localization/game-locale-schema';

const minimumWeaknessTagCoverage = 2;

export const contentCatalogSchema = z
  .object({
    phrases: z.array(phraseSchema).min(1),
    characters: z.array(characterSchema).min(2),
    scenes: z.array(sceneSchema).min(1),
    locales: z.array(gameLocaleBundleSchema).min(1),
  })
  .strict()
  .superRefine((catalog, context) => {
    const phraseById = new Map(
      catalog.phrases.map((phrase) => [phrase.id, phrase]),
    );
    const characterIds = new Set(
      catalog.characters.map((character) => character.id),
    );
    const sceneIds = new Set(catalog.scenes.map((scene) => scene.id));

    addDuplicateIssues(catalog.phrases, 'phrases', context);
    addDuplicateIssues(catalog.characters, 'characters', context);
    addDuplicateIssues(catalog.scenes, 'scenes', context);
    addDuplicateIssues(
      catalog.locales,
      'locales',
      context,
      (locale) => locale.locale,
    );
    requireRoles(
      catalog.phrases.map((phrase) => phrase.id),
      phraseById,
      ['phrases'],
      context,
      phraseRoles,
      'Add sample content for every core phrase role.',
    );
    const continuations = catalog.phrases.filter(
      (phrase) => phrase.role === 'continuation',
    );
    if (continuations.length !== 1) {
      issue(
        context,
        ['phrases'],
        `Supply exactly one universal continuation; found ${continuations.length}.`,
      );
    }

    catalog.phrases.forEach((phrase, phraseIndex) => {
      requireApprovedEditorialReview(phrase, phraseIndex, context);
      for (const [scoreIndex, customScore] of (
        phrase.customScores ?? []
      ).entries()) {
        for (const [field, nounId] of [
          ['leftNounId', customScore.leftNounId],
          ['rightNounId', customScore.rightNounId],
        ] as const) {
          if (!nounId) continue;
          if (phraseById.get(nounId)?.role !== 'noun') {
            issue(
              context,
              ['phrases', phraseIndex, 'customScores', scoreIndex, field],
              'Reference an existing noun phrase.',
            );
          }
        }
      }
      for (const [restrictionIndex, characterId] of (
        phrase.characterIds ?? []
      ).entries()) {
        if (!characterIds.has(characterId)) {
          issue(
            context,
            ['phrases', phraseIndex, 'characterIds', restrictionIndex],
            `Reference an existing character. "${characterId}" is not defined.`,
          );
          continue;
        }
        const owner = catalog.characters.find(
          (character) => character.id === characterId,
        )!;
        if (!owner.characterPhraseIds.includes(phrase.id)) {
          issue(
            context,
            ['phrases', phraseIndex, 'characterIds', restrictionIndex],
            `Add phrase "${phrase.id}" to character "${characterId}" or remove the restriction.`,
          );
        }
      }
      for (const [restrictionIndex, sceneId] of (
        phrase.sceneIds ?? []
      ).entries()) {
        if (!sceneIds.has(sceneId)) {
          issue(
            context,
            ['phrases', phraseIndex, 'sceneIds', restrictionIndex],
            `Reference an existing scene. "${sceneId}" is not defined.`,
          );
          continue;
        }
        const scene = catalog.scenes.find(
          (candidate) => candidate.id === sceneId,
        )!;
        if (!scene.phrasePool.includes(phrase.id)) {
          issue(
            context,
            ['phrases', phraseIndex, 'sceneIds', restrictionIndex],
            `Add phrase "${phrase.id}" to scene "${sceneId}" or remove the restriction.`,
          );
        }
      }
    });

    const comebackOwnerByKey = new Map<string, string>();
    catalog.characters.forEach((character, characterIndex) => {
      const pool = character.characterPhraseIds;
      validatePhraseReferences(
        pool,
        phraseById,
        ['characters', characterIndex, 'characterPhraseIds'],
        context,
      );
      pool.forEach((phraseId, poolIndex) => {
        const restrictions = phraseById.get(phraseId)?.characterIds;
        if (!restrictions?.includes(character.id)) {
          issue(
            context,
            ['characters', characterIndex, 'characterPhraseIds', poolIndex],
            `Phrase "${phraseId}" is not available to character "${character.id}".`,
          );
        }
      });
      for (const [tier, keys] of Object.entries(
        character.comebackLinesByTier,
      )) {
        for (const [keyIndex, key] of keys.entries()) {
          const path = [
            'characters',
            characterIndex,
            'comebackLinesByTier',
            tier,
            keyIndex,
          ];
          const expectedKey = `comeback.${character.id}.${tier}`;
          if (key !== expectedKey) {
            issue(
              context,
              path,
              `Use the exclusive character comeback key "${expectedKey}".`,
            );
          }
          const previousOwner = comebackOwnerByKey.get(key);
          if (previousOwner) {
            issue(
              context,
              path,
              `Comeback line "${key}" is already owned by ${previousOwner}.`,
            );
          } else {
            comebackOwnerByKey.set(key, `${character.id}.${tier}`);
          }
        }
      }
      for (const [tagIndex, tag] of character.weaknessTags.entries()) {
        const coverage = catalog.phrases.filter((phrase) =>
          phrase.tags.includes(tag),
        ).length;
        if (coverage < minimumWeaknessTagCoverage) {
          issue(
            context,
            ['characters', characterIndex, 'weaknessTags', tagIndex],
            `Tag "${tag}" needs at least ${minimumWeaknessTagCoverage} matching phrases; found ${coverage}.`,
          );
        }
      }
      validateMedia(
        character.assets.portrait,
        ['characters', characterIndex, 'assets', 'portrait'],
        context,
      );
      validateMedia(
        character.assets.token,
        ['characters', characterIndex, 'assets', 'token'],
        context,
      );
    });

    catalog.scenes.forEach((scene, sceneIndex) => {
      validatePhraseReferences(
        scene.phrasePool,
        phraseById,
        ['scenes', sceneIndex, 'phrasePool'],
        context,
      );
      scene.phrasePool.forEach((phraseId, poolIndex) => {
        const restrictions = phraseById.get(phraseId)?.sceneIds;
        if (restrictions && !restrictions.includes(scene.id)) {
          issue(
            context,
            ['scenes', sceneIndex, 'phrasePool', poolIndex],
            `Phrase "${phraseId}" is not available in scene "${scene.id}".`,
          );
        }
      });
      requireRoles(
        scene.phrasePool,
        phraseById,
        ['scenes', sceneIndex, 'phrasePool'],
        context,
        sentencePoolRoles,
        'Add noun, verb, and predicate phrases to this scene pool.',
      );
      const unrestricted = scene.phrasePool
        .map((phraseId) => phraseById.get(phraseId))
        .filter(
          (phrase): phrase is Phrase =>
            phrase !== undefined && phrase.characterIds === undefined,
        );
      const roleCount = (role: Phrase['role']) =>
        unrestricted.filter((phrase) => phrase.role === role).length;
      const forcedConnectorCount = unrestricted.filter(
        (phrase) =>
          phrase.role === 'conjunction' &&
          (phrase.connectorKind === 'and' ||
            phrase.connectorKind === 'but' ||
            phrase.connectorKind === 'yet'),
      ).length;
      if (
        roleCount('noun') < 3 ||
        roleCount('verb') < 3 ||
        roleCount('predicate') < 1 ||
        roleCount('continuation') < 1 ||
        forcedConnectorCount < 2
      ) {
        issue(
          context,
          ['scenes', sceneIndex, 'phrasePool'],
          'Supply three unrestricted nouns, three unrestricted verbs, one predicate, one continuation, and two distinct and-or-contrast connectors.',
        );
      }
      scene.backgroundLayers.forEach((layer, layerIndex) =>
        validateMedia(
          layer.media,
          ['scenes', sceneIndex, 'backgroundLayers', layerIndex, 'media'],
          context,
        ),
      );
      validateMedia(scene.music, ['scenes', sceneIndex, 'music'], context);
      validateMedia(
        scene.ambience,
        ['scenes', sceneIndex, 'ambience'],
        context,
      );
    });

    validateLocaleKeys(catalog, context);
    if (continuations.length === 1) {
      validateContinuationCue(catalog.locales, continuations[0]!, context);
    }
  });

type CatalogInput = z.input<typeof contentCatalogSchema>;
export type ContentCatalog = z.output<typeof contentCatalogSchema>;

export function validateContentCatalog(input: CatalogInput): ContentCatalog {
  return contentCatalogSchema.parse(input);
}

function issue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
): void {
  context.addIssue({ code: 'custom', path, message });
}

function addDuplicateIssues<T>(
  items: readonly T[],
  path: string,
  context: z.RefinementCtx,
  getId: (item: T) => string = (item) => (item as { id: string }).id,
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = getId(item);
    if (seen.has(id))
      issue(
        context,
        [path, index],
        `Use a unique identifier. "${id}" is duplicated.`,
      );
    seen.add(id);
  });
}

function validatePhraseReferences(
  ids: readonly string[],
  phraseById: ReadonlyMap<string, Phrase>,
  path: PropertyKey[],
  context: z.RefinementCtx,
): void {
  ids.forEach((id, index) => {
    if (!phraseById.has(id))
      issue(
        context,
        [...path, index],
        `Reference an existing phrase. "${id}" is not defined.`,
      );
  });
}

function requireRoles(
  ids: readonly string[],
  phraseById: ReadonlyMap<string, Phrase>,
  path: PropertyKey[],
  context: z.RefinementCtx,
  requiredRoles: readonly Phrase['role'][],
  message: string,
): void {
  const roles = new Set(ids.map((id) => phraseById.get(id)?.role));
  const missing = requiredRoles.filter((role) => !roles.has(role));
  if (missing.length > 0)
    issue(context, path, `${message} Missing: ${missing.join(', ')}.`);
}

function requireApprovedEditorialReview(
  phrase: Phrase,
  index: number,
  context: z.RefinementCtx,
): void {
  if (phrase.editorialReview.state !== 'approved')
    issue(
      context,
      ['phrases', index, 'editorialReview', 'state'],
      'Approve the editorial review before shipping this phrase.',
    );
  if (phrase.editorialReview.originality !== 'original')
    issue(
      context,
      ['phrases', index, 'editorialReview', 'originality'],
      'Ship only an original line. Replace copied or unverified prose.',
    );
  if (phrase.editorialReview.safetyFlags.length > 0)
    issue(
      context,
      ['phrases', index, 'editorialReview', 'safetyFlags'],
      `Remove or replace content marked as ${phrase.editorialReview.safetyFlags.join(', ')}.`,
    );
}

function validateMedia(
  media: { realLogo: boolean; copyrightedBroadcastGraphic: boolean },
  path: PropertyKey[],
  context: z.RefinementCtx,
): void {
  if (media.realLogo)
    issue(
      context,
      [...path, 'realLogo'],
      'Replace the real logo with original fictional media.',
    );
  if (media.copyrightedBroadcastGraphic)
    issue(
      context,
      [...path, 'copyrightedBroadcastGraphic'],
      'Replace the copyrighted broadcast graphic with original media.',
    );
}

function validateLocaleKeys(
  catalog: z.output<typeof contentCatalogSchema> | CatalogInput,
  context: z.RefinementCtx,
): void {
  const requiredKeys = new Set<string>();
  for (const phrase of catalog.phrases) {
    requiredKeys.add(phrase.textKey);
    if (phrase.numberForms) {
      requiredKeys.add(phrase.numberForms.singularKey);
      requiredKeys.add(phrase.numberForms.pluralKey);
      if (phrase.numberForms.personalSingularKey) {
        requiredKeys.add(phrase.numberForms.personalSingularKey);
      }
      if (phrase.numberForms.secondPersonKey) {
        requiredKeys.add(phrase.numberForms.secondPersonKey);
      }
    }
  }
  for (const character of catalog.characters) {
    requiredKeys.add(character.nameKey);
    requiredKeys.add(character.descriptionKey);
    Object.values(character.comebackLinesByTier)
      .flat()
      .forEach((key) => requiredKeys.add(key));
  }
  for (const scene of catalog.scenes) {
    requiredKeys.add(scene.nameKey);
    requiredKeys.add(scene.descriptionKey);
  }

  const referenceKeys = new Set(
    Object.keys(catalog.locales[0]?.messages ?? {}),
  );
  catalog.locales.forEach((locale, localeIndex) => {
    const keys = new Set(Object.keys(locale.messages));
    for (const key of requiredKeys) {
      if (!keys.has(key))
        issue(
          context,
          ['locales', localeIndex, 'messages', key],
          `Add the required locale message "${key}".`,
        );
    }
    for (const key of referenceKeys) {
      if (!keys.has(key))
        issue(
          context,
          ['locales', localeIndex, 'messages'],
          `Match locale key parity. Add "${key}".`,
        );
    }
    for (const key of keys) {
      if (!referenceKeys.has(key))
        issue(
          context,
          ['locales', localeIndex, 'messages', key],
          `Match locale key parity. Remove extra key "${key}" or add it to every locale.`,
        );
    }
  });
}

function validateContinuationCue(
  locales: readonly z.output<typeof gameLocaleBundleSchema>[],
  continuation: Phrase,
  context: z.RefinementCtx,
): void {
  locales.forEach((locale, localeIndex) => {
    if (locale.messages[continuation.textKey] !== '[...]') {
      issue(
        context,
        ['locales', localeIndex, 'messages', continuation.textKey],
        'Use "[...]" as the visible continuation cue.',
      );
    }
  });
}
