import { createHash } from 'node:crypto';
import type { ContentCatalog } from '../src/content/content-catalog';
import type { Phrase } from '../src/content/schemas';
import type { ReplayContext } from '../src/persistence/codecs/replay-codec';

export function contentFingerprint(context: ReplayContext): string {
  return createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

/** Check the final phrase volumes independently of later media packages. */
export function reviewContentPreflight(catalog: ContentCatalog): string[] {
  const issues: string[] = [];
  const check = (label: string, actual: number, minimum: number, maximum = Infinity) => {
    if (actual < minimum || actual > maximum) issues.push(`${label}: ${actual}; required ${minimum} through ${maximum === Infinity ? 'unbounded' : maximum}.`);
  };
  check('Characters', catalog.characters.length, 18, 18);
  check('Scenes', catalog.scenes.length, 6, 6);
  const general = catalog.phrases.filter((phrase) => !phrase.characterIds && !phrase.sceneIds);
  for (const [role, minimum, maximum] of [
    ['noun', 150, 165], ['verb', 120, 135], ['descriptive', 100, 115],
    ['conjunction', 8, 10], ['ending', 60, 70], ['continuation', 1, 1],
  ] as const) check(`General ${role}`, countRole(general, role), minimum, maximum);
  for (const character of catalog.characters) {
    const owned = catalog.phrases.filter((phrase) => phrase.characterIds?.includes(character.id));
    check(`${character.id} phrases`, owned.length, 20, 32);
    for (const [role, minimum] of [['noun', 6], ['verb', 4], ['descriptive', 4], ['predicate', 1], ['modifier', 1], ['conjunction', 1], ['ending', 1]] as const) {
      check(`${character.id} ${role}`, countRole(owned, role), minimum);
    }
  }
  for (const scene of catalog.scenes) {
    // Eligibility includes general phrases. Ownership must come from restrictions.
    const owned = catalog.phrases.filter((phrase) => phrase.sceneIds?.includes(scene.id) || phrase.role === 'continuation');
    check(`${scene.id} owned phrases including universal continuation`, owned.length, 25, 35);
    for (const [role, minimum] of [['noun', 8], ['verb', 6], ['descriptive', 5], ['predicate', 1], ['modifier', 1], ['conjunction', 1], ['ending', 1], ['continuation', 1]] as const) {
      check(`${scene.id} ${role}`, countRole(owned, role), minimum);
    }
  }
  return issues;
}

function countRole(phrases: readonly Phrase[], role: Phrase['role'] | 'descriptive'): number {
  return phrases.filter((phrase) => role === 'descriptive' ? ['predicate', 'modifier'].includes(phrase.role) : phrase.role === role).length;
}
