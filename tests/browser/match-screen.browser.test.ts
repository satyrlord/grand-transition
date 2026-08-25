import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';
import {
  GrandTransitionMatch,
  matchCommandEventName,
  type MatchCommandEvent,
} from '../../src/app/screens/match-screen';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

test('renders an immutable complete match snapshot and previews without changing it', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.sharedCards)).toBe(true);
  expect(snapshot.sharedCards).toHaveLength(9);
  expect(snapshot.privateCards).toHaveLength(2);
  expect(match.querySelectorAll('.shared-board > li')).toHaveLength(9);
  expect(match.querySelectorAll('.private-hand ol > li')).toHaveLength(2);
  const portraits = [
    ...match.querySelectorAll<HTMLImageElement>('.character-portrait'),
  ];
  expect(portraits).toHaveLength(2);
  expect(portraits.map((portrait) => portrait.src)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('red-folded-chairman'),
      expect.stringContaining('thunder-tribune'),
    ]),
  );
  expect(match.querySelector('.match-footer')).not.toBeNull();
  expect(match.querySelectorAll('.player-sentence')).toHaveLength(2);
  expect(match.querySelectorAll('[data-turn-state="active"]')).toHaveLength(1);
  expect(match.querySelectorAll('[data-turn-state="waiting"]')).toHaveLength(1);
  expect(
    match.querySelector('[data-turn-state="active"] .player-turn-status')
      ?.textContent,
  ).toContain('Your turn');
  expect(
    match.querySelectorAll('.player-turn-status:not([hidden])'),
  ).toHaveLength(1);
  expect(
    match.querySelector('.private-hand-heading')?.textContent,
  ).not.toContain('Has the floor');
  const actionIcons = match.querySelectorAll('svg.action-icon');
  expect(actionIcons).toHaveLength(3);
  for (const icon of actionIcons) {
    expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(
      Array.from(icon.querySelectorAll('path')).every(
        (path) => path.namespaceURI === 'http://www.w3.org/2000/svg',
      ),
    ).toBe(true);
  }

  const previewCard = snapshot.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const actionable = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  const accessibleName = actionable.getAttribute('aria-label')!;
  expect(accessibleName).toMatch(
    /Role (noun|verb|predicate|conjunction|ending|continuation)/u,
  );
  expect(accessibleName).toContain('Shared card');
  expect(accessibleName).toMatch(/Available/u);
  expect(accessibleName).toMatch(/weakness/u);

  const sentenceBefore = snapshot.sentenceText;
  actionable.focus();
  await match.updateComplete;
  expect(
    match.querySelector('.sentence-preview')?.textContent?.trim(),
  ).not.toBe(sentenceBefore);
  expect(match.snapshot).toBe(snapshot);
  expect(snapshot.sentenceText).toBe(sentenceBefore);
});

test('clears a focus preview when an authoritative snapshot arrives', async () => {
  const match = await startMatch();
  const previewCard = match.snapshot!.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const card = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  card.focus();
  await match.updateComplete;
  const preview = match.querySelector('.sentence-preview')?.textContent?.trim();
  expect(preview).not.toBe(match.snapshot!.sentenceText);

  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
    sentenceText: 'Authoritative next-turn sentence',
  };
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    'Authoritative next-turn sentence',
  );
});

test('keeps the current sentence visible for an empty legal preview', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const card = [...snapshot.privateCards, ...snapshot.sharedCards].find(
    (candidate) =>
      candidate.action === 'select' && candidate.previewText.trim() === '',
  );
  expect(card?.reference).toBeDefined();

  match
    .querySelector<HTMLButtonElement>(
      `[data-card-id="${card!.reference!.cardId}"]`,
    )!
    .focus();
  await match.updateComplete;

  expect(match.querySelector('.sentence-preview')?.textContent?.trim()).toBe(
    snapshot.sentenceText,
  );
});

test('does not refresh an empty private hand without a player command', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
  match.snapshot = {
    ...match.snapshot!,
    revision: match.snapshot!.revision + 1,
    privateCards: match.snapshot!.privateCards.map((card) => ({
      ...card,
      reference: null,
      phraseId: null,
      text: '',
      role: null,
      state: 'empty' as const,
      stateLabel: 'Empty',
      disabledReason: 'This slot is empty.',
      accessibleName: 'Empty private slot.',
      action: null,
      previewText: '',
    })),
  };
  await match.updateComplete;
  await new Promise<void>((resolve) => queueMicrotask(resolve));

  expect(commands).toEqual([]);
  expect(
    match.querySelector<HTMLButtonElement>('.action-secondary')?.disabled,
  ).toBe(false);
});

