import { seededRandomSource, type RandomSource } from './random-source.ts';
import { deepFreeze } from './plain-values.ts';

export type LadderDifficulty = 'local-radio-caller' | 'palace-operator' | 'party-strategist';

export type LadderProgress = Readonly<{
  schemaVersion: 2;
  selectedCharacterId: string;
  seed: number;
  /** One unique opponent per rung. Its length is the rung count. */
  opponentIds: readonly string[];
  /** One scene per rung, in rung order, with the same length. */
  sceneOrder: readonly string[];
  rungIndex: number;
  wins: number;
  losses: number;
  completed: boolean;
  /**
   * Matches started on this rung since the last result. Present only when it
   * is above zero, so an abandoned or reloaded match gets a new deal.
   */
  unfinishedAttempts?: number;
}>;

export type LadderRung = Readonly<{
  rungIndex: number;
  number: number;
  difficulty: LadderDifficulty;
  opponentCharacterId: string;
  sceneId: string;
}>;

export type LadderResult = 'abandon' | 'loss' | 'win';

export function createLadderProgress(
  selectedCharacterId: string,
  seed: number,
  characterIds: readonly string[],
  sceneIds: readonly string[],
  randomSource: RandomSource = seededRandomSource,
): LadderProgress {
  const opponents = characterIds
    .filter((characterId) => characterId !== selectedCharacterId)
    .toSorted();
  const scenes = validSceneIds(sceneIds);
  // The ladder plays each playable scene once, so the scene catalog sets the
  // rung count when the ladder starts.
  const rungCount = scenes.length;
  if (opponents.length < rungCount) {
    throw new Error(
      `A ladder of ${rungCount} rungs needs at least ${rungCount} non-player characters.`,
    );
  }
  if (new Set(opponents).size !== opponents.length) {
    throw new Error('A ladder needs unique character identifiers.');
  }
  let nextSeed = seed >>> 0;
  const opponentShuffle = shuffle(opponents, nextSeed, randomSource);
  nextSeed = opponentShuffle.nextSeed;
  const sceneShuffle = shuffle(scenes, nextSeed, randomSource);
  return deepFreeze({
    schemaVersion: 2,
    selectedCharacterId,
    seed: seed >>> 0,
    opponentIds: opponentShuffle.values.slice(0, rungCount),
    sceneOrder: sceneShuffle.values,
    rungIndex: 0,
    wins: 0,
    losses: 0,
    completed: false,
  });
}

export function ladderRungCount(progress: LadderProgress): number {
  return progress.opponentIds.length;
}

export function currentLadderRung(progress: LadderProgress): LadderRung | null {
  const rungCount = ladderRungCount(progress);
  if (progress.completed || progress.rungIndex >= rungCount) return null;
  const rungIndex = progress.rungIndex;
  return Object.freeze({
    rungIndex,
    number: rungIndex + 1,
    difficulty: ladderDifficulty(rungIndex, rungCount),
    opponentCharacterId: progress.opponentIds[rungIndex]!,
    sceneId: progress.sceneOrder[rungIndex]!,
  });
}

export function recordLadderResult(progress: LadderProgress, result: LadderResult): LadderProgress {
  if (progress.completed || result === 'abandon') return progress;
  const { unfinishedAttempts: _resolvedAttempts, ...resolved } = progress;
  if (result === 'loss') {
    return deepFreeze({ ...resolved, losses: progress.losses + 1 });
  }
  const rungCount = ladderRungCount(progress);
  const rungIndex = Math.min(rungCount, progress.rungIndex + 1);
  return deepFreeze({
    ...resolved,
    rungIndex,
    wins: progress.wins + 1,
    completed: rungIndex === rungCount,
  });
}

/** Records a started ladder match until its win or loss clears the count. */
export function recordLadderAttempt(progress: LadderProgress): LadderProgress {
  if (progress.completed) return progress;
  return deepFreeze({
    ...progress,
    unfinishedAttempts: (progress.unfinishedAttempts ?? 0) + 1,
  });
}

/**
 * The seed of the current rung's match. It changes with each loss and with
 * each earlier start that ended without a result, so an abandoned match is
 * never replayed with the same deal and the same AI choices.
 */
