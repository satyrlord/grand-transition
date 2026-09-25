import { expect, test } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import {
  romanianGameLocale,
  gameCatalog,
} from '../../src/game-content';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation';
import { encodeReplay, type ReplayContext } from '../../src/persistence/codecs/replay-codec';
import { setInterfaceLocale } from '../../src/app/interface-localization';

const seed = 20_260_917;

const romanianContext: ReplayContext = {
  catalog: gameCatalog,
  locale: romanianGameLocale,
  balance: basicScoringBalance,
};

function runRomanianFixture() {
  const match = simulateMatch(
    seed,
    createSimulationSetup(gameCatalog, {
      aiDifficulty: 'palace-operator',
      gameLocale: 'ro-RO',
    }),
    romanianContext,
  );
  return {
    replayBytes: encodeReplay(match.replay),
    matchLogBytes: match.matchLogBytes,
    winner: match.finalState.winner,
    resolutions: match.finalState.resolutionHistory.map((resolution) => ({
      round: resolution.round,
      openingPlayerId: resolution.openingPlayerId,
      players: Object.fromEntries(
        Object.entries(resolution.players).map(([playerId, player]) => [
          playerId,
          {
            prideBefore: player.prideBefore,
            prideAfter: player.prideAfter,
            sentenceDamage: player.sentenceDamage,
            outgoingDamage: player.outgoingDamage,
            selfDamage: player.selfDamage,
            comboMultiplier: player.comboMultiplier,
            weaknessActivated: player.weaknessActivated,
            comebackBonus: player.comebackBonus,
            continuation: player.continuation.status,
          },
        ]),
      ),
    })),
  };
}

// AC-029-09: the interface language is not an input to grammar, AI decisions,
// state, or scoring. The same game-locale fixture must produce identical bytes
// and identical facts under either interface language.
test('keeps Romanian match bytes, state, and scores identical across interface languages', async () => {
  await setInterfaceLocale('en');
  const englishInterface = runRomanianFixture();

  await setInterfaceLocale('ro-RO');
  const romanianInterface = runRomanianFixture();

  await setInterfaceLocale('en');

  expect(romanianInterface.replayBytes).toBe(englishInterface.replayBytes);
  expect(romanianInterface.matchLogBytes).toBe(englishInterface.matchLogBytes);
  expect(romanianInterface.winner).toBe(englishInterface.winner);
  expect(romanianInterface.resolutions).toEqual(englishInterface.resolutions);
  // The fixture really was the Romanian one, not the English default.
  expect(englishInterface.replayBytes).toContain('"gameLocale": "ro-RO"');
}, 60_000);