test('maps pointer and keyboard actions once', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  const redraw = match.querySelector<HTMLButtonElement>(
    '.match-actions button:first-child',
  )!;
  redraw.click();
  redraw.click();
  await vi.waitFor(() => expect(match.snapshot?.actions.redrawUsed).toBe(true));
  expect(
    commands.filter((event) => event.detail.type === 'redraw-hand'),
  ).toHaveLength(1);

  const current = match.snapshot!;
  const keyboardCard = current.sharedCards.find(
    (card) => card.action === 'select',
  );
  expect(keyboardCard).toBeDefined();
  const editingInput = document.createElement('input');
  document.body.append(editingInput);
  editingInput.focus();
  editingInput.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyboardCard!.shortcut,
      bubbles: true,
    }),
  );
  expect(
    commands.filter((event) => event.detail.type === 'select-phrase'),
  ).toHaveLength(0);
  editingInput.remove();

  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyboardCard!.shortcut }),
  );
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyboardCard!.shortcut }),
  );
  await match.updateComplete;

  const selections = commands.filter(
    (event) => event.detail.type === 'select-phrase',
  );
  expect(selections).toHaveLength(1);
  expect(selections[0]!.detail.payload).toEqual({
    card: keyboardCard!.reference,
  });
  await vi.waitFor(() =>
    expect(match.snapshot?.revision).toBeGreaterThan(current.revision),
  );
  const nextSnapshot = match.snapshot!;
  const nextCard =
    nextSnapshot.sharedCards
      .slice(keyboardCard!.slotIndex + 1)
      .find((card) => card.action) ??
    nextSnapshot.sharedCards
      .slice(0, keyboardCard!.slotIndex)
      .toReversed()
      .find((card) => card.action) ??
    nextSnapshot.privateCards.find((card) => card.action);
  if (nextCard?.reference) {
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('data-card-id')).toBe(
        nextCard.reference!.cardId,
      ),
    );
  }
  expect(match.querySelector('.card-shortcut:not([hidden])')).not.toBeNull();
});

test('blocks the comeback shortcut while a command is pending', async () => {
  const match = await startMatch();
  match.addEventListener(
    matchCommandEventName,
    (event) => event.stopPropagation(),
    { once: true },
  );
  const redraw = match.querySelector<HTMLButtonElement>(
    '.match-actions button:first-child',
  )!;

  redraw.click();
  await match.updateComplete;
  expect(redraw.disabled).toBe(true);

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
  await match.updateComplete;
  expect(match.querySelector('[role="dialog"]')).toBeNull();
});

test('a wrong card is chosen immediately as a grammar mistake', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
  const wrong = match.querySelector<HTMLButtonElement>(
    '[data-card-state="legal"][aria-label*="Role predicate"]',
  )!;

  expect(wrong).not.toBeNull();
  const activeBefore = match.snapshot!.activePlayerId;
  const activePanelBefore = match.querySelector('[data-turn-state="active"]');
  wrong.click();
  wrong.click();
  await vi.waitFor(() =>
    expect(match.snapshot?.activePlayerId).not.toBe(activeBefore),
  );
  expect(match.querySelector('[data-turn-state="active"]')).not.toBe(
    activePanelBefore,
  );
  expect(
    commands.filter((event) => event.detail.type === 'select-phrase'),
  ).toHaveLength(1);
  expect(match.querySelector('.action-fault')).toBeNull();
});

test('announces 10 and 5 seconds and expires one 15-second turn', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.textContent).toContain('Ten seconds remain.');
  expect(match.querySelector('[data-timer="10"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.textContent).toContain('Five seconds remain.');
  expect(match.querySelector('[data-timer="5"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(
    commands.filter((event) => event.detail.type === 'expire-turn'),
  ).toHaveLength(1);
});

async function startMatch(): Promise<GrandTransitionMatch> {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;

  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;

  const match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  expect(match.snapshot?.round).toBe(1);
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(match.querySelector('h1')),
  );
  return match;
}
