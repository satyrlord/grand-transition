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
  await expect(page.getByText('10 seconds', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Turn actions' }),
  ).toBeVisible();
  await expect(page.locator('[data-turn-state="active"]')).toHaveCount(1);
  await expect(
    page.locator('[data-turn-state="active"] .player-turn-status'),
  ).toHaveText('Has the floor');
  await expect(page.locator('.private-hand-heading strong')).toHaveText(
    'Has the floor',
  );
  await expect(page.locator('.private-hand-heading p')).toHaveText(
    'The Civic Fox',
  );
  const activePlaque = page.locator('[data-turn-state="active"] > div');
  expect(
    await activePlaque.evaluate((element) =>
      getComputedStyle(element).animationName.toLowerCase(),
    ),
  ).toContain('floor-transfer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await activePlaque.evaluate((element) =>
      getComputedStyle(element).animationName.toLowerCase(),
    ),
  ).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

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
      requiredTextClipping: Array.from(
        document.querySelectorAll<HTMLElement>(
          '.match-turn-heading h1, .card-phrase, .card-weakness',
        ),
      )
        .filter(
          (node) =>
            node.scrollWidth > node.clientWidth + 1 ||
            node.scrollHeight > node.clientHeight + 1,
        )
        .map((node) => {
          return {
            className: node.className,
            text: node.textContent?.trim(),
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
            clientHeight: node.clientHeight,
            scrollHeight: node.scrollHeight,
          };
        }),
    };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport.width);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewport.height);
  expect(geometry.requiredInside).toBe(true);
  expect(geometry.sharedOverlap).toBe(false);
  expect(geometry.requiredTextClipping).toEqual([]);

  const actionIconFacts = await page
    .locator('.match-actions .action-icon')
    .evaluateAll((icons) =>
      icons.map((icon) => {
        const box = icon.getBoundingClientRect();
        return {
          namespace: icon.namespaceURI,
          pathNamespaces: Array.from(
            icon.querySelectorAll('path'),
            (path) => path.namespaceURI,
          ),
          pathCount: icon.querySelectorAll('path').length,
          width: box.width,
          height: box.height,
          stroke: getComputedStyle(icon).stroke,
        };
      }),
    );
  expect(actionIconFacts).toHaveLength(3);
  expect(
    actionIconFacts.every(
      (icon) =>
        icon.namespace === 'http://www.w3.org/2000/svg' &&
        icon.pathCount > 0 &&
        icon.pathNamespaces.every(
          (namespace) => namespace === 'http://www.w3.org/2000/svg',
        ) &&
        icon.width > 0 &&
        icon.height > 0 &&
        icon.stroke !== 'none',
    ),
  ).toBe(true);

  const tacticalTextFloor = await page.evaluate(() => {
    const text = document.querySelectorAll(
      '.match-facts dt, .match-player dt, .match-player p, .reaction-copy p, .sentence-ledger h2, .card-topline, .card-phrase, .card-bottomline, .card-weakness, .private-hand-heading, .action-detail, .match-footer',
    );
    return Math.min(
      ...Array.from(text, (element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
  });
  expect(tacticalTextFloor).toBeGreaterThanOrEqual(11);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('match-desktop-1280x720.png'),
    fullPage: true,
  });

  await expect(page.getByRole('button', { name: 'Comeback' })).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileTacticalTextFloor = await page.evaluate(() => {
    const text = document.querySelectorAll(
      '.match-facts dt, .match-player dt, .match-player p, .reaction-copy p, .sentence-ledger h2, .card-topline, .card-phrase, .card-bottomline, .card-weakness, .private-hand-heading, .action-detail, .match-footer',
    );
    return Math.min(
      ...Array.from(text, (element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
  });
  expect(mobileTacticalTextFloor).toBeGreaterThanOrEqual(11);
  const mobileReactionTextClipping = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.reaction-copy h2, .reaction-copy > p',
      ),
    )
      .filter(
        (node) =>
          node.scrollWidth > node.clientWidth + 1 ||
          node.scrollHeight > node.clientHeight + 1,
      )
      .map((node) => ({
        className: node.className,
        text: node.textContent?.trim(),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
      })),
  );
  expect(mobileReactionTextClipping).toEqual([]);
  const mobileDraftOrder = await page.evaluate(() => {
    const privateHand = document.querySelector<HTMLElement>('.private-hand')!;
    const sharedBoard = document.querySelector<HTMLElement>('.shared-board')!;
    const actions = document.querySelector<HTMLElement>('.match-actions')!;
    return {
      visual: [
        privateHand.getBoundingClientRect().top,
        sharedBoard.getBoundingClientRect().top,
        actions.getBoundingClientRect().top,
      ],
      semantic:
        privateHand.compareDocumentPosition(sharedBoard) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        sharedBoard.compareDocumentPosition(actions) &
          Node.DOCUMENT_POSITION_FOLLOWING,
    };
  });
  expect(mobileDraftOrder.visual).toEqual(
    [...mobileDraftOrder.visual].sort((a, b) => a - b),
  );
  expect(Boolean(mobileDraftOrder.semantic)).toBe(true);
  await page.getByRole('heading', { name: /Round 1:/u }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.locator('.private-hand .phrase-card:not(:disabled)').first(),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('match-mobile-scope-evidence.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1672, height: 941 });
  const stageArt = page.locator('.broadcast-stage-art');
  await expect(stageArt).toBeVisible();
  expect(
    await stageArt.evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
    ),
  ).toBe(true);
  const parityGeometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    viewportWidth: document.documentElement.clientWidth,
    viewportHeight: document.documentElement.clientHeight,
  }));
  expect(parityGeometry.documentWidth).toBeLessThanOrEqual(
    parityGeometry.viewportWidth,
  );
  expect(parityGeometry.documentHeight).toBeLessThanOrEqual(
    parityGeometry.viewportHeight,
  );
  await page.screenshot({
    path: testInfo.outputPath('match-user-parity-1672x941.png'),
    fullPage: true,
  });
});

