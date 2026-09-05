import { expect, test } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

for (const viewport of [
  { width: 1024, height: 720 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`forced colors preserve setup and Pause choices at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await useFixedBrowserMatchSeed(page);
    await page.goto('');
    await page.getByRole('button', { name: 'Set up match', exact: true }).click();
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const overlays = page.locator('.contestant-stage-target, .skin-selector');
    expect(await overlays.count()).toBeGreaterThanOrEqual(2);
    for (const overlay of await overlays.all()) {
      await expect(overlay).toHaveCSS('background-color', /^rgba\(.*[,]\s*0\)$/);
    }
    const stages = page.locator('.contestant-stage');
    await expect(stages).toHaveCount(2);
    await page.keyboard.press('Tab');
    for (const stage of await stages.all()) {
      await expect(stage.locator('.contestant-player')).toBeVisible();
      await expect(stage.locator('.contestant-record strong')).toBeVisible();
      await expect(stage.locator('.contestant-weaknesses')).toBeVisible();
      await expect(stage.locator('.contestant-weaknesses')).not.toHaveText('');
      await expect(stage.locator('.contestant-portrait')).toBeVisible();
      const target = stage.locator('.contestant-stage-target');
      await target.focus();
      await expect(target).toBeFocused();
      await expect(stage).toHaveCSS('outline-style', 'solid');
      await expect(stage).toHaveCSS('outline-width', '3px');
    }
    await page.screenshot({ path: testInfo.outputPath('forced-setup.png') });
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const groups = page.locator('.interruption-notice fieldset');
    await expect(groups).toHaveCount(3);
    for (const group of await groups.all()) {
      const selected = group.locator('[aria-pressed="true"]');
      await expect(selected).toHaveCount(1);
      await page.keyboard.press('Tab');
      await selected.focus();
      await expect(selected).toBeFocused();
      await expect(selected).toHaveCSS('outline-width', '3px');
      await expect(selected).toHaveCSS('outline-offset', '3px');
      await expect(selected).toHaveCSS('text-decoration-line', 'underline');
      expect(await selected.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.color !== style.backgroundColor;
      })).toBe(true);
      await selected.hover();
      await expect(selected).toHaveCSS('text-decoration-line', 'underline');
      const other = group.locator('[aria-pressed="false"]').first();
      await expect(other).toHaveCSS('text-decoration-line', 'none');
      const choice = group.getByRole('button', { name: (await other.textContent())!.trim(), exact: true });
      await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(choice).toHaveCSS('text-decoration-line', 'underline');
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath('forced-pause.png') });
  });
}
