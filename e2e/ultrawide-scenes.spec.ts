import { expect, test } from '@playwright/test';

for (const scene of [
  'county-council-ballroom',
  'midnight-call-in-studio',
  'palace-press-hall',
  'influencer-campaign-livestream',
  'modern-debate-studio',
  'transition-era-television-studio',
]) {
  test(`${scene} fills ultrawide viewports without distorting scene layers`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 3424, height: 1427 });
    await page.goto('');
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByLabel('Scene').selectOption(scene);
    await page.getByRole('button', { name: 'Start match' }).click();
    await expect(page.locator('.broadcast-stage-art')).toBeVisible();

    for (const viewport of [
      { width: 2560, height: 1080 },
      { width: 3424, height: 1427 },
      { width: 5120, height: 1440 },
    ]) {
      await page.setViewportSize(viewport);
      await page.mouse.move(0, 0);
      const geometry = await page.evaluate(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const images = [...document.querySelectorAll<HTMLImageElement>(
          '.broadcast-stage-art, .broadcast-stage-props, .broadcast-stage-foreground',
        )];
        await Promise.all(images.map((image) => image.decode()));
        const back = images[0]!.getBoundingClientRect();
        const focalRectangles = JSON.parse(images[0]!.closest('picture')!
          .getAttribute('data-scene-focal-rectangles')!) as {
            moderatorFace: { y: number } | null;
          };
        const faceTop = focalRectangles.moderatorFace
          ? back.top + back.height * focalRectangles.moderatorFace.y
          : Infinity;
        const speech = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
        return {
          moderatorClear: speech.bottom < faceTop,
          covers: back.left <= 0.5 && back.top <= 0.5 &&
            back.right >= innerWidth - 0.5 && back.bottom >= innerHeight - 0.5,
          aligned: images.every((image) => {
            const box = image.getBoundingClientRect();
            return Math.abs(box.x - back.x) < 0.5 && Math.abs(box.y - back.y) < 0.5 &&
              Math.abs(box.width - back.width) < 0.5 && Math.abs(box.height - back.height) < 0.5;
          }),
          undistorted: images.every((image) => {
            const box = image.getBoundingClientRect();
            return Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight) < 0.001;
          }),
          noScroll: document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        };
      });
      expect(geometry, JSON.stringify(viewport)).toEqual({
        covers: true, aligned: true, undistorted: true, noScroll: true, moderatorClear: true,
      });
      await expect(page.locator('.shared-board > li')).toHaveCount(9);
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${scene}-${viewport.width}.png`) });
    }
  });
}
