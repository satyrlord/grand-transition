import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell.ts';
import {
  matchCommandEventName,
  type GrandTransitionMatch,
} from '../../src/app/screens/match-screen.ts';
import { NeuralVoiceRouter } from '../../src/audio/neural-voice-router.ts';
import { initialPride, type MatchState } from '../../src/engine/match-lifecycle.ts';
import { lockInSetup } from './setup-test-helpers.ts';

// Milestone 013 makes a cliffhanger mistake or a penalized expiration cost all
// the remaining Pride. The records of Milestones 016 and 025 show that amount.

beforeEach(async () => {
  await page.viewport(1280, 720);
  // These tests are about the records. Keep the neural voices from loading.
  vi.spyOn(NeuralVoiceRouter.prototype, 'preload').mockResolvedValue(false);
  vi.spyOn(NeuralVoiceRouter.prototype, 'initialize').mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

async function startCliffhanger() {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;
  const owner = app as unknown as { matchState: MatchState };
  owner.matchState = { ...owner.matchState, phase: 'sudden-death', suddenDeathActive: true };
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;
  expect(match.querySelector('#match-title')!.textContent).toContain('Cliffhanger · Round 1');
  const settleScreen = async () => {
    await app.updateComplete;
    await match.updateComplete;
  };
  return { app, owner, match, settleScreen };
}

async function expectVictoryWithPenalty(match: GrandTransitionMatch, loserId: string) {
  await vi.waitFor(() => expect(match.querySelector('#round-review-title')).not.toBeNull());
  expect(match.snapshot!.victory!.winnerId).not.toBe(loserId);
  expect(match.querySelector('.round-review-dialog')!.textContent).toMatch(
    new RegExp(`wins the match.*1 completed round.*−${initialPride} Pride penalty`, 'su'),
  );
  expect(match.querySelector('.round-review-dialog')!.textContent).not.toContain('−3 Pride');
  expect(match.querySelector('.match-skip')).toBeNull();
}

test('a cliffhanger grammar mistake shows the loss of all the Pride, and then Victory', async () => {
  const { owner, match, settleScreen } = await startCliffhanger();
  const loserId = owner.matchState.activePlayerId;
  const loserName = match.snapshot!.players.find(
    ({ playerId }) => playerId === loserId,
  )!.characterName;
  expect(owner.matchState.playerStates[loserId]!.pride).toBe(initialPride);

  // A predicate cannot start a sentence.
  match
    .querySelector<HTMLButtonElement>('[data-role="predicate"] [data-card-state="legal"]')!
    .click();
  await settleScreen();

  expect(owner.matchState.phase).toBe('results');
  expect(owner.matchState.playerStates[loserId]!.pride).toBe(0);
  expect(owner.matchState.resolutionHistory.at(-1)!.players[loserId]!.selfDamage).toBe(
    initialPride,
  );
  expect(match.presentation).toMatchObject({
    phase: 'damage',
    outcome: { kind: 'grammar-mistake', playerId: loserId },
    impact: { playerId: loserId, amount: initialPride, prideAfter: 0 },
  });
  expect(match.querySelector('.delivery-outcome')!.textContent).toContain('Grammar mistake');
  expect(match.querySelector('.delivery-impact-record')!.textContent).toContain(
    `${loserName}: −${initialPride} Pride · 0 Pride remains`,
  );
  expect(match.querySelector('.presentation-live-log')!.textContent).toContain(
    `Grammar mistake. ${loserName}: ${initialPride} Pride lost. 0 Pride remains.`,
  );
  expect(match.querySelector('.match-skip')).toBeNull();
  await expectVictoryWithPenalty(match, loserId);
});

test('a penalized cliffhanger expiration shows the loss of all the Pride, and then Victory', async () => {
  const { owner, match, settleScreen } = await startCliffhanger();
  // The first player ends, so the expiration of the other player has a penalty.
  match.querySelector<HTMLButtonElement>('.action-primary')!.click();
  await settleScreen();
  const loserId = owner.matchState.activePlayerId;
  const loserName = match.snapshot!.players.find(
    ({ playerId }) => playerId === loserId,
  )!.characterName;

  match.dispatchEvent(
    new CustomEvent(matchCommandEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { type: 'expire-turn', source: 'user', actorId: loserId, payload: {} },
    }),
  );
  await settleScreen();

  expect(owner.matchState.phase).toBe('results');
  expect(owner.matchState.resolutionHistory.at(-1)!.players[loserId]!.selfDamage).toBe(
    initialPride,
  );
  expect(match.presentation).toMatchObject({
    phase: 'damage',
    outcome: { kind: 'turn-timeout', playerId: loserId },
    impact: { playerId: loserId, amount: initialPride, prideAfter: 0 },
  });
  expect(match.querySelector('.delivery-outcome')!.textContent).toContain('Turn expired');
  expect(match.querySelector('.delivery-impact-record')!.textContent).toContain(
    `${loserName}: −${initialPride} Pride · 0 Pride remains`,
  );
  expect(match.querySelector('.presentation-live-log')!.textContent).toContain(
    `Turn expired. ${loserName}: ${initialPride} Pride lost. 0 Pride remains.`,
  );
  await expectVictoryWithPenalty(match, loserId);
});
