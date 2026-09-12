import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

test('forced colors keep phrase text and both player records readable through turn changes', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Tutorial', exact: true }).check();
  await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await page.getByRole('button', { name: 'Start match', exact: true }).click();

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ forcedColors: 'active', colorScheme, reducedMotion: 'reduce' });
    await assertSystemColors(page);
    const choice = page.locator('button.phrase-card[data-tutorial="true"]').first();
    await page.keyboard.press('Tab');
    await choice.focus();
    await expect(choice).toBeFocused();
    expect(await choice.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
    await choice.hover();
    await assertSystemColors(page);
    await page.locator('.private-hand button.phrase-card').first().hover();
    await assertSystemColors(page);
    await choice.click();
    await assertSystemColors(page);
    await assertPrideMeters(page);
    await page.screenshot({ path: `tmp/full-code-review/forced-colors-${colorScheme}.png` });
  }

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('.interruption-setting-options[aria-label="Phrase color coding"]').getByRole('button', { name: 'Off', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await assertSystemColors(page);
});

test('forced colors preserve readable disabled choices during the computer turn', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await useFixedBrowserMatchSeed(page);
  const clockStart = new Date('2026-09-12T12:00:00Z');
  await page.clock.install({ time: clockStart });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  // Freeze before creating a turn timer. The target is beyond this test's
  // timeout, so browser/driver latency cannot turn it into a past deadline.
  await page.clock.pauseAt(new Date(clockStart.getTime() + 60_000));
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  await page.locator('.shared-board [data-role="noun"] button').first().click();
  await expect(page.locator('.ai-thinking-record')).toBeVisible();
  const facts = await page.locator('.common-phrases').evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'color: GrayText; forced-color-adjust: none';
    element.append(probe);
    const gray = getComputedStyle(probe).color;
    probe.remove();
    const cards = [...element.querySelectorAll<HTMLButtonElement>('button.phrase-card')];
    const style = getComputedStyle(element);
    return {
      present: cards.length > 0,
      disabled: cards.every((card) => card.disabled),
      text: cards.every((card) => getComputedStyle(card.querySelector('.card-phrase')!).color === gray),
      filter: style.filter,
      opacity: style.opacity,
    };
  });
  expect(facts).toEqual({ present: true, disabled: true, text: true, filter: 'none', opacity: '1' });
});

async function assertPrideMeters(page: Page): Promise<void> {
  const highlight = await page.locator('.player-turn-status:not([hidden])').evaluate((element) =>
    getComputedStyle(element).backgroundColor.match(/\d+/gu)!.map(Number),
  );
  for (const meter of await page.locator('.player-health meter').all()) {
    await expect(meter).toHaveAttribute('value', '100');
    const { data, info } = await sharp(await meter.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let filledPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] === highlight[0] && data[index + 1] === highlight[1] && data[index + 2] === highlight[2]) filledPixels += 1;
    }
    expect(filledPixels).toBeGreaterThan(info.width * info.height / 4);
  }
}

async function assertSystemColors(page: Page): Promise<void> {
  const facts = await page.locator('.match-screen').evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'color: CanvasText; background: Canvas; forced-color-adjust: none';
    element.append(probe);
    const system = getComputedStyle(probe);
    const text = system.color;
    const background = system.backgroundColor;
    probe.style.cssText = 'color: HighlightText; background: Highlight; forced-color-adjust: none';
    const highlightText = getComputedStyle(probe).color;
    const highlight = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const phrases = [...element.querySelectorAll('.card-phrase')];
    const cards = [...element.querySelectorAll('button.phrase-card')];
    const records = [...element.querySelectorAll('.player-hud')];
    const labels = [...element.querySelectorAll('.player-hud h2, .player-health-label, .player-health strong')];
    const badge = getComputedStyle(element.querySelector('.player-turn-status:not([hidden])')!);
    return {
      phrasesPresent: phrases.length > 0,
      recordsPresent: records.length === 2,
      phraseColors: phrases.every((phrase) => getComputedStyle(phrase).color === text),
      cardSurfaces: cards.every((card) => getComputedStyle(card).backgroundColor === background),
      labelColors: labels.every((label) => getComputedStyle(label).color === text),
      activeBadge: badge.color === highlightText && badge.backgroundColor === highlight,
      recordSurfaces: records.every((record) => {
        const style = getComputedStyle(record);
        return style.backgroundColor === background && style.filter === 'none';
      }),
    };
  });
  expect(facts).toEqual({
    phrasesPresent: true, recordsPresent: true,
    phraseColors: true, cardSurfaces: true, labelColors: true,
    activeBadge: true, recordSurfaces: true,
  });
}
