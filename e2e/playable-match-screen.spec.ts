import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
});

test('the longest desktop match state fits and exposes every required fact', async ({
  page,
}, testInfo) => {
  await startMatch(page);

  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();
  await expect(page.locator('.shared-board > li')).toHaveCount(9);
  await expect(page.locator('.private-hand ol > li')).toHaveCount(2);
  await expect(page.getByText('Current sentence')).toBeVisible();
  await expect(page.getByText('Pride', { exact: true })).toHaveCount(2);
  await expect(page.locator('.player-health-label')).toHaveCount(2);
  await expect(page.locator('.player-health-label').first()).toBeVisible();
  await expect(page.locator('.player-health-label').last()).toBeVisible();
  await expect(page.locator('.timer-fact dd')).toHaveText(/^\d+ seconds$/u);
  expect(
    await page.locator('grand-transition-match').evaluate(
      (
        match: HTMLElement & {
          snapshot?: { timer: { durationSeconds: number } };
        },
      ) => match.snapshot?.timer.durationSeconds,
    ),
  ).toBe(15);
  await expect(
    page.getByRole('navigation', { name: 'Turn actions' }),
  ).toBeVisible();
  await expect(page.locator('[data-turn-state="active"]')).toHaveCount(1);
  await expect(
    page.locator('[data-turn-state="active"] .player-turn-status'),
  ).toHaveText('Your turn');
  await expect(page.locator('.player-turn-status:not([hidden])')).toHaveCount(
    1,
  );
  await expect(page.locator('.private-hand-heading')).not.toContainText(
    'Has the floor',
  );
  await expect(page.locator('.private-hand-heading p')).toHaveText(
    'The Red-Folded Chairman',
  );
  const activePortrait = page.locator(
    '[data-turn-state="active"] .character-portrait',
  );
  expect(
    await activePortrait.evaluate((element) =>
      getComputedStyle(element).animationName.toLowerCase(),
    ),
  ).toContain('claim-floor');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await activePortrait.evaluate((element) =>
      getComputedStyle(element).animationName.toLowerCase(),
    ),
  ).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const playerSeparation = await page.evaluate(() =>
    [...document.querySelectorAll('.match-player')].map((player) => {
      const hud = player.querySelector('.player-hud')!.getBoundingClientRect();
      const portrait = player
        .querySelector('.character-portrait')!
        .getBoundingClientRect();
      const name = player.querySelector('h2')!;
      const nameBox = name.getBoundingClientRect();
      return {
        noOverlap: hud.bottom <= portrait.top + 1,
        singleLineName:
          name.scrollWidth <= name.clientWidth + 1 &&
          nameBox.height <=
            Number.parseFloat(getComputedStyle(name).lineHeight) + 1,
        filter: getComputedStyle(player.querySelector('.character-portrait')!)
          .filter,
        state: player.getAttribute('data-turn-state'),
      };
    }),
  );
  expect(
    playerSeparation.every(({ noOverlap, singleLineName }) =>
      Boolean(noOverlap && singleLineName),
    ),
  ).toBe(true);
  expect(
    playerSeparation.find(({ state }) => state === 'active')?.filter,
  ).not.toBe(playerSeparation.find(({ state }) => state === 'waiting')?.filter);
  expect(await topStatusRegionsDoNotOverlap(page)).toBe(true);

  await expect(
    page.getByRole('heading', { name: 'Common phrases' }),
  ).toBeVisible();
  const commonPhraseGeometry = await page
    .locator('.shared-board > li')
    .evaluateAll((slots) =>
      slots.map((slot) => {
        const box = slot.getBoundingClientRect();
        return { left: box.left, top: box.top, width: box.width };
      }),
    );
  expect(
    new Set(commonPhraseGeometry.map(({ left }) => Math.round(left))).size,
  ).toBe(1);
  expect(commonPhraseGeometry.map(({ top }) => top)).toEqual(
    commonPhraseGeometry.map(({ top }) => top).toSorted((a, b) => a - b),
  );

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
          '.match-turn-heading h1, .match-player h2, .reaction-copy h2, .reaction-copy > p, .card-phrase, .card-weakness',
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
      '.match-facts dt, .player-hud, .player-turn-status, .player-health strong, .reaction-copy p, .sentence-ledger h2, .card-topline, .card-phrase, .card-bottomline, .card-weakness, .private-hand-heading, .common-phrases h2, .action-detail, .match-footer',
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
      '.match-facts dt, .player-hud, .player-turn-status, .player-health strong, .reaction-copy p, .sentence-ledger h2, .card-topline, .card-phrase, .card-bottomline, .card-weakness, .private-hand-heading, .common-phrases h2, .action-detail, .match-footer',
    );
    return Math.min(
      ...Array.from(text, (element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
  });
  expect(mobileTacticalTextFloor).toBeGreaterThanOrEqual(11);
  await expect(page.locator('.sentence-preview')).toBeVisible();
  await expect(page.locator('.sentence-preview')).not.toHaveText('');
  const mobileReactionTextClipping = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.reaction-copy h2, .reaction-copy > p, .shared-board .card-phrase, .shared-board .card-weakness',
      ),
    )
      .filter((node) => {
        const style = getComputedStyle(node);
        const clipsInline = ['clip', 'hidden'].includes(style.overflowX);
        const clipsBlock = ['clip', 'hidden'].includes(style.overflowY);
        return (
          (clipsInline && node.scrollWidth > node.clientWidth + 1) ||
          (clipsBlock && node.scrollHeight > node.clientHeight + 1)
        );
      })
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
  await page.getByRole('heading', { name: /Round 1.*turn/u }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.locator('.private-hand .phrase-card:not(:disabled)').first(),
  ).toBeFocused();
  await page.locator('.sentence-ledger').screenshot({
    path: testInfo.outputPath('match-mobile-sentence.png'),
  });
  await page.screenshot({
    path: testInfo.outputPath('match-mobile-scope-evidence.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1672, height: 941 });
  const portraits = page.locator('.character-portrait');
  await expect(portraits).toHaveCount(2);
  await expect
    .poll(() =>
      portraits.evaluateAll((images: HTMLImageElement[]) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
  expect(
    await page.locator('.match-player h2').evaluateAll((headings) =>
      headings.every((heading) => {
        const box = heading.getBoundingClientRect();
        return (
          heading.scrollWidth <= heading.clientWidth + 1 &&
          box.height <=
            Number.parseFloat(getComputedStyle(heading).lineHeight) + 1
        );
      }),
    ),
  ).toBe(true);
  expect(await topStatusRegionsDoNotOverlap(page)).toBe(true);
  const alphaFacts = await portraitAlphaFacts(portraits);
  expect(
    alphaFacts.every(
      ({ cornerAlpha, opaqueRatio, transparentRatio }) =>
        cornerAlpha.every((alpha) => alpha === 0) &&
        transparentRatio > 0.2 &&
        opaqueRatio > 0.2,
    ),
  ).toBe(true);
  const backgroundScene = page.locator('.broadcast-stage-art');
  await expect(backgroundScene).toBeVisible();
  await expect
    .poll(() =>
      backgroundScene.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
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

test('the selected roster characters load their local portrait assets', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page
    .getByLabel('Player two character')
    .selectOption('black-sea-captain');
  await page.getByRole('button', { name: 'Start match' }).click();

  await expect(
    page.getByRole('heading', { name: 'Black Sea Captain' }),
  ).toBeVisible();
  const portraits = page.locator('.character-portrait');
  await expect(portraits).toHaveCount(2);
  await expect(
    page.locator('img.character-portrait[src*="red-folded-chairman"]'),
  ).toBeVisible();
  await expect(
    page.locator('img.character-portrait[src*="black-sea-captain"]'),
  ).toBeVisible();
  await expect
    .poll(() =>
      portraits.evaluateAll((images: HTMLImageElement[]) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
  expect(
    await page.locator('.match-player h2').evaluateAll((headings) =>
      headings.every((heading) => {
        const box = heading.getBoundingClientRect();
        return (
          heading.scrollWidth <= heading.clientWidth + 1 &&
          box.height <=
            Number.parseFloat(getComputedStyle(heading).lineHeight) + 1
        );
      }),
    ),
  ).toBe(true);
  expect(
    (await portraitAlphaFacts(portraits)).every(
      ({ cornerAlpha, opaqueRatio, transparentRatio }) =>
        cornerAlpha.every((alpha) => alpha === 0) &&
        transparentRatio > 0.2 &&
        opaqueRatio > 0.2,
    ),
  ).toBe(true);
});

test('the match reflows across the remaining viewports and 200 percent text', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.evaluate(async () => document.fonts.ready);
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    const facts = await page.evaluate(() => {
      const players = [
        ...document.querySelectorAll<HTMLElement>('.match-player'),
      ];
      const names = [
        ...document.querySelectorAll<HTMLElement>('.match-player h2'),
      ];
      const commonSlots = [
        ...document.querySelectorAll<HTMLElement>('.shared-board > li'),
      ];
      const text = [
        ...document.querySelectorAll<HTMLElement>(
          '.match-turn-heading h1, .shared-board .card-phrase, .shared-board .card-weakness',
        ),
      ];
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        namesFit: names.every(
          (name) => name.scrollWidth <= name.clientWidth + 1,
        ),
        noHudPortraitOverlap: players.every((player) => {
          const hud = player.querySelector<HTMLElement>('.player-hud')!;
          const portrait = player.querySelector<HTMLElement>(
            '.character-portrait',
          )!;
          return (
            hud.getBoundingClientRect().bottom <=
            portrait.getBoundingClientRect().top + 1
          );
        }),
        commonListIsVertical:
          new Set(
            commonSlots.map((slot) =>
              Math.round(slot.getBoundingClientRect().left),
            ),
          ).size === 1 &&
          commonSlots.every(
            (slot, index) =>
              index === 0 ||
              slot.getBoundingClientRect().top >=
                commonSlots[index - 1]!.getBoundingClientRect().bottom,
          ),
        textClipping: text
          .filter(
            (node) =>
              node.scrollWidth > node.clientWidth + 1 ||
              node.scrollHeight > node.clientHeight + 1,
          )
          .map((node) => node.textContent?.trim()),
      };
    });
    expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth);
    expect(facts.namesFit, `${viewport.width}x${viewport.height}`).toBe(true);
    expect(facts.noHudPortraitOverlap).toBe(true);
    expect(facts.commonListIsVertical).toBe(true);
    expect(facts.textClipping).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const zoomFacts = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.right > document.documentElement.clientWidth + 1;
      })
      .slice(0, 12)
      .map((element) => ({
        className: element.className,
        right: element.getBoundingClientRect().right,
        text: element.textContent?.trim().slice(0, 80),
      })),
    turnVisible: Boolean(
      document
        .querySelector('.player-turn-status:not([hidden])')
        ?.getBoundingClientRect().height,
    ),
    commonPhraseCount: document.querySelectorAll('.shared-board > li').length,
    actionCount: document.querySelectorAll('.match-actions button').length,
    textClipping: [
      ...document.querySelectorAll<HTMLElement>(
        '.match-turn-heading h1, .match-player h2, .player-health-label, .player-turn-status, .sentence-preview, .shared-board .card-phrase, .shared-board .card-weakness, .action-title, .action-detail',
      ),
    ]
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => {
        const style = getComputedStyle(node);
        return {
          className: node.className,
          text: node.textContent?.trim(),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
        };
      }),
  }));
  await page.screenshot({
    path: testInfo.outputPath('match-mobile-200-percent.png'),
    fullPage: true,
  });
  expect(
    zoomFacts.documentWidth,
    JSON.stringify(zoomFacts.offenders),
  ).toBeLessThanOrEqual(zoomFacts.viewportWidth);
  expect(zoomFacts.turnVisible).toBe(true);
  expect(zoomFacts.commonPhraseCount).toBe(9);
  expect(zoomFacts.actionCount).toBe(3);
  expect(zoomFacts.textClipping).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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
    page.getByRole('heading', { name: /Thunder Tribune's turn/u }),
  ).toBeVisible();
  await expect(
    page.locator('[data-turn-state="active"] .player-turn-status'),
  ).toHaveText('Your turn');
  const incomingPortrait = page.locator(
    '[data-turn-state="active"] .character-portrait',
  );
  expect(
    await incomingPortrait.evaluate(
      (portrait) => getComputedStyle(portrait).animationName,
    ),
  ).toBe('claim-floor-blue');
  expect(
    await incomingPortrait.evaluate(
      (portrait) => getComputedStyle(portrait).animationDuration,
    ),
  ).toBe('0.36s');

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
  await expect(
    page.getByRole('heading', { name: /Round 2.*turn/u }),
  ).toBeVisible();
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
    name: /Thunder Tribune's turn/u,
  });
  await expect(opponentHeading).toBeVisible();
  await opponentHeading.focus();
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('heading', { name: 'Round 1 resolution' }),
  ).toBeVisible();
  await expect(page.getByText(/Continuation survived/u).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue to round 2' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 2.*turn/u }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.locator('.card-shortcut:not([hidden])').first(),
  ).toBeVisible();
});

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeFocused();
}

