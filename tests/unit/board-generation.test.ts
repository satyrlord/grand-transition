import { describe, expect, test } from 'vitest';
import { sampleContent } from '../../src/game-content';
import {
  boardSlotCount,
  generateBoard,
  type BoardGenerationRequest,
} from '../../src/engine/board-generation';
import type { RandomSource } from '../../src/engine/random-source';

const scene = sampleContent.scenes[0]!;
const request = (seed = 20260822): BoardGenerationRequest => ({
  seed,
  phrases: sampleContent.phrases,
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
    const count = (role: string) =>
      board.slots.filter((slot) => slot.role === role).length;
    expect(count('noun')).toBeGreaterThanOrEqual(3);
    expect(count('verb')).toBeGreaterThanOrEqual(3);
    expect(count('predicate')).toBeGreaterThanOrEqual(1);
  });

  test('can draw a modifier only through a variable board slot', () => {
    const board = Array.from({ length: 500 }, (_, seed) =>
      expectBoard(seed),
    ).find((candidate) =>
      candidate.slots.some((slot) => slot.role === 'modifier'),
    );
    expect(board).toBeDefined();
    expect(
      board!.slots.filter((slot) =>
        ['noun', 'verb', 'predicate'].includes(slot.role),
      ),
    ).toHaveLength(7);
  });

  test.each([
    [0.05, 0],
    [0.1, 1],
    [0.5, 1],
    [0.75, 1],
    [0.9, 1],
  ] as const)(
    'uses the shipped connector-count bands at roll %s',
    (connectorRoll, expectedConnectors) => {
      let calls = 0;
      const random: RandomSource = {
        next(seed) {
          calls += 1;
          return {
            value:
              calls === 9
                ? connectorRoll
                : calls === 10 && connectorRoll < 0.1
                  ? 0
                  : 0.01,
            nextSeed: seed + 1,
          };
        },
      };
      const result = generateBoard(request(1), random);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(
        result.board.slots.filter((slot) => slot.role === 'conjunction'),
      ).toHaveLength(expectedConnectors);
      expect(
        result.board.slots.filter((slot) => slot.role === 'continuation'),
      ).toHaveLength(1);
    },
  );

  test('rejects a board pool without the one universal continuation', () => {
    const scenePhraseIds = scene.phrasePool.filter(
      (phraseId) => phraseId !== 'ellipsis',
    );
    const result = generateBoard({ ...request(1), scenePhraseIds });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'impossible-content-pool',
        facts: {
          availableByRole: expect.arrayContaining([
            { role: 'continuation', count: 0 },
          ]),
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
            value: calls === 9 ? 0.5 : calls === 10 ? kindRoll : 0.01,
            nextSeed: seed + 1,
          };
        },
      };
      const result = generateBoard(request(1), random);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const connector = result.board.slots.find(
        (slot) => slot.role === 'conjunction',
      )!;
      expect(expectedKinds).toContain(
        sampleContent.phrases.find((phrase) => phrase.id === connector.phraseId)
          ?.connectorKind,
      );
    },
  );

  test('deals without a forced connector when only clause connectors remain', () => {
    const scenePhraseIds = scene.phrasePool.filter((phraseId) => {
      const phrase = sampleContent.phrases.find(
        (candidate) => candidate.id === phraseId,
      );
      return (
        phrase?.role !== 'conjunction' ||
        ['because', 'for', 'so'].includes(phrase.connectorKind ?? '')
      );
    });
    const result = generateBoard({ ...request(1), scenePhraseIds });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const slot of result.board.slots.filter(
      (candidate) => candidate.role === 'conjunction',
    )) {
      expect(['because', 'for', 'so']).toContain(
        sampleContent.phrases.find((phrase) => phrase.id === slot.phraseId)
          ?.connectorKind,
      );
    }
  });

  test('never puts a character-restricted phrase on the common board', () => {
    const restricted = {
      ...sampleContent.phrases.find(
        (phrase) => phrase.id === 'national-salvation-committee',
      )!,
      characterIds: ['red-folded-chairman'],
    };
    const phrases = sampleContent.phrases.map((phrase) =>
      phrase.id === restricted.id ? restricted : phrase,
    );
    const result = generateBoard({ ...request(), phrases });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.board.slots.some(
          (slot) => slot.phraseId === 'national-salvation-committee',
        ),
      ).toBe(false);
    }
  });

  test('reports the available role counts for an impossible scene pool', () => {
    const result = generateBoard({
      ...request(),
      scenePhraseIds: ['coalition-and'],
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
