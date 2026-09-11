import { expect, test, type Page } from '@playwright/test';
import type { MatchState } from '../src/engine/match-lifecycle';
import type { RoundPresentationFrame } from '../src/app/round-presentation';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function phase(page: Page, expected: string, maximum = 20000) {
  for (let elapsed = 0; elapsed <= maximum; elapsed += 100) {
    if (await page.locator('.match-screen').getAttribute('data-delivery-phase') === expected) return;
    await page.clock.runFor(100);
  }
  await expect(page.locator('.match-screen')).toHaveAttribute('data-delivery-phase', expected);
}

async function prepare(page: Page, lethal: boolean) {
  await useFixedBrowserMatchSeed(page, 20260823);
  await page.clock.install();
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  const pick = (role: string) => page.locator(`.shared-board [data-role="${role}"] button`).first().click();
  await pick('noun'); await pick('noun'); await pick('predicate'); await pick('verb');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await pick('noun');
  if (lethal) await page.evaluate(() => {
    const app = document.querySelector('grand-transition-app') as unknown as { matchState: MatchState };
    const state = app.matchState;
    const id = state.playerOrder[0]!;
    app.matchState = { ...state, playerStates: { ...state.playerStates, [id]: { ...state.playerStates[id]!, pride: 1 } } };
  });
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 50));
}

for (const size of [{ width: 1024, height: 720 }, { width: 1024, height: 768 },
  { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`recitation, inline scoring, impact, and automatic next round at ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size); await prepare(page, false);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
    await expect(page.locator('.sentence-ledger')).toHaveAttribute('data-speaker-side', 'blue');
    expect(await page.locator('.sentence-ledger').evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.x + box.width / 2 - innerWidth / 2;
    })).toBeGreaterThan(size.width * 0.08);
    const state = await page.evaluate(() => {
      const app = document.querySelector('grand-transition-app') as unknown as { matchState: MatchState };
      return app.matchState.resolutionHistory.at(-1)!;
    });
    const speaker = state.players['player-two']!;
    await expect(page.locator('.sentence-preview')).toHaveText(speaker.constructionText);
    const blue = page.locator('.match-player[data-side="blue"] grand-transition-character');
    await expect.poll(() => blue.evaluate((element) => (element as unknown as { cue: { stateId: string } }).cue.stateId)).toBe('delivery');
    await phase(page, 'total');
    await expect(page.locator('.delivery-total strong')).toHaveText(String(speaker.outgoingDamage));
    const redMeter = page.locator('.match-player[data-side="red"] meter');
    await expect(redMeter).toHaveAttribute('value', '100');
    const clear = await page.locator('.sentence-ledger').evaluate((bubble) => {
      const rect = bubble.getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return bubble === top || bubble.contains(top);
    });
    expect(clear).toBe(true);
    await page.screenshot({ path: info.outputPath('inline-total.png') });
    await phase(page, 'damage');
    await expect(redMeter).toHaveAttribute('value', String(state.players['player-one']!.prideAfter));
    await page.clock.runFor(500);
    await expect(page.locator('.sentence-ledger')).toHaveAttribute('data-speaker-side', 'red');
    expect(await page.locator('.sentence-ledger').evaluate((element) => {
      const box = element.getBoundingClientRect();
      return innerWidth / 2 - (box.x + box.width / 2);
    })).toBeGreaterThan(size.width * 0.08);
    await expect(page.locator('.sentence-preview')).toHaveText(state.players['player-one']!.constructionText);
    await phase(page, 'damage'); await page.clock.runFor(500);
    await expect(page.getByRole('heading', { name: /Round 2/u })).toBeVisible();
    await expect(page.locator('.shared-board button')).not.toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('terminal narration finishes for both characters before Victory can cover the arena', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await prepare(page, true);
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toHaveCount(0);
  await phase(page, 'damage'); await page.clock.runFor(500);
  await expect(page.locator('.sentence-ledger')).toHaveAttribute('data-speaker-side', 'red');
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toHaveCount(0);
  await phase(page, 'damage'); await page.clock.runFor(500);
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to main menu' })).toBeVisible();
});

test('long inline scores keep the latest line, bonuses, and total visible beside the speaker', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await prepare(page, false); await phase(page, 'total');
  await page.locator('grand-transition-match').evaluate(async (element) => {
    const match = element as HTMLElement & { presentation: RoundPresentationFrame; updateComplete: Promise<unknown> };
    match.presentation = { ...match.presentation, components: Array.from({ length: 10 }, (_, index) => ({
      kind: 'clause' as const, narrationIndex: index, phraseText: `Your public statement number ${index + 1} failed the audit.`,
      base: 5, amount: 15, restrictionFactor: 1, weaknessFactor: 1.5, comboFactor: 2, weaknessTags: ['evidence'],
    })), emphasis: [
      { kind: 'combo', playerId: 'player-two', text: 'Your public statement', value: 2 },
      { kind: 'weakness', playerId: 'player-one', text: 'evidence', value: 1.5 },
    ], total: 150 };
    await match.updateComplete;
  });
  for (const size of [{ width: 1024, height: 720 }, { width: 1024, height: 768 },
    { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await expect(page.locator('.delivery-receipt')).toHaveAttribute('role', 'log');
    await expect(page.locator('.delivery-score')).toHaveCount(10);
    await expect(page.locator('.delivery-score small')).toHaveCount(0);
    await expect(page.locator('[data-emphasis="combo"]')).toContainText('×2');
    await expect(page.locator('[data-emphasis="weakness"]')).toContainText('Evidence ×1.5');
    await expect(page.locator('.delivery-total strong')).toHaveText('150');
    const geometry = await page.locator('.delivery-receipt').evaluate((record) => {
      const list = record.querySelector('.delivery-components')!;
      const area = list.getBoundingClientRect();
      const latest = list.lastElementChild!.getBoundingClientRect();
      const total = record.querySelector('.delivery-total')!.getBoundingClientRect();
      const box = record.getBoundingClientRect();
      return { latestVisible: latest.top >= area.top - 1 && latest.bottom <= area.bottom + 1,
        totalVisible: total.bottom <= innerHeight && total.top >= box.top,
        noPanel: getComputedStyle(record).backgroundColor === 'rgba(0, 0, 0, 0)',
        horizontalFit: record.scrollWidth <= record.clientWidth + 1,
        side: box.left > innerWidth / 2 };
    });
    expect(geometry).toEqual({ latestVisible: true, totalVisible: true, noPanel: true, horizontalFit: true, side: true });
    await page.screenshot({ path: info.outputPath(`speaker-inline-${size.width}x${size.height}.png`) });
  }
  await page.locator('.delivery-components').focus();
  await page.keyboard.press('Home'); await page.keyboard.press('End');
  await expect.poll(() => page.locator('.delivery-components').evaluate((list) =>
    Math.abs(list.scrollHeight - list.clientHeight - list.scrollTop))).toBeLessThan(2);
});
