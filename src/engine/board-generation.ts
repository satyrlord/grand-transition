import type { Phrase } from '../content/schemas.ts';
import { seededRandomSource, type RandomSource } from './random-source.ts';
import {
  isClauseConnector,
  pickWeighted,
  preferredConnectors,
  rarityWeight,
  type WeightedPhrase,
} from './weighted-selection.ts';

export const boardSlotCount = 9;

const phraseRoles: readonly Phrase['role'][] = [
  'noun',
  'verb',
  'predicate',
  'modifier',
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
  readonly includeContinuation?: boolean;
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

export function generateBoard(
  request: BoardGenerationRequest,
  randomSource: RandomSource = seededRandomSource,
): BoardGenerationResult {
  const initialSeed = Math.trunc(request.seed) >>> 0;
  const cursor: RandomCursor = { seed: initialSeed };
  const includeContinuation = request.includeContinuation ?? true;
  const candidates = collectCandidates(request);
  const byRole = new Map(
    phraseRoles.map((role) => [
      role,
      candidates.filter((candidate) => candidate.phrase.role === role),
    ]),
  );

  // Every role has an entry, so the checks below guarantee each fixed slot.
  const roleCount = (role: Phrase['role']) => byRole.get(role)!.length;
  if (
    roleCount('noun') < 3 ||
    roleCount('verb') < 3 ||
    roleCount('predicate') < 1 ||
    (includeContinuation && roleCount('continuation') !== 1)
  ) {
    return impossiblePool(request, byRole);
  }

  const pending: Omit<BoardSlot, 'id'>[] = [];
  addRandomDistinct(pending, byRole.get('noun')!, 3, 'standard', cursor, randomSource);
  addRandomDistinct(pending, byRole.get('verb')!, 3, 'standard', cursor, randomSource);
  addRandomDistinct(pending, byRole.get('predicate')!, 1, 'standard', cursor, randomSource);

  if (includeContinuation) {
    const continuation = takeWeighted(byRole.get('continuation')!, cursor, randomSource).phrase;
    pending.push({
      phraseId: continuation.id,
      role: continuation.role,
      source: 'wildcard',
    });
  }

  const connectorRoll = nextRandom(cursor, randomSource);
  const forcedConnectors = byRole.get('conjunction')!.filter(isClauseConnector);
  // The fixed slots hold no conjunction, so every clause connector is still
  // available for the one forced connector slot.
  if (forcedConnectors.length > 0 && connectorRoll >= 0.1) {
    const kindRoll = nextRandom(cursor, randomSource);
    const pool = preferredConnectors(forcedConnectors, kindRoll);
    const connector = takeWeighted(pool, cursor, randomSource).phrase;
    pending.push({
      phraseId: connector.id,
      role: connector.role,
      source: 'wildcard',
    });
  }

  while (pending.length < boardSlotCount) {
    const selectedPhraseIds = new Set(pending.map((slot) => slot.phraseId));
    const unused = candidates.filter(
      (candidate) =>
        candidate.phrase.role !== 'continuation' && !selectedPhraseIds.has(candidate.phrase.id),
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

function collectCandidates(request: BoardGenerationRequest): readonly WeightedPhrase[] {
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
    return [{ phrase, weight: rarityWeight(phrase) }];
  });
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
    const selected = takeWeighted(remaining, cursor, randomSource);
    const phrase = selected.phrase;
    remaining = remaining.filter((candidate) => candidate.phrase.id !== phrase.id);
    target.push({ phraseId: phrase.id, role: phrase.role, source });
  }
}

function takeWeighted(
  candidates: readonly WeightedPhrase[],
  cursor: RandomCursor,
  randomSource: RandomSource,
): WeightedPhrase {
  return pickWeighted(candidates, nextRandom(cursor, randomSource));
}

function shuffle<T>(values: readonly T[], cursor: RandomCursor, randomSource: RandomSource): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(nextRandom(cursor, randomSource) * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex]!, shuffled[index]!];
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
          count: candidatesByRole.get(role)!.length,
        })),
      },
    },
  };
}
