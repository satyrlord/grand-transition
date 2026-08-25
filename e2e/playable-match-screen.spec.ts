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

  await page.screenshot({
    path: testInfo.outputPath('match-desktop-1280x720.png'),
    fullPage: true,
  });

  await expect(page.getByRole('button', { name: 'Comeback' })).toBeDisabled();

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

test('the match fits the supported landscape matrix', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.evaluate(async () => document.fonts.ready);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const facts = await page.evaluate(() => {
      const required = [
        ...document.querySelectorAll<HTMLElement>(
          '.match-status-rail, .match-player, .sentence-ledger, .shared-board > li, .private-hand ol > li, .match-actions button, .match-pause',
        ),
      ];
      const text = [
        ...document.querySelectorAll<HTMLElement>(
          '.match-turn-heading h1, .match-player h2, .shared-board .card-phrase, .shared-board .card-weakness',
        ),
      ];
      return {
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        requiredInside: required.every((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= 0 &&
            box.top >= 0 &&
            box.right <= window.innerWidth &&
            box.bottom <= window.innerHeight
          );
        }),
        textClipping: text
          .filter(
            (node) =>
              node.scrollWidth > node.clientWidth + 1 ||
              node.scrollHeight > node.clientHeight + 1,
          )
          .map((node) => node.textContent?.trim()),
      };
    });
    expect(facts.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(facts.documentHeight).toBeLessThanOrEqual(viewport.height);
    expect(facts.requiredInside, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(facts.textClipping).toEqual([]);
  }

  await page.screenshot({
    path: testInfo.outputPath('match-recommended-1920x1080.png'),
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
    '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
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

test('manual and viewport pauses conceal the match and preserve the timer', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.waitForTimeout(1_100);
  const timerBeforePause = Number(
    await page.locator('.timer-fact').getAttribute('data-timer'),
  );

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('[data-interruption="paused"]')).toBeVisible();
  await expect(page.locator('.match-screen')).toHaveCount(0);
  await expect(page.locator('.phrase-card')).toHaveCount(0);
  await expect(page.locator('[data-timer]')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('manual-pause-1280x720.png'),
    fullPage: true,
  });

  await page.waitForTimeout(1_100);
  await page.setViewportSize({ width: 1023, height: 720 });
  await expect(
    page.locator('[data-interruption="unsupported-viewport"]'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('unsupported-viewport-1023x720.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1024, height: 720 });
  await expect(page.locator('[data-interruption="paused"]')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.match-screen')).toBeVisible();
  const timerAfterManualPause = Number(
    await page.locator('.timer-fact').getAttribute('data-timer'),
  );
  expect(timerAfterManualPause).toBeLessThanOrEqual(timerBeforePause);
  expect(timerAfterManualPause).toBeGreaterThanOrEqual(timerBeforePause - 1);

  const timerBeforeViewportPause = timerAfterManualPause;
  await page.setViewportSize({ width: 1023, height: 720 });
  await expect(
    page.locator('[data-interruption="unsupported-viewport"]'),
  ).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.setViewportSize({ width: 1024, height: 720 });
  await expect(page.locator('.match-screen')).toBeVisible();
  const timerAfterViewportPause = Number(
    await page.locator('.timer-fact').getAttribute('data-timer'),
  );
  expect(timerAfterViewportPause).toBeLessThanOrEqual(timerBeforeViewportPause);
  expect(timerAfterViewportPause).toBeGreaterThanOrEqual(
    timerBeforeViewportPause - 1,
  );
});

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();
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
