import { expect, test } from '@playwright/test';

for (const scene of ['modern-debate-studio', 'transition-era-television-studio']) {
  for (const sample of [
    { width: 1280, height: 720, dpr: 1, sourceWidth: 1280 },
    { width: 1920, height: 1080, dpr: 1, sourceWidth: 1920 },
    { width: 2560, height: 1440, dpr: 1, sourceWidth: 2560 },
    { width: 3431, height: 1253, dpr: 1, sourceWidth: 3840 },
    { width: 3840, height: 2160, dpr: 1, sourceWidth: 3840 },
    { width: 1920, height: 1080, dpr: 2, sourceWidth: 3840 },
  ]) {
    test(`${scene} loads ${sample.sourceWidth}px artwork at ${sample.width}x${sample.height} DPR ${sample.dpr}`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: sample.width, height: sample.height },
        deviceScaleFactor: sample.dpr,
      });
      try {
        const page = await context.newPage();
        await page.goto(testInfo.project.use.baseURL!);
        await page.getByRole('button', { name: 'Set up match' }).click();
        await page.getByLabel('Scene').selectOption(scene);
        await page.getByRole('button', { name: 'Start match', exact: true }).click();
        const layers = page.locator('.broadcast-stage-art, .broadcast-stage-foreground');
        await expect(layers).toHaveCount(2);
        const facts = await layers.evaluateAll(async (elements) => Promise.all(elements.map(async (element) => {
          const image = element as HTMLImageElement;
          await image.decode();
          const bitmap = await createImageBitmap(await (await fetch(image.currentSrc)).blob());
          const sourceWidth = bitmap.width;
          bitmap.close();
          const box = image.getBoundingClientRect();
          return {
            sourceWidth,
            masterWidth: image.getAttribute('width'),
            masterHeight: image.getAttribute('height'),
            covers: box.left <= 0.5 && box.top <= 0.5 &&
              box.right >= innerWidth - 0.5 && box.bottom >= innerHeight - 0.5,
            aspectRatio: box.width / box.height,
          };
        })));
        for (const fact of facts) {
          expect(fact.sourceWidth).toBe(sample.sourceWidth);
          expect(fact.masterWidth).toBe('3840');
          expect(fact.masterHeight).toBe('2160');
          expect(fact.covers).toBe(true);
          expect(fact.aspectRatio).toBeCloseTo(16 / 9, 3);
        }
        await page.screenshot({ path: testInfo.outputPath(`${scene}.png`) });
      } finally {
        await context.close();
      }
    });
  }
}
