import { expect, test, vi } from 'vitest';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance.ts';
import { romanianGameLocale, gameCatalog } from '../../src/game-content.ts';
import { createSimulationSetup, simulateMatch } from '../../src/simulation/simulation.ts';
import type { ReplayContext } from '../../src/persistence/codecs/replay-codec.ts';
import {
  createMatchHistoryEntry,
  type MatchHistoryEntry,
} from '../../src/persistence/match-history.ts';
import { GrandTransitionMatchHistory } from '../../src/app/screens/match-history-modal.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import { setGameTextLocale } from '../../src/app/game-text-language.ts';
import { interfaceCharacterName } from '../../src/app/interface-names.ts';

const seed = 20_260_917;

const romanianContext: ReplayContext = {
  catalog: gameCatalog,
  locale: romanianGameLocale,
  balance: basicScoringBalance,
};

const recordedSentence = (): HTMLElement | null =>
  document.querySelector('.match-history-sentence');

async function mountHistory(entries: readonly MatchHistoryEntry[]): Promise<void> {
  document.body.innerHTML = '<grand-transition-match-history></grand-transition-match-history>';
  const modal = document.querySelector(
    'grand-transition-match-history',
  ) as GrandTransitionMatchHistory;
  modal.entries = entries;
  await modal.updateComplete;
}

function romanianEntry(): MatchHistoryEntry {
  const match = simulateMatch(
    seed,
    createSimulationSetup(gameCatalog, {
      aiDifficulty: 'palace-operator',
      gameLocale: 'ro-RO',
    }),
    romanianContext,
  );
  return createMatchHistoryEntry(match.finalState, {
    id: 'romanian-history',
    initialSeed: seed,
    completedAt: '2026-09-17T10:00:00.000Z',
    settings: {
      turnTimerSeconds: 30,
      autoComplete: true,
      phraseColorCoding: true,
    },
    gameLocale: 'ro-RO',
  });
}

// AC-029-10: recorded sentences keep the language they were played in. The
// annotation appears only when the document language differs from that language.
test('annotates a recorded Romanian sentence with its match language', async () => {
  const entry = romanianEntry();
  expect(entry.matchLog.setup.gameLocale).toBe('ro-RO');

  await setInterfaceLocale('en');
  setGameTextLocale('ro-RO');
  await mountHistory([entry]);
  await vi.waitFor(() => {
    expect(recordedSentence()?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(recordedSentence()?.getAttribute('lang')).toBe('ro-RO');
    const summary = document.querySelector('.match-history-phrase-round header p');
    expect(summary?.getAttribute('lang')).toBeNull();
    // A debater name is interface copy, so the English interface names the
    // players in English even though the recorded sentence stays Romanian.
    expect(summary?.querySelectorAll('span[lang="ro-RO"]')).toHaveLength(0);
    for (const player of entry.matchLog.setup.players) {
      const name = interfaceCharacterName(player.characterId);
      expect(summary?.textContent, name).toContain(name);
    }
    expect(summary?.textContent).toContain('Pride');
  });

  // With both languages Romanian the document already declares that language,
  // so the same recorded text needs no annotation.
  await setInterfaceLocale('ro-RO');
  await mountHistory([entry]);
  await vi.waitFor(() => {
    expect(recordedSentence()?.getAttribute('lang')).toBeNull();
  });

  await setInterfaceLocale('en');
  setGameTextLocale('en');
}, 60_000);
