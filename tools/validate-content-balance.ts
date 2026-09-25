import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { loadGameContent } from './load-game-content.ts';
import { basicScoringBalance } from '../src/content/basic-scoring-balance.ts';
import type { Phrase } from '../src/content/schemas.ts';
import { scoreClause, type ScoreClause } from '../src/engine/basic-scoring.ts';
import { fullQualityGateRequested } from './quality-gate-mode.ts';

const baseSeed = 2_026_091_600;
const matchesPerCell = 500;
const structuralSamplesPerDefender = 64;
const requestedWorkers = Math.min(12, availableParallelism());
const balanceModel = 'direct';
const winRateTolerance = 0.05;
const damageRatioTolerance = 0.1;

type Aggregates = {
  games: number;
  wins: number;
  damage: number;
  rounds: number;
};

type BalanceRow = Aggregates & {
  id: string;
  winRate: number;
  damagePerRound: number;
};

type StructuralRow = {
  id: string;
  samples: number;
  directDamage: number;
  averageDirectDamage: number;
};

type RandomSource = () => number;

type BalanceCell = Readonly<{
  leftId: string;
  rightId: string;
  sceneId: string;
  cellIndex: number;
}>;

type SimulationChunk = Readonly<{
  characters: readonly [string, Aggregates][];
  scenes: readonly [string, Aggregates][];
  globalDamage: number;
  globalRounds: number;
}>;

type BalanceWorkerData = Readonly<{
  start: number;
  end: number;
}>;

const rarityWeight: Record<Phrase['rarity'], number> = {
  common: 4,
  uncommon: 2,
  rare: 1,
};

function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function addAggregate(map: Map<string, Aggregates>, id: string, values: Partial<Aggregates>): void {
  const current = map.get(id) ?? { games: 0, wins: 0, damage: 0, rounds: 0 };
  current.games += values.games ?? 0;
  current.wins += values.wins ?? 0;
  current.damage += values.damage ?? 0;
  current.rounds += values.rounds ?? 0;
  map.set(id, current);
}

function toRow(id: string, values: Aggregates): BalanceRow {
  return {
    id,
    ...values,
    winRate: values.games === 0 ? 0 : values.wins / values.games,
    damagePerRound: values.rounds === 0 ? 0 : values.damage / values.rounds,
  };
}

function weightedPick(phrases: readonly Phrase[], random: RandomSource): Phrase {
  const total = phrases.reduce((sum, phrase) => sum + rarityWeight[phrase.rarity], 0);
  let cursor = random() * total;
  for (const phrase of phrases) {
    cursor -= rarityWeight[phrase.rarity];
    if (cursor < 0) return phrase;
  }
  return phrases.at(-1)!;
}

function scoreNormalizedConstruction(
  ids: readonly string[],
  phraseById: ReadonlyMap<string, Phrase>,
  defenderWeaknessTags: readonly string[],
): number | null {
  const selected = ids.map((id) => phraseById.get(id));
  if (selected.some((phrase) => phrase === undefined)) return null;
  const relation = selected.find(
    (phrase) => phrase!.role === 'verb' || phrase!.role === 'predicate',
  );
  if (!relation) return null;
  const nounPhraseIds = selected
    .filter((phrase) => phrase!.role === 'noun')
    .map((phrase) => phrase!.id);
  const clause: ScoreClause = {
    phraseIds: ids,
    nounPhraseIds,
    relationPhraseId: relation.id,
  };
  const scored = scoreClause(clause, phraseById, defenderWeaknessTags, basicScoringBalance);
  const ending = selected.find((phrase) => phrase!.role === 'ending');
  const finisherWeakness = ending && defenderWeaknessTags.some((tag) => ending.tags.includes(tag));
  const finisherDamage = ending
    ? Math.ceil(ending.finisherBonus ?? 0) *
      (finisherWeakness ? basicScoringBalance.weaknessMultiplier : 1)
    : 0;
  return Math.ceil(scored.scoreBeforeCombo + finisherDamage);
}

