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
  await page.screenshot({
    path: testInfo.outputPath('results-desktop.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Return to match setup' }).click();
  await expect(
    page.getByRole('heading', { name: 'Set up match' }),
  ).toBeVisible();
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
  ).toBeVisible();
});

test('the resolution record fits the supported landscape matrix', async ({
  page,
}, testInfo) => {
  const actions = planResolutionBrowserFlow().actions;
  const firstRoundEnd = actions.findIndex(
    (action) => action.kind === 'continue',
  );
  await startMatch(page);
  await executeDraftActions(page, actions.slice(0, firstRoundEnd));

  const viewports = [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
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
        buttonsInside: buttons.every(
          (box) => box.left >= 0 && box.right <= window.innerWidth,
        ),
        clipped: clipped.length,
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.buttonsInside).toBe(true);
    expect(geometry.clipped).toBe(0);
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(
    page.locator('.equation-operator').filter({ hasText: '+' }).first(),
  ).toBeVisible();
  await expect(
    page.locator('.equation-operator').filter({ hasText: '=' }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('resolution-recommended-1920x1080.png'),
    fullPage: true,
  });
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
    suddenDeath ||= await screen.evaluate(
      (element) =>
        (element as HTMLElement & { snapshot?: { suddenDeath: boolean } })
          .snapshot?.suddenDeath ?? false,
    );
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
  suddenDeath ||= resultText.includes('Cliffhanger scores:');
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
      await page.getByRole('button', { name: 'End', exact: true }).click();
      return;
    case 'redraw-hand':
      await page
        .getByRole('button', { name: 'Reshuffle private phrases' })
        .click();
      return;
    case 'select-comeback':
      await page.getByRole('button', { name: 'Comeback' }).click();
      return;
    default:
      throw new Error(`Unsupported browser draft action: ${command.type}`);
  }
}

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await startFromSetup(page);
}

async function startFromSetup(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();
}
