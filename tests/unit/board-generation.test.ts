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
import { prepareEnglishGrammarPhrase } from '../../src/engine/grammar/english-grammar-adapter';
import { englishGameLocale } from '../../src/localization/en-game-locale';

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

function expectStandardComposition(board: GeneratedBoard): void {
  const standardRoles = board.slots
    .filter((slot) => slot.source === 'standard')
    .map((slot) => slot.role);

  expect(standardRoles.filter((role) => role === 'noun')).toHaveLength(3);
  expect(standardRoles.filter((role) => role === 'verb')).toHaveLength(3);
  expect(standardRoles.filter((role) => role === 'predicate')).toHaveLength(1);
  expect(board.slots.filter((slot) => slot.source === 'wildcard')).toHaveLength(
    2,
  );
}

function expectRestrictionCompliance(
  board: GeneratedBoard,
  request: BoardGenerationRequest,
): void {
  const phrases = phraseById(request);
  for (const slot of board.slots) {
    const phrase = phrases.get(slot.phraseId)!;
    expect(slot.role).toBe(phrase.role);
    expect(request.scenePhraseIds).toContain(phrase.id);
    expect(phrase.sceneIds ?? [request.sceneId]).toContain(request.sceneId);
    expect(
      request.playerCharacterIds.some(
        (characterId, playerIndex) =>
          request.playerPublicPhraseIds[playerIndex].includes(phrase.id) &&
          (!phrase.characterIds || phrase.characterIds.includes(characterId)),
      ),
    ).toBe(true);
  }
}

function expectNumberCompatibility(
  board: GeneratedBoard,
  request: BoardGenerationRequest,
): void {
  const phrases = phraseById(request);
  for (const slot of board.slots) {
    const phrase = phrases.get(slot.phraseId)!;
    if (phrase.role !== 'noun' && phrase.role !== 'verb') continue;

    const prepared = prepareEnglishGrammarPhrase(phrase, englishGameLocale);
    expect(prepared.singularText).not.toBe('');
    expect(prepared.pluralText).not.toBe('');
    if (!phrase.numberForms) {
      expect(prepared.singularText).toBe(prepared.defaultText);
      expect(prepared.pluralText).toBe(prepared.defaultText);
    }
  }
}

function expectBoardInvariants(
  board: GeneratedBoard,
  request: BoardGenerationRequest,
): void {
  expect(board.slots).toHaveLength(boardSlotCount);
  expect(new Set(board.slots.map((slot) => slot.id))).toHaveLength(
    boardSlotCount,
  );
  expect(new Set(board.slots.map((slot) => slot.phraseId))).toHaveLength(
    boardSlotCount,
  );
  expectStandardComposition(board);
  expectRestrictionCompliance(board, request);
  expectNumberCompatibility(board, request);
  for (const characterId of request.playerCharacterIds) {
    expectPlayerPaths(board, request, characterId);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function makeImpossibleRequest(
  request: BoardGenerationRequest,
): BoardGenerationRequest {
  const nounId = request.phrases
    .filter((phrase) => phrase.role === 'noun')
    .at(-1)!.id;
  return {
    ...request,
    scenePhraseIds: request.scenePhraseIds.filter((id) => id !== nounId),
  };
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
    expectBoardInvariants(board, request);
  });

  test('proves all invariants across thousands of generated boards', () => {
    fc.assert(
      fc.property(fc.integer(), fc.boolean(), (seed, forceFailure) => {
        const feasibleRequest = sampleRequest(seed);
        const request = forceFailure
          ? makeImpossibleRequest(feasibleRequest)
          : feasibleRequest;
        const result = generateBoard(request);

        if (forceFailure) {
          expect(result.ok).toBe(false);
          if (result.ok) return;
          expect(result.error).toEqual({
            kind: 'board-generation-error',
            code: 'impossible-content-pool',
            facts: expect.objectContaining({
              sceneId: request.sceneId,
              playerCharacterIds: request.playerCharacterIds,
              requiredSlots: boardSlotCount,
              availableByRole: expect.any(Array),
            }),
          });
          return;
        }

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expectBoardInvariants(result.board, request);
      }),
      { numRuns: 3_000, seed: 20_260_822 },
    );
  });

  test('does not mutate a frozen request or phrase catalog', () => {
    const request = deepFreeze(sampleRequest(307));
    const snapshot = structuredClone(request);

    const result = generateBoard(request);

    expect(result.ok).toBe(true);
    expect(request).toEqual(snapshot);
    expect(request.phrases).toEqual(snapshot.phrases);
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
    const request = makeImpossibleRequest(sampleRequest(7));
    let randomStepCount = 0;
    const result = generateBoard(request, {
      next(seed) {
        randomStepCount += 1;
        return seededRandomSource.next(seed);
      },
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
          availableByRole: [
            { role: 'noun', count: 2 },
            { role: 'verb', count: 3 },
            { role: 'predicate', count: 2 },
            { role: 'conjunction', count: 1 },
            { role: 'ending', count: 1 },
            { role: 'continuation', count: 1 },
          ],
        },
      },
    });
    expect(randomStepCount).toBe(0);
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
