import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { loadGameContent } from '../tools/load-game-content';

const { sampleContent: catalog, englishGameLocale: locale } = loadGameContent();
const viewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`complete foundation selection at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.roster-choice')).toHaveCount(19);
    await expect(page.getByLabel('Scene', { exact: true }).locator('option')).toHaveCount(6);
    await page.locator('.roster-headshot').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    // A decoded resource can still leave an unpainted frame. Check rendered pixels.
    await expect.poll(async () => {
      const windows = await page.locator('.roster-portrait-window').evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        const inset = Math.max(3, Math.floor(Math.min(box.width, box.height) * 0.08));
        return { left: Math.ceil(box.left) + inset, top: Math.ceil(box.top) + inset,
          width: Math.floor(box.width) - 2 * inset, height: Math.floor(box.height) - 2 * inset };
      }));
      const pixels = await page.screenshot();
      const checks = await Promise.all(windows.map(async (window) => {
        const stats = await sharp(pixels).extract(window).stats();
        return stats.channels.slice(0, 3).some((channel) => channel.stdev > 8);
      }));
      return checks.every(Boolean);
    }, { timeout: 10_000 }).toBe(true);

    for (const side of ['one', 'two'] as const) {
      const selector = page.locator(side === 'one' ? '#playerOneCharacterId' : '#playerTwoCharacterId');
      const stage = page.locator(`.contestant-stage--${side}`);
      for (const character of catalog.characters) {
        // Choosing a character advances the target, so select the intended side each time.
        await selector.click();
        await page.locator(`.roster-choice[data-character-id="${character.id}"]`).click();
        await expect(selector).toHaveAttribute('data-character-id', character.id);
        await expect(stage.locator('.contestant-record strong')).toHaveText(locale.messages[character.nameKey]!);
        await stage.locator('.contestant-portrait').evaluate((image: HTMLImageElement) => image.decode());
        await expect(stage.locator('.contestant-portrait')).toHaveAttribute('src', new RegExp(character.id, 'u'));
        const geometry = await stage.evaluate(element => {
          const stageBox = element.getBoundingClientRect();
          const name = element.querySelector<HTMLElement>('.contestant-record strong')!;
          const range = document.createRange();
          range.selectNodeContents(name);
          const nameBox = range.getBoundingClientRect();
          const record = element.querySelector('.contestant-record')!.getBoundingClientRect();
          const weaknesses = element.querySelector('.contestant-record > span')!.getBoundingClientRect();
          const image = element.querySelector<HTMLImageElement>('.contestant-portrait')!;
          const portrait = image.getBoundingClientRect();
          return {
            loaded: image.complete && image.naturalWidth > 0,
            // Display-font glyphs can exceed their line box without being clipped.
            nameFits: nameBox.left >= record.left && nameBox.right <= record.right && nameBox.top >= record.top && nameBox.bottom <= weaknesses.top + 1,
            nameInside: nameBox.left >= 0 && nameBox.top >= 0 && nameBox.right <= innerWidth && nameBox.bottom <= innerHeight,
            portraitInside: portrait.left >= stageBox.left - 1 && portrait.top >= stageBox.top - 1 && portrait.right <= stageBox.right + 1 && portrait.bottom <= stageBox.bottom + 1,
            pageFits: document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight,
          };
        });
        expect(geometry, `${side}: ${character.id}`).toEqual({ loaded: true, nameFits: true, nameInside: true, portraitInside: true, pageFits: true });
      }
    }

    for (const scene of catalog.scenes) {
      await page.getByLabel('Scene', { exact: true }).selectOption(scene.id);
      await expect(page.getByLabel('Scene', { exact: true })).toHaveValue(scene.id);
      await expect(page.getByRole('button', { name: 'Start match', exact: true })).toBeEnabled();
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`catalog-${viewport.width}x${viewport.height}.png`) });
  });
}
