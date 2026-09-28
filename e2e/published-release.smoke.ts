import { expect, test, type Page } from '@playwright/test';
import os from 'node:os';
import { productionContentSecurityPolicy } from '../vite.config.ts';
import { loadGameContent } from '../tools/load-game-content.ts';
import { planMatchBrowserFlow, useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { finishPresentation } from './helpers/presentation.ts';
import { lockInSetup } from './helpers/setup.ts';
import { storedHistory } from './helpers/stored-data.ts';

// Milestone 031 published smoke. It runs only through `npm run test:published`
// and reads the release at the given base URL without changing it.
const releaseSeed = 20_260_823;
const { gameCatalog } = loadGameContent();

type RuntimeEvidence = Readonly<{
  remoteRequests: string[];
  runtimeRequests: string[];
  failedRequests: string[];
  errors: string[];
}>;
const evidence = new WeakMap<Page, RuntimeEvidence>();

test.beforeEach(async ({ page, baseURL }) => {
  const base = new URL(baseURL!);
  const observed: RuntimeEvidence = {
    remoteRequests: [],
    runtimeRequests: [],
    failedRequests: [],
    errors: [],
  };
  evidence.set(page, observed);
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, 'publishedPolicyViolations', { value: violations });
    window.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return;
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      observed.remoteRequests.push(request.url());
      return;
    }
    // Local audio and speech models are static release files. Any other
    // programmatic request is a runtime network call.
    const staticReleaseFile =
      request.method() === 'GET' &&
      url.search === '' &&
      /^(?:assets|tts)\/[^?#]+\.[a-z0-9]+$/u.test(url.pathname.slice(base.pathname.length));
    if (
      !staticReleaseFile &&
      ['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())
    ) {
      observed.runtimeRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'failed';
    // The browser cancels an image load when the game removes the image, for
    // example a comeback sidekick after its exchange. A missing image still
    // fails through its HTTP status or a different network error.
    if (request.resourceType() === 'image' && errorText === 'net::ERR_ABORTED') return;
    observed.failedRequests.push(`${request.url()}: ${errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      observed.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => observed.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') observed.errors.push(message.text());
  });
  await useFixedBrowserMatchSeed(page, releaseSeed);
});

test.afterEach(async ({ page, browser, baseURL }, info) => {
  await info.attach('published-environment', {
    contentType: 'application/json',
    body: JSON.stringify({
      baseURL,
      project: info.project.name,
      browser: browser.version(),
      os: `${os.platform()} ${os.release()}`,
      viewport: page.viewportSize(),
    }),
  });
  const observed = evidence.get(page)!;
  expect(observed.remoteRequests, 'remote requests').toEqual([]);
  expect(observed.runtimeRequests, 'runtime requests').toEqual([]);
  expect(observed.failedRequests, 'failed requests').toEqual([]);
  expect(observed.errors, 'runtime errors').toEqual([]);
  expect(
    await page.evaluate(() => Reflect.get(window, 'publishedPolicyViolations')),
    'policy violations',
  ).toEqual([]);
});

test('subpath serves local assets and the exact policy after refresh', async ({
  page,
  baseURL,
}) => {
  const assetTypes = new Set<string>();
  page.on('response', (response) => {
    if (response.url().startsWith(new URL('assets/', baseURL).href)) {
      assetTypes.add(response.request().resourceType());
    }
  });

  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(baseURL!);
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  // A production build counts its commits. It never shows the development label.
  await expect(page.locator('.title-version')).toHaveText(/^\s*Game version\s+v\d+\.[1-9]\d*\s*$/u);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  for (const type of ['font', 'image', 'script', 'stylesheet']) {
    expect(assetTypes, type).toContain(type);
  }
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    productionContentSecurityPolicy,
  );
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
  expect(response?.headers()['content-security-policy']).toBeUndefined();

  const refreshed = await page.reload();
  expect(refreshed?.status()).toBe(200);
  await expect(page).toHaveURL(baseURL!);
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  const direct = await page.goto('./index.html');
  expect(direct?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://network.invalid/published-policy-probe');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
  // The probe is expected to be blocked by the policy, so it is not evidence.
  const observed = evidence.get(page)!;
  observed.remoteRequests.splice(0);
  await page.evaluate(() =>
    (Reflect.get(window, 'publishedPolicyViolations') as string[]).splice(0),
  );
  observed.errors.splice(0);
});

test('supported speech loads the local voice', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Speech enabled', { exact: true }).check();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              document.querySelector('grand-transition-app') as unknown as {
                speech: { status: string };
              }
            ).speech.status,
        ),
      { timeout: 180_000 },
    )
    .toBe('ready');
  await expect(
    page.getByText('Local neural speech is unavailable. You can continue without narration.'),
  ).toHaveCount(0);
});

test('unavailable speech keeps the game playable without narration', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Speech enabled', { exact: true }).check();
  await expect(
    page.getByText('Local neural speech is unavailable. You can continue without narration.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startHotseat(page);
  await expect(page.locator('.shared-board > li')).toHaveCount(9);
});

for (const timer of [
  { label: '15 seconds', value: '15' },
  { label: 'Unlimited', value: 'unlimited' },
] as const) {
  test(`the ${timer.label} timer setting reaches the match`, async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: timer.label, exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await startHotseat(page);
    await expect(page.locator(`[data-timer="${timer.value}"]`)).toBeVisible();
  });
}

test('the fixed release match reaches victory and reopens from history', async ({ page }) => {
  const plan = planMatchBrowserFlow(releaseSeed);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Speech enabled', { exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: '30 seconds', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startHotseat(page);
  await expect(page.locator('[data-timer="30"]')).toBeVisible();
  expect(await matchSetup(page)).toEqual({
    seed: releaseSeed,
    sceneId: 'transition-era-television-studio',
    characterIds: gameCatalog.characters.slice(0, 2).map((character) => character.id),
  });

  let presentations = 0;
  for (const { command } of plan.actions) {
    switch (command.type) {
      case 'select-phrase':
        await page
          .locator(
            `[data-card-source="${command.payload.card.source}"][data-card-id="${command.payload.card.cardId}"]`,
          )
          .click();
        break;
      case 'commit-sentence':
        await page.getByRole('button', { name: 'End', exact: true }).click();
        break;
      case 'redraw-hand':
        await page.getByRole('button', { name: 'Reshuffle private phrases' }).click();
        break;
      case 'select-comeback':
        await page.getByRole('button', { name: 'Comeback' }).click();
        break;
      default:
        throw new Error(`Unsupported release flow command: ${command.type}`);
    }
    // Only the installed clock advances: each exchange that is not terminal
    // must continue by itself, with no user action.
    if (await finishPresentation(page)) presentations += 1;
  }
  expect(presentations).toBeGreaterThanOrEqual(plan.finalState.resolutionHistory.length - 1);

  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await expect.poll(async () => (await storedHistory(page)).length).toBe(1);
  await page.getByRole('button', { name: 'Return to main menu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Match history.*1/u }).click();
  const entry = page.locator('.match-history-entry');
  await expect(entry).toHaveCount(1);
  await entry.getByText('Technical record', { exact: true }).click();
  await expect(entry.locator('pre')).toContainText(`"seed": ${String(releaseSeed)}`);
  await expect(entry.locator('pre')).toContainText(`"winner": "${plan.finalState.winner}"`);
});

async function startHotseat(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  await expect(page.locator('.shared-board')).toBeVisible();
}

async function matchSetup(page: Page) {
  return page.locator('grand-transition-app').evaluate((element) => {
    const app = element as HTMLElement & {
      // The match state advances its seed; the shell keeps the initial one.
      matchInitialSeed: number;
      matchState: { setup: { sceneId: string; players: readonly { characterId: string }[] } };
    };
    return {
      seed: app.matchInitialSeed,
      sceneId: app.matchState.setup.sceneId,
      characterIds: app.matchState.setup.players.map((player) => player.characterId),
    };
  });
}