test('pointer play completes redraw, an immediate grammar mistake, and the other hotseat side', async ({
  page,
}, testInfo) => {
  await startMatch(page);

  const redraw = page.getByRole('button', { name: 'Redraw hand' });
  await redraw.click();
  await expect(
    page.getByRole('button', { name: 'Redraw used' }),
  ).toBeDisabled();

  const wrongPredicate = page.locator(
    '.shared-board button[data-card-state="legal"][aria-label*="Role predicate"]',
  );
  await expect(wrongPredicate).toBeVisible();
  await wrongPredicate.click();
  await page.screenshot({
    path: testInfo.outputPath('match-grammar-mistake.png'),
    fullPage: true,
  });
  await expect(
    page.getByRole('heading', { name: /Brass Peacock has the floor/u }),
  ).toBeVisible();
  await expect(
    page.locator('[data-turn-state="active"] .player-turn-status'),
  ).toHaveText('Has the floor');

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

test('keyboard play selects a continuation and ends the other sentence', async ({
  page,
}) => {
  await startMatch(page);
  const continuation = page
    .locator('button.phrase-card[aria-label*="Role continuation"]')
    .first();
  await expect(continuation).toBeEnabled();
  const shortcut = await continuation.evaluate((button) => {
    const match = document.querySelector('grand-transition-match') as
      | (HTMLElement & {
          snapshot?: {
            sharedCards: readonly {
              reference: { cardId: string } | null;
              shortcut: string;
            }[];
            privateCards: readonly {
              reference: { cardId: string } | null;
              shortcut: string;
            }[];
          };
        })
      | null;
    const cardId = button.getAttribute('data-card-id');
    return [
      ...(match?.snapshot?.sharedCards ?? []),
      ...(match?.snapshot?.privateCards ?? []),
    ].find((card) => card.reference?.cardId === cardId)?.shortcut;
  });
  expect(shortcut).toBeTruthy();
  await page.keyboard.press(shortcut!);
  const opponentHeading = page.getByRole('heading', {
    name: /Brass Peacock has the floor/u,
  });
  await expect(opponentHeading).toBeVisible();
  await opponentHeading.focus();
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('heading', { name: 'Round 1 resolution' }),
  ).toBeVisible();
  await expect(page.getByText(/Continuation survived/u).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue to round 2' }).click();
  await expect(page.getByRole('heading', { name: /Round 2:/u })).toBeVisible();
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
