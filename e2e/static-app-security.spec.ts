import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
});

test('production omits developer controls from the DOM and bundle', async ({
  page,
}) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Simulation Registry' }),
  ).toHaveCount(0);
  await expect(page.locator('grand-transition-developer-controls')).toHaveCount(
    0,
  );

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
    /grand-transition-developer-controls|Simulation Registry|Inspect legal phrases|Prepare match log|Development only/u,
  );
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
  await expect(page.getByRole('status')).toContainText('Copied replay JSON');
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

test('development controls pass the responsive and accessibility matrix', async ({
  browser,
  page,
}) => {
  const viewports = [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
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
            height: box.height,
            minimumHeight:
              element instanceof HTMLInputElement && element.type === 'checkbox'
                ? 24
                : 44,
          };
        },
      ),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    for (const control of geometry.controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(control.height).toBeGreaterThanOrEqual(control.minimumHeight);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(developmentUrl);
  await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByLabel('Seed').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Scene')).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.developer-controls__stamp')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(developmentUrl);
  const axe = await new AxeBuilder({ page })
    .include('grand-transition-developer-controls')
    .analyze();
  expect(
    axe.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);

  const forcedColors = await browser.newContext({
    forcedColors: 'active',
    viewport: { width: 390, height: 844 },
  });
  try {
    const forcedPage = await forcedColors.newPage();
    await forcedPage.goto(developmentUrl);
    await expect(
      forcedPage.getByRole('heading', { name: 'Simulation Registry' }),
    ).toBeVisible();
    expect(
      await forcedPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await forcedColors.close();
  }
});
