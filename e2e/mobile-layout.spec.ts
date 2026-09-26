import { lockInSetup } from './helpers/setup.ts';
import { expect, test, type Page } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { finishPresentation, reachDeliveryTotal } from './helpers/presentation.ts';
import type { RoundPresentationFrame } from '../src/app/round-presentation.ts';
import { gateViewports } from './helpers/viewports.ts';

const portraitViewports = [
  { width: 384, height: 832 },
  { width: 412, height: 915 },
  { width: 360, height: 780 },
  { width: 384, height: 700 },
  { width: 360, height: 640 },
] as const;
const landscapeViewports = [
  ...portraitViewports.map(({ width, height }) => ({ width: height, height: width })),
  { width: 740, height: 360 },
  { width: 640, height: 320 },
];

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  await useFixedBrowserMatchSeed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-09-13T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-13T12:01:00Z'));
});

for (const viewport of [
  ...gateViewports(portraitViewports),
  ...gateViewports(landscapeViewports),
]) {
  const portrait = viewport.height > viewport.width;
  test(`mobile ${viewport.width} by ${viewport.height} supports touch setup and drafting`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    if (portrait) await continueInPortrait(page);
    await expect(page.getByRole('button', { name: 'Single Player', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Ladder', exact: true })).toBeEnabled();
    const multiplayer = page.getByRole('button', { name: 'Multiplayer', exact: true });
    if (portrait) {
      await expect(multiplayer).toBeDisabled();
      await expect(multiplayer).toHaveAccessibleDescription('Multiplayer requires landscape mode.');
    } else {
      await expect(multiplayer).toBeEnabled();
    }
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Single Player', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Select your debaters' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('mobile-setup.png'), fullPage: true });
    await lockInSetup(page);
    await page.getByRole('button', { name: 'Start match', exact: true }).tap();
    await expect(page.locator('.match-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeInViewport();
    await expect(page.locator('.shared-board > li')).toHaveCount(9);
    await expect(page.locator('.private-hand ol > li')).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
    if (portrait) {
      const geometry = await page.evaluate(() => {
        const pool = document.querySelector('.common-phrases')!.getBoundingClientRect();
        const scene = document.querySelector('.match-stage')!.getBoundingClientRect();
        const sentence = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
        const rows = [...document.querySelectorAll('.shared-board > li')].map((row) =>
          row.getBoundingClientRect(),
        );
        return {
          left: pool.left,
          right: pool.right,
          width: document.documentElement.clientWidth,
          belowScene: pool.top >= scene.bottom - 1,
          belowSentence: pool.top >= sentence.bottom - 1,
          oneColumn: rows.every((row) => Math.abs(row.left - rows[0]!.left) <= 1),
          separateRows: rows.every(
            (row, index) => index === 0 || row.top >= rows[index - 1]!.bottom - 1,
          ),
        };
      });
      expect(Math.abs(geometry.left)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.right - geometry.width)).toBeLessThanOrEqual(2);
      expect(geometry.belowScene).toBe(true);
      expect(geometry.belowSentence).toBe(true);
      expect(geometry.oneColumn).toBe(true);
      expect(geometry.separateRows).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('mobile-match.png'), fullPage: true });
    await page.locator('.private-hand button.phrase-card').first().tap({ trial: true });
    await page.getByRole('button', { name: 'End', exact: true }).tap({ trial: true });
    await page.getByRole('button', { name: 'Reshuffle private phrases', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Reshuffle used', exact: true })).toBeDisabled();
    const cardId = await page.locator('grand-transition-match').evaluate((element) => {
      const match = element as HTMLElement & {
        snapshot: {
          sharedCards: Array<{
            grammarAccepted: boolean;
            reference: { cardId: string } | null;
            action: unknown;
          }>;
        };
      };
      return match.snapshot.sharedCards.find((card) => card.grammarAccepted && card.action !== null)
        ?.reference?.cardId;
    });
    expect(cardId).toBeTruthy();
    const sentenceBefore = await page.locator('.sentence-preview').textContent();
    await page.locator(`.shared-board button[data-card-id="${cardId}"]`).tap();
    await expect(page.locator('.sentence-preview')).not.toHaveText(sentenceBefore ?? '');
    await expectPhraseCardsInsideRows(page);
    await expectNoHorizontalOverflow(page);
  });
}

test('portrait recommendation is modal and appears once per page instance', async ({ page }) => {
  await page.setViewportSize(portraitViewports[0]);
  await page.goto('');
  await expect(page.getByRole('alertdialog', { name: 'Landscape recommended' })).toBeVisible();
  await expect(page.locator('grand-transition-title')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue in portrait' })).toBeFocused();
  await continueInPortrait(page);
  await page.setViewportSize({ width: 832, height: 384 });
  await expect(page.getByRole('button', { name: 'Multiplayer' })).toBeEnabled();
  await page.setViewportSize(portraitViewports[0]);
  await expect(page.getByRole('button', { name: 'Multiplayer' })).toBeDisabled();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('alertdialog', { name: 'Landscape recommended' })).toBeVisible();
  await page.setViewportSize({ width: 640, height: 640 });
  await expectConcealed(page, 'unsupported-viewport');
  await page.setViewportSize({ width: 832, height: 384 });
  await expect(page.getByRole('button', { name: 'Multiplayer' })).toBeEnabled();
  await page.setViewportSize(portraitViewports[0]);
  await expect(page.getByRole('button', { name: 'Multiplayer' })).toBeDisabled();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('portrait AI pause and rotation preserve the match and remaining turn time', async ({
  page,
}) => {
  await page.setViewportSize(portraitViewports[0]);
  await page.goto('');
  await continueInPortrait(page);
  await page.getByRole('button', { name: 'Single Player', exact: true }).tap();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).tap();
  await page.clock.runFor(5_000);
  const before = await matchFacts(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expectConcealed(page, 'paused');
  await page.clock.runFor(45_000);
  await page.setViewportSize({ width: 832, height: 384 });
  await expectConcealed(page, 'paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  expect(await matchFacts(page)).toEqual(before);
  await page.setViewportSize(portraitViewports[0]);
  expect(await matchFacts(page)).toEqual(before);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.clock.runFor(1_000);
  await expect(page.locator('.timer-fact')).toHaveAttribute('data-timer', '24');
});

test('rotating hotseat conceals the match and preserves timer and manual pause', async ({
  page,
}) => {
  await page.setViewportSize({ width: 832, height: 384 });
  await page.goto('');
  await page.getByRole('button', { name: 'Multiplayer' }).tap();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).tap();
  await page.clock.runFor(5_000);
  const before = await matchFacts(page);
  await page.setViewportSize(portraitViewports[0]);
  await expectConcealed(page, 'hotseat-portrait');
  await expect(page.getByRole('button', { name: 'Continue in portrait' })).toHaveCount(0);
  await page.clock.runFor(45_000);
  await page.setViewportSize({ width: 832, height: 384 });
  expect(await matchFacts(page)).toEqual(before);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.setViewportSize(portraitViewports[0]);
  await expectConcealed(page, 'hotseat-portrait');
  await page.clock.runFor(45_000);
  await page.setViewportSize({ width: 832, height: 384 });
  await expectConcealed(page, 'paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  expect(await matchFacts(page)).toEqual(before);
});

test('first portrait rotation pauses an active AI match until the recommendation is dismissed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 832, height: 384 });
  await page.goto('');
  await page.getByRole('button', { name: 'Single Player', exact: true }).tap();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).tap();
  await page.clock.runFor(5_000);
  const before = await matchFacts(page);
  await page.setViewportSize(portraitViewports[0]);
  await expectConcealed(page, 'landscape-recommended');
  await page.clock.runFor(45_000);
  await continueInPortrait(page);
  expect(await matchFacts(page)).toEqual(before);
});

test('mobile AI delivery, victory and saved history remain readable and reachable', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 832, height: 384 });
  await page.goto('');
  await page.getByRole('button', { name: 'Single Player', exact: true }).tap();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).tap();
  let checkedPresentation = false;
  for (let step = 0; step < 600; step += 1) {
    if (await page.getByRole('heading', { name: 'Victory', exact: true }).count()) break;
    if (await page.locator('.match-screen[data-delivery-phase]').count()) {
      if (!checkedPresentation) {
        const frameBefore = await presentationFrame(page);
        await page.setViewportSize(portraitViewports[0]);
        await expectConcealed(page, 'landscape-recommended');
        await page.clock.runFor(45_000);
        expect(await presentationFrame(page)).toEqual(frameBefore);
        await continueInPortrait(page);
        expect(await presentationFrame(page)).toEqual(frameBefore);
        await reachDeliveryTotal(page, frameBefore!.speakerId);
        await expect(page.locator('.delivery-total')).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectHorizontallyContained(page, '.delivery-receipt');
        await page.screenshot({ path: testInfo.outputPath('mobile-delivery.png'), fullPage: true });
        checkedPresentation = true;
      }
      await finishPresentation(page);
      continue;
    }
    if (await page.locator('.ai-thinking-record').count()) {
      await expect(page.locator('.private-hand, .match-actions')).toHaveCount(0);
      await page.clock.runFor(500);
      await page.waitForTimeout(20);
      continue;
    }
    const complete = await page
      .locator('grand-transition-match')
      .evaluate(
        (element) =>
          (element as HTMLElement & { snapshot: { sentenceComplete: boolean } }).snapshot
            .sentenceComplete,
      );
    // After the first delivery, deliberate grammar mistakes reach a real saved
    // result quickly through the same touch controls as ordinary play.
    const invalidCard = checkedPresentation
      ? await page.locator('grand-transition-match').evaluate((element) => {
          type Card = {
            grammarAccepted: boolean;
            action: unknown;
            reference: { cardId: string; source: string } | null;
          };
          const { sharedCards, privateCards } = (
            element as HTMLElement & { snapshot: { sharedCards: Card[]; privateCards: Card[] } }
          ).snapshot;
          return [...sharedCards, ...privateCards].find(
            (card) => !card.grammarAccepted && card.action !== null,
          )?.reference;
        })
      : null;
    const phrase = invalidCard
      ? page.locator(
          `button[data-card-source="${invalidCard.source}"][data-card-id="${invalidCard.cardId}"]`,
        )
      : page
          .locator(
            '.private-hand button.phrase-card:not(:disabled), .shared-board button.phrase-card:not(:disabled)',
          )
          .first();
    await expectPhraseCardsInsideRows(page);
    if ((invalidCard || !complete) && (await phrase.count())) await phrase.tap({ timeout: 5_000 });
    else await page.getByRole('button', { name: 'End', exact: true }).tap();
    await page.clock.runFor(500);
  }
  expect(checkedPresentation).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Victory' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  for (const viewport of [
    portraitViewports[0],
    portraitViewports[2],
    { width: 832, height: 384 },
    { width: 640, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expectHorizontallyContained(page, '.round-review-dialog');
    await page.getByRole('button', { name: 'Return to main menu' }).tap({ trial: true });
    await page.screenshot({
      path: testInfo.outputPath(`mobile-victory-${viewport.width}x${viewport.height}.png`),
      // Fixed dialogs are viewport evidence. Full-page capture can change the
      // emulated mobile page scale before the next native touch interaction.
      fullPage: false,
    });
    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
    const returnButton = page.getByRole('button', { name: 'Return to main menu' });
    await returnButton.scrollIntoViewIfNeeded();
    const returnGeometry = await returnButton.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const scores = document.querySelector('.reaction-scores')!.getBoundingClientRect();
      const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        belowScores: box.top >= scores.bottom,
        receivesTouch: target !== null && button.contains(target),
      };
    });
    expect(returnGeometry).toEqual({ belowScores: true, receivesTouch: true });
  }
  await page.getByRole('button', { name: 'Return to main menu' }).tap();
  await page.getByRole('button', { name: /Match history/u }).tap();
  await expect(page.locator('.match-history-entry')).toHaveCount(1);
  for (const viewport of [
    portraitViewports[0],
    portraitViewports[2],
    { width: 832, height: 384 },
    { width: 640, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expectHorizontallyContained(page, '.match-history-dialog, .match-history-entry');
    await page.getByRole('button', { name: 'Close', exact: true }).tap({ trial: true });
    await page.screenshot({
      path: testInfo.outputPath(`mobile-history-${viewport.width}x${viewport.height}.png`),
      fullPage: false,
    });
    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  }
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
});

