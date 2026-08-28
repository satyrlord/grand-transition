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
  const backgroundLayer = match.querySelector<HTMLImageElement>(
    '.broadcast-stage-art[data-scene-depth="0"]',
  );
  const foregroundLayer = match.querySelector<HTMLImageElement>(
    '.broadcast-stage-foreground[data-scene-depth="1"]',
  );
  expect(backgroundLayer?.src).toContain('transition-era-television-studio');
  expect(foregroundLayer?.src).toContain(
    'transition-era-television-studio-desks',
  );
  expect(foregroundLayer?.draggable).toBe(false);
  expect(foregroundLayer?.alt).toBe('');
  expect(match.querySelector('.match-footer')).toBeNull();
  expect(match.querySelectorAll('.player-sentence--waiting')).toHaveLength(1);
  expect(match.querySelector('.sentence-ledger')).not.toBeNull();
  expect(match.querySelectorAll('[data-turn-state="active"]')).toHaveLength(1);
  expect(match.querySelectorAll('[data-turn-state="waiting"]')).toHaveLength(1);
  const playerHuds = [...match.querySelectorAll<HTMLElement>('.player-hud')];
  expect(playerHuds).toHaveLength(2);
  expect(
    playerHuds.every((hud) => getComputedStyle(hud).clipPath === 'none'),
  ).toBe(true);
  expect(
    match.querySelector('[data-turn-state="active"] .player-turn-status')
      ?.textContent,
  ).toContain('Your turn');
  expect(
    match.querySelectorAll('.player-turn-status:not([hidden])'),
  ).toHaveLength(1);
  const headerControls = match.querySelector('.match-header-controls');
  expect(headerControls).not.toBeNull();
  expect(headerControls?.querySelector('.match-pause')).not.toBeNull();
  expect(headerControls?.querySelector('.timer-fact')).not.toBeNull();
  expect(match.querySelector('.match-turn-heading')?.textContent).toContain(
    'Round 1',
  );
  expect(match.querySelector('.private-hand')?.getAttribute('data-side')).toBe(
    'red',
  );
  const actionIcons = match.querySelectorAll('svg.action-icon');
  expect(actionIcons).toHaveLength(1);
  for (const icon of actionIcons) {
    expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(
      Array.from(icon.querySelectorAll('path')).every(
        (path) => path.namespaceURI === 'http://www.w3.org/2000/svg',
      ),
    ).toBe(true);
  }
  expect(match.querySelector('.card-role')).toBeNull();
  expect(match.querySelector('.card-bottomline')).toBeNull();
  expect(match.querySelector('.card-weakness')).toBeNull();
  const visiblePhrases = [
    ...match.querySelectorAll<HTMLButtonElement>('.shared-board .phrase-card'),
  ];
  expect(visiblePhrases.length).toBeGreaterThan(0);
  expect(
    visiblePhrases.every(
      (button) =>
        button.textContent?.trim() ===
        button.querySelector('.card-phrase')?.textContent?.trim(),
    ),
  ).toBe(true);
  expect(
    visiblePhrases.some((button) => button.ariaLabel?.includes('Shared')),
  ).toBe(true);

  const previewCard = snapshot.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const actionable = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  const sentenceBefore = snapshot.sentenceText;
  actionable.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await match.updateComplete;
  expect(
    match.querySelector('.sentence-preview')?.textContent?.trim(),
  ).not.toBe(sentenceBefore);
  expect(match.snapshot).toBe(snapshot);
  expect(snapshot.sentenceText).toBe(sentenceBefore);
});

test('clears a pointer preview when an authoritative snapshot arrives', async () => {
  const match = await startMatch();
  const previewCard = match.snapshot!.sharedCards.find(
    (card) => card.action === 'select' && card.previewText.trim() !== '',
  )!;
  const card = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${previewCard.reference!.cardId}"]`,
  )!;
  card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
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

test('shows an appended comeback line in the speaker bubble', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const waitingIndex = snapshot.players.findIndex((player) => !player.isActive);
  const waiting = snapshot.players[waitingIndex]!;
  const sentence =
    'Your party belongs in a party museum. Your paper crown collapses before the first fact.';
  const players = [...snapshot.players] as [
    (typeof snapshot.players)[number],
    (typeof snapshot.players)[number],
  ];
  players[waitingIndex] = {
    ...waiting,
    sentence,
    comebackLine: 'Your paper crown collapses before the first fact.',
    status: 'ended',
  };
  match.snapshot = { ...snapshot, revision: snapshot.revision + 1, players };
  await match.updateComplete;

  const bubble = match.querySelector('.player-sentence--comeback');
  expect(bubble?.textContent?.trim()).toBe(sentence);
  expect(bubble?.getAttribute('aria-label')).toContain('comeback');
});

