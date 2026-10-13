import { describe, expect, test } from 'vitest';
import type { Character } from '../../src/content/schemas.ts';
import {
  comebackTiers,
  selectComebackTier,
  type ComebackTier,
} from '../../src/engine/continuation-comeback-resolution.ts';
import type { GameCommand } from '../../src/engine/game-contracts.ts';
import { seededRandomSource } from '../../src/engine/random-source.ts';
import { englishGameLocale, gameCatalog, romanianGameLocale } from '../../src/game-content.ts';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema.ts';

const linesPerTier = 3;
const maximumComebackWordCount = 16;
const opponentCommit: GameCommand = {
  type: 'commit-sentence',
  source: 'user',
  actorId: 'second-player',
  payload: {},
};

function visibleText(text: string, locale: string): string {
  return text.trim().replaceAll(/\s+/gu, ' ').toLocaleLowerCase(locale);
}

function draw(
  character: Character,
  tier: ComebackTier,
  seed: number,
  commandHistory: readonly GameCommand[],
  locale: GameLocaleBundle = englishGameLocale,
) {
  const result = selectComebackTier({
    playerId: 'first-player',
    character,
    tier,
    phase: 'drafting',
    constructionComplete: true,
    selectedComeback: null,
    charge: 60,
    seed,
    commandHistory,
    locale,
  });
  if (!result.ok) throw new Error(`The ${tier} comeback of ${character.id} must be selectable.`);
  return result;
}

// A match moves its seed through the generator, so the draws use that same sequence.
function matchSeeds(firstSeed: number, count: number): readonly number[] {
  const seeds: number[] = [];
  let seed = firstSeed;
  for (let index = 0; index < count; index += 1) {
    seeds.push(seed);
    seed = seededRandomSource.next(seed).nextSeed;
  }
  return seeds;
}

describe('comeback line variety', () => {
  test.each([englishGameLocale, romanianGameLocale])(
    'each character has three different lines in each tier in $locale',
    (locale) => {
      const ownerByText = new Map<string, string>();
      for (const character of gameCatalog.characters) {
        for (const tier of comebackTiers) {
          const keys = character.comebackLinesByTier[tier];
          expect(keys).toEqual(
            Array.from(
              { length: linesPerTier },
              (_, lineIndex) => `comeback.${character.id}.${tier}.${lineIndex + 1}`,
            ),
          );
          for (const key of keys) {
            const text = locale.messages[key];
            expect(text, key).toBeTruthy();
            expect(text!.trim().split(/\s+/u).length, key).toBeLessThanOrEqual(
              maximumComebackWordCount,
            );
            const normalized = visibleText(text!, locale.locale);
            expect(ownerByText.get(normalized), `${key} repeats another comeback line`).toBe(
              undefined,
            );
            ownerByText.set(normalized, key);
          }
        }
      }
      // 19 characters give 171 lines for each locale.
      expect(ownerByText.size).toBe(
        gameCatalog.characters.length * comebackTiers.length * linesPerTier,
      );
    },
  );

  test.each(comebackTiers)(
    'the seeded draw gives each of the three %s lines and repeats for one seed and history',
    (tier) => {
      for (const character of gameCatalog.characters) {
        const drawnKeys = new Set<string>();
        for (const seed of matchSeeds(1, 48)) {
          const first = draw(character, tier, seed, [opponentCommit]);
          expect(draw(character, tier, seed, [opponentCommit])).toEqual(first);
          expect(first.nextSeed).toBe(seededRandomSource.next(seed).nextSeed);
          expect(first.selection.closingLine).toBe(
            englishGameLocale.messages[first.selection.closingLineKey],
          );
          drawnKeys.add(first.selection.closingLineKey);
        }
        expect(drawnKeys.size, character.id).toBe(linesPerTier);
        expect([...drawnKeys].toSorted(), character.id).toEqual(
          character.comebackLinesByTier[tier].toSorted(),
        );
      }
    },
  );

  test('the draw selects the same line number in each game locale', () => {
    const character = gameCatalog.characters[0]!;
    for (const seed of matchSeeds(7, 24)) {
      const english = draw(character, 'strong', seed, [opponentCommit]);
      const romanian = draw(character, 'strong', seed, [opponentCommit], romanianGameLocale);
      expect(romanian.selection.closingLineKey).toBe(english.selection.closingLineKey);
      expect(romanian.selection.closingLine).toBe(
        romanianGameLocale.messages[english.selection.closingLineKey],
      );
    }
  });

  test.each([[[]], [[opponentCommit]], [[opponentCommit, opponentCommit]]] as const)(
    'the draw gives each line about one time in three for command history %#',
    (commandHistory) => {
      const character = gameCatalog.characters[0]!;
      const counts = new Map<string, number>();
      const seeds = matchSeeds(2_026, 3_000);
      for (const seed of seeds) {
        const key = draw(character, 'medium', seed, commandHistory).selection.closingLineKey;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(counts.size).toBe(linesPerTier);
      for (const [key, count] of counts) {
        expect(count / seeds.length, key).toBeGreaterThan(0.3);
        expect(count / seeds.length, key).toBeLessThan(0.37);
      }
    },
  );
});
