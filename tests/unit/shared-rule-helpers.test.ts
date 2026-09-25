import { describe, expect, test } from 'vitest';
import type { Phrase } from '../../src/content/schemas';
import { handCardSlotIndex } from '../../src/engine/draft-actions';
import { grammarFor } from '../../src/engine/grammar/grammar-locale';
import { phraseIndex } from '../../src/engine/phrase-index';
import { deepFreeze, isRecord } from '../../src/engine/plain-values';
import { stableHash } from '../../src/engine/stable-hash';
import {
  isClauseConnector,
  pickWeighted,
  preferredConnectors,
  rarityWeight,
  type WeightedPhrase,
} from '../../src/engine/weighted-selection';
import {
  englishGameLocale,
  gameCatalog,
  romanianGameLocale,
} from '../../src/game-content';

// The hash that the AI decision seeds and comeback lines used before the
// shared helper. The helper must keep every existing seed unchanged.
function previousStableHash(text: string, initialHash: number): number {
  let hash = initialHash >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function conjunction(id: string, connectorKind: Phrase['connectorKind']): WeightedPhrase {
  const phrase = gameCatalog.phrases.find(({ role }) => role === 'conjunction')!;
  return { phrase: { ...phrase, id, connectorKind }, weight: 1 };
}

describe('stable hash', () => {
  test('matches the published 32-bit FNV-1a vectors', () => {
    expect(stableHash('')).toBe(0x811c_9dc5);
    expect(stableHash('a')).toBe(0xe40c_292c);
    expect(stableHash('foobar')).toBe(0xbf9c_f968);
  });

  test.each([0, 1, 42, 0xffff_ffff, 2_166_136_261])(
    'keeps previous decision seeds from initial hash %i',
    (initialHash) => {
      const text = JSON.stringify([{ type: 'select-phrase', actorId: 'player-two' }]);
      expect(stableHash(text, initialHash)).toBe(previousStableHash(text, initialHash));
    },
  );
});

describe('plain values', () => {
  test('deep-freezes nested objects and arrays and returns the same value', () => {
    const value = { list: [{ item: 1 }], nested: { flag: true } };
    expect(deepFreeze(value)).toBe(value);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
  });

  test('accepts only non-array objects as records', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('text')).toBe(false);
  });
});

describe('rule lookups', () => {
  test('builds one phrase index for each phrase list', () => {
    const index = phraseIndex(gameCatalog.phrases);
    expect(phraseIndex(gameCatalog.phrases)).toBe(index);
    expect(index.get(gameCatalog.phrases[0]!.id)).toBe(gameCatalog.phrases[0]);
    expect(phraseIndex([...gameCatalog.phrases])).not.toBe(index);
  });

  test('prepares each phrase once for each game locale', () => {
    const phrase = gameCatalog.phrases.find(({ role }) => role === 'verb')!;
    const english = grammarFor(englishGameLocale);
    const romanian = grammarFor(romanianGameLocale);
    expect(english.prepare(phrase, englishGameLocale)).toBe(
      english.prepare(phrase, englishGameLocale),
    );
    expect(romanian.prepare(phrase, romanianGameLocale).localeTag).toBe('ro-RO');
    expect(() => english.prepare(phrase, romanianGameLocale)).toThrow(/English/u);
  });

  test('keeps each private card in the slot it was dealt into', () => {
    expect(handCardSlotIndex({ id: 'hand-3-player-one-1', phraseId: 'x' })).toBe(0);
    expect(handCardSlotIndex({ id: 'hand-12-player-two-2', phraseId: 'x' })).toBe(1);
    expect(handCardSlotIndex({ id: 'redraw-2-player-one-2', phraseId: 'x' })).toBe(1);
  });
});

describe('weighted selection', () => {
  test('weights common, uncommon, and rare phrases 4, 2, and 1', () => {
    const phrase = gameCatalog.phrases[0]!;
    expect(rarityWeight({ ...phrase, rarity: 'common' })).toBe(4);
    expect(rarityWeight({ ...phrase, rarity: 'uncommon' })).toBe(2);
    expect(rarityWeight({ ...phrase, rarity: 'rare' })).toBe(1);
  });

  test('selects by cumulative weight and keeps the last candidate at the upper bound', () => {
    const phrase = gameCatalog.phrases[0]!;
    const candidates = [
      { phrase: { ...phrase, id: 'light' }, weight: 1 },
      { phrase: { ...phrase, id: 'heavy' }, weight: 3 },
    ];
    expect(pickWeighted(candidates, 0).phrase.id).toBe('light');
    expect(pickWeighted(candidates, 0.25).phrase.id).toBe('heavy');
    expect(pickWeighted(candidates, 1).phrase.id).toBe('heavy');
  });

  test('prefers contrast connectors for a quarter of rolls and falls back to every connector', () => {
    const and = conjunction('and-card', 'and');
    const but = conjunction('but-card', 'but');
    const because = conjunction('because-card', 'because');
    expect([and, but, because].filter(isClauseConnector)).toEqual([and, but]);
    expect(preferredConnectors([and, but], 0.1)).toEqual([but]);
    expect(preferredConnectors([and, but], 0.9)).toEqual([and]);
    expect(preferredConnectors([and], 0.1)).toEqual([and]);
    expect(preferredConnectors([], 0.1)).toEqual([]);
  });
});
