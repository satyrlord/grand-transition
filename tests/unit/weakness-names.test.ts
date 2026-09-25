import { describe, expect, test } from 'vitest';
import { gameCatalog } from '../../src/game-content.ts';
import {
  displayWeaknessName,
  romanianWeaknessNames,
} from '../../src/localization/romanian-display-names.ts';

// A weakness label is interface text: the interface language names it, while
// scoring, content, and stored state keep the stable tag identifier.
describe('weakness labels', () => {
  test('names exactly the shipped weakness tags in Romanian', () => {
    const shippedTags = [
      ...new Set(gameCatalog.characters.flatMap((character) => character.weaknessTags)),
    ].sort();
    expect(shippedTags.length).toBeGreaterThan(0);
    expect(Object.keys(romanianWeaknessNames).sort()).toEqual(shippedTags);
  });

  test('ships the Romanian label for every shipped tag', () => {
    for (const tag of Object.keys(romanianWeaknessNames)) {
      const romanian = displayWeaknessName(tag, 'ro-RO');
      expect(romanian, tag).toBe(romanianWeaknessNames[tag]);
      expect(romanian, tag).toBe(romanian.normalize('NFC'));
    }
  });

  test('translates a tag whose two labels differ', () => {
    expect(displayWeaknessName('legacy', 'ro-RO')).not.toBe(displayWeaknessName('legacy', 'en'));
    expect(displayWeaknessName('accountability', 'ro-RO')).toBe('Responsabilitate');
  });

  test('shows the English label the setup and score views shipped', () => {
    expect(displayWeaknessName('legacy', 'en')).toBe('Legacy');
    expect(displayWeaknessName('miners', 'en')).toBe('Miners');
    expect(displayWeaknessName('firsthand-knowledge', 'en')).toBe('Firsthand-Knowledge');
    // Milestone 005 pins this one label.
    expect(displayWeaknessName('securitate', 'en')).toBe('Former secret police');
  });

  test('follows the interface locale rather than the game locale', () => {
    expect(displayWeaknessName('miners', 'ro-RO')).toBe('Mineri');
    expect(displayWeaknessName('procurement', 'ro-RO')).toBe('Achiziții publice');
    expect(displayWeaknessName('securitate', 'ro-RO')).toBe('Fosta Securitate');
  });

  test('falls back to the tag in title case so an unknown tag stays readable', () => {
    expect(displayWeaknessName('not-a-shipped-weakness', 'ro-RO')).toBe('Not-A-Shipped-Weakness');
  });
});
