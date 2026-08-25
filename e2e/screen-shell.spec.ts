import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'narrow-landscape', width: 844, height: 390 },
  { name: 'portrait-mobile', width: 390, height: 844 },
  { name: 'minimum-width', width: 320, height: 568 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name} pointer flow remains accessible and inside the viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    await expect(
      page.getByRole('heading', { name: 'Grand Transition' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'All characters and events are fictional composites created for satire.',
      ),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-title.png`),
      fullPage: true,
    });

    const url = page.url();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(
      page.getByRole('heading', { name: 'Set up match' }),
    ).toBeVisible();
    expect(page.url()).toBe(url);
    await page
      .getByLabel('Player two character')
      .selectOption('red-folded-chairman');

    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      controlsInside: [...document.querySelectorAll('select, button')].every(
        (control) => {
          const box = control.getBoundingClientRect();
          return (
            box.left >= 0 &&
            box.right <= document.documentElement.clientWidth &&
            box.width >= 24 &&
            box.height >= 24
          );
        },
      ),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.controlsInside).toBe(true);

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-setup.png`),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(
      page.getByRole('heading', { name: 'Grand Transition' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(page.getByLabel('Player two character')).toHaveValue(
      'red-folded-chairman',
    );
  });
}

for (const viewport of viewports) {
  test(`${viewport.name} keyboard order, Escape, and duplicate submit are deterministic`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    const url = page.url();

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Set up match' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Set up match' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Mode')).toBeFocused();
    for (const name of [
      'Scene',
      'Player one character',
      'Player two character',
    ]) {
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(name)).toBeFocused();
    }

    await page
      .getByLabel('Player two character')
      .selectOption('red-folded-chairman');
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Player two character')).toHaveValue(
      'red-folded-chairman',
    );

    const eventFacts = await page.evaluate(() => {
      const app = document.querySelector('grand-transition-app')!;
      const facts: { count: number; frozen: boolean; composed: boolean } = {
        count: 0,
        frozen: false,
        composed: false,
      };
      app.addEventListener('start-match', (event) => {
        const command = event as CustomEvent;
        facts.count += 1;
        facts.frozen = Object.isFrozen(command.detail);
        facts.composed = command.composed;
      });
      const form = document.querySelector('form')!;
      form.dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true }),
      );
      return facts;
    });
    expect(eventFacts).toEqual({ count: 1, frozen: true, composed: true });

    expect(page.url()).toBe(url);
  });
}

test('setup reflows with 200 percent text and respects reduced motion and forced colors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto('');
  await expect(page.locator('.status')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    startMatchVisible: Boolean(
      document.querySelector('.primary-action')?.getBoundingClientRect().height,
    ),
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.startMatchVisible).toBe(true);
});
