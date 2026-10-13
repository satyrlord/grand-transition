import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell.ts';
import {
  matchCommandEventName,
  type GrandTransitionMatch,
  type MatchCommandEvent,
} from '../../src/app/screens/match-screen.ts';
import type { MatchState } from '../../src/engine/match-lifecycle.ts';
import { draftState, mountMatch, snapshotOf } from './match-state-helpers.ts';
import { lockInSetup } from './setup-test-helpers.ts';

// Milestone 016, AC-016-24: the game refreshes a spent private hand, and the
// screen tells the viewer one time.

const announcement = 'Both private phrases were used. Two new phrases replaced them automatically.';

async function settleAnnouncement(match: GrandTransitionMatch): Promise<void> {
  await match.updateComplete;
  await Promise.resolve();
  await match.updateComplete;
}

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

test('shows the two new cards, the used Reshuffle control, and one polite announcement', async () => {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;

  // The active player holds two nouns, so no pick ends the sentence.
  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const actorId = state.activePlayerId;
  const player = state.draft!.playerStates[actorId]!;
  const hand = ['common-noun-001', 'common-noun-002'].map((phraseId, index) => ({
    id: `hand-1-${actorId}-${index + 1}`,
    phraseId,
  }));
  owner.matchState = {
    ...state,
    draft: {
      ...state.draft!,
      playerStates: {
        ...state.draft!.playerStates,
        [actorId]: {
          ...player,
          hand,
          legalCards: [
            ...player.legalCards.filter(({ source }) => source !== 'private'),
            ...hand.map(({ id }) => ({ source: 'private' as const, cardId: id })),
          ],
        },
      },
    },
  };
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  const settleScreen = async () => {
    await app.updateComplete;
    await settleAnnouncement(match);
  };
  await settleScreen();
  const commandsSent: string[] = [];
  match.addEventListener(matchCommandEventName, (event: MatchCommandEvent) =>
    commandsSent.push(event.detail.type),
  );
  const status = () => match.querySelector('.draft-live-status')!;
  const reshuffle = () => match.querySelector<HTMLButtonElement>('.action-reshuffle')!;
  const privateCardIds = () =>
    [...match.querySelectorAll<HTMLElement>('.private-hand button.phrase-card')].map(
      (card) => card.dataset.cardId,
    );
  const select = async (cardId: string) => {
    match.querySelector<HTMLButtonElement>(`[data-card-id="${cardId}"]`)!.click();
    await settleScreen();
  };

  expect(status().getAttribute('role')).toBe('status');
  expect(status().getAttribute('aria-live')).toBe('polite');
  expect(status().textContent!.trim()).toBe('');
  expect(reshuffle().disabled).toBe(false);
  expect(reshuffle().getAttribute('aria-label')).toBe('Reshuffle private phrases');

  await select(hand[0]!.id);
  // The opponent ends, so the first player keeps the floor.
  match.querySelector<HTMLButtonElement>('.action-primary')!.click();
  await settleScreen();
  expect(owner.matchState.activePlayerId).toBe(actorId);
  expect(privateCardIds()).toEqual([hand[1]!.id]);
  expect(status().textContent!.trim()).toBe('');

  // The second private card empties the hand, and the game refreshes it.
  await select(hand[1]!.id);
  expect(privateCardIds()).toEqual([`redraw-1-${actorId}-1`, `redraw-1-${actorId}-2`]);
  const cards = [...match.querySelectorAll<HTMLButtonElement>('.private-hand button.phrase-card')];
  expect(cards.every((card) => !card.disabled && card.textContent!.trim().length > 0)).toBe(true);
  expect(match.querySelectorAll('.private-hand .phrase-card--empty')).toHaveLength(0);
  expect(reshuffle().disabled).toBe(true);
  expect(reshuffle().getAttribute('aria-label')).toBe('Reshuffle used');
  expect(status().textContent!.trim()).toBe(announcement);
  // The screen sent only the commands of the players.
  expect(commandsSent).toEqual(['select-phrase', 'commit-sentence', 'select-phrase']);

  // The same pick sequence keeps one announcement, and a refreshed card is playable.
  await select(`redraw-1-${actorId}-1`);
  expect(privateCardIds()).toEqual([`redraw-1-${actorId}-2`]);
  expect(status().textContent!.trim()).toBe(announcement);
  expect(match.querySelectorAll('.draft-live-status')).toHaveLength(1);
});

test('announces the refresh of each viewer one time in a round', async () => {
  const snapshot = snapshotOf(draftState());
  const [first, second] = snapshot.players;
  const match = await mountMatch(snapshot);
  const status = () => match.querySelector('.draft-live-status')!.textContent!.trim();
  let revision = snapshot.revision;
  const show = async (activePlayerId: string, redrawAutomatic: boolean, round = snapshot.round) => {
    revision += 1;
    match.snapshot = {
      ...snapshot,
      revision,
      round,
      activePlayerId,
      actions: { ...snapshot.actions, redrawUsed: redrawAutomatic, redrawAutomatic },
    };
    await settleAnnouncement(match);
  };
  expect(status()).toBe('');
  await show(first.playerId, true);
  expect(status()).toBe(announcement);
  // The floor goes to the other player, whose hand has no refresh.
  await show(second.playerId, false);
  expect(status()).toBe('');
  // The first player gets the floor again: the same refresh is not announced again.
  await show(first.playerId, true);
  expect(status()).toBe('');
  await show(second.playerId, true);
  expect(status()).toBe(announcement);
  // The next round can announce a new refresh.
  await show(first.playerId, false, snapshot.round + 1);
  expect(status()).toBe('');
  await show(first.playerId, true, snapshot.round + 1);
  expect(status()).toBe(announcement);
  // A delivery removes the announcement.
  match.snapshot = { ...match.snapshot!, roundReview: true };
  await match.updateComplete;
  expect(status()).toBe('');
});

test('inserts a new live announcement when both consecutive viewers have refreshed hands', async () => {
  const snapshot = snapshotOf(draftState());
  const [first, second] = snapshot.players;
  const match = await mountMatch(snapshot);
  const status = match.querySelector('.draft-live-status')!;
  const changes: string[] = [];
  const observer = new MutationObserver(() => changes.push(status.textContent!.trim()));
  observer.observe(status, { childList: true, characterData: true, subtree: true });
  const show = async (activePlayerId: string, round = snapshot.round) => {
    changes.length = 0;
    match.snapshot = {
      ...snapshot,
      round,
      activePlayerId,
      actions: { ...snapshot.actions, redrawUsed: true, redrawAutomatic: true },
    };
    await settleAnnouncement(match);
  };

  try {
    await show(first.playerId);
    expect(changes).toEqual([announcement]);
    await show(first.playerId);
    expect(changes).toEqual([]);

    // The same status region becomes empty before the second player's text is inserted.
    await show(second.playerId);
    expect(match.querySelector('.draft-live-status')).toBe(status);
    expect(changes).toEqual(['', announcement]);

    // Each refresh is announced once, even while both snapshot flags remain true.
    await show(first.playerId);
    expect(changes).toEqual(['']);
    expect(status.textContent!.trim()).toBe('');
    await show(second.playerId);
    expect(changes).toEqual([]);
    expect(status.textContent!.trim()).toBe('');

    await show(first.playerId, snapshot.round + 1);
    expect(changes).toEqual([announcement]);
  } finally {
    observer.disconnect();
  }
});
