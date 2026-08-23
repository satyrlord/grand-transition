import type { Phrase } from '../content/schemas';
import { seededRandomSource, type RandomSource } from './random-source';

export const privateHandSize = 2;

export interface PrivateHandGenerationRequest {
  readonly seed: number;
  readonly playerId: string;
  readonly characterId: string;
  readonly sceneId: string;
  readonly phrases: readonly Phrase[];
  readonly privatePhraseIds: readonly string[];
  readonly scenePhraseIds: readonly string[];
  readonly generalPhraseIds: readonly string[];
  readonly legalRoles: readonly Phrase['role'][];
  readonly opponentWeaknessTags: readonly string[];
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

export interface PrivateHandWeightContext {
  readonly legalRoles: ReadonlySet<Phrase['role']>;
  readonly opponentWeaknessTags: ReadonlySet<string>;
  readonly scenePhraseIds: ReadonlySet<string>;
  readonly generalPhraseIds: ReadonlySet<string>;
}

const rarityWeights = {
  common: 4,
  uncommon: 2,
  rare: 1,
} as const satisfies Readonly<Record<Phrase['rarity'], number>>;

export function privateHandCandidateWeight(
  phrase: Phrase,
  context: PrivateHandWeightContext,
): number {
  const legalRoleBonus = context.legalRoles.has(phrase.role) ? 4 : 0;
  const weaknessBonus =
    [...new Set(phrase.tags)].filter((tag) =>
      context.opponentWeaknessTags.has(tag),
    ).length * 3;
  const characterOnlyBonus =
    !context.scenePhraseIds.has(phrase.id) &&
    !context.generalPhraseIds.has(phrase.id)
      ? 1
      : 0;

  return (
    rarityWeights[phrase.rarity] +
    legalRoleBonus +
    weaknessBonus +
    characterOnlyBonus
  );
}

export function generatePrivateHand(
  request: PrivateHandGenerationRequest,
  randomSource: RandomSource = seededRandomSource,
): PrivateHandGenerationResult {
  const initialSeed = Math.trunc(request.seed) >>> 0;
  const candidates = collectCandidates(request);

  if (candidates.length < privateHandSize) {
    return {
      ok: false,
      error: {
        kind: 'private-hand-generation-error',
        code: 'impossible-private-hand',
        facts: {
          playerId: request.playerId,
          sceneId: request.sceneId,
          requiredCount: privateHandSize,
          availableCount: candidates.length,
        },
      },
    };
  }

  const context: PrivateHandWeightContext = {
    legalRoles: new Set(request.legalRoles),
    opponentWeaknessTags: new Set(request.opponentWeaknessTags),
    scenePhraseIds: new Set(request.scenePhraseIds),
    generalPhraseIds: new Set(request.generalPhraseIds),
  };
  const remaining = [...candidates];
  const selected: Phrase[] = [];
  let seed = initialSeed;

  while (selected.length < privateHandSize) {
    const weights = remaining.map((phrase) =>
      privateHandCandidateWeight(phrase, context),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const step = randomSource.next(seed);
    seed = step.nextSeed;
    let target = Math.floor(step.value * totalWeight);
    let selectedIndex = weights.length - 1;

    for (const [index, weight] of weights.entries()) {
      if (target < weight) {
        selectedIndex = index;
        break;
      }
      target -= weight;
    }

    selected.push(remaining[selectedIndex]!);
    remaining.splice(selectedIndex, 1);
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
): readonly Phrase[] {
  const privatePhraseIds = new Set(request.privatePhraseIds);
  const excludedPhraseIds = new Set(request.excludedPhraseIds ?? []);
  const uniquePhrases = new Map<string, Phrase>();

  for (const phrase of request.phrases) {
    if (
      uniquePhrases.has(phrase.id) ||
      !privatePhraseIds.has(phrase.id) ||
      excludedPhraseIds.has(phrase.id)
    ) {
      continue;
    }
    if (
      phrase.characterIds &&
      !phrase.characterIds.includes(request.characterId)
    ) {
      continue;
    }
    if (phrase.sceneIds && !phrase.sceneIds.includes(request.sceneId)) {
      continue;
    }
    uniquePhrases.set(phrase.id, phrase);
  }

  return [...uniquePhrases.values()].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}