export function ladderMatchSeed(progress: LadderProgress): number {
  let seed = progress.seed >>> 0;
  seed ^= Math.imul(progress.rungIndex + 1, 0x9e37_79b1);
  seed ^= Math.imul(progress.losses + 1, 0x85eb_ca6b);
  const attempts = progress.unfinishedAttempts ?? 0;
  if (attempts > 0) seed ^= Math.imul(attempts, 0xc2b2_ae35);
  return seed >>> 0;
}

export function ladderProgressMatchesCatalog(
  progress: LadderProgress,
  characterIds: readonly string[],
  sceneIds: readonly string[],
): boolean {
  const characters = new Set(characterIds);
  const scenes = new Set(sceneIds);
  return (
    characters.has(progress.selectedCharacterId) &&
    progress.opponentIds.every((opponentId) => characters.has(opponentId)) &&
    scenes.size > 0 &&
    scenes.size === sceneIds.length &&
    progress.sceneOrder.length === ladderRungCount(progress) &&
    progress.sceneOrder.every((sceneId) => scenes.has(sceneId))
  );
}

/**
 * Keeps the rung count that the ladder started with. A rung whose scene left
 * the catalog plays on a scene that the ladder does not use yet, and then on
 * any playable scene. Scenes added later belong to the next new ladder.
 */
export function reconcileLadderScenes(
  progress: LadderProgress,
  sceneIds: readonly string[],
  randomSource: RandomSource = seededRandomSource,
): LadderProgress {
  const scenes = validSceneIds(sceneIds);
  const availableScenes = new Set(scenes);
  if (progress.sceneOrder.every((sceneId) => availableScenes.has(sceneId))) {
    return progress;
  }
  const usedScenes = new Set(progress.sceneOrder.filter((sceneId) => availableScenes.has(sceneId)));
  const unusedScenes = shuffle(
    scenes.filter((sceneId) => !usedScenes.has(sceneId)),
    progress.seed,
    randomSource,
  ).values;
  const fallbackScenes = shuffle(scenes, progress.seed, randomSource).values;
  let replacements = 0;
  const sceneOrder = progress.sceneOrder.map((sceneId) => {
    if (availableScenes.has(sceneId)) return sceneId;
    const replacement =
      replacements < unusedScenes.length
        ? unusedScenes[replacements]!
        : fallbackScenes[(replacements - unusedScenes.length) % fallbackScenes.length]!;
    replacements += 1;
    return replacement;
  });
  return deepFreeze({ ...progress, sceneOrder });
}

/**
 * Splits the rungs into thirds in difficulty order. The extra rungs of a count
 * that three does not divide go to the harder tiers, so 7 rungs give 2, 2, 3.
 */
export function ladderDifficulty(rungIndex: number, rungCount: number): LadderDifficulty {
  if (!Number.isInteger(rungIndex) || rungIndex < 0 || rungIndex >= rungCount) {
    throw new Error(`Unknown ladder rung ${rungIndex}.`);
  }
  const localRadioRungs = Math.floor(rungCount / 3);
  const partyStrategistRungs = localRadioRungs + (rungCount % 3 === 2 ? 1 : 0);
  if (rungIndex < localRadioRungs) return 'local-radio-caller';
  if (rungIndex < localRadioRungs + partyStrategistRungs) return 'party-strategist';
  return 'palace-operator';
}

function shuffle<Value>(
  input: readonly Value[],
  seed: number,
  randomSource: RandomSource,
): Readonly<{ values: readonly Value[]; nextSeed: number }> {
  const values = [...input];
  let nextSeed = seed >>> 0;
  for (let index = values.length - 1; index > 0; index -= 1) {
    const step = randomSource.next(nextSeed);
    nextSeed = step.nextSeed;
    const selected = Math.min(index, Math.floor(step.value * (index + 1)));
    [values[index], values[selected]] = [values[selected]!, values[index]!];
  }
  return Object.freeze({ values: Object.freeze(values), nextSeed });
}

function validSceneIds(sceneIds: readonly string[]): string[] {
  if (sceneIds.length === 0) {
    throw new Error('A ladder needs at least one scene identifier.');
  }
  if (new Set(sceneIds).size !== sceneIds.length) {
    throw new Error('A ladder needs unique scene identifiers.');
  }
  return [...sceneIds].toSorted();
}