test('portrait recommendation suspends pending AI work and resumes it after dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 832, height: 384 });
  await page.goto('');
  await page.getByRole('button', { name: 'Single Player', exact: true }).tap();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).tap();
  const cardId = await page.locator('grand-transition-match').evaluate((element) => {
    const match = element as HTMLElement & {
      snapshot: {
        sharedCards: Array<{
          grammarAccepted: boolean;
          reference: { cardId: string } | null;
          action: unknown;
        }>;
      };
    };
    return match.snapshot.sharedCards.find((card) => card.grammarAccepted && card.action !== null)
      ?.reference?.cardId;
  });
  expect(cardId).toBeTruthy();
  await page.locator(`.shared-board button[data-card-id="${cardId}"]`).tap();
  await expect(page.locator('.ai-thinking-record')).toBeVisible();
  const before = await matchRevision(page);
  await page.setViewportSize(portraitViewports[0]);
  await expectConcealed(page, 'landscape-recommended');
  await page.clock.runFor(45_000);
  expect(await matchRevision(page)).toBe(before);
  await continueInPortrait(page);
  for (
    let elapsed = 0;
    elapsed < 10_000 && (await matchRevision(page)) === before;
    elapsed += 500
  ) {
    await page.clock.runFor(500);
    await page.waitForTimeout(20);
  }
  expect(await matchRevision(page)).toBeGreaterThan(before);
});

