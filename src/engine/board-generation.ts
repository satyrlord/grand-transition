import type { Phrase } from '../content/schemas';
import { seededRandomSource, type RandomSource } from './random-source';

export const boardSlotCount = 9;

const phraseRoles: readonly Phrase['role'][] = [
  'noun',
  'verb',
  'predicate',
  'conjunction',
  'ending',
  'continuation',
];

export interface BoardGenerationRequest {
  readonly seed: number;
  readonly phrases: readonly Phrase[];
  readonly sceneId: string;
  readonly scenePhraseIds: readonly string[];
  readonly excludedPhraseIds?: readonly string[];
}

export interface BoardSlot {
  readonly id: string;
  readonly phraseId: string;
  readonly role: Phrase['role'];
  readonly source: 'standard' | 'wildcard';
}

export interface GeneratedBoard {
  readonly seed: number;
  readonly nextSeed: number;
  readonly slots: readonly BoardSlot[];
}

export interface BoardGenerationFailure {
  readonly kind: 'board-generation-error';
  readonly code: 'impossible-content-pool';
  readonly facts: {
    readonly sceneId: string;
    readonly requiredSlots: typeof boardSlotCount;
    readonly availableByRole: readonly Readonly<{
      role: Phrase['role'];
      count: number;
    }>[];
  };
}

export type BoardGenerationResult =
  | Readonly<{ ok: true; board: GeneratedBoard }>
  | Readonly<{ ok: false; error: BoardGenerationFailure }>;

interface RandomCursor {
  seed: number;
}

interface WeightedPhrase {
  readonly phrase: Phrase;
  readonly weight: number;
}

export function generateBoard(
  request: BoardGenerationRequest,
  randomSource: RandomSource = seededRandomSource,
): BoardGenerationResult {
  const initialSeed = Math.trunc(request.seed) >>> 0;
  const cursor: RandomCursor = { seed: initialSeed };
  const candidates = collectCandidates(request);
  const byRole = new Map(
    phraseRoles.map((role) => [
      role,
      candidates.filter((candidate) => candidate.phrase.role === role),
    ]),
  );

  if (
    (byRole.get('noun')?.length ?? 0) < 3 ||
    (byRole.get('verb')?.length ?? 0) < 3 ||
    (byRole.get('predicate')?.length ?? 0) < 1
  ) {
    return impossiblePool(request, byRole);
  }

  const pending: Omit<BoardSlot, 'id'>[] = [];
  addRandomDistinct(
    pending,
    byRole.get('noun')!,
    3,
    'standard',
    cursor,
    randomSource,
  );
  addRandomDistinct(
    pending,
    byRole.get('verb')!,
    3,
    'standard',
    cursor,
    randomSource,
  );
  addRandomDistinct(
    pending,
    byRole.get('predicate')!,
    1,
    'standard',
    cursor,
    randomSource,
  );

  const connectorRoll = nextRandom(cursor, randomSource);
  const forcedConnectors = byRole
    .get('conjunction')!
    .filter((candidate) =>
      ['and', 'but', 'yet'].includes(candidate.phrase.connectorKind ?? ''),
    );
  const connectorCount =
    forcedConnectors.length === 0
      ? 0
      : connectorRoll < 0.1
        ? 0
        : connectorRoll < 0.75
          ? 1
          : 2;
  for (let index = 0; index < connectorCount; index += 1) {
    const connectorRoll = nextRandom(cursor, randomSource);
    const preferredKinds =
      connectorRoll < 0.25 ? new Set(['but', 'yet']) : new Set(['and']);
    const selectedPhraseIds = new Set(pending.map((slot) => slot.phraseId));
    const availableConnectors = forcedConnectors.filter(
      (candidate) => !selectedPhraseIds.has(candidate.phrase.id),
    );
    const preferred = availableConnectors.filter((candidate) =>
      preferredKinds.has(candidate.phrase.connectorKind ?? ''),
    );
    const pool = preferred.length > 0 ? preferred : availableConnectors;
    if (pool.length === 0) return impossiblePool(request, byRole);
    const connector = takeWeighted(pool, cursor, randomSource).phrase;
    pending.push({
      phraseId: connector.id,
      role: connector.role,
      source: 'wildcard',
    });
  }

  if (pending.length < boardSlotCount) {
    const continuations = byRole.get('continuation')!;
    if (continuations.length > 0) {
      const continuation = takeWeighted(
        continuations,
        cursor,
        randomSource,
      ).phrase;
      pending.push({
        phraseId: continuation.id,
        role: continuation.role,
        source: 'wildcard',
      });
    }
  }

  while (pending.length < boardSlotCount) {
    const selectedPhraseIds = new Set(pending.map((slot) => slot.phraseId));
    const unused = candidates.filter(
      (candidate) =>
        candidate.phrase.role !== 'continuation' &&
        !selectedPhraseIds.has(candidate.phrase.id),
    );
    if (unused.length === 0) return impossiblePool(request, byRole);
    const phrase = takeWeighted(unused, cursor, randomSource).phrase;
    pending.push({
      phraseId: phrase.id,
      role: phrase.role,
      source: 'wildcard',
    });
  }

  const slots = shuffle(pending, cursor, randomSource).map((slot, index) => ({
    ...slot,
    id: `board-${initialSeed}-${index + 1}`,
  }));
  return {
    ok: true,
    board: { seed: initialSeed, nextSeed: cursor.seed, slots },
  };
}

