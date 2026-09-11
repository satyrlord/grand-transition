import { expect, test, type Page } from '@playwright/test';
import type { MatchScreenSnapshot } from '../src/app/match-screen-snapshot';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const highlightedCards = 'button.phrase-card[data-tutorial="true"]';
const supportedViewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

test('tutorial starts unchecked and the default match has no tutorial glow', async ({ page }) => {
  await prepareMenu(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tutorial', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startMatch(page);
  await expect(page.locator('.shared-board button')).not.toHaveCount(0);
  await expect(page.locator(highlightedCards)).toHaveCount(0);
});

test('tutorial persists and all valid next choices follow each hotseat draft and pause', async ({ page }) => {
  await prepareMenu(page);
  await enableTutorial(page);
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('grand-transition.settings.v1')!),
  )).toMatchObject({ schemaVersion: 5, tutorialMode: true });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Tutorial', exact: true })).toBeChecked();

  for (const viewport of supportedViewports) {
    await page.setViewportSize(viewport);
    await assertVisibleGeometry(page, '.settings-dialog', 'button, input, select');
    await page.screenshot({ path: `tmp/tutorial-mode/settings-${viewport.width}x${viewport.height}.png` });
  }
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startMatch(page);
  const initial = await assertAllValidChoices(page);
  expect(initial.length).toBeGreaterThan(1);
  await expect(page.locator('[data-role="continuation"] [data-tutorial="true"]')).toHaveCount(0);

  for (const viewport of supportedViewports) {
    await page.setViewportSize(viewport);
    await assertVisibleGeometry(page, '.match-screen', highlightedCards);
    await assertAllValidChoices(page);
    await page.screenshot({ path: `tmp/tutorial-mode/match-${viewport.width}x${viewport.height}.png` });
  }
  for (let step = 0; step < 3; step += 1) {
    const before = await assertAllValidChoices(page);
    await page.locator(highlightedCards).first().click();
    const after = await assertAllValidChoices(page);
    expect(after).not.toEqual(before);
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator(highlightedCards)).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await assertAllValidChoices(page);
});

test('tutorial glow pulses slowly and remains steady with reduced motion and distinct in forced colors', async ({ page }) => {
  await prepareMenu(page);
  await enableTutorial(page);
  await startMatch(page);
  await assertAllValidChoices(page);
  const choice = page.locator(highlightedCards).first();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const animated = await choice.evaluate((button) => {
    const style = getComputedStyle(button, '::after');
    return { name: style.animationName, duration: style.animationDuration, shadow: style.boxShadow };
  });
  expect(animated.name).toBe('tutorial-glow');
  expect(animated.duration).toBe('2.4s');
  expect(animated.shadow).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const steady = await choice.evaluate((button) => {
    const style = getComputedStyle(button, '::after');
    return { name: style.animationName, opacity: Number(style.opacity), shadow: style.boxShadow };
  });
  expect(steady.name).toBe('none');
  expect(steady.opacity).toBeGreaterThan(0);
  expect(steady.shadow).not.toBe('none');
  await page.screenshot({ path: 'tmp/tutorial-mode/reduced-motion.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await choice.evaluate((button) => {
    const style = getComputedStyle(button, '::after');
    return { name: style.animationName, outline: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset) };
  });
  expect(forced.name).toBe('none');
  expect(forced.outline).toBe('dotted');
  expect(forced.width).toBeGreaterThan(0);
  expect(forced.offset).toBeLessThan(0);
  await choice.focus();
  await expect(choice).toBeFocused();
  await page.screenshot({ path: 'tmp/tutorial-mode/forced-colors.png' });
});

test('tutorial does not reveal recommendations during the computer turn', async ({ page }) => {
  await prepareMenu(page);
  await enableTutorial(page);
  await page.evaluate(() => {
    const host = window as typeof window & { tutorialAiCounts: number[] };
    host.tutorialAiCounts = [];
    new MutationObserver(() => {
      if (document.querySelector('.ai-thinking-record')) {
        host.tutorialAiCounts.push(document.querySelectorAll('button.phrase-card[data-tutorial="true"]').length);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  });
  await startMatch(page, 'Single Player');
  await assertAllValidChoices(page);
  await page.locator(highlightedCards).first().click();
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { tutorialAiCounts: number[] }).tutorialAiCounts.length,
  )).toBeGreaterThan(0);
  expect(await page.evaluate(() =>
    (window as typeof window & { tutorialAiCounts: number[] }).tutorialAiCounts.every((count) => count === 0),
  )).toBe(true);
  await expect(page.locator('.ai-thinking-record')).toHaveCount(0);
  await assertAllValidChoices(page);
});

test('tutorial recommendations disappear during round delivery', async ({ page }) => {
  await prepareMenu(page);
  await enableTutorial(page);
  await page.clock.install();
  await startMatch(page);
  const pick = (role: string) => page.locator(`.shared-board [data-role="${role}"] button`).first().click();
  await pick('noun');
  await pick('noun');
  await pick('predicate');
  await pick('verb');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await pick('noun');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 50));
  await expect(page.locator('.match-screen')).toHaveAttribute('data-delivery-phase', /.+/u);
  await expect(page.locator(highlightedCards)).toHaveCount(0);
});

async function prepareMenu(page: Page): Promise<void> {
  await page.setViewportSize(supportedViewports[0]);
  await useFixedBrowserMatchSeed(page, 20260823);
  await page.goto('/grand-transition/');
}

async function enableTutorial(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Tutorial', exact: true }).check();
  await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}

async function startMatch(page: Page, mode = 'Multiplayer'): Promise<void> {
  await page.getByRole('button', { name: mode, exact: true }).click();
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
}

async function assertAllValidChoices(page: Page): Promise<string[]> {
  await expect(page.locator(highlightedCards)).not.toHaveCount(0);
  const facts = await page.locator('grand-transition-match').evaluate((element) => {
    const snapshot = (element as HTMLElement & { snapshot: MatchScreenSnapshot }).snapshot;
    const expected = [...snapshot.sharedCards, ...snapshot.privateCards]
      .filter((card) => card.reference && card.action === 'select' && card.grammarAccepted)
      .map((card) => `${card.reference!.source}:${card.reference!.cardId}`).sort();
    const actual = [...element.querySelectorAll<HTMLButtonElement>('button.phrase-card[data-tutorial="true"]')]
      .map((button) => `${button.dataset.cardSource}:${button.dataset.cardId}`).sort();
    return { expected, actual };
  });
  expect(facts.actual).toEqual(facts.expected);
  return facts.actual;
}

async function assertVisibleGeometry(page: Page, container: string, selector: string): Promise<void> {
  const facts = await page.locator(container).evaluate((element, controls) => {
    const box = element.getBoundingClientRect();
    return {
      inside: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
      pageScrolls: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
      controlsInside: [...element.querySelectorAll<HTMLElement>(controls)].every((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left >= box.left && rect.top >= box.top && rect.right <= box.right && rect.bottom <= box.bottom;
      }),
    };
  }, selector);
  expect(facts).toEqual({ inside: true, pageScrolls: false, controlsInside: true });
}
