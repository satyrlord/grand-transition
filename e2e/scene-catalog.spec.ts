import { expect, test } from '@playwright/test';

const scenes = [
  'transition-era-television-studio',
  'modern-debate-studio',
  'county-council-ballroom',
  'midnight-call-in-studio',
  'palace-press-hall',
  'influencer-campaign-livestream',
] as const;

const viewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1920, height: 1080 },
];

test('a sentence forty percent longer than the long-match fixture fits above the moderator', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  const baseline = [
    'A NATIONAL-SALVATION COMMITTEE REPACKAGES AN INFRASTRUCTURE FEASIBILITY STUDY',
    'DURING THE NIGHT, AS THIEVES, BEFORE THE MICROPHONES COOL',
    'AND A COUNTY-COUNCIL MAJORITY COORDINATES A PUBLIC-PROCUREMENT FILE',
    'THROUGH ANOTHER REFORM CYCLE, PENDING FURTHER CONSULTATION',
  ].join(', ');
  const sentence = `${baseline} ${baseline}`.slice(0, Math.ceil(baseline.length * 1.4));
  await page.locator('grand-transition-match').evaluate(async (element, text) => {
    const match = element as HTMLElement & {
      snapshot: Readonly<Record<string, unknown>> & { revision: number };
      updateComplete: Promise<boolean>;
    };
    match.snapshot = { ...match.snapshot, revision: match.snapshot.revision + 1, sentenceText: text };
    await match.updateComplete;
    await document.fonts.ready;
  }, sentence);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const fits = await page.evaluate(() => {
      const bubble = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.sentence-preview')!);
      const text = range.getBoundingClientRect();
      return text.top >= bubble.top && text.bottom <= bubble.bottom && text.left >= bubble.left && text.right <= bubble.right;
    });
    expect(fits, `${viewport.width}x${viewport.height}`).toBe(true);
    await expect(page.locator('.sentence-preview')).toHaveText(sentence);
  }
});

for (const scene of scenes) {
  test(`${scene} keeps its artwork, players, and moderator clear at every supported viewport`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByLabel('Scene', { exact: true }).selectOption(scene);
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await expect(page.locator('.broadcast-stage-art')).toHaveAttribute('data-scene-asset', scene);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
      });
      await expect.poll(() => page.locator('.broadcast-stage-art').evaluate(
        (image: HTMLImageElement) => image.complete && image.currentSrc.length > 0 && image.naturalWidth > 0,
      )).toBe(true);
      const geometry = await page.evaluate(() => {
        const background = document.querySelector<HTMLImageElement>('.broadcast-stage-art')!;
        const back = background.getBoundingClientRect();
        const speech = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
        const pool = document.querySelector('.common-phrases')!;
        const poolBox = pool.getBoundingClientRect();
        const focal = JSON.parse(background.closest('picture')!.getAttribute('data-scene-focal-rectangles')!) as {
          moderatorFace: { x: number; y: number; width: number; height: number } | null;
        };
        const face = focal.moderatorFace;
        const moderator = face ? {
          left: back.left + back.width * face.x,
          right: back.left + back.width * (face.x + face.width),
          top: back.top + back.height * face.y,
          bottom: back.top + back.height * (face.y + face.height),
        } : null;
        const frames = [...document.querySelectorAll('.character-frame')].map(frame => frame.getBoundingClientRect());
        return {
          source: background.currentSrc,
          loaded: background.complete && background.naturalWidth > 0,
          allManifest: [...document.querySelectorAll('.broadcast-scene-picture')].every(picture => picture.getAttribute('data-scene-kind') === 'manifest'),
          pointerInert: getComputedStyle(background).pointerEvents === 'none',
          noScroll: document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight,
          poolFits: poolBox.bottom <= innerHeight && poolBox.top >= 0,
          poolBackground: getComputedStyle(pool).backgroundColor,
          centered: Math.abs((poolBox.left + poolBox.right) / 2 - innerWidth / 2) < 1,
          moderatorClear: !moderator || (speech.bottom < moderator.top && poolBox.top > moderator.bottom),
          moderatorCentered: !moderator || Math.abs((moderator.left + moderator.right) / 2 - innerWidth / 2) < 1,
          frameScale: frames.map(frame => frame.height / back.height),
          frameTop: frames.map(frame => (frame.top - back.top) / back.height),
          squarePortraits: [...document.querySelectorAll('.character-portrait')].every(image => {
            const rect = image.getBoundingClientRect();
            return Math.abs(rect.width - rect.height) < 1;
          }),
        };
      });
      expect(geometry.source).toContain(scene);
      expect(geometry.source).not.toContain('title-proscenium');
      expect(geometry.loaded).toBe(true);
      expect(geometry.allManifest).toBe(true);
      expect(geometry.pointerInert).toBe(true);
      expect(geometry.noScroll).toBe(true);
      expect(geometry.poolFits).toBe(true);
      expect(geometry.centered).toBe(true);
      expect(geometry.moderatorClear).toBe(true);
      expect(geometry.moderatorCentered).toBe(true);
      expect(geometry.poolBackground).toBe('rgba(5, 6, 8, 0.78)');
      expect(geometry.squarePortraits).toBe(true);
      for (const scale of geometry.frameScale) expect(scale).toBeCloseTo(0.8, 3);
      for (const top of geometry.frameTop) expect(top).toBeCloseTo(0.24, 3);
      await expect(page.locator('.shared-board > li')).toHaveCount(9);
      await page.screenshot({ path: testInfo.outputPath(`${scene}-${viewport.width}x${viewport.height}.png`) });
    }
  });
}