test('exposes the waiting sentence to pointer and keyboard presentation', async () => {
  const match = await startMatch();
  const snapshot = match.snapshot!;
  const waitingIndex = snapshot.players.findIndex((player) => !player.isActive);
  const waiting = snapshot.players[waitingIndex]!;
  const sentence =
    'Your party belongs in a party museum, and your voters change the channel.';
  const players = [...snapshot.players] as [
    (typeof snapshot.players)[number],
    (typeof snapshot.players)[number],
  ];
  players[waitingIndex] = {
    ...waiting,
    sentence,
  };
  match.snapshot = { ...snapshot, revision: snapshot.revision + 1, players };
  await match.updateComplete;

  const bubble = match.querySelector<HTMLElement>('.player-sentence--waiting')!;
  expect(bubble.tagName).toBe('BUTTON');
  expect(bubble.tabIndex).toBe(0);
  expect(bubble.getAttribute('aria-expanded')).toBe('false');
  expect(bubble.ariaLabel).toContain(sentence);
  expect(
    bubble.querySelector('.waiting-sentence-ellipsis')?.textContent?.trim(),
  ).toBe('…');
  expect(
    bubble.querySelector('.waiting-sentence-content')?.textContent?.trim(),
  ).toBe(sentence);

  bubble.click();
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('true');
  expect(bubble.dataset.revealed).toBe('true');

  match.querySelector<HTMLElement>('.sentence-preview')!.click();
  await match.updateComplete;
  expect(bubble.getAttribute('aria-expanded')).toBe('false');
  expect(bubble.dataset.revealed).toBe('false');
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
    .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
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
      action: null,
      previewText: '',
    })),
  };
  await match.updateComplete;
  await new Promise<void>((resolve) => queueMicrotask(resolve));

  expect(commands).toEqual([]);
  const emptyStateLabels = [
    ...match.querySelectorAll(
      '.private-hand .phrase-card--empty .visually-hidden',
    ),
  ];
  expect(emptyStateLabels).toHaveLength(2);
  expect(
    emptyStateLabels.every((label) => label.textContent?.includes('Empty')),
  ).toBe(true);
  expect(
    match.querySelector<HTMLButtonElement>('.action-reshuffle')?.disabled,
  ).toBe(false);
});

test('maps rapid pointer actions once', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  const redraw = match.querySelector<HTMLButtonElement>('.action-reshuffle')!;
  redraw.click();
  redraw.click();
  await vi.waitFor(() => expect(match.snapshot?.actions.redrawUsed).toBe(true));
  expect(
    commands.filter((event) => event.detail.type === 'redraw-hand'),
  ).toHaveLength(1);

  const current = match.snapshot!;
  const pointerCard = current.sharedCards.find(
    (card) => card.action === 'select',
  );
  expect(pointerCard).toBeDefined();
  const button = match.querySelector<HTMLButtonElement>(
    `[data-card-id="${pointerCard!.reference!.cardId}"]`,
  )!;
  button.click();
  button.click();
  await match.updateComplete;

  const selections = commands.filter(
    (event) => event.detail.type === 'select-phrase',
  );
  expect(selections).toHaveLength(1);
  expect(selections[0]!.detail.payload).toEqual({
    card: pointerCard!.reference,
  });
  await vi.waitFor(() =>
    expect(match.snapshot?.revision).toBeGreaterThan(current.revision),
  );
});

