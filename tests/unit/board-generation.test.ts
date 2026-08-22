import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  boardSlotCount,
  generateBoard,
  type BoardGenerationRequest,
  type GeneratedBoard,
} from '../../src/engine/board-generation';
import { seededRandomSource } from '../../src/engine/random-source';
import { sampleContent } from '../../src/content/sample-content';
import type { Phrase } from '../../src/content/schemas';

const playerCharacterIds = ['civic-fox', 'brass-peacock'] as const;

function sampleRequest(
  seed: number,
  recentPhraseIds: readonly string[] = [],
): BoardGenerationRequest {
  const scene = sampleContent.scenes[0]!;
  return {
    seed,
    phrases: sampleContent.phrases,
    sceneId: scene.id,
    scenePhraseIds: scene.phrasePool,
    playerCharacterIds,
    playerPublicPhraseIds: [
      sampleContent.characters[0]!.phrasePools.public,
      sampleContent.characters[1]!.phrasePools.public,
    ],
    recentPhraseIds,
  };
}

function expectBoard(request: BoardGenerationRequest): GeneratedBoard {
  const result = generateBoard(request);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(
    true,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.board;
}

function phraseById(
  request: BoardGenerationRequest,
): ReadonlyMap<string, Phrase> {
  return new Map(request.phrases.map((phrase) => [phrase.id, phrase]));
}

function expectPlayerPaths(
  board: GeneratedBoard,
  request: BoardGenerationRequest,
  characterId: string,
): void {
  const phrases = phraseById(request);
  const playerIndex = request.playerCharacterIds.indexOf(characterId);
  const available = board.slots
    .map((slot) => phrases.get(slot.phraseId)!)
    .filter(
      (phrase) =>
        request.playerPublicPhraseIds[playerIndex]?.includes(phrase.id) &&
        (!phrase.characterIds || phrase.characterIds.includes(characterId)),
    );
  const nouns = available.filter((phrase) => phrase.role === 'noun');
  const verbs = available.filter((phrase) => phrase.role === 'verb');
  const predicates = available.filter((phrase) => phrase.role === 'predicate');

  expect(nouns.length).toBeGreaterThanOrEqual(2);
  expect(verbs.length).toBeGreaterThanOrEqual(1);
  expect(predicates.length).toBeGreaterThanOrEqual(1);
  expect(nouns[0]?.id).not.toBe(nouns[1]?.id);
}

function makePhrase(id: string, role: Phrase['role']): Phrase {
  const source = sampleContent.phrases[0]!;
  return {
    ...structuredClone(source),
    id,
    role,
    textKey: `phrase.${id}`,
    numberForms:
      role === 'noun' || role === 'verb'
        ? {
            singularKey: `phrase.${id}.singular`,
            pluralKey: `phrase.${id}.plural`,
          }
        : undefined,
    characterIds: undefined,
    sceneIds: undefined,
  };
}

function abundantRequest(seed: number): BoardGenerationRequest {
  const counts: Readonly<Record<Phrase['role'], number>> = {
    noun: 6,
    verb: 6,
    predicate: 5,
    conjunction: 4,
    continuation: 4,
    ending: 4,
  };
  const phrases = Object.entries(counts).flatMap(([role, count]) =>
    Array.from({ length: count }, (_, index) =>
      makePhrase(`${role}-${index + 1}`, role as Phrase['role']),
    ),
  );

  return {
    seed,
    phrases,
    sceneId: 'test-scene',
    scenePhraseIds: phrases.map((phrase) => phrase.id),
    playerCharacterIds,
    playerPublicPhraseIds: [
      phrases.map((phrase) => phrase.id),
      phrases.map((phrase) => phrase.id),
    ],
  };
}

describe('seeded board generation', () => {
  test('produces repeatable random steps in the unit interval', () => {
    const first = seededRandomSource.next(42);
    const repeated = seededRandomSource.next(42);
    const next = seededRandomSource.next(first.nextSeed);

    expect(first).toEqual(repeated);
    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(next).not.toEqual(first);
  });

  test('reproduces the complete board from a fixed seed', () => {
    const first = expectBoard(sampleRequest(2_026_082_2));
    const repeated = expectBoard(sampleRequest(2_026_082_2));
    const different = expectBoard(sampleRequest(2_026_082_3));

    expect(repeated).toEqual(first);
    expect(different).not.toEqual(first);
  });

  test('enforces composition, unique identifiers, restrictions, and player paths', () => {
    const request = sampleRequest(1729);
    const board = expectBoard(request);
    const phrases = phraseById(request);
    const standardRoles = board.slots
      .filter((slot) => slot.source === 'standard')
      .map((slot) => slot.role);

    expect(board.slots).toHaveLength(boardSlotCount);
    expect(standardRoles.filter((role) => role === 'noun')).toHaveLength(3);
    expect(standardRoles.filter((role) => role === 'verb')).toHaveLength(3);
    expect(standardRoles.filter((role) => role === 'predicate')).toHaveLength(
      1,
    );
    expect(
      board.slots.filter((slot) => slot.source === 'wildcard'),
    ).toHaveLength(2);
    expect(new Set(board.slots.map((slot) => slot.id))).toHaveLength(
      boardSlotCount,
    );
    expect(new Set(board.slots.map((slot) => slot.phraseId))).toHaveLength(
      boardSlotCount,
    );

    for (const slot of board.slots) {
      const phrase = phrases.get(slot.phraseId)!;
      expect(request.scenePhraseIds).toContain(phrase.id);
      expect(phrase.sceneIds ?? [request.sceneId]).toContain(request.sceneId);
      expect(
        !phrase.characterIds ||
          request.playerCharacterIds.some((id) =>
            phrase.characterIds?.includes(id),
          ),
      ).toBe(true);
    }
    for (const characterId of request.playerCharacterIds) {
      expectPlayerPaths(board, request, characterId);
    }
  });

  test('proves all invariants across thousands of generated boards', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const request = sampleRequest(seed);
        const result = generateBoard(request);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.board.slots).toHaveLength(boardSlotCount);
        expect(new Set(result.board.slots.map((slot) => slot.id))).toHaveLength(
          boardSlotCount,
        );
        expect(
          new Set(result.board.slots.map((slot) => slot.phraseId)),
        ).toHaveLength(boardSlotCount);
        for (const characterId of request.playerCharacterIds) {
          expectPlayerPaths(result.board, request, characterId);
        }
      }),
      { numRuns: 3_000, seed: 20_260_822 },
    );
  });

  test('uses the approved wildcard weights when all roles are feasible', () => {
    const counts: Record<Phrase['role'], number> = {
      conjunction: 0,
      continuation: 0,
      verb: 0,
      noun: 0,
      predicate: 0,
      ending: 0,
    };
    const boardCount = 10_000;

    for (let seed = 0; seed < boardCount; seed += 1) {
      const board = expectBoard(abundantRequest(seed));
      for (const slot of board.slots) {
        if (slot.source === 'wildcard') counts[slot.role] += 1;
      }
    }

    const wildcardCount = boardCount * 2;
    expect(counts.conjunction / wildcardCount).toBeCloseTo(0.4, 1);
    expect(counts.continuation / wildcardCount).toBeCloseTo(0.25, 1);
    expect(counts.verb / wildcardCount).toBeCloseTo(0.2, 1);
    expect(counts.noun / wildcardCount).toBeCloseTo(0.1, 1);
    expect(counts.predicate / wildcardCount).toBeCloseTo(0.025, 1);
    expect(counts.ending / wildcardCount).toBeCloseTo(0.025, 1);
  });

  test('excludes recent phrases when valid alternatives exist', () => {
    const request = abundantRequest(91);
    const recentPhraseIds = [
      'noun-1',
      'verb-1',
      'predicate-1',
      'conjunction-1',
      'continuation-1',
      'ending-1',
    ];
    const board = expectBoard({ ...request, recentPhraseIds });

    expect(board.slots.map((slot) => slot.phraseId)).not.toEqual(
      expect.arrayContaining(recentPhraseIds),
    );
  });

  test('reuses a recent phrase only when its role has no valid alternative', () => {
    const request = sampleRequest(114, ['paper-promise']);
    const board = expectBoard(request);

    expect(board.slots.map((slot) => slot.phraseId)).toContain('paper-promise');
  });

  test('returns a bounded typed failure for an impossible content pool', () => {
    const request = sampleRequest(7);
    const nounIds = request.phrases
      .filter((phrase) => phrase.role === 'noun')
      .map((phrase) => phrase.id);
    const result = generateBoard({
      ...request,
      scenePhraseIds: request.scenePhraseIds.filter(
        (id) => id !== nounIds.at(-1),
      ),
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'board-generation-error',
        code: 'impossible-content-pool',
        facts: {
          sceneId: 'echo-chamber',
          playerCharacterIds,
          requiredSlots: 9,
          availableByRole: expect.arrayContaining([{ role: 'noun', count: 2 }]),
        },
      },
    });
  });

  test('rejects a pool that cannot give both players legal branches', () => {
    const request = abundantRequest(17);
    const phrases = request.phrases.map((phrase) =>
      phrase.role === 'predicate'
        ? { ...phrase, characterIds: ['civic-fox'] }
        : phrase,
    );
    const result = generateBoard({ ...request, phrases });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('impossible-content-pool');
    }
  });
});
