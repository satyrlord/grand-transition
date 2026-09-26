import { expect, test, type Page } from '@playwright/test';
import os from 'node:os';
import type { MatchScreenSnapshot } from '../src/app/match-screen-snapshot.ts';
import { loadGameContent } from '../tools/load-game-content.ts';
import { planMatchBrowserFlow, useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { finishPresentation } from './helpers/presentation.ts';
import { lockInSetup } from './helpers/setup.ts';
import { storedHistory } from './helpers/stored-data.ts';
import { gateViewports } from './helpers/viewports.ts';

const plan = planMatchBrowserFlow(20_260_008);
const { gameCatalog: catalog } = loadGameContent();
const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await useFixedBrowserMatchSeed(page, plan.seed);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.afterEach(async ({ page, browser }, info) => {
  await info.attach('compatibility-environment', {
    contentType: 'application/json',
    body: JSON.stringify({
      project: info.project.name,
      browser: browser.version(),
      os: `${os.platform()} ${os.release()}`,
      viewport: page.viewportSize(),
      userAgent: await page.evaluate(() => navigator.userAgent),
      runtimeErrors: runtimeErrors.get(page),
      coverage: 'Playwright engine and device emulation; real browser releases not examined',
    }),
  });
  expect(runtimeErrors.get(page)).toEqual([]);
});

test('title reaches victory and reload restores history when speech is unavailable', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  });
  await page.clock.install();
  await page.goto('');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Speech enabled', { exact: true }).check();
  await expect(
    page.getByText('Local neural speech is unavailable. You can continue without narration.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startHotseat(page);

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
    await finishPresentation(page);
  }

  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await expect.poll(async () => (await storedHistory(page)).length).toBe(1);
  await page.getByRole('button', { name: 'Return to main menu', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Match history.*1/u }).click();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
});

test('blocked storage keeps settings usable and clearly reports that changes do not persist', async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException('Storage is blocked.', 'SecurityError');
    };
  });
  await page.goto('');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.settings-persistence-notice')).toContainText(
    'Changes will not persist after this page closes.',
  );
  await page.getByRole('slider', { name: 'Master volume', exact: true }).fill('0.35');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Master volume', exact: true })).toHaveValue(
    '0.35',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await startHotseat(page);
  await expect(page.locator('.shared-board > li')).toHaveCount(9);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Master volume', exact: true })).not.toHaveValue(
    '0.35',
  );
});

test('hotseat hides the inactive hand and removes private content while paused or blocked', async ({
  page,
}) => {
  await page.goto('');
  await startHotseat(page);
  const initialHand = await page
    .locator('.private-hand [data-card-id]')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-card-id')));
  expect(initialHand).toHaveLength(2);
  await expect(page.locator('.private-hand')).toHaveAttribute('data-side', 'red');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.locator('.private-hand')).toHaveAttribute('data-side', 'blue');
  for (const id of initialHand) {
    await expect(page.locator(`[data-card-id="${id}"]`)).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.phrase-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const supported = page.viewportSize()!;
  for (const viewport of [
    { width: 639, height: 320 },
    { width: 640, height: 319 },
    { width: 359, height: 780 },
    { width: 359, height: 640 },
    { width: 360, height: 639 },
    { width: 640, height: 640 },
    { width: 1024, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-interruption="unsupported-viewport"]')).toBeVisible();
    await expect(page.locator('.phrase-card')).toHaveCount(0);
    await page.setViewportSize(supported);
    await expect(page.locator('.private-hand')).toHaveAttribute('data-side', 'blue');
  }
});

for (const viewport of gateViewports([
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1920, height: 1080 },
  { width: 640, height: 320 },
  { width: 740, height: 360 },
  { width: 780, height: 360 },
  { width: 832, height: 384 },
  { width: 915, height: 412 },
  { width: 700, height: 384 },
  { width: 360, height: 640 },
  { width: 360, height: 780 },
  { width: 384, height: 832 },
  { width: 412, height: 915 },
  { width: 384, height: 700 },
])) {
  test(`longest shipped content fits the final art at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    if (viewport.height > viewport.width) {
      await page.getByRole('button', { name: 'Continue in portrait' }).click();
    }
    await page.getByRole('button', { name: 'Single Player', exact: true }).click();
    const messages = catalog.locales[0]!.messages;
    const longestCharacter = catalog.characters.toSorted(
      (a, b) => messages[b.nameKey]!.length - messages[a.nameKey]!.length,
    )[0]!;
    const longestScene = catalog.scenes.toSorted(
      (a, b) => messages[b.nameKey]!.length - messages[a.nameKey]!.length,
    )[0]!;
    await page.locator('#playerOneCharacterId').click();
    await page
      .locator(`.roster-choice[data-character-id="${longestCharacter.id}"][data-skin-id="default"]`)
      .click();
    await page.getByLabel('Scene', { exact: true }).selectOption(longestScene.id);
    await lockInSetup(page);
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const longestPhrases = catalog.locales.map(
      (locale) =>
        catalog.phrases
          .map((phrase) => locale.messages[phrase.textKey]!)
          .toSorted((a, b) => b.length - a.length)[0]!,
    );
    // A renderer fixture uses actual shipped text; gameplay is covered above.
    await page.locator('grand-transition-match').evaluate(async (element, phrases) => {
      const match = element as HTMLElement & {
        snapshot: MatchScreenSnapshot;
        updateComplete: Promise<boolean>;
      };
      match.snapshot = {
        ...match.snapshot,
        revision: match.snapshot.revision + 1,
        sharedCards: match.snapshot.sharedCards.map((card, index) => ({
          ...card,
          text: phrases[index % phrases.length]!,
        })),
      };
      await match.updateComplete;
    }, longestPhrases);
    await expect
      .poll(() =>
        page.locator('img.broadcast-stage-art').evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every((image) => {
              const raster = image as HTMLImageElement;
              return raster.complete && raster.naturalWidth > 0;
            }),
        ),
      )
      .toBe(true);
    await page.evaluate(() => document.fonts.ready);
    for (const phrase of longestPhrases) {
      await expect(
        page.locator('.shared-board .card-phrase').filter({ hasText: phrase }).first(),
      ).toBeVisible();
    }
    const geometry = await page.evaluate(() => ({
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
      clipped: [...document.querySelectorAll<HTMLElement>('.card-phrase, .match-player h2')]
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
        )
        .map((element) => element.textContent),
    }));
    expect(geometry).toEqual({ pageFits: true, clipped: [] });
    await page.screenshot({ path: info.outputPath('longest-content.png'), fullPage: true });
  });
}

async function startHotseat(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
}
