import { expect, test } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

for (const viewport of [{ width: 1024, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`The Reluctant Theorem plays on both sides at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await useFixedBrowserMatchSeed(page, 20260912);
    await page.goto('');
    await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
    for (const side of ['One', 'Two']) {
      await page.locator(`#player${side}CharacterId`).click();
      await page.locator('.roster-choice[data-character-id="reluctant-theorem"]').click();
      await expect(page.locator(`#player${side}CharacterId`)).toHaveAttribute('data-character-id', 'reluctant-theorem');
    }
    await expect(page.locator('.contestant-weaknesses')).toHaveText([
      'Indecision · Urgency · Delivery', 'Indecision · Urgency · Delivery',
    ]);
    await page.locator('.contestant-portrait').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    await page.screenshot({ path: testInfo.outputPath('reluctant-theorem-setup.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    for (const side of ['red', 'blue']) {
      const player = page.locator(`.match-player[data-side="${side}"]`);
      await expect(player.getByRole('heading')).toHaveText('Reluctant Theorem');
      await expect(player.locator('.character-frame')).toHaveAttribute('data-source-facing', 'right');
      await expect(player.locator('.character-frame')).toHaveAttribute('data-mirrored', side === 'blue' ? 'true' : 'false');
      const portrait = player.locator('.character-portrait');
      await expect(portrait).toHaveAttribute('src', /reluctant-theorem/u);
      await portrait.evaluate((image: HTMLImageElement) => image.decode());
      expect(await portrait.evaluate((image: HTMLImageElement) =>
        image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await portrait.evaluate((image: HTMLImageElement) => image.currentSrc))
        .toMatch(/reluctant-theorem-\d+x\d+-[\w-]+\.(?:avif|webp)$/u);
    }
    await expect(page.locator('.shared-board > li')).toHaveCount(9);
    expect(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))).toEqual(viewport);
    await page.screenshot({
      path: testInfo.outputPath('reluctant-theorem-match.png'),
      animations: 'disabled',
      mask: [page.locator('.private-hand')],
    });
  });
}
