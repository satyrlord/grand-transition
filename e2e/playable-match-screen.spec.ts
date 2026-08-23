import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
});

test('the longest desktop match state fits and exposes every required fact', async ({
  page,
}, testInfo) => {
  await startMatch(page);

  await expect(page.getByRole('heading', { name: /Round 1:/u })).toBeVisible();
  await expect(page.locator('.shared-board > li')).toHaveCount(9);
  await expect(page.locator('.private-hand ol > li')).toHaveCount(2);
  await expect(page.getByText('Current sentence')).toBeVisible();
  await expect(page.getByText('Pride', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Unlimited', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Turn actions' }),
  ).toBeVisible();

  const geometry = await page.evaluate(() => {
    const viewport = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
    const required = [
      ...document.querySelectorAll(
        '.match-status-rail, .match-player, .reaction-docket, .sentence-ledger, .shared-board > li, .private-hand ol > li, .match-actions button',
      ),
    ];
    const boxes = required.map((element) => element.getBoundingClientRect());
    return {
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewport,
      requiredInside: boxes.every(
        (box) =>
          box.width > 0 &&
          box.height > 0 &&
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= viewport.width &&
          box.bottom <= viewport.height,
      ),
      sharedOverlap: boxes
        .slice(4, 13)
        .some((box, index, all) =>
          all
            .slice(index + 1)
            .some(
              (other) =>
                box.left < other.right &&
                box.right > other.left &&
                box.top < other.bottom &&
                box.bottom > other.top,
            ),
        ),
    };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport.width);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewport.height);
  expect(geometry.requiredInside).toBe(true);
  expect(geometry.sharedOverlap).toBe(false);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('match-desktop-1280x720.png'),
    fullPage: true,
  });

  await page.keyboard.press('c');
  await expect(
    page.getByRole('dialog', { name: 'Comeback register' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('match-comeback-overlay.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('match-mobile-scope-evidence.png'),
    fullPage: true,
  });
});

test('pointer play completes redraw, strategic fault, and the other hotseat side', async ({
  page,
}, testInfo) => {
  await startMatch(page);

  const redraw = page.getByRole('button', { name: 'Redraw hand' });
  await redraw.click();
  await expect(
    page.getByRole('button', { name: 'Redraw used' }),
  ).toBeDisabled();

  const illegalConjunction = page.locator(
    '.shared-board button[data-card-state="illegal"][aria-label*="Role conjunction"]',
  );
  await expect(illegalConjunction).toBeVisible();
  await illegalConjunction.click();
  await expect(
    page.getByRole('button', { name: 'Commit strategic foul' }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('match-fault-confirmation.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Commit strategic foul' }).click();
  await expect(
    page.getByRole('heading', { name: /Brass Peacock has the floor/u }),
  ).toBeVisible();

  for (let turn = 0; turn < 8; turn += 1) {
    if (
      await page
        .getByRole('heading', { name: 'Round 1 resolution' })
        .isVisible()
    )
      break;
    const end = page.getByRole('button', { name: 'End sentence' });
    if (await end.isEnabled()) {
      await end.click();
      continue;
    }
    const legal = page
      .locator(
        '.shared-board button[data-card-state="legal"], .private-hand button[data-card-state="legal"]',
      )
      .first();
    await expect(legal).toBeVisible();
    await legal.click();
  }

  await expect(
    page.getByRole('heading', { name: 'Round 1 resolution' }),
  ).toBeVisible();
  await expect(page.getByText('Score terms and rule record')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to round 2' }).click();
  await expect(page.getByRole('heading', { name: /Round 2:/u })).toBeVisible();
});

test('keyboard play commits one side and carries the other continuation', async ({
  page,
}) => {
  await startMatch(page);

  await page.keyboard.press('3');
  await expect(
    page.getByRole('heading', { name: /Brass Peacock has the floor/u }),
  ).toBeVisible();
  await page.keyboard.press('6');
  await expect(
    page.getByRole('heading', { name: /Civic Fox has the floor/u }),
  ).toBeVisible();
  await page.keyboard.press('5');
  await expect(
    page.getByRole('heading', { name: /Brass Peacock has the floor/u }),
  ).toBeVisible();
  await page.keyboard.press('2');
  await expect(
    page.getByRole('heading', { name: /Civic Fox has the floor/u }),
  ).toBeVisible();
  await page.keyboard.press('1');
  await expect(
    page.getByRole('heading', { name: /Brass Peacock has the floor/u }),
  ).toBeVisible();

  await page
    .getByRole('heading', { name: /Brass Peacock has the floor/u })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: /Civic Fox has the floor/u }),
  ).toBeVisible();
  await expect(
    page.locator('.private-hand button[aria-label*="Role continuation"]'),
  ).toBeEnabled();
  await page.keyboard.press('q');

  await expect(
    page.getByRole('heading', { name: 'Round 1 resolution' }),
  ).toBeVisible();
  await expect(page.getByText(/Continuation survived/u).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue to round 2' }).click();
  await expect(page.getByRole('heading', { name: /Round 2:/u })).toBeVisible();
  const restored = await page.evaluate(() => {
    const match = document.querySelector('grand-transition-match') as
      | (HTMLElement & {
          snapshot?: {
            round: number;
            players: readonly {
              characterId: string;
              sentence: string | null;
            }[];
          };
        })
      | null;
    return match?.snapshot?.players.find(
      (player) => player.characterId === 'civic-fox',
    )?.sentence;
  });
  expect(restored).toContain('committee kite folds a velvet megaphone');
  await page.keyboard.press('Tab');
  await expect(
    page.locator('.card-shortcut:not([hidden])').first(),
  ).toBeVisible();
});

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.getByRole('heading', { name: /Round 1:/u })).toBeFocused();
}
