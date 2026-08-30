import { expect, test, type Page } from '@playwright/test';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  planMatchBrowserFlow,
  type MatchBrowserAction,
  useFixedBrowserMatchSeed,
} from './helpers/match-flow';

const productionOrigin = 'http://127.0.0.1:4173';
const developmentUrl = 'http://127.0.0.1:5174/grand-transition/';
const developmentGameLogDirectory = path.resolve(process.cwd(), 'logs', 'test');
const productionContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

test.setTimeout(90_000);

test('production preview loads the subpath shell and local assets after refresh', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const remoteRequests: string[] = [];
  const loadedAssetTypes = new Set<string>();
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      url.origin !== productionOrigin
    ) {
      remoteRequests.push(request.url());
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown error'}`,
    );
  });
  page.on('response', (response) => {
    if (
      response.url().startsWith(`${productionOrigin}/grand-transition/assets/`)
    ) {
      loadedAssetTypes.add(response.request().resourceType());
    }
  });

  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${productionOrigin}/grand-transition/`);
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(
    page.getByText('A Verbal Republic', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(loadedAssetTypes).toEqual(
    new Set(['font', 'image', 'script', 'stylesheet']),
  );

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  expect(remoteRequests).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('production injects the exact policy and blocks a remote connection', async ({
  page,
}) => {
  let remoteConnectionReachedNetwork = false;
  await page.route('https://network.invalid/**', async (route) => {
    remoteConnectionReachedNetwork = true;
    await route.abort();
  });
  await page.goto('./');
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveAttribute('content', productionContentSecurityPolicy);
  const result = await page.evaluate(async () => {
    try {
      await fetch('https://network.invalid/csp-probe');
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });
  expect(result).toBe('blocked');
  expect(remoteConnectionReachedNetwork).toBe(false);
});

test('development and production render the same game UI with no tool surface', async ({
  page,
}) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const productionUi = await uiSignature(page);

  await page.goto(developmentUrl);
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const developmentUi = await uiSignature(page);
  expect(developmentUi).toEqual(productionUi);
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(
      'grand-transition-click-audit, grand-transition-game-audit, grand-transition-developer-controls',
    ),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      /Completed Game Audit|Simulation Registry|Debug|Configure Match Facts|Run AI versus AI|Inspect legal phrases|Validate content|Prepare replay|Prepare match log/iu,
    ),
  ).toHaveCount(0);
});

test('production omits development logger and tool code from the bundle', async ({
  page,
}) => {
  await page.goto('./');
  const assetsDirectory = path.resolve(process.cwd(), 'dist', 'assets');
  const assetFiles = await readdir(assetsDirectory);
  const productionText = (
    await Promise.all(
      assetFiles
        .filter((file) => /\.(?:css|js)$/u.test(file))
        .map((file) => readFile(path.join(assetsDirectory, file), 'utf8')),
    )
  ).join('\n');
  expect(productionText).not.toMatch(
    /grand-transition-(?:developer-controls|click-audit|game-audit)|grandTransitionDevelopmentGameLog|__game-log|Simulation Registry|Completed Game Audit|Run AI versus AI|Inspect legal phrases|Prepare match log/iu,
  );
});

test('development automatically writes one completed match text log', async ({
  page,
}) => {
  await rm(developmentGameLogDirectory, { force: true, recursive: true });
  try {
    const plan = planMatchBrowserFlow();
    await useFixedBrowserMatchSeed(page, plan.seed);
    await page.goto(developmentUrl);
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();

    for (const action of plan.actions) {
      await executeDraftAction(page, action);
      const continueButton = page.getByRole('button', {
        name: 'Continue',
        exact: true,
      });
      if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click();
      }
    }

    await expect.poll(async () => logFiles()).toHaveLength(1);
    const [filename] = await logFiles();
    expect(filename).toMatch(
      new RegExp(
        `^match-\\d{4}-\\d{2}-\\d{2}-seed-${String(plan.seed)}\\.log$`,
        'u',
      ),
    );
    const text = await readFile(
      path.join(developmentGameLogDirectory, filename!),
      'utf8',
    );
    const records = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, any>);
    expect(records[0]).toEqual(
      expect.objectContaining({
        type: 'match-log',
        formatVersion: 1,
        seed: plan.seed,
      }),
    );
    expect(records.at(-1)).toEqual(
      expect.objectContaining({
        type: 'match-complete',
        winner: plan.finalState.winner,
      }),
    );
    expect(
      records.some(
        (record) =>
          record.type === 'action' &&
          record.move?.type === 'select-phrase' &&
          typeof record.move.text === 'string' &&
          typeof record.state?.players?.['player-one']?.bubble === 'string',
      ),
    ).toBe(true);
    expect(
      records
        .filter((record) => record.type === 'action')
        .map((record) => record.command),
    ).toEqual(plan.finalState.commandHistory);
    expect(text).not.toMatch(/"hand"|userAgent|machine/iu);
  } finally {
    await rm(developmentGameLogDirectory, { force: true, recursive: true });
  }
});

test('production bundles only the four approved font families and subsets', async () => {
  const assetsDirectory = path.resolve(process.cwd(), 'dist', 'assets');
  const assetFiles = await readdir(assetsDirectory);
  const fontFiles = assetFiles.filter((file) => /\.woff2?$/u.test(file));
  const variableFontFiles = assetFiles.filter((file) =>
    /^(?:nunito|rubik)-.*\.woff2$/u.test(file),
  );
  expect(fontFiles).toHaveLength(6);
  expect(variableFontFiles).toHaveLength(4);
  for (const font of ['nunito', 'rubik']) {
    expect(
      variableFontFiles.some((file) =>
        file.startsWith(`${font}-latin-wght-normal-`),
      ),
    ).toBe(true);
    expect(
      variableFontFiles.some((file) =>
        file.startsWith(`${font}-latin-ext-wght-normal-`),
      ),
    ).toBe(true);
  }
  expect(assetFiles.join('\n')).not.toMatch(
    /arabic|barlow|cyrillic|hebrew|vietnamese|\.woff$/u,
  );
  expect(fontFiles.some((file) => file.startsWith('poiret-one-latin-'))).toBe(
    true,
  );
  expect(
    fontFiles.some((file) => file.startsWith('share-tech-mono-latin-')),
  ).toBe(true);
});

async function uiSignature(page: Page) {
  return page.evaluate(() => {
    const app = document.querySelector('grand-transition-app');
    const heading = document.querySelector('h1');
    const action = document.querySelector('button');
    return {
      html:
        app?.innerHTML
          .replace(/\?lit\$\d+\$/gu, '?lit$')
          .replace(
            /srcset="[^"]*grand-transition-emblem[^"]*\.webp"/gu,
            'srcset="[local-brand-emblem]"',
          )
          .replace(
            /src="[^"]*grand-transition-emblem[^"]*\.(?:png|webp)"/gu,
            'src="[local-brand-emblem]"',
          ) ?? '',
      text: app?.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
      heading: heading
        ? {
            color: getComputedStyle(heading).color,
            font: getComputedStyle(heading).font,
          }
        : null,
      action: action
        ? {
            background: getComputedStyle(action).backgroundColor,
            color: getComputedStyle(action).color,
            font: getComputedStyle(action).font,
          }
        : null,
    };
  });
}

async function logFiles(): Promise<string[]> {
  return readdir(developmentGameLogDirectory).catch(() => []);
}

async function executeDraftAction(
  page: Page,
  action: MatchBrowserAction,
): Promise<void> {
  const command = action.command;
  switch (command.type) {
    case 'select-phrase':
      await page
        .locator(
          `[data-card-source="${command.payload.card.source}"][data-card-id="${command.payload.card.cardId}"]`,
        )
        .click();
      return;
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