async function portraitAlphaFacts(portraits: Locator): Promise<
  readonly Readonly<{
    cornerAlpha: readonly number[];
    opaqueRatio: number;
    transparentRatio: number;
  }>[]
> {
  return portraits.evaluateAll((images: HTMLImageElement[]) =>
    images.map((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let opaquePixels = 0;
      let transparentPixels = 0;
      for (let alphaIndex = 3; alphaIndex < pixels.length; alphaIndex += 4) {
        if (pixels[alphaIndex] === 0) transparentPixels += 1;
        if (pixels[alphaIndex] === 255) opaquePixels += 1;
      }
      const pixelCount = canvas.width * canvas.height;
      return {
        cornerAlpha: [
          context.getImageData(0, 0, 1, 1).data[3],
          context.getImageData(canvas.width - 1, 0, 1, 1).data[3],
          context.getImageData(0, canvas.height - 1, 1, 1).data[3],
          context.getImageData(canvas.width - 1, canvas.height - 1, 1, 1)
            .data[3],
        ],
        opaqueRatio: opaquePixels / pixelCount,
        transparentRatio: transparentPixels / pixelCount,
      };
    }),
  );
}

async function topStatusRegionsDoNotOverlap(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const center = document
      .querySelector('.match-status-rail')!
      .getBoundingClientRect();
    return [...document.querySelectorAll('.player-hud')].every((hud) => {
      const box = hud.getBoundingClientRect();
      return box.right <= center.left || box.left >= center.right;
    });
  });
}