function collectCandidates(
  request: BoardGenerationRequest,
): readonly WeightedPhrase[] {
  const scenePhraseIds = new Set(request.scenePhraseIds);
  const excludedPhraseIds = new Set(request.excludedPhraseIds ?? []);
  return request.phrases.flatMap((phrase) => {
    if (
      !scenePhraseIds.has(phrase.id) ||
      excludedPhraseIds.has(phrase.id) ||
      (phrase.sceneIds && !phrase.sceneIds.includes(request.sceneId)) ||
      phrase.characterIds
    ) {
      return [];
    }
    return [{ phrase, weight: drawCount(phrase) }];
  });
}

function drawCount(phrase: Phrase): number {
  return phrase.rarity === 'common' ? 4 : phrase.rarity === 'uncommon' ? 2 : 1;
}

function addRandomDistinct(
  target: Omit<BoardSlot, 'id'>[],
  candidates: readonly WeightedPhrase[],
  count: number,
  source: BoardSlot['source'],
  cursor: RandomCursor,
  randomSource: RandomSource,
): void {
  let remaining = [...candidates];
  for (let index = 0; index < count; index += 1) {
    if (remaining.length === 0) return;
    const selected = takeWeighted(remaining, cursor, randomSource);
    const phrase = selected.phrase;
    remaining = remaining.filter(
      (candidate) => candidate.phrase.id !== phrase.id,
    );
    target.push({ phraseId: phrase.id, role: phrase.role, source });
  }
}

function takeWeighted(
  candidates: readonly WeightedPhrase[],
  cursor: RandomCursor,
  randomSource: RandomSource,
): WeightedPhrase {
  const totalWeight = candidates.reduce(
    (total, candidate) => total + candidate.weight,
    0,
  );
  let threshold = nextRandom(cursor, randomSource) * totalWeight;
  for (const candidate of candidates) {
    threshold -= candidate.weight;
    if (threshold < 0) return candidate;
  }
  return candidates.at(-1)!;
}

function shuffle<T>(
  values: readonly T[],
  cursor: RandomCursor,
  randomSource: RandomSource,
): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(
      nextRandom(cursor, randomSource) * (index + 1),
    );
    [shuffled[index], shuffled[targetIndex]] = [
      shuffled[targetIndex]!,
      shuffled[index]!,
    ];
  }
  return shuffled;
}

function nextRandom(cursor: RandomCursor, randomSource: RandomSource): number {
  const step = randomSource.next(cursor.seed);
  cursor.seed = step.nextSeed;
  return step.value;
}

function impossiblePool(
  request: BoardGenerationRequest,
  candidatesByRole: ReadonlyMap<Phrase['role'], readonly WeightedPhrase[]>,
): BoardGenerationResult {
  return {
    ok: false,
    error: {
      kind: 'board-generation-error',
      code: 'impossible-content-pool',
      facts: {
        sceneId: request.sceneId,
        requiredSlots: boardSlotCount,
        availableByRole: phraseRoles.map((role) => ({
          role,
          count: candidatesByRole.get(role)?.length ?? 0,
        })),
      },
    },
  };
}