function structuralPotential(
  catalog: ReturnType<typeof loadGameContent>['gameCatalog'],
): readonly StructuralRow[] {
  const byId = new Map(catalog.phrases.map((phrase) => [phrase.id, phrase]));
  const rows: StructuralRow[] = [];
  for (const character of catalog.characters) {
    for (const scene of catalog.scenes) {
      const eligibleIds = new Set([
        ...catalog.phrases
          .filter(
            (phrase) =>
              !phrase.characterIds && (!phrase.sceneIds || phrase.sceneIds.includes(scene.id)),
          )
          .map((phrase) => phrase.id),
        ...character.characterPhraseIds,
      ]);
      const eligible = [...eligibleIds]
        .map((id) => byId.get(id)!)
        .filter((phrase) => phrase.role !== 'continuation' && phrase.role !== 'conjunction');
      const nouns = eligible.filter((phrase) => phrase.role === 'noun');
      const relations = eligible.filter(
        (phrase) => phrase.role === 'verb' || phrase.role === 'predicate',
      );
      const modifiers = eligible.filter((phrase) => phrase.role === 'modifier');
      const endings = eligible.filter((phrase) => phrase.role === 'ending');
      let directDamage = 0;
      let samples = 0;
      for (const defender of catalog.characters) {
        if (defender.id === character.id) continue;
        const random = createRandom(baseSeed ^ hash(`${character.id}:${scene.id}:${defender.id}`));
        for (let sample = 0; sample < structuralSamplesPerDefender; sample += 1) {
          const subject = weightedPick(nouns, random);
          const relation = weightedPick(relations, random);
          const ids = [subject.id, relation.id];
          if (relation.role === 'verb') {
            const object = weightedPick(nouns, random);
            ids.push(object.id);
          }
          if (modifiers.length > 0 && random() < 0.5) {
            ids.push(weightedPick(modifiers, random).id);
          }
          if (endings.length > 0 && random() < 0.75) {
            ids.push(weightedPick(endings, random).id);
          }
          const score = scoreNormalizedConstruction(ids, byId, defender.weaknessTags);
          if (score === null) continue;
          directDamage += score;
          samples += 1;
        }
      }
      rows.push({
        id: `${character.id}@${scene.id}`,
        samples,
        directDamage,
        averageDirectDamage: samples === 0 ? 0 : directDamage / samples,
      });
    }
  }
  return rows;
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

function createBalanceCells(
  catalog: ReturnType<typeof loadGameContent>['gameCatalog'],
): readonly BalanceCell[] {
  const cells: BalanceCell[] = [];
  for (const [leftIndex, left] of catalog.characters.entries()) {
    for (const [rightIndex, right] of catalog.characters.entries()) {
      if (left.id === right.id) continue;
      for (const [sceneIndex, scene] of catalog.scenes.entries()) {
        cells.push({
          leftId: left.id,
          rightId: right.id,
          sceneId: scene.id,
          cellIndex:
            leftIndex * catalog.characters.length * catalog.scenes.length +
            rightIndex * catalog.scenes.length +
            sceneIndex,
        });
      }
    }
  }
  return cells;
}

function directEligiblePhrases(
  catalog: ReturnType<typeof loadGameContent>['gameCatalog'],
  characterId: string,
  sceneId: string,
): readonly Phrase[] {
  return catalog.phrases.filter((phrase) => {
    if (phrase.role === 'continuation' || phrase.role === 'conjunction') {
      return false;
    }
    if (phrase.characterIds) return phrase.characterIds.includes(characterId);
    return !phrase.sceneIds || phrase.sceneIds.includes(sceneId);
  });
}

function sampleDirectDamage(
  phrases: readonly Phrase[],
  phraseById: ReadonlyMap<string, Phrase>,
  defenderWeaknessTags: readonly string[],
  random: RandomSource,
): number {
  const nouns = phrases.filter((phrase) => phrase.role === 'noun');
  const relations = phrases.filter(
    (phrase) => phrase.role === 'verb' || phrase.role === 'predicate',
  );
  const modifiers = phrases.filter((phrase) => phrase.role === 'modifier');
  const endings = phrases.filter((phrase) => phrase.role === 'ending');
  const subject = weightedPick(nouns, random);
  const relation = weightedPick(relations, random);
  const ids = [subject.id, relation.id];
  if (relation.role === 'verb') ids.push(weightedPick(nouns, random).id);
  if (modifiers.length > 0 && random() < 0.5) {
    ids.push(weightedPick(modifiers, random).id);
  }
  if (endings.length > 0 && random() < 0.75) {
    ids.push(weightedPick(endings, random).id);
  }
  return scoreNormalizedConstruction(ids, phraseById, defenderWeaknessTags) ?? 0;
}

function simulateDirectCells(
  catalog: ReturnType<typeof loadGameContent>['gameCatalog'],
  cells: readonly BalanceCell[],
): SimulationChunk {
  const phraseById = new Map(catalog.phrases.map((phrase) => [phrase.id, phrase]));
  const characterById = new Map(catalog.characters.map((character) => [character.id, character]));
  const characterAggregates = new Map<string, Aggregates>();
  const sceneAggregates = new Map<string, Aggregates>();
  let globalDamage = 0;
  let globalRounds = 0;
  for (const cell of cells) {
    const left = characterById.get(cell.leftId)!;
    const right = characterById.get(cell.rightId)!;
    const leftPhrases = directEligiblePhrases(catalog, left.id, cell.sceneId);
    const rightPhrases = directEligiblePhrases(catalog, right.id, cell.sceneId);
    for (let match = 0; match < matchesPerCell; match += 1) {
      const random = createRandom((baseSeed + cell.cellIndex * matchesPerCell + match) >>> 0);
      let leftPride = 100;
      let rightPride = 100;
      let rounds = 0;
      let leftDamageTotal = 0;
      let rightDamageTotal = 0;
      while (leftPride > 0 && rightPride > 0 && rounds < 100) {
        const leftDamage = sampleDirectDamage(leftPhrases, phraseById, right.weaknessTags, random);
        const rightDamage = sampleDirectDamage(rightPhrases, phraseById, left.weaknessTags, random);
        leftPride = Math.max(0, leftPride - rightDamage);
        rightPride = Math.max(0, rightPride - leftDamage);
        leftDamageTotal += leftDamage;
        rightDamageTotal += rightDamage;
        rounds += 1;
      }
      const leftWon =
        rightPride === 0 && leftPride !== 0
          ? true
          : leftPride === 0 && rightPride !== 0
            ? false
            : random() < 0.5;
      addAggregate(characterAggregates, left.id, {
        games: 1,
        wins: Number(leftWon),
        damage: leftDamageTotal,
        rounds,
      });
      addAggregate(characterAggregates, right.id, {
        games: 1,
        wins: Number(!leftWon),
        damage: rightDamageTotal,
        rounds,
      });
      addAggregate(sceneAggregates, cell.sceneId, {
        games: 2,
        wins: 1,
        damage: leftDamageTotal + rightDamageTotal,
        rounds: rounds * 2,
      });
      globalDamage += leftDamageTotal + rightDamageTotal;
      globalRounds += rounds * 2;
    }
  }
  return {
    characters: [...characterAggregates.entries()],
    scenes: [...sceneAggregates.entries()],
    globalDamage,
    globalRounds,
  };
}

function mergeChunk(
  characterAggregates: Map<string, Aggregates>,
  sceneAggregates: Map<string, Aggregates>,
  chunk: SimulationChunk,
): void {
  for (const [id, values] of chunk.characters) {
    addAggregate(characterAggregates, id, values);
  }
  for (const [id, values] of chunk.scenes) {
    addAggregate(sceneAggregates, id, values);
  }
}

function runBalanceWorker(): void {
  const data = workerData as BalanceWorkerData;
  const { gameCatalog } = loadGameContent();
  const cells = createBalanceCells(gameCatalog);
  const chunk = simulateDirectCells(gameCatalog, cells.slice(data.start, data.end));
  parentPort!.postMessage(chunk);
}

function runWorkerSlice(start: number, end: number): Promise<SimulationChunk> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      execArgv: process.execArgv,
      workerData: { start, end } satisfies BalanceWorkerData,
    });
    let settled = false;
    worker.once('message', (message: SimulationChunk) => {
      settled = true;
      resolve(message);
      void worker.terminate();
    });
    worker.once('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    worker.once('exit', (code) => {
      if (code !== 0 && !settled) {
        settled = true;
        reject(new Error(`Balance worker exited with code ${code}.`));
      }
    });
  });
}

