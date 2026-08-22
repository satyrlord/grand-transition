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

const minimumPrivatePhrases = 3;
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

    catalog.phrases.forEach((phrase, phraseIndex) => {
      requireApprovedEditorialReview(phrase, phraseIndex, context);
      for (const [restrictionIndex, characterId] of (
        phrase.characterIds ?? []
      ).entries()) {
        if (!characterIds.has(characterId)) {
          issue(
            context,
            ['phrases', phraseIndex, 'characterIds', restrictionIndex],
            `Reference an existing character. "${characterId}" is not defined.`,
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
        }
      }
    });

    catalog.characters.forEach((character, characterIndex) => {
      const pool = [
        ...character.phrasePools.public,
        ...character.phrasePools.private,
      ];
      validatePhraseReferences(
        pool,
        phraseById,
        ['characters', characterIndex, 'phrasePools'],
        context,
      );
      pool.forEach((phraseId, poolIndex) => {
        const restrictions = phraseById.get(phraseId)?.characterIds;
        if (restrictions && !restrictions.includes(character.id)) {
          issue(
            context,
            ['characters', characterIndex, 'phrasePools', poolIndex],
            `Phrase "${phraseId}" is not available to character "${character.id}".`,
          );
        }
      });
      if (character.phrasePools.private.length < minimumPrivatePhrases) {
        issue(
          context,
          ['characters', characterIndex, 'phrasePools', 'private'],
          `Add at least ${minimumPrivatePhrases} private phrases for safe private-hand variety.`,
        );
      }
      requireRoles(
        pool,
        phraseById,
        ['characters', characterIndex, 'phrasePools'],
        context,
        sentencePoolRoles,
        'Make noun, verb, and predicate roles reachable for this character.',
      );
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
