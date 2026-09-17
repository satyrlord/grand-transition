import type { ContentCatalog } from '../src/content/content-catalog';
import type { Phrase } from '../src/content/schemas';

type Role = Phrase['role'];
type Volume = readonly [role: Role, required: number];

const generalVolumes: readonly Volume[] = [
  ['noun', 300],
  ['verb', 150],
  ['predicate', 99],
  ['modifier', 50],
  ['conjunction', 5],
  ['ending', 50],
  ['continuation', 1],
];

const characterVolumes: readonly Volume[] = [
  ['noun', 10],
  ['verb', 9],
  ['predicate', 12],
  ['modifier', 3],
  ['conjunction', 1],
  ['ending', 5],
  ['continuation', 0],
];

const sceneVolumes: readonly Volume[] = [
  ['noun', 10],
  ['verb', 9],
  ['predicate', 6],
  ['modifier', 3],
  ['conjunction', 3],
  ['ending', 3],
  ['continuation', 0],
];

const generalConnectorKinds = new Set(['and', 'but', 'because', 'so', 'with']);

/** Milestone 028 release volumes, separate from the reusable catalog schema. */
export function finalContentVolumeIssues(
  catalog: Pick<ContentCatalog, 'phrases' | 'characters' | 'scenes'>,
): string[] {
  const issues: string[] = [];
  const count = (phrases: readonly Phrase[], role: Role) =>
    phrases.filter((phrase) => phrase.role === role).length;
  const check = (label: string, actual: number, required: number) => {
    if (actual !== required) {
      issues.push(`${label}: found ${actual}; required exactly ${required}.`);
    }
  };
  const checkRoles = (label: string, phrases: readonly Phrase[], volumes: readonly Volume[]) => {
    for (const [role, required] of volumes) {
      check(`${label} ${role}`, count(phrases, role), required);
    }
  };
  const checkTenses = (
    label: string,
    phrases: readonly Phrase[],
    role: 'verb' | 'predicate',
    requiredPerTense: number,
  ) => {
    for (const tense of ['past', 'present', 'future'] as const) {
      check(
        `${label} ${role} ${tense}`,
        phrases.filter((phrase) => phrase.role === role && phrase.tense === tense).length,
        requiredPerTense,
      );
    }
  };

  check('Characters', catalog.characters.length, 19);
  check('Scenes', catalog.scenes.length, 6);
  const general = catalog.phrases.filter((phrase) =>
    !phrase.characterIds && !phrase.sceneIds);
  checkRoles('General', general, generalVolumes);
  checkTenses('General', general, 'verb', 50);
  checkTenses('General', general, 'predicate', 33);
  const generalConjunctions = general.filter((phrase) => phrase.role === 'conjunction');
  if (generalConjunctions.some((phrase) =>
    !generalConnectorKinds.has(phrase.connectorKind ?? '') || phrase.tags.length > 0,
  )) {
    issues.push('General conjunctions: use only the five neutral connector cards.');
  }

  for (const character of catalog.characters) {
    const owned = catalog.phrases.filter((phrase) =>
      phrase.characterIds?.includes(character.id));
    check(`${character.id} phrases`, owned.length, 40);
    checkRoles(character.id, owned, characterVolumes);
    checkTenses(character.id, owned, 'verb', 3);
    checkTenses(character.id, owned, 'predicate', 4);
  }
  for (const scene of catalog.scenes) {
    const owned = catalog.phrases.filter((phrase) => phrase.sceneIds?.includes(scene.id));
    const continuationCount = catalog.phrases.filter((phrase) => phrase.role === 'continuation').length;
    check(`${scene.id} scene-owned phrases`, owned.length, 34);
    check(`${scene.id} eligible phrase pool`, owned.length + continuationCount, 35);
    checkRoles(scene.id, owned, sceneVolumes);
    checkTenses(scene.id, owned, 'verb', 3);
    checkTenses(scene.id, owned, 'predicate', 2);
    if (owned.some((phrase) => (phrase.sceneIds?.length ?? 0) !== 1)) {
      issues.push(`${scene.id} scene cards: each card must belong to exactly one scene.`);
    }
  }
  return issues;
}
