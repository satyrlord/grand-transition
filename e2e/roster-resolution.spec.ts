import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 3424, height: 1427 },
  { width: 5120, height: 1440 },
];

for (const deviceScaleFactor of [1, 2]) {
  for (const viewport of viewports) {
    test(`roster crop resolution at ${viewport.width}x${viewport.height}, DPR ${deviceScaleFactor}`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport,
        deviceScaleFactor,
      });
      try {
        const page = await context.newPage();
        await page.goto('/grand-transition/');
        await page.getByRole('button', { name: 'Multiplayer' }).click();
        await page.locator('.roster-headshot').evaluateAll(async (images) => {
          await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
        });
        const samples = await page.locator('.roster-headshot').evaluateAll(async (images) =>
          Promise.all(images.map(async (element) => {
            const image = element as HTMLImageElement;
            // A separate image gives physical source pixels, without srcset density correction.
            const source = new Image();
            source.src = image.currentSrc;
            await source.decode();
            const style = getComputedStyle(image);
            const activeScale = Number(style.getPropertyValue('--roster-portrait-active-scale'));
            const drawnWidth = Math.max(image.clientWidth, image.clientHeight) * activeScale;
            return {
              source: image.currentSrc,
              pixels: source.naturalWidth,
              required: Math.min(960, Math.ceil(drawnWidth * devicePixelRatio)),
            };
          })),
        );
        await page.locator('.roster-zone').screenshot({ path: testInfo.outputPath('roster.png') });
        expect(samples).toHaveLength(18);
        for (const sample of samples) {
          expect(sample.pixels, JSON.stringify(sample)).toBeGreaterThanOrEqual(sample.required);
        }
      } finally {
        await context.close();
      }
    });
  }
}