async function simulateBalance(catalog: ReturnType<typeof loadGameContent>['gameCatalog']): Promise<
  Readonly<{
    characters: readonly BalanceRow[];
    scenes: readonly BalanceRow[];
    globalDamagePerRound: number;
  }>
> {
  const cells = createBalanceCells(catalog);
  const workerCount = Math.max(
    1,
    Math.min(cells.length, Number.isFinite(requestedWorkers) ? Math.floor(requestedWorkers) : 1),
  );
  const characterAggregates = new Map<string, Aggregates>();
  const sceneAggregates = new Map<string, Aggregates>();
  const chunks = await Promise.all(
    Array.from({ length: workerCount }, (_, index) => {
      const start = Math.floor((index * cells.length) / workerCount);
      const end = Math.floor(((index + 1) * cells.length) / workerCount);
      return runWorkerSlice(start, end);
    }),
  );
  let globalDamage = 0;
  let globalRounds = 0;
  for (const chunk of chunks) {
    mergeChunk(characterAggregates, sceneAggregates, chunk);
    globalDamage += chunk.globalDamage;
    globalRounds += chunk.globalRounds;
  }
  return {
    characters: [...characterAggregates.entries()].map(([id, values]) => toRow(id, values)),
    scenes: [...sceneAggregates.entries()].map(([id, values]) => toRow(id, values)),
    globalDamagePerRound: globalRounds === 0 ? 0 : globalDamage / globalRounds,
  };
}

