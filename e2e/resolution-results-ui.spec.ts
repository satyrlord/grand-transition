import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  planResolutionBrowserFlow,
  type ResolutionBrowserAction,
} from './helpers/resolution-flow';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
});

test('a fixed hotseat flow reaches continuation, comeback, double knockout, sudden death, results, setup, and rematch', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const plan = planResolutionBrowserFlow();
  await startMatch(page);
  const firstRun = await executePlan(
    page,
    plan.actions,
    testInfo.outputPath('resolution'),
  );

  expect(firstRun.continuation).toBe(true);
  expect(firstRun.comeback).toBe(true);
  expect(firstRun.doubleKnockout).toBe(true);
  expect(firstRun.suddenDeath).toBe(true);
  await expect(page.getByRole('heading', { name: /Winner:/u })).toBeVisible();
  await expect(page.locator('.outcome-record > p')).toContainText(
    'Cliffhanger scores:',
  );
  await expect(page.locator('.outcome-record > p')).toContainText(
    'Pride damage:',
  );
  await expect(
    page.getByText('Final score — The Red-Folded Chairman'),
  ).toBeVisible();
  await expect(
    page.getByText('Final score — The Thunder Tribune'),
  ).toBeVisible();
  await expect(page.getByText('Best insult', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('results-desktop.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Return to match setup' }).click();
  await expect(
    page.getByRole('heading', { name: 'Set up match' }),
  ).toBeFocused();
  await startFromSetup(page);
  await executePlan(
    page,
    plan.actions,
    testInfo.outputPath('second-resolution'),
  );
  await page
    .getByRole('button', { name: 'Start rematch with same setup' })
    .click();
  await expect(
    page.getByRole('heading', {
      name: /Round 1.*Thunder Tribune's turn/u,
    }),
  ).toBeFocused();
});

test('normal and reduced motion expose the same resolved DOM and snapshot', async ({
  page,
}) => {
  const actions = planResolutionBrowserFlow().actions;
  const firstRoundEnd = actions.findIndex(
    (action) => action.kind === 'continue',
  );
  const firstRound = actions.slice(0, firstRoundEnd);

  await startMatch(page);
  await executeDraftActions(page, firstRound);
  const normal = await resolutionEvidence(page);
  expect(normal.animationName).toBe('resolution-meter-change');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await startMatch(page);
  await executeDraftActions(page, firstRound);
  const reduced = await resolutionEvidence(page);

  expect(reduced.animationName).toBe('none');
  expect(reduced.text).toBe(normal.text);
  expect(reduced.snapshot).toEqual(normal.snapshot);
});

test('the resolution record reflows across the shared viewports and text scaling', async ({
  page,
}, testInfo) => {
  const actions = planResolutionBrowserFlow().actions;
  const firstRoundEnd = actions.findIndex(
    (action) => action.kind === 'continue',
  );
  await startMatch(page);
  await executeDraftActions(page, actions.slice(0, firstRoundEnd));

  const viewports = [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')].map((button) =>
        button.getBoundingClientRect(),
      );
      const clipped = [
        ...document.querySelectorAll(
          '.resolution-heading, .resolution-sequence, .results-record, .resolution-actions',
        ),
      ].filter((element) => element.scrollWidth > element.clientWidth + 1);
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        targets: buttons.every((box) => box.width >= 44 && box.height >= 44),
        clipped: clipped.length,
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.targets).toBe(true);
    expect(geometry.clipped).toBe(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.locator('.equation-operator').filter({ hasText: '+' }).first(),
  ).toBeVisible();
  await expect(
    page.locator('.equation-operator').filter({ hasText: '=' }).first(),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('resolution-mobile-390x844.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const scaledWidth = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(scaledWidth.document).toBeLessThanOrEqual(scaledWidth.viewport);

  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.getByRole('button', { name: /^Continue to/u })).toHaveCSS(
    'border-top-style',
    'solid',
  );
});

async function executePlan(
  page: Page,
  actions: readonly ResolutionBrowserAction[],
  screenshotPrefix: string,
): Promise<
  Readonly<{
    continuation: boolean;
    comeback: boolean;
    doubleKnockout: boolean;
    suddenDeath: boolean;
  }>
> {
  let continuation = false;
  let comeback = false;
  let doubleKnockout = false;
  let suddenDeath = false;
  let resolutionIndex = 0;

  for (const action of actions) {
    if (action.kind === 'draft') {
      await executeDraftAction(page, action);
      continue;
    }

    const screen = page.locator('grand-transition-resolution-results');
    await expect(screen).toBeVisible();
    const text = await screen.innerText();
    continuation ||= text.includes('Continuation survived');
    comeback ||= text.includes('comeback activated');
    doubleKnockout ||= text.includes('Double knockout recorded');
    suddenDeath ||= text.includes('Sudden-death exchange complete');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (resolutionIndex === 0 || text.includes('Double knockout recorded')) {
      await page.screenshot({
        path: `${screenshotPrefix}-${resolutionIndex}.png`,
        fullPage: true,
      });
    }
    resolutionIndex += 1;
    await page.getByRole('button', { name: /^Continue to/u }).click();
  }

  await expect(
    page.locator('grand-transition-resolution-results'),
  ).toBeVisible();
  const resultText = await page
    .locator('grand-transition-resolution-results')
    .innerText();
  suddenDeath ||= resultText.includes('Sudden-death exchange complete');
  return { continuation, comeback, doubleKnockout, suddenDeath };
}

async function executeDraftActions(
  page: Page,
  actions: readonly ResolutionBrowserAction[],
): Promise<void> {
  for (const action of actions) {
    if (action.kind !== 'draft') {
      throw new Error('A round-only action list cannot contain Continue.');
    }
    await executeDraftAction(page, action);
  }
  await expect(
    page.locator('grand-transition-resolution-results'),
  ).toBeVisible();
}

async function executeDraftAction(
  page: Page,
  action: Extract<ResolutionBrowserAction, { kind: 'draft' }>,
): Promise<void> {
  const command = action.command;
  switch (command.type) {
    case 'select-phrase': {
      const card = command.payload.card;
      await page
        .locator(
          `[data-card-source="${card.source}"][data-card-id="${card.cardId}"]`,
        )
        .click();
      return;
    }
    case 'commit-sentence':
      await page.getByRole('button', { name: 'End sentence' }).click();
      return;
    case 'redraw-hand':
      await page.getByRole('button', { name: 'Redraw hand' }).click();
      return;
    case 'select-comeback':
      await page.getByRole('button', { name: 'Comeback' }).click();
      return;
    default:
      throw new Error(`Unsupported browser draft action: ${command.type}`);
  }
}

async function resolutionEvidence(page: Page): Promise<
  Readonly<{
    text: string;
    snapshot: unknown;
    animationName: string;
  }>
> {
  return page
    .locator('grand-transition-resolution-results')
    .evaluate((element) => {
      const screen = element as HTMLElement & { snapshot: unknown };
      const text = screen.innerText.replaceAll(/\s+/gu, ' ').trim();
      const meter = screen.querySelector('.meter-track span');
      return {
        text,
        snapshot: screen.snapshot,
        animationName: meter ? getComputedStyle(meter).animationName : '',
      };
    });
}

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await startFromSetup(page);
}

async function startFromSetup(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeFocused();
}
