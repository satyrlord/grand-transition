import { expect, test, type Locator, type Page } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const viewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

test('victory and populated history fit every supported landscape viewport', async ({
  page,
}) => {
  const runtimeEvidence = observeProductionRuntime(page);
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await page.evaluate(() =>
    localStorage.removeItem('grand-transition.match-history.v1'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await prepareLethalGrammarMistake(page);
  await page
    .locator('[data-role="predicate"] button[data-card-state="legal"]')
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(page.locator('.timer-fact')).toHaveCount(0);
  await assertMinimumTarget(
    page.getByRole('button', { name: 'Return to main menu' }),
  );

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertDialogGeometry(page, '.round-review-dialog');
    await page.screenshot({
      path: `.impeccable/review/victory-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Return to main menu' }).click();
  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await page.getByText('Technical record', { exact: true }).click();
  await expect(page.locator('.match-history-entry pre')).toBeVisible();
  await assertMinimumTarget(page.getByRole('button', { name: 'Close' }));
  await assertMinimumTarget(
    page.getByText('Technical record', { exact: true }),
  );
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertDialogGeometry(page, '.match-history-dialog');
    await page.screenshot({
      path: `.impeccable/review/history-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  }

  const completedMatchId = await page
    .locator('.match-history-entry')
    .getAttribute('data-history-id');
  const storedCompletedMatch = await page.evaluate(() =>
    localStorage.getItem('grand-transition.match-history.v1'),
  );
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await expect(page.locator('.match-history-entry')).toHaveAttribute(
    'data-history-id',
    completedMatchId!,
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('grand-transition.match-history.v1'),
    ),
  ).toBe(storedCompletedMatch);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.evaluate(() => {
    const key = 'grand-transition.match-history.v1';
    const document = JSON.parse(localStorage.getItem(key)!) as {
      entries: Array<{ matchLog: { sentences?: unknown } }>;
    };
    delete document.entries[0]!.matchLog.sentences;
    localStorage.setItem(key, JSON.stringify(document));
  });
  await page.reload();
  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await expect(page.locator('.match-history-legacy-phrases')).toContainText(
    'Phrase text was not recorded',
  );
  await page.getByRole('button', { name: 'Close' }).click();
  await page.evaluate(() => {
    const key = 'grand-transition.match-history.v1';
    const document = JSON.parse(localStorage.getItem(key)!) as {
      entries: Array<Record<string, unknown> & { completedAt: string }>;
    };
    const entry = document.entries[0]!;
    const completedAt = Date.parse(entry.completedAt);
    document.entries = Array.from({ length: 12 }, (_, index) => ({
      ...entry,
      id: `overflow-match-${index}`,
      completedAt: new Date(completedAt + index * 60_000).toISOString(),
    }));
    localStorage.setItem(key, JSON.stringify(document));
  });
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.reload();
  await page.getByRole('button', { name: /Match history.*12/iu }).click();
  await expect(page.locator('.match-history-entry')).toHaveCount(12);
  await expect(page.locator('.match-history-entry').first()).toHaveAttribute(
    'data-history-id',
    'overflow-match-11',
  );
  const overflow = await page.locator('.match-history-list').evaluate((list) => ({
    listScrolls: list.scrollHeight > list.clientHeight,
    pageScrolls:
      document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }));
  expect(overflow).toEqual({ listScrolls: true, pageScrolls: false });
  expect(runtimeEvidence.failedRequests).toEqual([]);
  expect(runtimeEvidence.consoleErrors).toEqual([]);
  expect(runtimeEvidence.pageErrors).toEqual([]);
  expect(runtimeEvidence.remoteRequests).toEqual([]);
  expect(runtimeEvidence.runtimeRequests).toEqual([]);
});

test('empty history is available only from the title', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/grand-transition/');
  await page.evaluate(() =>
    localStorage.removeItem('grand-transition.match-history.v1'),
  );
  await page.reload();

  await page.screenshot({
    path: '.impeccable/review/title-with-history-1024x720.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /Match history.*0/iu }).click();
  await expect(page.getByText('No completed matches yet.')).toBeVisible();
  await assertDialogGeometry(page, '.match-history-dialog');
  await page.screenshot({
    path: '.impeccable/review/history-empty-1024x720.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await expect(
    page.getByRole('button', { name: /Match history/iu }),
  ).toHaveCount(0);
});

test('malformed stored history stays unchanged and shows recovery guidance', async ({
  page,
}) => {
  const invalidBytes = '{"schemaVersion":1,"entries":';
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/grand-transition/');
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: 'grand-transition.match-history.v1',
      value: invalidBytes,
    },
  );
  await page.reload();

  await expect(page.locator('.title-history-notice')).toContainText(
    'will not persist',
  );
  await page.getByRole('button', { name: /Match history.*0/iu }).click();
  await expect(page.locator('.match-history-notice')).toContainText(
    'clear this site',
  );
  await expect(page.getByText('No completed matches yet.')).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('grand-transition.match-history.v1'),
    ),
  ).toBe(invalidBytes);
  await assertDialogGeometry(page, '.match-history-dialog');
  await page.screenshot({
    path: '.impeccable/review/history-storage-failure-1024x720.png',
    fullPage: true,
  });
});

async function prepareLethalGrammarMistake(page: Page): Promise<void> {
  await page.locator('grand-transition-app').evaluate(async (element) => {
    const app = element as HTMLElement & {
      matchState: {
        activePlayerId: string;
        playerStates: Record<string, { pride: number }>;
      };
      updateComplete: Promise<boolean>;
    };
    const state = app.matchState;
    const loserId = state.activePlayerId;
    app.matchState = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
      },
    };
    await app.updateComplete;
  });
}

async function assertDialogGeometry(page: Page, selector: string): Promise<void> {
  const facts = await page.locator(selector).evaluate((dialog) => {
    const box = dialog.getBoundingClientRect();
    const style = getComputedStyle(dialog);
    return {
      inside:
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= window.innerWidth &&
        box.bottom <= window.innerHeight,
      box: {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      },
      style: {
        boxSizing: style.boxSizing,
        maxHeight: style.maxHeight,
        paddingBlock: `${style.paddingTop} ${style.paddingBottom}`,
        borderBlock: `${style.borderTopWidth} ${style.borderBottomWidth}`,
      },
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });
  expect(facts.inside, JSON.stringify(facts)).toBe(true);
  expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth);
  expect(facts.documentHeight).toBeLessThanOrEqual(facts.viewportHeight);
}

async function assertMinimumTarget(
  locator: Locator,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

function observeProductionRuntime(page: Page): Readonly<{
  failedRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
  remoteRequests: string[];
  runtimeRequests: string[];
}> {
  const applicationOrigin = 'http://127.0.0.1:4173';
  const failedRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const remoteRequests: string[] = [];
  const runtimeRequests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.origin !== applicationOrigin) remoteRequests.push(request.url());
    }
    if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) {
      runtimeRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown failure'}`,
    );
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  return {
    failedRequests,
    consoleErrors,
    pageErrors,
    remoteRequests,
    runtimeRequests,
  };
}
