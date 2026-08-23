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
  expect(match.querySelector('.broadcast-stage-art')).not.toBeNull();
  expect(match.querySelector('.match-footer')).not.toBeNull();
  expect(match.querySelectorAll('.player-sentence')).toHaveLength(2);
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

  const actionable = match.querySelector<HTMLButtonElement>(
    '.shared-board .phrase-card:not(:disabled)',
  )!;
  const accessibleName = actionable.getAttribute('aria-label')!;
  expect(accessibleName).toMatch(/Role (noun|verb|predicate)/u);
  expect(accessibleName).toMatch(/Value \d+/u);
  expect(accessibleName).toContain('Shared card');
  expect(accessibleName).toMatch(/Legal|Illegal/u);
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

test('maps pointer and keyboard actions once and restores overlay focus', async () => {
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

  const comebackTrigger = match.querySelectorAll<HTMLButtonElement>(
    '.match-actions button',
  )[1]!;
  comebackTrigger.focus();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
  await match.updateComplete;
  const dialog = match.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  const focusedInDialog = document.activeElement;
  expect(dialog.contains(focusedInDialog)).toBe(true);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
  expect(document.activeElement).toBe(focusedInDialog);
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }),
  );
  expect(document.activeElement).toBe(focusedInDialog);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await match.updateComplete;
  expect(match.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(comebackTrigger);

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

test('requires a separate confirmation before an illegal card becomes a fault', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
  const illegal = match.querySelector<HTMLButtonElement>(
    '[data-card-state="illegal"]',
  )!;

  expect(illegal).not.toBeNull();
  illegal.click();
  await match.updateComplete;
  expect(commands).toHaveLength(0);
  const confirmation = match.querySelector<HTMLButtonElement>('.action-fault')!;
  expect(confirmation.textContent).toContain('Commit strategic foul');
  expect(document.activeElement).toBe(confirmation);

  confirmation.click();
  confirmation.click();
  await match.updateComplete;
  expect(
    commands.filter((event) => event.detail.type === 'deliberate-fault'),
  ).toHaveLength(1);
});

test('announces 10 and 5 seconds and expires one timed turn', async () => {
  vi.useFakeTimers();
  const match = await startMatch(15);
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

test('unlimited mode renders no countdown interval', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  expect(match.querySelector('[data-timer="unlimited"]')).not.toBeNull();
  expect(match.textContent).toContain('Unlimited');
  await vi.advanceTimersByTimeAsync(60_000);
  expect(
    commands.filter((event) => event.detail.type === 'expire-turn'),
  ).toHaveLength(0);
});

async function startMatch(
  timerSeconds: 15 | 30 | null = null,
): Promise<GrandTransitionMatch> {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;

  await page.getByRole('button', { name: 'Set up match' }).click();
  await page
    .getByLabelText('Timer')
    .selectOptions(timerSeconds === null ? 'unlimited' : String(timerSeconds));
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
