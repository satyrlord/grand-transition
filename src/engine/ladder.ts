import { seededRandomSource, type RandomSource } from './random-source';

export const ladderRungCount = 9;
export const ladderSceneCount = 6;

export type LadderDifficulty =
  | 'local-radio-caller'
  | 'palace-operator'
  | 'party-strategist';

export type LadderProgress = Readonly<{
  schemaVersion: 1;
  selectedCharacterId: string;
  seed: number;
  opponentIds: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  sceneOrder: readonly [string, string, string, string, string, string];
  rungIndex: number;
  wins: number;
  losses: number;
  completed: boolean;
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
  const scenes = [...sceneIds].toSorted();
  if (opponents.length < ladderRungCount) {
    throw new Error('A ladder needs at least nine non-player characters.');
  }
  if (new Set(opponents).size !== opponents.length) {
    throw new Error('A ladder needs unique character identifiers.');
  }
  if (scenes.length !== ladderSceneCount || new Set(scenes).size !== scenes.length) {
    throw new Error('A ladder needs exactly six unique scene identifiers.');
  }
  let nextSeed = seed >>> 0;
  const opponentShuffle = shuffle(opponents, nextSeed, randomSource);
  nextSeed = opponentShuffle.nextSeed;
  const sceneShuffle = shuffle(scenes, nextSeed, randomSource);
  return deepFreeze({
    schemaVersion: 1,
    selectedCharacterId,
    seed: seed >>> 0,
    opponentIds: nine(opponentShuffle.values),
    sceneOrder: six(sceneShuffle.values),
    rungIndex: 0,
    wins: 0,
    losses: 0,
    completed: false,
  });
}

export function currentLadderRung(
  progress: LadderProgress,
): LadderRung | null {
  if (progress.completed || progress.rungIndex >= ladderRungCount) return null;
  const rungIndex = progress.rungIndex;
  return Object.freeze({
    rungIndex,
    number: rungIndex + 1,
    difficulty: ladderDifficulty(rungIndex),
    opponentCharacterId: progress.opponentIds[rungIndex]!,
    sceneId: progress.sceneOrder[rungIndex % progress.sceneOrder.length]!,
  });
}

export function recordLadderResult(
  progress: LadderProgress,
  result: LadderResult,
): LadderProgress {
  if (progress.completed || result === 'abandon') return progress;
  if (result === 'loss') {
    return deepFreeze({ ...progress, losses: progress.losses + 1 });
  }
  const rungIndex = Math.min(ladderRungCount, progress.rungIndex + 1);
  return deepFreeze({
    ...progress,
    rungIndex,
    wins: progress.wins + 1,
    completed: rungIndex === ladderRungCount,
  });
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
    progress.sceneOrder.length === scenes.size &&
    progress.sceneOrder.every((sceneId) => scenes.has(sceneId))
  );
}

export function ladderDifficulty(rungIndex: number): LadderDifficulty {
  if (rungIndex < 0 || rungIndex >= ladderRungCount) {
    throw new Error(`Unknown ladder rung ${rungIndex}.`);
  }
  if (rungIndex < 3) return 'local-radio-caller';
  if (rungIndex < 6) return 'party-strategist';
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

function nine(values: readonly string[]): LadderProgress['opponentIds'] {
  return [
    values[0]!,
    values[1]!,
    values[2]!,
    values[3]!,
    values[4]!,
    values[5]!,
    values[6]!,
    values[7]!,
    values[8]!,
  ];
}

function six(values: readonly string[]): LadderProgress['sceneOrder'] {
  return [
    values[0]!,
    values[1]!,
    values[2]!,
    values[3]!,
    values[4]!,
    values[5]!,
  ];
}

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}