async function main(): Promise<void> {
  const { gameCatalog } = loadGameContent();
  const structural = structuralPotential(gameCatalog);
  const structuralMean =
    structural.reduce((sum, row) => sum + row.averageDirectDamage, 0) / structural.length;
  const structuralFailures = structural.filter(
    (row) =>
      row.averageDirectDamage < structuralMean * (1 - damageRatioTolerance) ||
      row.averageDirectDamage > structuralMean * (1 + damageRatioTolerance),
  );
  const simulation = await simulateBalance(gameCatalog);
  const characterFailures = simulation.characters.filter(
    (row) =>
      row.winRate < 0.5 - winRateTolerance ||
      row.winRate > 0.5 + winRateTolerance ||
      row.damagePerRound < simulation.globalDamagePerRound * (1 - damageRatioTolerance) ||
      row.damagePerRound > simulation.globalDamagePerRound * (1 + damageRatioTolerance),
  );
  const sceneFailures = simulation.scenes.filter(
    (row) =>
      row.winRate < 0.5 - winRateTolerance ||
      row.winRate > 0.5 + winRateTolerance ||
      row.damagePerRound < simulation.globalDamagePerRound * (1 - damageRatioTolerance) ||
      row.damagePerRound > simulation.globalDamagePerRound * (1 + damageRatioTolerance),
  );
  const report = {
    contract: {
      matchesPerCell,
      balanceModel,
      winRateTolerance,
      damageRatioTolerance,
      structuralSamplesPerDefender,
    },
    structuralMean,
    structuralFailures,
    simulation,
    characterFailures,
    sceneFailures,
  };
  console.log(JSON.stringify(report, null, 2));
  if (structuralFailures.length || characterFailures.length || sceneFailures.length) {
    process.exitCode = 1;
  }
}

if (!fullQualityGateRequested()) {
  console.error('Content balance validation is only available through npm run quality:full.');
  process.exitCode = 1;
} else if (isMainThread) {
  void main();
} else {
  runBalanceWorker();
}
