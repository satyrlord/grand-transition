import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

test.setTimeout(90_000);

test('a custom Local Radio Caller match reaches victory without private-hand exposure', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useFixedBrowserMatchSeed(page, 21);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByLabel('Mode', { exact: true }).selectOption('ai');
  await expect(page.getByLabel('Difficulty', { exact: true })).toHaveValue(
    'local-radio-caller',
  );
  await installAiThinkingProbe(page);
  await page.getByRole('button', { name: 'Start match' }).click();

  let sawThinking = false;
  for (let step = 0; step < 800; step += 1) {
    if (await page.getByRole('heading', { name: 'Victory' }).isVisible().catch(() => false)) {
      break;
    }
    const continueButton = page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      continue;
    }
    const thinking = page.locator('.ai-thinking-record');
    if (await thinking.isVisible().catch(() => false)) {
      sawThinking = true;
      const projection = await page.locator('grand-transition-match').evaluate(
        (element) =>
          {
            const match = element as HTMLElement & {
              thinking: boolean;
              snapshot?: {
                activePlayerId: string;
                privateCards: Array<{
                  reference: unknown;
                  phraseId: string | null;
                  text: string;
                }>;
              };
            };
            return {
              thinking: match.thinking,
              snapshot: match.snapshot,
              privateHandCount: match.querySelectorAll('.private-hand').length,
              actionCount: match.querySelectorAll('.match-actions').length,
            };
          },
      );
      if (
        projection.thinking &&
        projection.snapshot?.activePlayerId === 'player-two'
      ) {
        expect(projection.privateHandCount).toBe(0);
        expect(projection.actionCount).toBe(0);
        expect(
          projection.snapshot.privateCards.every(
            (card) =>
              card.reference === null &&
              card.phraseId === null &&
              card.text === '',
          ),
        ).toBe(true);
      }
      if (sawThinking && step === 0) {
        await page.screenshot({
          path: testInfo.outputPath('local-radio-caller-thinking.png'),
          fullPage: true,
        });
      }
      await expect(thinking).toHaveCount(0, { timeout: 3_000 });
      continue;
    }

    const match = page.locator('grand-transition-match');
    const snapshot = await match.evaluate(
      (element) =>
        (
          element as HTMLElement & {
            snapshot?: {
              activePlayerId: string;
              sentenceComplete: boolean;
            };
          }
        ).snapshot,
    );
    if (snapshot?.activePlayerId !== 'player-one') {
      await page.waitForTimeout(20);
      continue;
    }
    if (snapshot.sentenceComplete) {
      await page.getByRole('button', { name: 'End', exact: true }).click();
      continue;
    }
    const phrase = page.locator(
      '.private-hand button.phrase-card:not(:disabled), .shared-board button.phrase-card:not(:disabled)',
    ).first();
    if (await phrase.isVisible().catch(() => false)) {
      await phrase.click();
      continue;
    }
    await page.getByRole('button', { name: 'End', exact: true }).click();
  }

  const thinkingEvidence = await readAiThinkingEvidence(page);
  expect(thinkingEvidence.length).toBeGreaterThan(0);
  expect(
    thinkingEvidence.some(
      (evidence) =>
        evidence.visible &&
        evidence.thinking &&
        evidence.activePlayerId === 'player-two' &&
        evidence.privateHandCount === 0 &&
        evidence.actionCount === 0 &&
        evidence.privateCardsRedacted,
    ),
  ).toBe(true);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to main menu' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('local-radio-caller-victory.png'),
    fullPage: true,
  });
});

