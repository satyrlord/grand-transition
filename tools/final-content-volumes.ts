import type { ContentCatalog } from '../src/content/content-catalog';
import type { Phrase } from '../src/content/schemas';

type Role = Phrase['role'] | 'descriptive';
type Volume = readonly [role: Role, minimum: number, maximum: number];

const generalVolumes: readonly Volume[] = [
  ['noun', 150, 165],
  ['verb', 120, 135],
  ['descriptive', 100, 115],
  ['conjunction', 8, 10],
  ['ending', 60, 70],
  ['continuation', 1, 1],
];

const characterVolumes: readonly Volume[] = [
  ['noun', 6, Infinity],
  ['verb', 4, Infinity],
  ['descriptive', 4, Infinity],
  ['predicate', 1, Infinity],
  ['modifier', 1, Infinity],
  ['conjunction', 1, Infinity],
  ['ending', 1, Infinity],
];

const sceneVolumes: readonly Volume[] = [
  ['noun', 8, Infinity],
  ['verb', 6, Infinity],
  ['descriptive', 5, Infinity],
  ['predicate', 1, Infinity],
  ['modifier', 1, Infinity],
  ['conjunction', 1, Infinity],
  ['ending', 1, Infinity],
  ['continuation', 1, Infinity],
];

/** Milestone 028 release volumes, separate from the reusable catalog schema. */
export function finalContentVolumeIssues(
  catalog: Pick<ContentCatalog, 'phrases' | 'characters' | 'scenes'>,
): string[] {
  const issues: string[] = [];
  const count = (phrases: readonly Phrase[], role: Role) =>
    phrases.filter((phrase) => role === 'descriptive'
      ? phrase.role === 'predicate' || phrase.role === 'modifier'
      : phrase.role === role).length;
  const check = (label: string, actual: number, minimum: number, maximum: number) => {
    if (actual < minimum || actual > maximum) {
      const required = Number.isFinite(maximum)
        ? `${minimum} through ${maximum}`
        : `at least ${minimum}`;
      issues.push(`${label}: found ${actual}; required ${required}.`);
    }
  };
  const checkRoles = (label: string, phrases: readonly Phrase[], volumes: readonly Volume[]) => {
    for (const [role, minimum, maximum] of volumes) {
      check(`${label} ${role}`, count(phrases, role), minimum, maximum);
    }
  };

  check('Characters', catalog.characters.length, 19, 19);
  check('Scenes', catalog.scenes.length, 6, 6);
  checkRoles('General', catalog.phrases.filter((phrase) =>
    !phrase.characterIds && !phrase.sceneIds), generalVolumes);

  for (const character of catalog.characters) {
    const owned = catalog.phrases.filter((phrase) =>
      phrase.characterIds?.includes(character.id));
    check(`${character.id} phrases`, owned.length, 20, 32);
    checkRoles(character.id, owned, characterVolumes);
  }
  for (const scene of catalog.scenes) {
    const owned = catalog.phrases.filter((phrase) =>
      phrase.sceneIds?.includes(scene.id) || phrase.role === 'continuation');
    check(`${scene.id} phrases`, owned.length, 25, 35);
    checkRoles(scene.id, owned, sceneVolumes);
  }
  return issues;
}
