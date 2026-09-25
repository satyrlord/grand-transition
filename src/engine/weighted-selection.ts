import type { Phrase } from '../content/schemas.ts';

export type WeightedPhrase = Readonly<{
  phrase: Phrase;
  weight: number;
}>;

const rarityWeights = {
  common: 4,
  uncommon: 2,
  rare: 1,
} as const satisfies Readonly<Record<Phrase['rarity'], number>>;

/** Draw weight shared by the public board and the private hands. */
export function rarityWeight(phrase: Phrase): number {
  return rarityWeights[phrase.rarity];
}

/** Selects one candidate for a random value in [0, 1). */
export function pickWeighted(candidates: readonly WeightedPhrase[], value: number): WeightedPhrase {
  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  let threshold = value * totalWeight;
  for (const candidate of candidates) {
    threshold -= candidate.weight;
    if (threshold < 0) return candidate;
  }
  return candidates.at(-1)!;
}

/** A connector that can join two complete clauses. */
export function isClauseConnector(candidate: WeightedPhrase): boolean {
  const kind = candidate.phrase.connectorKind;
  return kind === 'and' || kind === 'but' || kind === 'yet';
}

/**
 * Keeps the connectors of the kind that a random roll prefers: a contrast
 * connector for a quarter of the rolls and `and` otherwise. When no connector
 * of that kind is available, every connector stays available.
 */
export function preferredConnectors(
  connectors: readonly WeightedPhrase[],
  roll: number,
): readonly WeightedPhrase[] {
  const preferredKinds: readonly string[] = roll < 0.25 ? ['but', 'yet'] : ['and'];
  const preferred = connectors.filter((candidate) =>
    preferredKinds.includes(candidate.phrase.connectorKind ?? ''),
  );
  return preferred.length > 0 ? preferred : connectors;
}
