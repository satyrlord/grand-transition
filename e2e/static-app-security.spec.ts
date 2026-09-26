import { lockInSetup } from './helpers/setup.ts';
import { finishPresentation } from './helpers/presentation.ts';
import { expect, test, type Page } from '@playwright/test';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import {
  planMatchBrowserFlow,
  type MatchBrowserAction,
  useFixedBrowserMatchSeed,
} from './helpers/match-flow.ts';

const productionOrigin = 'http://127.0.0.1:4173';
const developmentUrl = 'http://127.0.0.1:5174/grand-transition/';
const developmentGameLogDirectory = path.resolve(process.cwd(), 'logs', 'test');
const productionContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

test.setTimeout(90_000);

test('production ships credits and lossless sidekicks without PNG masters', async () => {
  for (const name of ['CREDITS.md', 'LICENSE.md']) {
    expect(await readFile(path.resolve('dist', name), 'utf8')).toBe(await readFile(name, 'utf8'));
  }
  const assets = await readdir('dist/assets');
  const sources = (await readdir('src/assets/sidekicks')).filter((name) => name.endsWith('.png'));
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    const id = path.parse(source).name;
    const variants = assets.filter(
      (name) => name.startsWith(`${id}-sidekick-`) && name.endsWith('.webp'),
    );
    expect(variants, id).toHaveLength(1);
    const original = await sharp(path.resolve('src/assets/sidekicks', source))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const encoded = await sharp(path.resolve('dist/assets', variants[0]!))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(encoded.info).toEqual(original.info);
    // RGB under fully transparent pixels is not visible. Lossless WebP can
    // normalize it, but alpha and every visible color must stay exact.
    for (let index = 0; index < original.data.length; index += 4) {
      if (original.data[index + 3] === 0) {
        original.data.fill(0, index, index + 3);
        encoded.data.fill(0, index, index + 3);
      }
    }
    expect(encoded.data.equals(original.data), id).toBe(true);
  }
  expect(assets.filter((name) => name.endsWith('.png'))).toEqual([]);
});

test('production JavaScript chunks stay within the default Vite warning limit', async () => {
  const assetDirectory = path.resolve('dist/assets');
  const scripts = (await readdir(assetDirectory)).filter((name) => /\.[cm]?js$/u.test(name));
  expect(scripts.length).toBeGreaterThan(0);
  for (const name of scripts) {
    const script = await readFile(path.join(assetDirectory, name));
    expect(script.byteLength, name).toBeLessThanOrEqual(500_000);
  }
});