test('the AI speech bubble stays open automatically for the human reader', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await useFixedBrowserMatchSeed(page, 21);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByLabel('Mode', { exact: true }).selectOption('ai');
  await page.getByRole('button', { name: 'Start match' }).click();

  const validCard = await page.locator('grand-transition-match').evaluate(
    (element) => {
      const snapshot = (
        element as HTMLElement & {
          snapshot?: {
            sentenceText: string;
            privateCards: Array<{
              previewText: string;
              reference: { source: string; cardId: string } | null;
            }>;
            sharedCards: Array<{
              previewText: string;
              reference: { source: string; cardId: string } | null;
            }>;
          };
        }
      ).snapshot;
      return [...(snapshot?.privateCards ?? []), ...(snapshot?.sharedCards ?? [])]
        .find(
          (card) =>
            card.reference &&
            card.previewText.trim() !== '' &&
            card.previewText !== snapshot?.sentenceText,
        )?.reference;
    },
  );
  await page
    .locator(
      `[data-card-source="${validCard!.source}"][data-card-id="${validCard!.cardId}"]`,
    )
    .click();
  await expect
    .poll(() =>
      page.locator('grand-transition-match').evaluate((element) => {
        const match = element as HTMLElement & {
          thinking: boolean;
          snapshot?: { activePlayerId: string };
        };
        return {
          activePlayerId: match.snapshot?.activePlayerId,
          thinking: match.thinking,
        };
      }),
    )
    .toEqual({ activePlayerId: 'player-one', thinking: false });

  const bubble = page.locator('.player-sentence--waiting');
  await expect(bubble).toHaveAttribute('data-revealed', 'true');
  await expect(bubble.locator('.waiting-sentence-content')).toBeVisible();
  await expect(page.locator('.match-stage')).not.toHaveAttribute('inert', '');

  await page.waitForTimeout(4_200);
  await expect(bubble).toHaveAttribute('data-revealed', 'false');
});

test('browser Back cancels a pending AI presentation without a hidden command', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await useFixedBrowserMatchSeed(page, 21);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByLabel('Mode', { exact: true }).selectOption('ai');
  await page.getByRole('button', { name: 'Start match' }).click();
  const pending = await page.locator('grand-transition-app').evaluate(
    async (element) => {
      const app = element as HTMLElement & {
        aiThinking: boolean;
        matchState?: { commandHistory: unknown[] };
      };
      const match = element.querySelector('grand-transition-match') as
        | (HTMLElement & {
            thinking: boolean;
            snapshot?: {
              sentenceText: string;
              activePlayerId: string;
              privateCards: Array<{
                previewText: string;
                reference: { source: string; cardId: string } | null;
                phraseId: string | null;
                text: string;
              }>;
              sharedCards: Array<{
                previewText: string;
                reference: { source: string; cardId: string } | null;
              }>;
            };
          })
        | null;
      const snapshot = match?.snapshot;
      const reference = [
        ...(snapshot?.privateCards ?? []),
        ...(snapshot?.sharedCards ?? []),
      ].find(
        (card) =>
          card.reference &&
          card.previewText.trim() !== '' &&
          card.previewText !== snapshot?.sentenceText,
      )?.reference;
      if (!match || !reference) {
        throw new Error('The AI match did not expose a playable card.');
      }
      const cardButton = match.querySelector<HTMLButtonElement>(
        `[data-card-source="${reference.source}"][data-card-id="${reference.cardId}"]`,
      );
      if (!cardButton) {
        throw new Error('The playable AI card button was not found.');
      }
      cardButton.click();
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (app.aiThinking && match.thinking) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      const pendingSnapshot = match.snapshot;
      const before = app.matchState?.commandHistory.length;
      const observed = {
        activePlayerId: pendingSnapshot?.activePlayerId,
        thinking: match.thinking,
        privateCards: pendingSnapshot?.privateCards,
        privateHandCount: match.querySelectorAll('.private-hand').length,
        actionCount: match.querySelectorAll('.match-actions').length,
      };
      window.history.back();
      return { ...observed, before };
    },
  );
  expect(pending).toMatchObject({
    activePlayerId: 'player-two',
    thinking: true,
    privateHandCount: 0,
    actionCount: 0,
  });
  expect(
    pending.privateCards?.every(
      (card) =>
        card.reference === null && card.phraseId === null && card.text === '',
    ),
  ).toBe(true);
  await expect(page.locator('.setup-screen')).toBeVisible();
  await page.waitForTimeout(1_200);
  const after = await page.locator('grand-transition-app').evaluate(
    (element) => {
      const app = element as HTMLElement & {
        aiThinking?: boolean;
        matchState?: { commandHistory: unknown[] };
      };
      return {
        aiThinking: app.aiThinking,
        commands: app.matchState?.commandHistory.length,
      };
    },
  );
  expect(after).toEqual({ aiThinking: false, commands: pending.before });
});

