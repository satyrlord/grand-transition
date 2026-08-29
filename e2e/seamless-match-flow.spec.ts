import { expect, test, type Page } from '@playwright/test';
import {
  planMatchBrowserFlow,
  type MatchBrowserAction,
  useFixedBrowserMatchSeed,
} from './helpers/match-flow';

const plan = planMatchBrowserFlow();

test.setTimeout(90_000);

test('a hotseat match reviews every exchange and exposes no post-match surface', async ({
  page,
}, testInfo) => {
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  let reachedLaterRound = false;
  let reachedSuddenDeath = false;
  let reviewedExchange = false;
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
  await expect(
    page.getByRole('heading', { name: 'Select your debaters' }),
  ).toBeVisible();
  await expect(page.locator('grand-transition-match')).toHaveCount(0);
  await expect(page.locator('grand-transition-resolution-results')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: /rematch|match results|statistics/iu }),
  ).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('completed-match-returns-to-setup.png'),
    fullPage: true,
  });
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
