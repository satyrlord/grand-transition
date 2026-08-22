import type { Phrase } from '../content/schemas';
import { seededRandomSource, type RandomSource } from './random-source';

export const boardSlotCount = 9;

const standardRoleCounts = {
  noun: 3,
  verb: 3,
  predicate: 1,
  conjunction: 0,
  ending: 0,
  continuation: 0,
} as const satisfies Readonly<Record<Phrase['role'], number>>;

const wildcardRoleWeights = {
  conjunction: 0.4,
  continuation: 0.25,
  verb: 0.2,
  noun: 0.1,
  predicate: 0.025,
  ending: 0.025,
} as const satisfies Readonly<Record<Phrase['role'], number>>;

const phraseRoles = Object.keys(standardRoleCounts) as Phrase['role'][];
const wildcardRoles = Object.keys(wildcardRoleWeights) as Phrase['role'][];

type PlayerCharacterIds = readonly [string, string];
type PlayerPublicPhraseIds = readonly [readonly string[], readonly string[]];

interface PlayerContext {
  readonly characterId: string;
  readonly publicPhraseIds: ReadonlySet<string>;
}

type PlayerContexts = readonly [PlayerContext, PlayerContext];

export interface BoardGenerationRequest {
  readonly seed: number;
  readonly phrases: readonly Phrase[];
  readonly sceneId: string;
  readonly scenePhraseIds: readonly string[];
  readonly playerCharacterIds: PlayerCharacterIds;
  readonly playerPublicPhraseIds: PlayerPublicPhraseIds;
  readonly recentPhraseIds?: readonly string[];
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
    readonly playerCharacterIds: PlayerCharacterIds;
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

interface WeightedWildcardPlan {
  readonly roles: readonly [Phrase['role'], Phrase['role']];
  readonly weight: number;
}

interface SelectionRequirement {
  readonly count: number;
  readonly minimumAccessibleByPlayer: readonly [number, number];
}

export function generateBoard(
  request: BoardGenerationRequest,
  randomSource: RandomSource = seededRandomSource,
): BoardGenerationResult {
  const initialSeed = Math.trunc(request.seed) >>> 0;
  const cursor: RandomCursor = { seed: initialSeed };
  const players = playerContexts(request);
  const candidatesByRole = collectCandidatesByRole(request, players);
  const feasiblePlans = collectFeasibleWildcardPlans(candidatesByRole, players);

  if (feasiblePlans.length === 0) {
    return impossiblePool(request, candidatesByRole);
  }

  const wildcardPlan = chooseWeightedPlan(feasiblePlans, cursor, randomSource);
  const requiredByRole = requiredRoleCounts(wildcardPlan.roles);
  const recentPhraseIds = new Set(request.recentPhraseIds ?? []);
  const selectedByRole = new Map<Phrase['role'], readonly Phrase[]>();

  for (const role of phraseRoles) {
    const requirement = selectionRequirement(role, requiredByRole[role]);
    const selected = selectCandidates(
      candidatesByRole.get(role) ?? [],
      requirement,
      players,
      recentPhraseIds,
      cursor,
      randomSource,
    );
    if (!selected) {
      return impossiblePool(request, candidatesByRole);
    }
    selectedByRole.set(role, selected);
  }

  const pendingSlots: Omit<BoardSlot, 'id'>[] = [];
  for (const role of phraseRoles) {
    const selected = selectedByRole.get(role) ?? [];
    const standardCount = standardRoleCounts[role];
    selected.forEach((phrase, index) => {
      pendingSlots.push({
        phraseId: phrase.id,
        role,
        source: index < standardCount ? 'standard' : 'wildcard',
      });
    });
  }

  const shuffledSlots = shuffle(pendingSlots, cursor, randomSource);
  const slots = shuffledSlots.map((slot, index) => ({
    ...slot,
    id: `board-${initialSeed}-${index + 1}`,
  }));

  return {
    ok: true,
    board: {
      seed: initialSeed,
      nextSeed: cursor.seed,
      slots,
    },
  };
}

function collectCandidatesByRole(
  request: BoardGenerationRequest,
  players: PlayerContexts,
): ReadonlyMap<Phrase['role'], readonly Phrase[]> {
  const scenePhraseIds = new Set(request.scenePhraseIds);
  const uniquePhrases = new Map<string, Phrase>();

  for (const phrase of request.phrases) {
    if (uniquePhrases.has(phrase.id) || !scenePhraseIds.has(phrase.id))
      continue;
    if (phrase.sceneIds && !phrase.sceneIds.includes(request.sceneId)) continue;
    if (!players.some((player) => isAvailableToPlayer(phrase, player)))
      continue;
    uniquePhrases.set(phrase.id, phrase);
  }

  return new Map(
    phraseRoles.map((role) => [
      role,
      [...uniquePhrases.values()].filter((phrase) => phrase.role === role),
    ]),
  );
}

function collectFeasibleWildcardPlans(
  candidatesByRole: ReadonlyMap<Phrase['role'], readonly Phrase[]>,
  players: PlayerContexts,
): readonly WeightedWildcardPlan[] {
  const plans: WeightedWildcardPlan[] = [];

  for (const firstRole of wildcardRoles) {
    for (const secondRole of wildcardRoles) {
      const roles = [firstRole, secondRole] as const;
      const requiredByRole = requiredRoleCounts(roles);
      const feasible = phraseRoles.every((role) =>
        canSelect(
          candidatesByRole.get(role) ?? [],
          selectionRequirement(role, requiredByRole[role]),
          players,
        ),
      );
      if (feasible) {
        plans.push({
          roles,
          weight:
            wildcardRoleWeights[firstRole] * wildcardRoleWeights[secondRole],
        });
      }
    }
  }

  return plans;
}

function requiredRoleCounts(
  wildcardPlan: readonly [Phrase['role'], Phrase['role']],
): Record<Phrase['role'], number> {
  const counts: Record<Phrase['role'], number> = { ...standardRoleCounts };
  for (const role of wildcardPlan) counts[role] += 1;
  return counts;
}

function selectionRequirement(
  role: Phrase['role'],
  count: number,
): SelectionRequirement {
  if (role === 'noun') {
    return { count, minimumAccessibleByPlayer: [2, 2] };
  }
  if (role === 'verb' || role === 'predicate') {
    return { count, minimumAccessibleByPlayer: [1, 1] };
  }
  return { count, minimumAccessibleByPlayer: [0, 0] };
}

function canSelect(
  candidates: readonly Phrase[],
  requirement: SelectionRequirement,
  players: PlayerContexts,
): boolean {
  return findSelection(candidates, requirement, players) !== undefined;
}

function selectCandidates(
  candidates: readonly Phrase[],
  requirement: SelectionRequirement,
  players: PlayerContexts,
  recentPhraseIds: ReadonlySet<string>,
  cursor: RandomCursor,
  randomSource: RandomSource,
): readonly Phrase[] | undefined {
  if (requirement.count === 0) return [];

  const nonRecent = candidates.filter(
    (phrase) => !recentPhraseIds.has(phrase.id),
  );
  const recent = candidates.filter((phrase) => recentPhraseIds.has(phrase.id));
  const shuffledNonRecent = shuffle(nonRecent, cursor, randomSource);

  const preferred = findSelection(shuffledNonRecent, requirement, players);
  if (preferred) return preferred;

  const orderedFallback = [
    ...shuffledNonRecent,
    ...shuffle(recent, cursor, randomSource),
  ];
  return findSelection(orderedFallback, requirement, players);
}

function findSelection(
  candidates: readonly Phrase[],
  requirement: SelectionRequirement,
  players: PlayerContexts,
): readonly Phrase[] | undefined {
  if (requirement.count === 0) return [];
  if (candidates.length < requirement.count) return undefined;

  const failedStates = new Set<string>();
  const selected: Phrase[] = [];

  const search = (
    index: number,
    accessibleByFirstPlayer: number,
    accessibleBySecondPlayer: number,
  ): boolean => {
    const remainingNeeded = requirement.count - selected.length;
    if (remainingNeeded === 0) {
      return (
        accessibleByFirstPlayer >= requirement.minimumAccessibleByPlayer[0] &&
        accessibleBySecondPlayer >= requirement.minimumAccessibleByPlayer[1]
      );
    }
    if (candidates.length - index < remainingNeeded) return false;

    const cappedFirst = Math.min(
      accessibleByFirstPlayer,
      requirement.minimumAccessibleByPlayer[0],
    );
    const cappedSecond = Math.min(
      accessibleBySecondPlayer,
      requirement.minimumAccessibleByPlayer[1],
    );
    const state = `${index}:${selected.length}:${cappedFirst}:${cappedSecond}`;
    if (failedStates.has(state)) return false;

    const candidate = candidates[index];
    if (!candidate) return false;
    selected.push(candidate);
    if (
      search(
        index + 1,
        accessibleByFirstPlayer +
          Number(isAvailableToPlayer(candidate, players[0])),
        accessibleBySecondPlayer +
          Number(isAvailableToPlayer(candidate, players[1])),
      )
    ) {
      return true;
    }
    selected.pop();

    if (search(index + 1, accessibleByFirstPlayer, accessibleBySecondPlayer)) {
      return true;
    }

    failedStates.add(state);
    return false;
  };

  return search(0, 0, 0) ? [...selected] : undefined;
}

function playerContexts(request: BoardGenerationRequest): PlayerContexts {
  return [
    {
      characterId: request.playerCharacterIds[0],
      publicPhraseIds: new Set(request.playerPublicPhraseIds[0]),
    },
    {
      characterId: request.playerCharacterIds[1],
      publicPhraseIds: new Set(request.playerPublicPhraseIds[1]),
    },
  ];
}

function isAvailableToPlayer(phrase: Phrase, player: PlayerContext): boolean {
  return (
    player.publicPhraseIds.has(phrase.id) &&
    (!phrase.characterIds || phrase.characterIds.includes(player.characterId))
  );
}

function chooseWeightedPlan(
  plans: readonly WeightedWildcardPlan[],
  cursor: RandomCursor,
  randomSource: RandomSource,
): WeightedWildcardPlan {
  const totalWeight = plans.reduce((sum, plan) => sum + plan.weight, 0);
  let target = nextRandom(cursor, randomSource) * totalWeight;

  for (const plan of plans) {
    target -= plan.weight;
    if (target < 0) return plan;
  }
  return plans.at(-1)!;
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
  candidatesByRole: ReadonlyMap<Phrase['role'], readonly Phrase[]>,
): BoardGenerationResult {
  return {
    ok: false,
    error: {
      kind: 'board-generation-error',
      code: 'impossible-content-pool',
      facts: {
        sceneId: request.sceneId,
        playerCharacterIds: request.playerCharacterIds,
        requiredSlots: boardSlotCount,
        availableByRole: phraseRoles.map((role) => ({
          role,
          count: candidatesByRole.get(role)?.length ?? 0,
        })),
      },
    },
  };
}
