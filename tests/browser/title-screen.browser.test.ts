import { englishGameLocale, sampleContent } from '../../src/game-content';
import { basicScoringBalance } from '../../src/content/basic-scoring-balance';
import { createSimulationSetup, simulateMatch } from '../../src/engine/simulation';
import { createMatchHistoryEntry } from '../../src/persistence/match-history';
import { page } from 'vitest/browser';
import { expect, test } from 'vitest';
import { registerGrandTransitionTitle } from '../../src/app/screens/title-screen';
import type { GrandTransitionMatchHistory } from '../../src/app/screens/match-history-modal';
import type { GrandTransitionApp } from '../../src/app/app-shell';
import { matchHistoryStorageKey } from '../../src/persistence/match-history';
import '../../src/main';

test('renders the title screen in a real browser', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  await expect
    .element(page.getByText('A Verbal Republic', { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByText('Live now, on NTV Channel 3!', { exact: true }))
    .toBeVisible();
  expect(document.querySelector('.title-emblem')).not.toBeNull();
  await expect
    .element(page.getByRole('button', { name: 'Set up match' }))
    .toBeVisible();
});

test('uses the match-owned feature and interface fonts', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect.element(page.getByRole('heading')).toHaveStyle({
    fontFamily: '"Poiret One", Arial, sans-serif',
  });
  await expect.element(page.getByRole('main')).toHaveStyle({
    fontFamily: '"Rubik Variable", Arial, sans-serif',
  });
});

test('keeps the display-only title text unselectable', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect.element(page.getByRole('main')).toHaveStyle({
    userSelect: 'none',
  });
});

test('preserves an existing title-screen registration', async () => {
  const registeredElement = customElements.get('grand-transition-title');

  registerGrandTransitionTitle();

  expect(customElements.get('grand-transition-title')).toBe(registeredElement);
});

test('opens an empty title-only history modal and traps keyboard focus', async () => {
  await page.viewport(1280, 720);
  localStorage.removeItem(matchHistoryStorageKey);
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  const historyButton = document.querySelector<HTMLButtonElement>(
    '.title-history-action',
  )!;

  historyButton.click();
  await app.updateComplete;
  const modal = document.querySelector(
    'grand-transition-match-history',
  ) as GrandTransitionMatchHistory;
  await modal.updateComplete;
  const close = modal.querySelector<HTMLButtonElement>('.match-history-close')!;
  const list = modal.querySelector<HTMLElement>('.match-history-list')!;
  expect(modal.querySelector('.match-history-empty')?.textContent).toMatch(
    /No completed matches yet/iu,
  );
  expect(document.activeElement).toBe(close);

  close.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    }),
  );
  expect(document.activeElement).toBe(list);
  list.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
  );
  expect(document.activeElement).toBe(close);
});


test.each([['ai', 'Single player'], ['hotseat', 'Hotseat']] as const)('history labels %s without changing stored mode', async (mode, label) => {
  const setup = {
    ...createSimulationSetup(sampleContent),
    mode,
    aiDifficulty: mode === 'ai' ? 'local-radio-caller' : null,
  };
  const completed = simulateMatch(20_260_829, setup, {
    catalog: sampleContent, locale: englishGameLocale, balance: basicScoringBalance,
  });
  const entry = createMatchHistoryEntry(completed.finalState, {
    id: `mode-${mode}`, initialSeed: 20_260_829, completedAt: '2026-09-05T12:00:00.000Z',
    settings: { turnTimerSeconds: 30, autoComplete: true, phraseColorCoding: true },
  });
  document.body.innerHTML = '<grand-transition-match-history></grand-transition-match-history>';
  const modal = document.querySelector('grand-transition-match-history') as GrandTransitionMatchHistory;
  modal.entries = [entry];
  await modal.updateComplete;
  await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  expect(entry.replay.setup.mode).toBe(mode);
  expect(entry.matchLog.setup.mode).toBe(mode);
  document.body.innerHTML = '';
});
