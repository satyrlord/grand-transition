import { describe, expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { englishGameLocale, sampleContent } from '../../src/game-content';
import { snapshotDraftStateForPlayer } from '../../src/engine/draft-actions';
import {
  createSimulationSetup,
  listLocalRadioCallerSimulationOptions,
  simulateMatch,
  type SimulationOptionProvider,
} from '../../src/engine/simulation';
import type { ReplayContext } from '../../src/persistence/codecs/replay-codec';

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

describe('Milestone 026 deterministic catalog foundation workload', () => {
  test('covers all 2,166 ordered character and scene setups, including mirrors', () => {
    expect(sampleContent.characters).toHaveLength(19);
    expect(sampleContent.scenes).toHaveLength(6);
    expect(sampleContent.characters.length * setupsPerCharacter).toBe(2_166);
  });

  test.each(sampleContent.characters.map((character, index) => ({
    characterId: character.id,
    index,
  })))('$characterId prepares and completes every opponent and scene setup', ({ characterId, index }) => {
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
  }, 120_000);
});
