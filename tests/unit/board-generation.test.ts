import { describe, expect, test } from 'vitest';
import { gameCatalog } from '../../src/game-content.ts';
import {
  boardSlotCount,
  generateBoard,
  type BoardGenerationRequest,
} from '../../src/engine/board-generation.ts';
import type { RandomSource } from '../../src/engine/random-source.ts';

const scene = gameCatalog.scenes[0]!;
const request = (seed = 20260822): BoardGenerationRequest => ({
  seed,
  phrases: gameCatalog.phrases,
  sceneId: scene.id,
  scenePhraseIds: scene.phrasePool,
});
const expectBoard = (seed = 20260822) => {
  const result = generateBoard(request(seed));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.board;
};

describe('Hollywood Roast shared board generation', () => {
  test('creates a reproducible shuffled nine-card common board', () => {
    const first = expectBoard();
    const second = expectBoard();
    expect(first).toEqual(second);
    expect(first.slots).toHaveLength(boardSlotCount);
    expect(new Set(first.slots.map((slot) => slot.id))).toHaveLength(9);
    expect(new Set(first.slots.map((slot) => slot.phraseId))).toHaveLength(9);
  });

  test('never repeats a phrase identifier across generated boards', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      const board = expectBoard(seed);
      expect(
        new Set(board.slots.map((slot) => slot.phraseId)),
        `duplicate phrase at seed ${seed}`,
      ).toHaveLength(boardSlotCount);
    }
  });

  test('always includes three nouns, three object-taking verbs, and one predicate', () => {
    const board = expectBoard();
    const count = (role: string) => board.slots.filter((slot) => slot.role === role).length;
    expect(count('noun')).toBeGreaterThanOrEqual(3);
    expect(count('verb')).toBeGreaterThanOrEqual(3);
    expect(count('predicate')).toBeGreaterThanOrEqual(1);
  });

  test('can draw a modifier only through a variable board slot', () => {
    const board = Array.from({ length: 500 }, (_, seed) => expectBoard(seed)).find((candidate) =>
      candidate.slots.some((slot) => slot.role === 'modifier'),
    );
    expect(board).toBeDefined();
    expect(
      board!.slots.filter((slot) => ['noun', 'verb', 'predicate'].includes(slot.role)),
    ).toHaveLength(7);
  });

  test.each([
    [0.05, 0],
    [0.0999, 0],
    [0.1, 1],
    [0.5, 1],
    [0.7499, 1],
    [0.75, 2],
    [0.9, 2],
  ] as const)(
    'uses the shipped connector-count bands at roll %s',
    (connectorRoll, expectedConnectors) => {
      let calls = 0;
      const random: RandomSource = {
        next(seed) {
          calls += 1;
          // Seven fixed-slot draws come before the connector-count roll. With no
          // forced connector, draw 10 fills the open slot from the start of the pool.
          return {
            value: calls === 8 ? connectorRoll : calls === 10 && connectorRoll < 0.1 ? 0 : 0.01,
            nextSeed: seed + 1,
          };
        },
      };
      const result = generateBoard(request(1), random);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.board.slots).toHaveLength(boardSlotCount);
      expect(result.board.slots.filter((slot) => slot.role === 'conjunction')).toHaveLength(
        expectedConnectors,
      );
      // Two connectors fill the board, so that board has no continuation.
      expect(result.board.slots.filter((slot) => slot.role === 'continuation')).toHaveLength(
        expectedConnectors === 2 ? 0 : 1,
      );
    },
  );

  test('two forced connectors use two different phrase identifiers', () => {
    let calls = 0;
    const random: RandomSource = {
      next(seed) {
        calls += 1;
        return { value: calls === 8 ? 0.9 : 0.5, nextSeed: seed + 1 };
      },
    };
    const result = generateBoard(request(1), random);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const connectors = result.board.slots.filter((slot) => slot.role === 'conjunction');
    expect(connectors.length).toBeGreaterThanOrEqual(2);
    expect(new Set(connectors.map((slot) => slot.phraseId))).toHaveLength(connectors.length);
  });

  test('a cliffhanger board with two connectors keeps nine cards and no continuation', () => {
    let calls = 0;
    const random: RandomSource = {
      next(seed) {
        calls += 1;
        return { value: calls === 8 ? 0.9 : 0.01, nextSeed: seed + 1 };
      },
    };
    const result = generateBoard({ ...request(1), includeContinuation: false }, random);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.board.slots).toHaveLength(boardSlotCount);
    expect(result.board.slots.some((slot) => slot.role === 'continuation')).toBe(false);
  });

  test('seeds two nouns that a fixed relation of the board prefers as its subject', () => {
    const phraseById = new Map(gameCatalog.phrases.map((phrase) => [phrase.id, phrase]));
    for (let seed = 0; seed < 250; seed += 1) {
      const fixed = expectBoard(seed)
        .slots.filter((slot) => slot.source === 'standard')
        .map((slot) => phraseById.get(slot.phraseId)!);
      const preferredGroups = new Set(
        fixed
          .filter((phrase) => phrase.role === 'verb' || phrase.role === 'predicate')
          .flatMap((relation) => relation.scorePreferences?.substance ?? [])
          .flatMap((rule) => rule.left),
      );
      const seeded = fixed.filter(
        (phrase) =>
          phrase.role === 'noun' &&
          phrase.scoreGroups!.substance.some((group) => preferredGroups.has(group)),
      );
      expect(seeded.length, `seeded nouns at seed ${seed}`).toBeGreaterThanOrEqual(2);
    }
  });

  test('deals three nouns when no noun suits a fixed relation', () => {
    const phrases = gameCatalog.phrases.map((phrase) =>
      phrase.role === 'noun'
        ? { ...phrase, scoreGroups: { substance: ['unmatched-group'], flavour: [] } }
        : phrase,
    );
    const result = generateBoard({ ...request(7), phrases });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.board.slots.filter((slot) => slot.role === 'noun' && slot.source === 'standard'),
    ).toHaveLength(3);
  });

  test('rejects a board pool without the one universal continuation', () => {
    const scenePhraseIds = scene.phrasePool.filter(
      (phraseId) => phraseId !== 'common-continuation-001',
    );
    const result = generateBoard({ ...request(1), scenePhraseIds });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'impossible-content-pool',
        facts: {
          availableByRole: expect.arrayContaining([{ role: 'continuation', count: 0 }]),
        },
      },
    });
  });

  test.each([
    [0.249, ['but', 'yet']],
    [0.25, ['and']],
  ] as const)(
    'uses the half-open 25 percent contrast band at roll %s',
    (kindRoll, expectedKinds) => {
      let calls = 0;
      const random: RandomSource = {
        next(seed) {
          calls += 1;
          return {
            // Seven fixed-slot draws come first, then the count roll and the kind roll.
            value: calls === 8 ? 0.5 : calls === 9 ? kindRoll : 0.01,
            nextSeed: seed + 1,
          };
        },
      };
      const result = generateBoard(request(1), random);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const connector = result.board.slots.find((slot) => slot.role === 'conjunction')!;
      expect(expectedKinds).toContain(
        gameCatalog.phrases.find((phrase) => phrase.id === connector.phraseId)?.connectorKind,
      );
    },
  );

  test('deals without a forced connector when only clause connectors remain', () => {
    const scenePhraseIds = scene.phrasePool.filter((phraseId) => {
      const phrase = gameCatalog.phrases.find((candidate) => candidate.id === phraseId);
      return (
        phrase?.role !== 'conjunction' ||
        ['common-conjunction-003', 'common-conjunction-004'].includes(phrase.connectorKind ?? '')
      );
    });
    const result = generateBoard({ ...request(1), scenePhraseIds });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const slot of result.board.slots.filter((candidate) => candidate.role === 'conjunction')) {
      expect(['common-conjunction-003', 'common-conjunction-004']).toContain(
        gameCatalog.phrases.find((phrase) => phrase.id === slot.phraseId)?.connectorKind,
      );
    }
  });

  test('never puts a character-restricted phrase on the common board', () => {
    const restricted = {
      ...gameCatalog.phrases.find((phrase) => phrase.id === 'red-folded-chairman-noun-001')!,
      characterIds: ['red-folded-chairman'],
    };
    const phrases = gameCatalog.phrases.map((phrase) =>
      phrase.id === restricted.id ? restricted : phrase,
    );
    const result = generateBoard({ ...request(), phrases });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.board.slots.some((slot) => slot.phraseId === 'red-folded-chairman-noun-001'),
      ).toBe(false);
    }
  });

  test('rejects a pool that fills the fixed slots but not the variable slots', () => {
    const open = gameCatalog.phrases.filter((phrase) => !phrase.characterIds && !phrase.sceneIds);
    const take = (role: string, count: number) =>
      open
        .filter((phrase) => phrase.role === role)
        .slice(0, count)
        .map(({ id }) => id);
    const scenePhraseIds = [
      ...take('noun', 3),
      ...take('verb', 3),
      ...take('predicate', 1),
      ...take('continuation', 1),
    ];
    expect(scenePhraseIds).toHaveLength(8);
    expect(generateBoard({ ...request(1), scenePhraseIds })).toMatchObject({
      ok: false,
      error: { code: 'impossible-content-pool' },
    });
  });

  test('skips the forced connector below the 10 percent connector roll', () => {
    let calls = 0;
    const random: RandomSource = {
      next(seed) {
        calls += 1;
        return { value: calls === 8 ? 0.05 : 0.01, nextSeed: seed + 1 };
      },
    };
    const result = generateBoard(request(1), random);
    expect(result.ok).toBe(true);
    // Seven fixed draws, the connector roll, the continuation draw, one
    // variable draw, and eight shuffle draws. A forced connector would add
    // its kind and phrase draws.
    expect(calls).toBe(18);
  });

  test('reports the available role counts for an impossible scene pool', () => {
    const result = generateBoard({
      ...request(),
      scenePhraseIds: ['common-conjunction-001'],
    });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'impossible-content-pool',
        facts: { sceneId: scene.id, requiredSlots: 9 },
      },
    });
  });
});
