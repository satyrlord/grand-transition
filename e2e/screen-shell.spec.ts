import { expect, test } from '@playwright/test';

const supportedViewports = [
  { name: 'minimum-landscape', width: 1024, height: 720 },
  { name: 'four-by-three', width: 1024, height: 768 },
  { name: 'common-landscape', width: 1280, height: 720 },
  { name: 'recommended-pc', width: 1920, height: 1080 },
] as const;

for (const viewport of supportedViewports) {
  test(`${viewport.name} pointer flow stays inside the viewport`, async ({
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
            box.left >= 0 && box.right <= document.documentElement.clientWidth
          );
        },
      ),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.controlsInside).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-setup.png`),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(page.getByLabel('Player two character')).toHaveValue(
      'red-folded-chairman',
    );
  });
}

test('duplicate setup submit dispatches one immutable command', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();

  const eventFacts = await page.evaluate(() => {
    const app = document.querySelector('grand-transition-app')!;
    const facts = { count: 0, frozen: false, composed: false };
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
});

for (const viewport of [
  { width: 1023, height: 720 },
  { width: 1024, height: 719 },
  { width: 720, height: 1024 },
  { width: 1200, height: 1600 },
  { width: 1024, height: 1024 },
]) {
  test(`blocks ${viewport.width} by ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('');

    await expect(
      page.locator('[data-interruption="unsupported-viewport"]'),
    ).toBeVisible();
    await expect(page.locator('grand-transition-title')).toHaveCount(0);
    await expect(page.getByText('1024 × 720', { exact: true })).toBeVisible();
    await expect(
      page.getByText('1920 × 1080 on PC', { exact: true }),
    ).toBeVisible();
  });
}