async function matchRevision(page: Page): Promise<number> {
  return page
    .locator('grand-transition-match')
    .evaluate(
      (element) => (element as HTMLElement & { snapshot: { revision: number } }).snapshot.revision,
    );
}

async function expectPhraseCardsInsideRows(page: Page): Promise<void> {
  const overflowingSlots = await page.locator('.shared-board > li').evaluateAll((slots) =>
    slots.flatMap((slot) => {
      const row = slot.getBoundingClientRect();
      const element = slot.querySelector('.phrase-card')!;
      const card = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return card.top < row.top - 1 || card.bottom > row.bottom + 1
        ? [
            {
              slot: slot.getAttribute('data-slot'),
              state: slot.getAttribute('data-card-state'),
              rowTop: row.top,
              rowBottom: row.bottom,
              cardTop: card.top,
              cardBottom: card.bottom,
              height: style.height,
              minHeight: style.minHeight,
              boxSizing: style.boxSizing,
              gridRows: getComputedStyle(slot.parentElement!).gridTemplateRows,
            },
          ]
        : [];
    }),
  );
  expect(overflowingSlots, 'Every selected and available card must remain inside its row').toEqual(
    [],
  );
}

async function expectHorizontallyContained(page: Page, selector: string): Promise<void> {
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        width: box.width,
        viewport: document.documentElement.clientWidth,
        textFits: element.scrollWidth <= element.clientWidth + 1,
      };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.width).toBeGreaterThan(0);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(box.viewport + 1);
    expect(box.textFits).toBe(true);
  }
}

async function presentationFrame(page: Page) {
  return page
    .locator('grand-transition-match')
    .evaluate(
      (element) =>
        (element as HTMLElement & { presentation: RoundPresentationFrame | null }).presentation,
    );
}

async function continueInPortrait(page: Page): Promise<void> {
  await expect(page.getByRole('alertdialog', { name: 'Landscape recommended' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue in portrait' }).tap();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
}

async function expectConcealed(page: Page, kind: string): Promise<void> {
  await expect(page.locator(`[data-interruption="${kind}"]`)).toBeVisible();
  await expect(page.locator('.match-screen, .phrase-card, [data-timer]')).toHaveCount(0);
}

async function matchFacts(page: Page) {
  await expect(page.locator('.match-screen')).toBeVisible();
  // Compare the draft, not an autocomplete preview under the setup mouse position.
  await page.mouse.move(0, 0);
  return {
    timer: await page.locator('.timer-fact').getAttribute('data-timer'),
    sentence: await page.locator('.sentence-preview').textContent(),
    cards: await page.locator('.phrase-card').allTextContents(),
    round: await page.locator('#match-title').textContent(),
    pride: await page.locator('.player-health-label').allTextContents(),
  };
}