test('a wrong card is chosen immediately as a grammar mistake', async () => {
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );
  const wrong = match.querySelector<HTMLButtonElement>(
    '[data-role="predicate"] [data-card-state="legal"]',
  )!;

  expect(wrong).not.toBeNull();
  const activeBefore = match.snapshot!.activePlayerId;
  const activePanelBefore = match.querySelector('[data-turn-state="active"]');
  wrong.click();
  wrong.click();
  await vi.waitFor(() =>
    expect(match.snapshot?.activePlayerId).not.toBe(activeBefore),
  );
  expect(match.snapshot?.arenaReaction).toMatchObject({
    kind: 'grammar-mistake',
    playerId: activeBefore,
    damage: 3,
  });
  expect(match.querySelector('.grammar-strike')?.textContent).toMatch(
    /Off script.*Grammar mistake.*Red-Folded Chairman.*−3 Pride/su,
  );
  const struckPlayer = match.querySelector<HTMLElement>(
    '[data-reaction-state="grammar-mistake"]',
  )!;
  expect(struckPlayer.getAttribute('data-turn-state')).toBe('waiting');
  expect(match.querySelector('[data-turn-state="active"]')).not.toBe(
    activePanelBefore,
  );
  expect(
    commands.filter((event) => event.detail.type === 'select-phrase'),
  ).toHaveLength(1);
  expect(match.querySelector('.action-fault')).toBeNull();

  match
    .querySelector<HTMLButtonElement>(
      '.shared-board [data-role="noun"] button[data-card-state="legal"], .private-hand [data-role="noun"] button[data-card-state="legal"]',
    )!
    .click();
  await vi.waitFor(() => expect(match.snapshot?.arenaReaction).toBeNull());
  expect(match.querySelector('.grammar-strike')).toBeNull();
});

test('updates and expires one 30-second turn', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const commands: MatchCommandEvent[] = [];
  match.addEventListener(matchCommandEventName, (event) =>
    commands.push(event),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="20"]')).not.toBeNull();

  await vi.advanceTimersByTimeAsync(20_000);
  await match.updateComplete;
  expect(
    commands.filter((event) => event.detail.type === 'expire-turn'),
  ).toHaveLength(1);
});

test('conceals a paused match and resumes from the exact timer value', async () => {
  vi.useFakeTimers();
  const match = await startMatch();
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  const revision = match.snapshot!.revision;

  await vi.advanceTimersByTimeAsync(5_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-interruption="paused"]')).not.toBeNull();
  expect(match.querySelector('.match-screen')).toBeNull();
  expect(match.querySelector('.phrase-card')).toBeNull();
  expect(match.querySelector('[data-timer]')).toBeNull();
  expect(match.textContent).not.toContain(match.snapshot!.activePlayerName);

  await vi.advanceTimersByTimeAsync(5_000);
  match.querySelector<HTMLButtonElement>('button')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.querySelector('[data-timer="25"]')).not.toBeNull();
  expect(match.snapshot!.revision).toBe(revision);

  await vi.advanceTimersByTimeAsync(1_000);
  await match.updateComplete;
  expect(match.querySelector('[data-timer="24"]')).not.toBeNull();
});

test('confirms a paused exit before it discards the match', async () => {
  const match = await startMatch();
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  const activePlayerName = match.snapshot!.activePlayerName;

  match.querySelector<HTMLButtonElement>('.match-pause')!.click();
  await app.updateComplete;
  await match.updateComplete;

  expect(match.textContent).toContain('Back to menu');
  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;

  expect(match.querySelector('[role="alertdialog"]')).not.toBeNull();
  expect(match.textContent).toContain('End this match?');
  expect(match.textContent).toContain('Current match progress will be lost.');
  expect(match.querySelector('.match-screen')).toBeNull();
  expect(match.querySelector('[data-timer]')).toBeNull();
  expect(match.textContent).not.toContain(activePlayerName);
  await vi.waitFor(() =>
    expect(document.activeElement?.textContent?.trim()).toBe('Stay paused'),
  );

  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
  );
  await match.updateComplete;
  expect(match.textContent).toContain('Resume');
  expect(match.querySelector('[role="alertdialog"]')).toBeNull();

  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;
  match.querySelector<HTMLButtonElement>('.interruption-cancel')!.click();
  await match.updateComplete;
  expect(match.querySelector('[data-interruption="paused"]')).not.toBeNull();
  expect(match.textContent).toContain('Resume');
  expect(match.textContent).toContain('Back to menu');

  match.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
  await match.updateComplete;
  match.querySelector<HTMLButtonElement>('.interruption-danger')!.click();
  await app.updateComplete;

  expect(document.querySelector('grand-transition-match')).toBeNull();
  expect(document.querySelector('grand-transition-title')).not.toBeNull();
  expect(
    document.querySelector('grand-transition-title h1')?.textContent,
  ).toMatch(/Grand\s+Transition/u);
});

async function startMatch(): Promise<GrandTransitionMatch> {
  await page.viewport(1280, 720);
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
  return match;
}
