import type { Phrase } from '../content/schemas';
import { seededRandomSource, type RandomSource } from './random-source';
import {
  isClauseConnector,
  pickWeighted,
  preferredConnectors,
  rarityWeight,
  type WeightedPhrase,
} from './weighted-selection';

export const privateHandSize = 2;

export interface PrivateHandGenerationRequest {
  readonly seed: number;
  readonly playerId: string;
  readonly characterId: string;
  readonly sceneId: string;
  readonly phrases: readonly Phrase[];
  readonly characterPhraseIds: readonly string[];
  readonly scenePhraseIds: readonly string[];
  readonly generalPhraseIds: readonly string[];
  readonly excludedPhraseIds?: readonly string[];
}

export interface GeneratedPrivateHand {
  readonly seed: number;
  readonly nextSeed: number;
  readonly phraseIds: readonly [string, string];
}

export interface PrivateHandGenerationFailure {
  readonly kind: 'private-hand-generation-error';
  readonly code: 'impossible-private-hand';
  readonly facts: {
    readonly playerId: string;
    readonly sceneId: string;
    readonly requiredCount: typeof privateHandSize;
    readonly availableCount: number;
  };
}

export type PrivateHandGenerationResult =
  | Readonly<{ ok: true; hand: GeneratedPrivateHand }>
  | Readonly<{ ok: false; error: PrivateHandGenerationFailure }>;

export function privateHandCandidateWeight(phrase: Phrase): number {
  return rarityWeight(phrase);
}

export function generatePrivateHand(
  request: PrivateHandGenerationRequest,
  randomSource: RandomSource = seededRandomSource,
): PrivateHandGenerationResult {
  const initialSeed = Math.trunc(request.seed) >>> 0;
  const candidates = collectCandidates(request);
  const availableCount = candidates.length;
  if (availableCount < privateHandSize) {
    return impossibleHand(request, availableCount);
  }

  const selected: Phrase[] = [];
  const remaining = [...candidates];
  let seed = initialSeed;
  let step = randomSource.next(seed);
  seed = step.nextSeed;

  const connectors = remaining.filter(
    (candidate) =>
      candidate.phrase.role === 'conjunction' && isClauseConnector(candidate),
  );
  if (step.value < 0.25 && connectors.length > 0) {
    step = randomSource.next(seed);
    seed = step.nextSeed;
    const pool = preferredConnectors(connectors, step.value);
    step = randomSource.next(seed);
    seed = step.nextSeed;
    const connector = pickWeighted(pool, step.value).phrase;
    selected.push(connector);
    removePhrase(remaining, connector.id);
  }

  while (selected.length < privateHandSize) {
    step = randomSource.next(seed);
    seed = step.nextSeed;
    const phrase = pickWeighted(remaining, step.value).phrase;
    selected.push(phrase);
    removePhrase(remaining, phrase.id);
  }

  return {
    ok: true,
    hand: {
      seed: initialSeed,
      nextSeed: seed,
      phraseIds: [selected[0]!.id, selected[1]!.id],
    },
  };
}

export function privateHandAvailableCount(
  request: PrivateHandGenerationRequest,
): number {
  return collectCandidates(request).length;
}

function collectCandidates(
  request: PrivateHandGenerationRequest,
): readonly WeightedPhrase[] {
  const characterPhraseIds = new Set(request.characterPhraseIds);
  const sharedPhraseIds = new Set([
    ...request.generalPhraseIds,
    ...request.scenePhraseIds,
  ]);
  const excludedPhraseIds = new Set(request.excludedPhraseIds ?? []);
  return request.phrases
    .flatMap((phrase) => {
      if (
        excludedPhraseIds.has(phrase.id) ||
        (phrase.sceneIds && !phrase.sceneIds.includes(request.sceneId))
      ) {
        return [];
      }
      let eligible: boolean;
      if (phrase.characterIds) {
        eligible =
          phrase.characterIds.includes(request.characterId) &&
          characterPhraseIds.has(phrase.id);
      } else {
        eligible = sharedPhraseIds.has(phrase.id);
      }
      if (!eligible) return [];
      return [{ phrase, weight: rarityWeight(phrase) }];
    })
    .sort((left, right) => left.phrase.id.localeCompare(right.phrase.id, 'en'));
}

function removePhrase(phrases: WeightedPhrase[], phraseId: string): void {
  for (let index = phrases.length - 1; index >= 0; index -= 1) {
    if (phrases[index]!.phrase.id === phraseId) phrases.splice(index, 1);
  }
}

function impossibleHand(
  request: PrivateHandGenerationRequest,
  availableCount: number,
): PrivateHandGenerationResult {
  return {
    ok: false,
    error: {
      kind: 'private-hand-generation-error',
      code: 'impossible-private-hand',
      facts: {
        playerId: request.playerId,
        sceneId: request.sceneId,
        requiredCount: privateHandSize,
        availableCount,
      },
    },
  };
}
