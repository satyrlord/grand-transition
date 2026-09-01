import { expect, test, type Page } from '@playwright/test';
import { ladderProgressStorageKey } from '../src/persistence/ladder-progress';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';
import { decideLocalRadioCaller } from '../src/ai/easy-ai';
import { basicScoringBalance } from '../src/content/basic-scoring-balance';
import type { MatchEngineContext, MatchState } from '../src/engine/match-lifecycle';
import { loadGameContent } from '../tools/load-game-content';

test.setTimeout(300_000);

const { englishGameLocale, sampleContent } = loadGameContent();
const matchContext: MatchEngineContext = {
  phrases: sampleContent.phrases,
  characters: sampleContent.characters,
  locale: englishGameLocale,
  balance: basicScoringBalance,
};

for (const viewport of [
  { width: 1_024, height: 720 },
  { width: 1_024, height: 768 },
  { width: 1_280, height: 720 },
  { width: 1_920, height: 1_080 },
] as const) {
  test(`ladder setup fits ${viewport.width} by ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await useFixedBrowserMatchSeed(page, 1);
    await page.goto('/grand-transition/');
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page
      .getByRole('button', { name: /Government AI.*Select for player one/u })
      .click();
    await page.getByLabel('Mode', { exact: true }).selectOption('ladder');
    await expect(page.locator('.ladder-record')).toContainText('Rung 1/9');
    await expect(page.locator('.setup-heading > p:last-child')).toBeVisible();
    await expect(page.locator('.roster-choice')).toHaveCount(19);
    await page.locator('.contestant-portrait').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    await page.locator('.roster-headshot').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    await page.locator('.setup-channel').hover();
    await expect(page.locator('.character-inspector')).toHaveCount(0);
    const geometry = await page.locator('.setup-screen').evaluate((screen) => {
      const roster = screen.querySelector<HTMLElement>('.roster-grid')!;
      const rosterZone = screen.querySelector<HTMLElement>('.roster-zone')!;
      const rosterBox = roster.getBoundingClientRect();
      const rosterZoneBox = rosterZone.getBoundingClientRect();
      return {
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
        rosterRowCounts: (() => {
          const rows = new Map<number, number>();
          for (const choice of roster.querySelectorAll<HTMLElement>(
            '.roster-choice',
          )) {
            const top = Math.round(choice.getBoundingClientRect().top);
            rows.set(top, (rows.get(top) ?? 0) + 1);
          }
          return [...rows.entries()]
            .sort(([left], [right]) => left - right)
            .map(([, count]) => count);
        })(),
        rosterOverflowX: getComputedStyle(roster).overflowX,
        rosterOverflowY: getComputedStyle(roster).overflowY,
        rosterHorizontallyContained:
          rosterBox.left >= rosterZoneBox.left - 0.5 &&
          rosterBox.right <= rosterZoneBox.right + 0.5 &&
          roster.scrollWidth <= roster.clientWidth + 1,
        rosterVerticallyContained:
          rosterBox.top >= rosterZoneBox.top - 0.5 &&
          rosterBox.bottom <= rosterZoneBox.bottom + 0.5,
        nonRosterControlsInside: [
          ...screen.querySelectorAll<HTMLElement>('button, select'),
        ]
          .filter((control) => !control.matches('.roster-choice'))
          .every((control) => {
            const box = control.getBoundingClientRect();
            return (
              box.left >= 0 &&
              box.top >= 0 &&
              box.right <= document.documentElement.clientWidth &&
              box.bottom <= document.documentElement.clientHeight
            );
          }),
      };
    });
    expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.pageHeight).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.rosterRowCounts).toEqual([6, 6, 6, 1]);
    expect(geometry.rosterOverflowX).toBe('hidden');
    expect(geometry.rosterOverflowY).toBe('auto');
    expect(geometry.rosterHorizontallyContained).toBe(true);
    expect(geometry.rosterVerticallyContained).toBe(true);
    expect(geometry.nonRosterControlsInside).toBe(true);
    const rosterReadability = await page.locator('.setup-screen').evaluate((screen) => {
      const choices = [
        ...screen.querySelectorAll<HTMLElement>('.roster-choice'),
      ];
      const ladderRecord = screen.querySelector<HTMLElement>('.ladder-record span');
      const reset = screen.querySelector<HTMLElement>('.ladder-inline-reset');
      return {
        visibleLabelsAbsent: choices.every(
          (choice) => choice.querySelector('.roster-choice-name') === null,
        ),
        accessibleNamesComplete: choices.every((choice) =>
          (choice.getAttribute('aria-label') ?? '').includes(
            '. Weaknesses: ',
          ),
        ),
        ladderTextSize: Number.parseFloat(
          getComputedStyle(ladderRecord!).fontSize,
        ),
        resetTextSize: Number.parseFloat(getComputedStyle(reset!).fontSize),
      };
    });
    expect(rosterReadability.visibleLabelsAbsent).toBe(true);
    expect(rosterReadability.accessibleNamesComplete).toBe(true);
    await page
      .getByRole('button', {
        name: /Apartment-Block Geopolitician.*Select for player one/u,
      })
      .focus();
    await expect(page.locator('.character-inspector')).toContainText(
      'Apartment-Block Geopolitician',
    );
    expect(rosterReadability.ladderTextSize).toBeGreaterThanOrEqual(11);
    expect(rosterReadability.resetTextSize).toBeGreaterThanOrEqual(11);
    await page.screenshot({
      path: `.impeccable/review/ladder-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
}

test('the production ladder completes nine persisted rungs and resumes exactly', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useFixedBrowserMatchSeed(page, 1);
  await page.goto('/grand-transition/');
  await page.evaluate(
    (storageKey) => localStorage.removeItem(storageKey),
    ladderProgressStorageKey,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page
    .getByRole('button', { name: /Government AI.*Select for player one/u })
    .click();
  await page.getByLabel('Mode', { exact: true }).selectOption('ladder');

  let wins = 0;
  let attempts = 0;
  while (wins < 9 && attempts < 30) {
    attempts += 1;
    await expect(page.locator('.ladder-record')).toContainText(
      `Rung ${wins + 1}/9`,
    );
    await page
      .getByRole('button', {
        name: wins === 0 ? 'Start ladder' : 'Continue ladder',
      })
      .click();

    const winner = await playHumanMatch(page);
    const progress = await storedProgress(page);
    console.log(
      `Ladder attempt ${attempts}: winner=${winner}, rung=${progress.rungIndex}, losses=${progress.losses}.`,
    );
    expect(progress).toBeTruthy();
    if (winner === 'player-one') {
      wins += 1;
      expect(progress.rungIndex).toBe(wins);
      expect(progress.wins).toBe(wins);
      await page.reload();
      await page.getByRole('button', { name: 'Set up match' }).click();
      await expect(page.getByLabel('Mode', { exact: true })).toHaveValue(
        'ladder',
      );
      if (wins < 9) {
        await expect(page.locator('.ladder-record')).toContainText(
          `Rung ${wins + 1}/9`,
        );
      }
    } else {
      expect(progress.rungIndex).toBe(wins);
      expect(progress.losses).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Continue ladder' }).click();
      await expect(page.locator('.ladder-record')).toContainText(
        `Rung ${wins + 1}/9`,
      );
    }
  }

  expect(wins).toBe(9);
  await expect(page.locator('.ladder-record')).toContainText('Ladder complete');
  await expect(page.locator('.ladder-record')).toContainText(
    'Nine victories recorded',
  );
  await expect(
    page.locator('.contestant-stage--two .contestant-player'),
  ).toHaveText('Ladder complete');
  await expect(
    page.getByRole('button', { name: 'Ladder complete', exact: true }),
  ).toBeDisabled();
  const completed = await storedProgress(page);
  expect(completed).toMatchObject({
    rungIndex: 9,
    wins: 9,
    completed: true,
  });
});

async function playHumanMatch(page: Page): Promise<string> {
  for (let step = 0; step < 1_500; step += 1) {
    if (
      await page
        .getByRole('heading', { name: 'Victory' })
        .isVisible()
        .catch(() => false)
    ) {
      return page.locator('grand-transition-app').evaluate((element) => {
        const app = element as HTMLElement & {
          matchState?: { winner?: string };
        };
        return app.matchState?.winner ?? '';
      });
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
      await expect(thinking).toHaveCount(0, { timeout: 4_000 });
      continue;
    }
    const state = await page.locator('grand-transition-app').evaluate((element) => {
      const app = element as HTMLElement & { matchState?: MatchState };
      return app.matchState ?? null;
    });
    if (state?.activePlayerId !== 'player-one') {
      await page.waitForTimeout(10);
      continue;
    }
    const decision = decideLocalRadioCaller(state, matchContext, {
      reducedDelay: true,
    });
    if (!decision) throw new Error('The test player has no AI decision.');
    await activateDecision(page, decision.command);
  }
  throw new Error('The ladder match did not reach Victory.');
}

async function activateDecision(
  page: Page,
  command: NonNullable<ReturnType<typeof decideLocalRadioCaller>>['command'],
): Promise<void> {
  if (command.type === 'select-phrase') {
    await page
      .locator(
        `[data-card-source="${command.payload.card.source}"][data-card-id="${command.payload.card.cardId}"]`,
      )
      .click();
    return;
  }
  if (command.type === 'redraw-hand') {
    await page
      .getByRole('button', { name: 'Reshuffle private phrases' })
      .click();
    return;
  }
  if (command.type === 'select-comeback') {
    await page.getByRole('button', { name: 'Comeback', exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'End', exact: true }).click();
}

async function storedProgress(page: Page): Promise<{
  rungIndex: number;
  wins: number;
  losses: number;
  completed: boolean;
}> {
  return page.evaluate((storageKey) => {
    const bytes = localStorage.getItem(storageKey);
    if (!bytes) throw new Error('Ladder progress is missing.');
    return JSON.parse(bytes);
  }, ladderProgressStorageKey);
}
