import type { Page } from '@playwright/test';
import sceneManifest from '../src/assets/scenes/scene-manifest.json' with { type: 'json' };
import { expect, test } from './helpers/fixtures.ts';
import { sceneMonitor } from './helpers/setup.ts';
import { gateViewports } from './helpers/viewports.ts';

const sceneCount = 8;
const sceneAssetIds = new Set(sceneManifest.assets.map(({ id }) => id));
const desktopViewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1920, height: 1080 },
] as const;
const compactViewports = [
  { width: 360, height: 640 },
  { width: 640, height: 320 },
  { width: 915, height: 412 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function openGuide(
  page: Page,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('');
  if (viewport.height > viewport.width) {
    await page.getByRole('button', { name: 'Continue in portrait' }).click();
  }
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select your debaters' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await sceneMonitor(page).click();
  await expect(page.locator('dialog.scene-picker')).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page.locator('dialog.scene-picker img').evaluateAll((images) =>
        images.every((image) => {
          const candidate = image as HTMLImageElement;
          return candidate.complete && candidate.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
}

for (const viewport of gateViewports(desktopViewports)) {
  test(`the scene guide fits without scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await openGuide(page, viewport);
    for (const index of [0, 3, sceneCount - 1]) {
      await page.getByTestId('scene-tile').nth(index).hover();
      const geometry = await page.evaluate(() => {
        const dialog = document.querySelector('dialog.scene-picker')!.getBoundingClientRect();
        const frame = document.querySelector<HTMLElement>('.scene-picker-frame')!;
        const inside = (element: Element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= dialog.left - 1 &&
            box.right <= dialog.right + 1 &&
            box.top >= dialog.top - 1 &&
            box.bottom <= dialog.bottom + 1
          );
        };
        const tiles = [...document.querySelectorAll('.scene-tile')].map((tile) =>
          tile.getBoundingClientRect(),
        );
        const overlap = tiles.some((a, i) =>
          tiles.some(
            (b, j) =>
              i < j &&
              a.left < b.right - 1 &&
              b.left < a.right - 1 &&
              a.top < b.bottom - 1 &&
              b.top < a.bottom - 1,
          ),
        );
        const description = document.querySelector<HTMLElement>('.scene-preview-description')!;
        const monitor = document.querySelector('.scene-preview-monitor')!.getBoundingClientRect();
        const caption = document.querySelector('.scene-preview-caption')!.getBoundingClientRect();
        return {
          pageHScroll: document.documentElement.scrollWidth > innerWidth + 1,
          frameScroll: frame.scrollHeight - frame.clientHeight,
          descriptionScroll: description.scrollHeight - description.clientHeight,
          allInside: [
            ...document.querySelectorAll(
              '.scene-tile, .scene-preview-monitor, .scene-preview-caption, .scene-preview-done, .scene-picker-close',
            ),
          ].every(inside),
          overlap,
          captionBelowMonitor: caption.top >= monitor.bottom - 1,
          tileCount: tiles.length,
        };
      });
      expect(geometry, `tile ${index}`).toEqual({
        pageHScroll: false,
        frameScroll: 0,
        descriptionScroll: 0,
        allInside: true,
        overlap: false,
        captionBelowMonitor: true,
        tileCount: sceneCount,
      });
    }
  });
}

for (const viewport of gateViewports(compactViewports)) {
  test(`the scene guide stacks and scrolls inside its frame at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await openGuide(page, viewport);
    await page
      .getByTestId('scene-tile')
      .nth(sceneCount - 1)
      .hover();
    const geometry = await page.evaluate(() => {
      const monitor = document.querySelector('.scene-preview-monitor')!.getBoundingClientRect();
      const caption = document.querySelector('.scene-preview-caption')!.getBoundingClientRect();
      const description = document.querySelector<HTMLElement>('.scene-preview-description')!;
      const title = document.querySelector('.scene-preview-caption h3')!.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.scene-tile')].map((tile) =>
        tile.getBoundingClientRect(),
      );
      return {
        pageHScroll: document.documentElement.scrollWidth > innerWidth + 1,
        captionBelowMonitor: caption.top >= monitor.bottom - 1,
        titleInsideCaption: title.top >= caption.top - 1 && title.bottom <= caption.bottom + 1,
        descriptionFits: description.scrollHeight <= description.clientHeight + 1,
        tilesDoNotOverlap: !tiles.some((a, i) =>
          tiles.some(
            (b, j) =>
              i < j &&
              a.left < b.right - 1 &&
              b.left < a.right - 1 &&
              a.top < b.bottom - 1 &&
              b.top < a.bottom - 1,
          ),
        ),
      };
    });
    expect(geometry).toEqual({
      pageHScroll: false,
      captionBelowMonitor: true,
      titleInsideCaption: true,
      descriptionFits: true,
      tilesDoNotOverlap: true,
    });
    // Every tile stays reachable by scrolling the frame.
    const last = page.getByTestId('scene-tile').nth(sceneCount - 1);
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await last.click();
    await page.getByTestId('scene-picker-close').click();
    await expect(sceneMonitor(page)).toHaveAttribute('data-scene-id', 'grand-hotel-romania');
  });
}

test('scene names that are 40 percent longer wrap inside the guide', async ({ page }) => {
  await openGuide(page, { width: 1024, height: 720 });
  const evidence = await page.evaluate(() => {
    const expand = (value: string) => (value + ' ' + value).slice(0, Math.ceil(value.length * 1.4));
    const fits = (element: HTMLElement, container: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      const box = container.getBoundingClientRect();
      return (
        text.left >= box.left - 1 &&
        text.right <= box.right + 1 &&
        text.top >= box.top - 1 &&
        text.bottom <= box.bottom + 1
      );
    };
    const title = document.querySelector<HTMLElement>('.scene-preview-caption h3')!;
    title.textContent = expand(title.textContent!.trim());
    const names = [...document.querySelectorAll<HTMLElement>('.scene-tile-name')];
    for (const name of names) name.textContent = expand(name.textContent!.trim());
    return {
      title: fits(title, title.parentElement!),
      tiles: names.map((name) => fits(name, name.closest('.scene-tile')!)),
      pageHScroll: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  expect(evidence.title).toBe(true);
  expect(evidence.tiles).toEqual(Array.from({ length: sceneCount }, () => true));
  expect(evidence.pageHScroll).toBe(false);
});

test('setup requests only small art for the selected scene until the guide opens', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    const match = /\/assets\/([a-z-]+?)-(\d+)x\d+-[\w-]+\.(?:avif|webp)(?:$|[?#])/u.exec(
      request.url(),
    );
    if (match && sceneAssetIds.has(match[1]!)) {
      requested.push(`${match[1]}:${match[2]}`);
    }
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select your debaters' })).toBeVisible();
  await expect(sceneMonitor(page).locator('img').first()).toHaveJSProperty('complete', true);
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((entry) => !entry.endsWith(':640'))).toEqual([]);
  expect(
    requested.filter((entry) => !entry.startsWith('transition-era-television-studio')),
  ).toEqual([]);

  await sceneMonitor(page).click();
  await expect(page.locator('dialog.scene-picker')).toHaveAttribute('open', '');
  await expect
    .poll(
      () =>
        new Set(
          requested.map((entry) => entry.split(':')[0]!.replace(/-(?:desks|foreground)$/u, '')),
        ).size,
    )
    .toBe(sceneCount);
  // Tiles and the monitor never need the two largest widths.
  expect(requested.some((entry) => /:(?:2560|3840)$/u.test(entry))).toBe(false);
});