test('initial production JavaScript stays within the total gzip budget', async ({ page }, info) => {
  const scripts = new Set<string>();
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.add(request.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const chunks = await Promise.all(
    [...scripts].sort().map(async (url) => {
      const resource = new URL(url);
      expect(resource.origin).toBe(productionOrigin);
      expect(resource.pathname).toMatch(/^\/grand-transition\/assets\/[^/]+\.[cm]?js$/u);
      const file = path.basename(resource.pathname);
      const bytes = await readFile(path.resolve('dist/assets', file));
      return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
    }),
  );
  expect(chunks.length).toBeGreaterThan(0);
  const gzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  const resultPath = info.outputPath('initial-javascript-gzip.json');
  await writeFile(
    resultPath,
    JSON.stringify({ budgetBytes: 350 * 1024, gzipBytes, chunks }, null, 2),
  );
  await info.attach('initial-javascript-gzip.json', {
    path: resultPath,
    contentType: 'application/json',
  });
  expect(gzipBytes).toBeLessThanOrEqual(350 * 1024);
});

test('production content and dependencies have separate emitted chunks', async () => {
  const scripts = (await readdir(path.resolve('dist/assets'))).filter((name) =>
    name.endsWith('.js'),
  );
  for (const group of ['common-phrase-data', 'character-phrase-data', 'content-data', 'vendor']) {
    expect(
      scripts.some((name) => name.startsWith(`${group}-`)),
      group,
    ).toBe(true);
  }
});

test('production contains no source maps, secret files, or committed build output', async () => {
  const files = await readdir(path.resolve('dist'), { recursive: true, withFileTypes: true });
  const violations: string[] = [];
  const sensitiveValue =
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{40,})\b/u;
  for (const file of files) {
    if (!file.isFile()) continue;
    const filename = path.join(file.parentPath, file.name);
    const relative = path.relative(path.resolve('dist'), filename);
    if (/\.map$/iu.test(file.name) || /^\.env(?:\.|$)/u.test(file.name)) {
      violations.push(`${relative}: prohibited file type`);
    }
    if (!/\.(?:[cm]?js|css|html|json|md|txt|pem|key)$/iu.test(file.name)) continue;
    const contents = await readFile(filename, 'utf8');
    if (/(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL=/u.test(contents)) {
      violations.push(`${relative}: source map reference`);
    }
    // Keep the matched value out of errors, traces, and test reports.
    if (sensitiveValue.test(contents)) violations.push(`${relative}: possible credential`);
  }
  expect(violations).toEqual([]);
  expect(execFileSync('git', ['ls-files', '--', 'dist'], { encoding: 'utf8' }).trim()).toBe('');
});

test('production preview loads the subpath shell and local assets after refresh', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const remoteRequests: string[] = [];
  const loadedAssetTypes = new Set<string>();
  const otherAssets = new Set<string>();
  const pageErrors: string[] = [];

  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, 'startupPolicyViolations', { value: violations });
    window.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });

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
    if (response.url().startsWith(`${productionOrigin}/grand-transition/assets/`)) {
      const type = response.request().resourceType();
      if (type === 'other') otherAssets.add(response.url());
      else loadedAssetTypes.add(type);
    }
  });

  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${productionOrigin}/grand-transition/`);
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('type', 'image/webp');
  const iconUrl = await icon.getAttribute('href');
  expect(iconUrl).toMatch(/^\/grand-transition\/assets\/grand-transition-emblem-.*\.webp$/u);
  expect((await page.request.get(iconUrl!)).ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  await expect(page.getByText('A Verbal Republic', { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => Reflect.get(window, 'startupPolicyViolations'))).toEqual([]);
  expect(loadedAssetTypes).toEqual(new Set(['font', 'image', 'script', 'stylesheet']));

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  expect(remoteRequests).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  // Chromium classifies favicon requests as "other", independently of MIME type.
  for (const url of otherAssets) expect(url).toBe(new URL(iconUrl!, productionOrigin).href);
  expect(await page.evaluate(() => Reflect.get(window, 'startupPolicyViolations'))).toEqual([]);
});

test('production injects the exact policy and blocks a remote connection', async ({ page }) => {
  let remoteConnectionReachedNetwork = false;
  await page.route('https://network.invalid/**', async (route) => {
    remoteConnectionReachedNetwork = true;
    await route.abort();
  });
  await page.goto('./');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    productionContentSecurityPolicy,
  );
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
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const productionUi = await uiSignature(page);

  await page.goto(developmentUrl);
  await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const developmentUi = await uiSignature(page);
  expect(developmentUi).toEqual(productionUi);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(0);
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

test('production omits development logger and tool code from the bundle', async ({ page }) => {
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

test('development automatically writes one completed match text log', async ({ page }) => {
  await rm(developmentGameLogDirectory, { force: true, recursive: true });
  try {
    const plan = planMatchBrowserFlow();
    await useFixedBrowserMatchSeed(page, plan.seed);
    await page.clock.install();
    await page.goto(developmentUrl);
    await page.getByRole('button', { name: 'Multiplayer' }).click();
    await lockInSetup(page);
    await page.getByRole('button', { name: 'Start match' }).click();

    for (const action of plan.actions) {
      await executeDraftAction(page, action);
      await finishPresentation(page);
    }

    await expect.poll(async () => logFiles()).toHaveLength(1);
    const [filename] = await logFiles();
    expect(filename).toMatch(
      new RegExp(`^match-\\d{4}-\\d{2}-\\d{2}-seed-${String(plan.seed)}\\.log$`, 'u'),
    );
    // The server creates the file before it writes the text, so wait until
    // the file holds a complete log instead of reading it the moment it exists.
    let text = '';
    let records: Record<string, any>[] = [];
    await expect
      .poll(async () => {
        text = await readFile(path.join(developmentGameLogDirectory, filename!), 'utf8');
        try {
          records = text
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line) as Record<string, any>);
          return text.trim().length > 0;
        } catch {
          return false;
        }
      })
      .toBe(true);
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
        speechDiagnostics: expect.objectContaining({ status: 'finished' }),
      }),
    );
    expect(records.at(-1)!.speechDiagnostics.events).toContainEqual(
      expect.objectContaining({ type: 'presentation-end' }),
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
      records.filter((record) => record.type === 'action').map((record) => record.command),
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
  const variableFontFiles = assetFiles.filter((file) => /^(?:nunito|rubik)-.*\.woff2$/u.test(file));
  expect(fontFiles).toHaveLength(7);
  expect(variableFontFiles).toHaveLength(4);
  for (const font of ['nunito', 'rubik']) {
    expect(variableFontFiles.some((file) => file.startsWith(`${font}-latin-wght-normal-`))).toBe(
      true,
    );
    expect(
      variableFontFiles.some((file) => file.startsWith(`${font}-latin-ext-wght-normal-`)),
    ).toBe(true);
  }
  expect(assetFiles.join('\n')).not.toMatch(/arabic|barlow|cyrillic|hebrew|vietnamese|\.woff$/u);
  expect(fontFiles.some((file) => file.startsWith('poiret-one-latin-'))).toBe(true);
  expect(fontFiles.some((file) => file.startsWith('poiret-one-latin-ext-'))).toBe(true);
  expect(fontFiles.some((file) => file.startsWith('share-tech-mono-latin-'))).toBe(true);
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
            /\/grand-transition\/(?:src\/assets\/brand|assets)\/(grand-transition-emblem(?:-640)?|title-proscenium-background)(?:-[A-Za-z0-9_-]+)?\.(avif|webp|png)(?:\?no-inline)?/gu,
            '[local-brand:$1.$2]',
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

async function executeDraftAction(page: Page, action: MatchBrowserAction): Promise<void> {
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
      await page.getByRole('button', { name: 'Reshuffle private phrases' }).click();
      return;
    case 'select-comeback':
      await page.getByRole('button', { name: 'Comeback' }).click();
      return;
    default:
      throw new Error(`Unsupported browser draft action: ${command.type}`);
  }
}
