import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const productionOrigin = 'http://127.0.0.1:4173';
const developmentUrl = 'http://127.0.0.1:5174/grand-transition/';
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

test('production preview loads the subpath shell and local assets after refresh', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const remoteRequests: string[] = [];
  const loadedAssetTypes = new Set<string>();
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
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
  await expect(page.getByText('The chamber is')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(loadedAssetTypes).toEqual(new Set(['font', 'script', 'stylesheet']));

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
  const remoteConnectionResult = await page.evaluate(async () => {
    try {
      await fetch('https://network.invalid/csp-probe');
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });

  expect(remoteConnectionResult).toBe('blocked');
  expect(remoteConnectionReachedNetwork).toBe(false);
});

test('development omits the production policy', async ({ page }) => {
  const response = await page.goto(developmentUrl);

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Simulation Registry' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Open click audit/u }),
  ).toBeVisible();
});

test('development starts the click audit before the first title action', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const setupButton = [...document.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Set up match',
      );
      if (setupButton) {
        setupButton.click();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });

  await page.goto(developmentUrl);
  await expect(
    page.getByRole('heading', { name: 'Set up match' }),
  ).toBeVisible();
  const entries = await page.locator('grand-transition-click-audit').evaluate(
    (audit) =>
      (
        audit as HTMLElement & {
          exportDocument(): {
            entries: readonly { kind: string; event: string }[];
          };
        }
      ).exportDocument().entries,
  );
  expect(entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'game-action', event: 'show-setup' }),
    ]),
  );
});

test('production omits developer controls from the DOM and bundle', async ({
  page,
}) => {
  await page.goto('./?click-audit=1');
  await expect(
    page.getByRole('heading', { name: 'Simulation Registry' }),
  ).toHaveCount(0);
  await expect(page.locator('grand-transition-developer-controls')).toHaveCount(
    0,
  );
  await expect(page.locator('grand-transition-click-audit')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Open click audit/u }),
  ).toHaveCount(0);

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
    /grand-transition-(?:developer-controls|click-audit)|grandTransitionTemporaryClickAudit|game-action-result|Simulation Registry|Inspect legal phrases|Prepare match log|Development only|Open click audit|Temporary Click Audit/u,
  );
});

test('development click audit correlates one shared phrase selection', async ({
  page,
}) => {
  await page.goto(developmentUrl);
  await expect(
    page.getByRole('button', { name: /Open click audit/u }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.locator('.shared-board [data-role="noun"] button').first().click();
  await page.getByRole('button', { name: /Open click audit/u }).click();

  await expect(
    page.getByRole('heading', { name: 'Temporary Click Audit' }),
  ).toBeVisible();
  await expect(page.getByText('Action: select-phrase')).toBeVisible();
  await expect(page.getByText('Result: select-phrase accepted')).toBeVisible();
});

test('development evidence can be copied and downloaded by document type', async ({
  page,
}) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:5174',
  });
  await page.goto(developmentUrl);

  await page.getByRole('button', { name: 'Run AI versus AI' }).click();
  await expect(page.getByText('Replay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.locator('.developer-controls__status')).toContainText(
    'Copied replay JSON',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'grand-transition-replay',
  );

  const replayDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const replayFile = await replayDownload;
  expect(replayFile.suggestedFilename()).toMatch(
    /^grand-transition-replay-\d+\.json$/u,
  );
  const replayPath = await replayFile.path();
  expect(replayPath).not.toBeNull();
  expect(await readFile(replayPath!, 'utf8')).toContain(
    'grand-transition-replay',
  );

  await page.getByRole('button', { name: 'Prepare match log' }).click();
  await expect(
    page.getByText('Public match log', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Import replay' }),
  ).toBeDisabled();
  const logDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const logFile = await logDownload;
  expect(logFile.suggestedFilename()).toMatch(
    /^grand-transition-match-log-\d+\.json$/u,
  );
  const logPath = await logFile.path();
  expect(logPath).not.toBeNull();
  expect(await readFile(logPath!, 'utf8')).toContain(
    'grand-transition-match-log',
  );
});

test('development controls fit the supported landscape matrix', async ({
  page,
}) => {
  const viewports = [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(developmentUrl);
    await expect(
      page.locator('grand-transition-developer-controls'),
    ).toBeVisible();
    const geometry = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('button, input, select')].map(
        (element) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
          };
        },
      ),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    for (const control of geometry.controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(geometry.viewportWidth);
    }
  }
});
