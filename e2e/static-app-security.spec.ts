import { expect, test } from '@playwright/test';

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
});
