import { expect, test, type Page } from '@playwright/test';
import {
  planMatchBrowserFlow,
  type MatchBrowserAction,
  useFixedBrowserMatchSeed,
} from './helpers/match-flow';

const plan = planMatchBrowserFlow();

test.setTimeout(90_000);

test('a hotseat match reaches persistent victory and restores title history', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const remoteRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin !== 'http://127.0.0.1:4173'
    ) {
      remoteRequests.push(request.url());
    }
  });
  await useFixedBrowserMatchSeed(page, plan.seed);
  await page.goto('/grand-transition/');
  await page.evaluate(() =>
    localStorage.removeItem('grand-transition.match-history.v1'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  let reachedLaterRound = false;
  let reachedSuddenDeath = false;
  let reviewedExchange = false;
  let reviewIndex = 0;
  for (const action of plan.actions) {
    const match = page.locator('grand-transition-match');
    const snapshot = await match.evaluate(
      (element) =>
        (
          element as HTMLElement & {
            snapshot?: { phase: string; round: number };
          }
        ).snapshot,
    );
    reachedLaterRound ||= (snapshot?.round ?? 0) > 1;
    reachedSuddenDeath ||= snapshot?.phase === 'sudden-death';

    await executeDraftAction(page, action);
    const continueButton = page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });
    if (await continueButton.isVisible().catch(() => false)) {
      reviewedExchange = true;
      await expect(page.locator('.round-review-dialog')).toBeVisible();
      await expect(page.locator('.sentence-preview')).not.toBeEmpty();
      const expectedResolution = plan.finalState.resolutionHistory[reviewIndex]!;
      for (const [playerId, result] of Object.entries(
        expectedResolution.players,
      )) {
        await expect(
          page.locator(`[data-round-player="${playerId}"]`),
        ).toContainText(`${result.outgoingDamage} damage`);
      }
      reviewIndex += 1;
      await continueButton.click();
    }
    await expect(
      page.locator('grand-transition-resolution-results'),
    ).toHaveCount(0);
  }

  expect(plan.finalState.phase).toBe('results');
  expect(plan.finalState.winner).toBeTruthy();
  expect(reachedLaterRound).toBe(true);
  expect(reachedSuddenDeath).toBe(true);
  expect(reviewedExchange).toBe(true);
  expect(reviewIndex).toBe(plan.finalState.resolutionHistory.length - 1);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  const terminalResolution = plan.finalState.resolutionHistory.at(-1)!;
  for (const [playerId, result] of Object.entries(terminalResolution.players)) {
    await expect(page.locator(`[data-round-player="${playerId}"]`)).toContainText(
      `${result.outgoingDamage} damage`,
    );
  }
  await expect(page.locator('grand-transition-match')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: /Match history/iu }),
  ).toHaveCount(0);
  await expect(page.locator('grand-transition-resolution-results')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: /rematch|statistics/iu }),
  ).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('completed-match-victory.png'),
    fullPage: true,
  });

  const storedEntryCount = await page.evaluate(() => {
    const raw = localStorage.getItem('grand-transition.match-history.v1');
    return raw ? (JSON.parse(raw).entries?.length ?? 0) : 0;
  });
  expect(storedEntryCount).toBe(1);

  await page.getByRole('button', { name: 'Return to main menu' }).click();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(page.locator('grand-transition-match')).toHaveCount(0);
  const historyButton = page.getByRole('button', { name: /Match history.*1/iu });
  await expect(historyButton).toBeVisible();
  await historyButton.click();
  await expect(page.getByRole('dialog', { name: 'Match history' })).toBeVisible();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
  await page.getByText('Technical record', { exact: true }).click();
  await expect(page.locator('.match-history-entry pre')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('populated-match-history.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

async function executeDraftAction(
  page: Page,
  action: MatchBrowserAction,
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
