// Shared workload for the Milestone 026 deterministic catalog foundation suite.
//
// Each per-character case replays 114 independent fixed-seed matches and shares
// no mutable state with its siblings. The cases are split across sibling test
// files because Vitest parallelizes files across worker processes while the
// tests inside one file share a single thread. The workload is synchronous and
// CPU-bound, so concurrent tests inside one file cannot overlap and only inflate
// each case's wall clock.

import { expect } from 'vitest';
import { basicScoringBalance } from '../../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../../src/game-content';
import { snapshotDraftStateForPlayer } from '../../../src/engine/draft-actions';
import {
  createSimulationSetup,
  listLocalRadioCallerSimulationOptions,
  simulateMatch,
  type SimulationOptionProvider,
} from '../../../src/engine/simulation';
import type { ReplayContext } from '../../../src/persistence/codecs/replay-codec';

export type CatalogFoundationCharacter = Readonly<{
  characterId: string;
  index: number;
}>;

const context: ReplayContext = {
  catalog: sampleContent,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};
const workloadSeed = 26_000;
const setupsPerCharacter = sampleContent.characters.length * sampleContent.scenes.length;

// Inspect both player projections before every command. The simulation also
// checks accepted actions, round uniqueness, bounded completion, exact replay,
// private-card omissions from exports, and each actual AI presentation delay.
const verifiedOptions: SimulationOptionProvider = (state, engineContext) => {
  if (state.draft) {
    for (const viewerId of state.playerOrder) {
      const snapshot = snapshotDraftStateForPlayer(state.draft, viewerId);
      const opponentId = state.playerOrder.find((id) => id !== viewerId)!;
      const opponent = state.draft.playerStates[opponentId]!;
      expect(snapshot.players[viewerId]!.hand.cards).toEqual(
        state.draft.playerStates[viewerId]!.hand,
      );
      expect(snapshot.players[opponentId]!.hand).toEqual({ count: opponent.hand.length });
      expect(snapshot.players[opponentId]!.legalCards).toEqual([]);
      const serialized = JSON.stringify(snapshot);
      for (const card of opponent.hand) {
        expect(serialized).not.toContain(JSON.stringify(card.id));
        expect(serialized).not.toContain(JSON.stringify(card.phraseId));
      }
    }
  }
  return listLocalRadioCallerSimulationOptions(state, engineContext);
};

export const catalogFoundationCounts = Object.freeze({
  characters: sampleContent.characters.length,
  scenes: sampleContent.scenes.length,
  setups: sampleContent.characters.length * setupsPerCharacter,
});

export const catalogFoundationCharacters: readonly CatalogFoundationCharacter[] =
  Object.freeze(
    sampleContent.characters.map((character, index) =>
      Object.freeze({ characterId: character.id, index }),
    ),
  );

// The shard count keeps every sibling file short enough that no single file
// bounds the whole unit phase. Shards keep the global character index, so the
// generated seeds stay identical to the unsplit workload.
const shardCount = 5;

export function catalogFoundationShard(shard: number): readonly CatalogFoundationCharacter[] {
  const size = Math.ceil(catalogFoundationCharacters.length / shardCount);
  return Object.freeze(catalogFoundationCharacters.slice(shard * size, (shard + 1) * size));
}

export const catalogFoundationCaseTimeoutMs = 120_000;

export function runCatalogFoundationCharacter({
  characterId,
  index,
}: CatalogFoundationCharacter): void {
  for (const [opponentIndex, opponent] of sampleContent.characters.entries()) {
    for (const [sceneIndex, scene] of sampleContent.scenes.entries()) {
      const seed = workloadSeed + index * setupsPerCharacter
        + opponentIndex * sampleContent.scenes.length + sceneIndex;
      const setup = createSimulationSetup(sampleContent, {
        characterIds: [characterId, opponent.id],
        sceneId: scene.id,
        aiDifficulty: 'local-radio-caller',
      });
      const label = `${characterId} / ${opponent.id} / ${scene.id}; seed=${seed}`;
      try {
        const match = simulateMatch(seed, setup, context, verifiedOptions);
        expect(match.replay.setup.players.map((player) => player.pride)).toEqual([100, 100]);
        expect(match.replay.setup.players.map((player) => player.charge)).toEqual([0, 0]);
        expect(match.finalState.phase).toBe('results');
        expect(match.finalState.playerOrder).toContain(match.finalState.winner);
        expect(match.finalState.resolutionHistory.length).toBeGreaterThan(0);
        expect(match.replay.commands.some((command) => command.type === 'prepare-round')).toBe(true);
        expect(match.privacyLeaks).toBe(0);
        expect(match.timerOverruns).toBe(0);
        expect(match.maximumPresentationDelayMs).toBeGreaterThanOrEqual(500);
        expect(match.maximumPresentationDelayMs).toBeLessThanOrEqual(1_100);

        if (index === 0 && opponentIndex === 0 && sceneIndex === 0) {
          const repeated = simulateMatch(seed, setup, context, verifiedOptions);
          expect(repeated.replayBytes).toBe(match.replayBytes);
          expect(repeated.matchLogBytes).toBe(match.matchLogBytes);
          expect(repeated.finalState).toEqual(match.finalState);
        }
      } catch (error) {
        throw new Error(`Catalog foundation failed: ${label}`, { cause: error });
      }
    }
  }
}