for (const viewport of [
  { width: 1_024, height: 720 },
  { width: 1_024, height: 768 },
  { width: 1_280, height: 720 },
  { width: 1_920, height: 1_080 },
] as const) {
  test(`AI setup and thinking fit ${viewport.width} by ${viewport.height}`, async ({
    page,
  }, testInfo: TestInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await useFixedBrowserMatchSeed(page, 21);
    await page.goto('/grand-transition/');
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(
      page.getByRole('group', { name: 'Match settings' }),
    ).toBeVisible();
    await waitForLocalImages(page.locator('.setup-screen'));
    await page.evaluate(() => document.fonts.ready);
    await expectNoViewportOverflow(page.locator('.setup-screen'));
    const hotseatGeometry = await readSetupFooterGeometry(page);
    expect(hotseatGeometry.difficultyValue).toBeNull();
    expect(hotseatGeometry.modeLabelFits).toBe(true);
    expect(hotseatGeometry.sceneLabelFits).toBe(true);
    expect(hotseatGeometry.controlsAligned).toBe(true);
    await page.getByLabel('Mode', { exact: true }).selectOption('ai');
    await expect(page.getByLabel('Difficulty', { exact: true })).toHaveValue(
      'local-radio-caller',
    );
    await expect(page.locator('.setup-screen')).toBeVisible();
    await waitForLocalImages(page.locator('.setup-screen'));
    await page.evaluate(() => document.fonts.ready);
    await expectNoViewportOverflow(page.locator('.setup-screen'));
    const aiGeometry = await readSetupFooterGeometry(page);
    expect(aiGeometry.layout.fieldset).toEqual(
      hotseatGeometry.layout.fieldset,
    );
    expect(aiGeometry.layout.actions).toEqual(hotseatGeometry.layout.actions);
    expect(aiGeometry.difficultyValue).toBe('local-radio-caller');
    expect(aiGeometry.controlsAligned).toBe(true);
    expect(aiGeometry.modeLabelFits).toBe(true);
    expect(aiGeometry.difficultyLabelFits).toBe(true);
    expect(aiGeometry.sceneLabelFits).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`ai-setup-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    await installAiThinkingProbe(page);
    await page.getByRole('button', { name: 'Start match' }).click();
    const activePlayerId = await page.locator('grand-transition-match').evaluate(
      (element) =>
        (
          element as HTMLElement & {
            snapshot?: { activePlayerId: string };
          }
        ).snapshot?.activePlayerId,
    );
    if (activePlayerId === 'player-one') {
      const validCard = await page.locator('grand-transition-match').evaluate(
        (element) => {
          const snapshot = (
            element as HTMLElement & {
              snapshot?: {
                sentenceText: string;
                privateCards: Array<{
                  previewText: string;
                  reference: { source: string; cardId: string } | null;
                }>;
                sharedCards: Array<{
                  previewText: string;
                  reference: { source: string; cardId: string } | null;
                }>;
              };
            }
          ).snapshot;
          return [...(snapshot?.privateCards ?? []), ...(snapshot?.sharedCards ?? [])]
            .find(
              (card) =>
                card.reference &&
                card.previewText.trim() !== '' &&
                card.previewText !== snapshot?.sentenceText,
            )?.reference;
        },
      );
      expect(validCard).toBeTruthy();
      await page
        .locator(
          `[data-card-source="${validCard!.source}"][data-card-id="${validCard!.cardId}"]`,
        )
        .click();
    }
    await expect
      .poll(
        async () =>
          (await readAiThinkingEvidence(page)).filter(
            (evidence) => evidence.visible,
          ).length,
      )
      .toBeGreaterThan(0);
    const thinkingBox = (await readAiThinkingEvidence(page)).find(
      (evidence) => evidence.visible,
    )!.rect;
    expect(thinkingBox.width).toBeGreaterThan(0);
    expect(thinkingBox.height).toBeGreaterThan(0);
    expect(thinkingBox.x).toBeGreaterThanOrEqual(0);
    expect(thinkingBox.y).toBeGreaterThanOrEqual(0);
    expect(thinkingBox.x + thinkingBox.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(thinkingBox.y + thinkingBox.height).toBeLessThanOrEqual(
      viewport.height,
    );
    if (await page.locator('.ai-thinking-record').isVisible().catch(() => false)) {
      await page.screenshot({
        path: testInfo.outputPath(
          `ai-thinking-${viewport.width}x${viewport.height}.png`,
        ),
        fullPage: true,
      });
    }
    await waitForLocalImages(page.locator('.match-screen'));
    await expectNoViewportOverflow(page.locator('.match-screen'));
    if (viewport.width === 1_280 && viewport.height === 720) {
      for (let index = 0; index < 6; index += 1) {
        await page.waitForTimeout(220);
        await page.setViewportSize({
          width: index % 2 === 0 ? 1_279 : 1_280,
          height: 720,
        });
      }
      await expect(page.locator('.ai-thinking-record')).toHaveCount(0);
    }
  });
}

type AiThinkingEvidence = Readonly<{
  visible: boolean;
  thinking: boolean;
  activePlayerId: string | undefined;
  privateCardsRedacted: boolean;
  privateHandCount: number;
  actionCount: number;
  rect: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

async function installAiThinkingProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = window as typeof window & {
      __grandTransitionAiThinkingEvidence?: AiThinkingEvidence[];
    };
    host.__grandTransitionAiThinkingEvidence = [];
    const capture = () => {
      const record = document.querySelector<HTMLElement>('.ai-thinking-record');
      if (!record) return;
      const match = document.querySelector('grand-transition-match') as
        | (HTMLElement & {
            thinking?: boolean;
            snapshot?: {
              activePlayerId: string;
              privateCards: Array<{
                reference: unknown;
                phraseId: string | null;
                text: string;
              }>;
            };
          })
        | null;
      const bounds = record.getBoundingClientRect();
      const style = getComputedStyle(record);
      host.__grandTransitionAiThinkingEvidence!.push({
        visible:
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden',
        thinking: match?.thinking === true,
        activePlayerId: match?.snapshot?.activePlayerId,
        privateCardsRedacted:
          match?.snapshot?.privateCards.every(
            (card) =>
              card.reference === null &&
              card.phraseId === null &&
              card.text === '',
          ) ?? false,
        privateHandCount: match?.querySelectorAll('.private-hand').length ?? -1,
        actionCount: match?.querySelectorAll('.match-actions').length ?? -1,
        rect: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      });
    };
    new MutationObserver(capture).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    capture();
  });
}

async function readAiThinkingEvidence(page: Page): Promise<AiThinkingEvidence[]> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __grandTransitionAiThinkingEvidence?: AiThinkingEvidence[];
        }
      ).__grandTransitionAiThinkingEvidence ?? [],
  );
}

async function expectNoViewportOverflow(
  locator: Locator,
): Promise<void> {
  const geometry = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
}

async function readSetupFooterGeometry(page: Page) {
  return page.locator('.match-settings').evaluate((fieldset) => {
    const mode = fieldset.querySelector<HTMLSelectElement>('#mode')!;
    const difficulty =
      fieldset.querySelector<HTMLSelectElement>('#aiDifficulty');
    const scene = fieldset.querySelector<HTMLSelectElement>('#sceneId')!;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const labelFits = (select: HTMLSelectElement) => {
      const style = getComputedStyle(select);
      context.font = style.font;
      const availableWidth =
        select.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight) -
        12;
      return (
        context.measureText(select.selectedOptions[0]?.text ?? '').width <=
        availableWidth
      );
    };
    const box = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    };
    const controls = [mode, difficulty, scene].filter(
      (control): control is HTMLSelectElement => control !== null,
    );
    const controlTops = controls.map(
      (control) => control.getBoundingClientRect().top,
    );

    return {
      layout: {
        fieldset: box(fieldset),
        actions: [...document.querySelectorAll('.setup-actions button')].map(
          box,
        ),
      },
      difficultyValue: difficulty?.value ?? null,
      controlsAligned:
        Math.max(...controlTops) - Math.min(...controlTops) <= 1,
      modeLabelFits: labelFits(mode),
      difficultyLabelFits: difficulty ? labelFits(difficulty) : true,
      sceneLabelFits: labelFits(scene),
    };
  });
}

async function waitForLocalImages(locator: Locator): Promise<void> {
  await expect
    .poll(() =>
      locator.locator('img').evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
}
