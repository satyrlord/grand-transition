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
  await expect(page.locator('#sentence-title')).toHaveCount(1);
  await expect(page.locator('.sentence-preview')).toBeVisible();
  await expect(page.getByText('Pride', { exact: true })).toHaveCount(2);
  await expect(page.locator('.player-health-label')).toHaveCount(2);
  await expect(page.locator('.player-health-label').first()).toBeVisible();
  await expect(page.locator('.player-health-label').last()).toBeVisible();
  await expect(page.locator('.timer-fact dd')).toHaveText(/^\d+$/u);
  await expect(page.locator('.timer-fact dd')).toHaveAttribute(
    'aria-label',
    /^\d+ seconds$/u,
  );
  expect(
    await page.locator('grand-transition-match').evaluate(
      (
        match: HTMLElement & {
          snapshot?: { timer: { durationSeconds: number } };
        },
      ) => match.snapshot?.timer.durationSeconds,
    ),
  ).toBe(30);
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
  await expect(page.locator('.private-hand')).toHaveAttribute(
    'data-side',
    'red',
  );
  await expect(page.locator('.sentence-ledger')).toHaveAttribute(
    'data-speaker-side',
    'red',
  );
  await expect(page.locator('.player-sentence--waiting')).toHaveCount(1);
  await expect(page.locator('.player-sentence--waiting')).toContainText('…');
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
  expect(
    await page
      .locator('[data-turn-state="waiting"] .character-portrait')
      .evaluate((portrait) => getComputedStyle(portrait).opacity),
  ).toBe('1');
  expect(await centeredHeaderControls(page)).toBe(true);
  expect(await topStatusRegionsDoNotOverlap(page)).toBe(true);

  await expect(
    page.getByRole('heading', { name: 'Common phrases' }),
  ).toHaveCount(1);
  await expect(page.locator('.card-role')).toHaveCount(0);
  await expect(page.locator('.card-bottomline')).toHaveCount(0);
  await expect(page.locator('.card-weakness')).toHaveCount(0);
  const visibleCardText = await page
    .locator('.shared-board button.phrase-card')
    .evaluateAll((buttons) =>
      buttons.every(
        (button) =>
          button.textContent?.trim() ===
          button.querySelector('.card-phrase')?.textContent?.trim(),
      ),
    );
  expect(visibleCardText).toBe(true);
  expect(
    await page
      .locator('.shared-board button.phrase-card')
      .evaluateAll((buttons) =>
        buttons.some((button) => button.ariaLabel?.includes('Shared')),
      ),
  ).toBe(true);
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
        '.match-status-rail, .match-player, .round-review-dialog, .sentence-ledger, .shared-board > li, .private-hand ol > li, .match-actions button',
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
          '.match-turn-heading h1, .match-player h2, .round-review-dialog h2, .card-phrase, .sentence-preview',
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
    .locator('.action-reshuffle .action-icon')
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
  expect(actionIconFacts).toHaveLength(1);
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
      '.match-turn-heading h1, .player-health-label, .player-turn-status, .player-health strong, .sentence-preview, .card-phrase, .action-title',
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
      ({
        bottomRowOpaqueRatio,
        chromaKeyGreenRatio,
        cornerAlpha,
        lowerThirdOpaqueRatio,
        opaqueRatio,
        transparentRatio,
      }) =>
        cornerAlpha.every((alpha) => alpha === 0) &&
        bottomRowOpaqueRatio < 0.02 &&
        chromaKeyGreenRatio === 0 &&
        lowerThirdOpaqueRatio > 0.02 &&
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
  const [backgroundPixels] = await portraitAlphaFacts(backgroundScene);
  expect(backgroundPixels?.chromaKeyGreenRatio).toBe(0);
  const foregroundScene = page.locator('.broadcast-stage-foreground');
  await expect(foregroundScene).toBeVisible();
  await expect(foregroundScene).toHaveAttribute(
    'data-scene-asset',
    'transition-era-television-studio-desks',
  );
  await expect
    .poll(() =>
      foregroundScene.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const [foregroundAlpha] = await portraitAlphaFacts(foregroundScene);
  expect(
    foregroundAlpha?.cornerAlpha.every((alpha) => alpha === 0) &&
      foregroundAlpha.transparentRatio > 0.7 &&
      foregroundAlpha.opaqueRatio > 0.15,
  ).toBe(true);
  const sceneStack = await page.evaluate(() => ({
    background: Number(
      getComputedStyle(document.querySelector('.broadcast-stage-art')!).zIndex,
    ),
    portrait: Number(
      getComputedStyle(document.querySelector('.character-portrait')!).zIndex,
    ),
    foreground: Number(
      getComputedStyle(document.querySelector('.broadcast-stage-foreground')!)
        .zIndex,
    ),
    playerHud: Number(
      getComputedStyle(document.querySelector('.player-hud')!).zIndex,
    ),
  }));
  expect(sceneStack.background).toBeLessThan(sceneStack.portrait);
  expect(sceneStack.portrait).toBeLessThan(sceneStack.foreground);
  expect(sceneStack.foreground).toBeLessThan(sceneStack.playerHud);
  expect(
    await foregroundScene.evaluate(
      (image) => image.getBoundingClientRect().bottom > window.innerHeight,
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

test('the match prevents accidental browser text selection', async ({
  page,
}) => {
  await startMatch(page);
  await expect(page.locator('body')).toHaveCSS('user-select', 'none');
  await expect(page.locator('.match-screen')).toHaveCSS('user-select', 'none');
  await page.keyboard.press('Control+A');
  expect(
    await page.evaluate(() => window.getSelection()?.toString() ?? ''),
  ).toBe('');
});

test('the next round clears an incomplete public sentence', async ({
  page,
}) => {
  await startMatch(page);
  await page
    .locator('[data-role="noun"] button[data-card-state="legal"]')
    .first()
    .click();
  const bubble = page.locator('.player-sentence--waiting');
  await bubble.hover();
  const priorPublicSentence = (
    await bubble.locator('.waiting-sentence-content').textContent()
  )?.trim();
  expect(priorPublicSentence).toBeTruthy();

  await page.getByRole('button', { name: 'End', exact: true }).click();
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Round 2.*turn/u }),
  ).toBeVisible();
  await expect(page.locator('.sentence-preview')).toHaveText(
    'Select a noun to begin.',
  );

  const nextRoundBubble = page.locator('.player-sentence--waiting');
  await nextRoundBubble.hover();
  await expect(nextRoundBubble).toHaveAttribute('data-revealed', 'true');
  await expect(nextRoundBubble.locator('.waiting-sentence-content')).toHaveText(
    'No sentence yet.',
  );
  await expect(
    nextRoundBubble.locator('.waiting-sentence-content'),
  ).not.toHaveText(priorPublicSentence!);
});

test('the gray waiting bubble always reveals and fits its complete sentence', async ({
  page,
}) => {
  await startMatch(page);
  const sentence =
    'Your reform calendar transports voters with busses from the government podium and embarrasses this televised debate. And I have the dossiers to prove it!';
  await setWaitingSentence(page, sentence);

  const bubble = page.locator('.player-sentence--waiting');
  const content = bubble.locator('.waiting-sentence-content');
  const ellipsis = bubble.locator('.waiting-sentence-ellipsis');

  await expect(bubble).toHaveAttribute('data-has-content', 'true');
  await expect(content).toBeHidden();
  await expect(ellipsis).toBeVisible();

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator('.sentence-preview').hover();
    const compactBox = await bubble.boundingBox();

    await bubble.hover();
    await expect(bubble).toHaveAttribute('data-revealed', 'true');
    await expect(bubble).toHaveAttribute('aria-expanded', 'true');
    await expect(content).toBeVisible();
    await expect(content).toHaveText(sentence);
    await expect(ellipsis).toBeHidden();
    const expandedBox = await bubble.boundingBox();
    expect(expandedBox!.width).toBeGreaterThan(compactBox!.width);
    const geometry = await bubble.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const sentenceContent = element.querySelector<HTMLElement>(
        '.waiting-sentence-content',
      )!;
      return {
        bottom: box.bottom,
        contentHeight: sentenceContent.clientHeight,
        contentScrollHeight: sentenceContent.scrollHeight,
        contentScrollWidth: sentenceContent.scrollWidth,
        contentWidth: sentenceContent.clientWidth,
        clipPath: getComputedStyle(element).clipPath,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
    expect(geometry.contentScrollWidth).toBeLessThanOrEqual(
      geometry.contentWidth + 1,
    );
    expect(geometry.contentScrollHeight).toBeLessThanOrEqual(
      geometry.contentHeight + 1,
    );
    expect(geometry.clipPath).toBe('none');

    await page.locator('.sentence-preview').hover();
    await expect(content).toBeHidden();
    await expect(ellipsis).toBeVisible();
  }

  await bubble.click();
  await expect(bubble).toHaveAttribute('data-revealed', 'true');
  await expect(bubble).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toBeVisible();
  await bubble.click();
  await expect(bubble).toHaveAttribute('data-revealed', 'true');
  await expect(bubble).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toBeVisible();
  await page.locator('.sentence-preview').click();
  await expect(bubble).toHaveAttribute('data-revealed', 'false');
  await expect(bubble).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toBeHidden();

  await page.locator('.match-pause').focus();
  await page.keyboard.press('Tab');
  await expect(bubble).toBeFocused();
  await expect(content).toBeVisible();
  await expect(ellipsis).toBeHidden();
});

test('the reported long bubble works on both sides at the reported viewport', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await selectSetupCharacter(page, 'one', 'black-sea-captain');
  await selectSetupCharacter(page, 'two', 'thunder-tribune');
  await page.getByLabel('Scene').selectOption('modern-debate-studio');
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();
  await page.setViewportSize({ width: 2014, height: 921 });
  const sentence =
    'Your reform calendar transports voters with busses from the government podium and embarrasses this televised debate. And I have the dossiers to prove it!';

  for (const waitingSide of ['red', 'blue'] as const) {
    await setWaitingSentence(page, sentence, waitingSide);
    const bubble = page.locator('.player-sentence--waiting');
    const content = bubble.locator('.waiting-sentence-content');
    await page.mouse.move(1007, 460);
    const compactBox = await bubble.boundingBox();

    await bubble.hover();
    await expect(bubble).toHaveAttribute('data-revealed', 'true');
    await expect(content).toBeVisible();
    await expect(content).toHaveText(sentence);
    if (waitingSide === 'red') {
      await page.waitForTimeout(1_100);
      await expect(bubble).toHaveAttribute('data-revealed', 'true');
      await expect(content).toBeVisible();
      await expect(content).toHaveText(sentence);
      await page.locator('grand-transition-match').evaluate(async (element) => {
        const match = element as HTMLElement & {
          snapshot: { revision: number };
          updateComplete: Promise<boolean>;
        };
        match.snapshot = {
          ...match.snapshot,
          revision: match.snapshot.revision + 1,
        };
        await match.updateComplete;
      });
      await expect(bubble).toHaveAttribute('data-revealed', 'true');
      await expect(content).toBeVisible();
      await expect(content).toHaveText(sentence);
    }
    const geometry = await bubble.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const contentBox = element
        .querySelector<HTMLElement>('.waiting-sentence-content')!
        .getBoundingClientRect();
      return {
        bubble: {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
        },
        clipPath: getComputedStyle(element).clipPath,
        content: {
          bottom: contentBox.bottom,
          left: contentBox.left,
          right: contentBox.right,
          top: contentBox.top,
        },
      };
    });
    const expandedBox = await bubble.boundingBox();
    expect(expandedBox!.width).toBeGreaterThan(compactBox!.width);
    expect(expandedBox!.height).toBeGreaterThan(compactBox!.height);
    expect(geometry.clipPath).toBe('none');
    expect(geometry.content.left).toBeGreaterThanOrEqual(geometry.bubble.left);
    expect(geometry.content.top).toBeGreaterThanOrEqual(geometry.bubble.top);
    expect(geometry.content.right).toBeLessThanOrEqual(geometry.bubble.right);
    expect(geometry.content.bottom).toBeLessThanOrEqual(geometry.bubble.bottom);
    await page.screenshot({
      path: testInfo.outputPath(`waiting-bubble-${waitingSide}-2014x921.png`),
      fullPage: true,
    });
  }
});

test.describe('touch waiting-bubble disclosure', () => {
  test.use({ hasTouch: true });

  test('every tap reveals the complete waiting sentence', async ({ page }) => {
    await startMatch(page);
    const sentence =
      'Your reform calendar transports voters with busses from the government podium and embarrasses this televised debate. And I have the dossiers to prove it!';
    await setWaitingSentence(page, sentence);

    const bubble = page.locator('.player-sentence--waiting');
    const content = bubble.locator('.waiting-sentence-content');
    await bubble.tap();
    await expect(bubble).toHaveAttribute('data-revealed', 'true');
    await expect(content).toBeVisible();
    await expect(content).toHaveText(sentence);

    await bubble.tap();
    await expect(bubble).toHaveAttribute('data-revealed', 'true');
    await expect(content).toBeVisible();
    await expect(content).toHaveText(sentence);

    await page.locator('.sentence-preview').tap();
    await expect(bubble).toHaveAttribute('data-revealed', 'false');
    await expect(content).toBeHidden();
  });
});

test('the selected roster characters load their local portrait assets', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await selectSetupCharacter(page, 'two', 'black-sea-captain');
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
      ({
        bottomRowOpaqueRatio,
        chromaKeyGreenRatio,
        cornerAlpha,
        lowerThirdOpaqueRatio,
        opaqueRatio,
        transparentRatio,
      }) =>
        cornerAlpha.every((alpha) => alpha === 0) &&
        bottomRowOpaqueRatio < 0.02 &&
        chromaKeyGreenRatio === 0 &&
        lowerThirdOpaqueRatio > 0.02 &&
        transparentRatio > 0.2 &&
        opaqueRatio > 0.2,
    ),
  ).toBe(true);
});

test('the selected modern debate studio loads both local scene layers', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByLabel('Scene').selectOption('modern-debate-studio');
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();

  const background = page.locator(
    '.broadcast-stage-art[data-scene-asset="modern-debate-studio"]',
  );
  const foreground = page.locator(
    '.broadcast-stage-foreground[data-scene-asset="modern-debate-studio-desks"]',
  );
  await expect(background).toBeVisible();
  await expect(foreground).toBeVisible();
  await expect
    .poll(() =>
      background.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === 1672 &&
          image.naturalHeight === 941,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      foreground.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === 1672 &&
          image.naturalHeight === 941,
      ),
    )
    .toBe(true);

  const [foregroundAlpha] = await portraitAlphaFacts(foreground);
  expect(foregroundAlpha?.cornerAlpha.every((alpha) => alpha === 0)).toBe(true);
  expect(foregroundAlpha?.chromaKeyGreenRatio).toBe(0);
  expect(foregroundAlpha?.transparentRatio).toBeGreaterThan(0.7);
  expect(foregroundAlpha?.opaqueRatio).toBeGreaterThan(0.05);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const backgroundBox = document
        .querySelector('.broadcast-stage-art')!
        .getBoundingClientRect();
      const foregroundBox = document
        .querySelector('.broadcast-stage-foreground')!
        .getBoundingClientRect();
      return {
        documentFits:
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
        backgroundCovers:
          backgroundBox.left <= 0 &&
          backgroundBox.top <= 0 &&
          backgroundBox.right >= innerWidth &&
          backgroundBox.bottom >= innerHeight,
        foregroundExtendsBelowStage: foregroundBox.bottom > innerHeight,
      };
    });
    expect(geometry, `${viewport.width}x${viewport.height}`).toEqual({
      documentFits: true,
      backgroundCovers: true,
      foregroundExtendsBelowStage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(
        `modern-debate-studio-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
});

test('keeps portraits in a stable standing-desk scale', async ({ page }) => {
  await startMatch(page);
  const portraits = page.locator('.character-portrait');
  await expect(portraits).toHaveCount(2);
  await expect
    .poll(() =>
      portraits.evaluateAll((images: HTMLImageElement[]) =>
        images.every(
          (image) =>
            image.complete &&
            image.naturalWidth === 1024 &&
            image.naturalHeight === 1536,
        ),
      ),
    )
    .toBe(true);
  const portraitPixelFacts = await portraitAlphaFacts(portraits);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const composition = await page.evaluate(() => {
      const stage = document
        .querySelector('.broadcast-stage')!
        .getBoundingClientRect();
      const sentence = document
        .querySelector('.sentence-ledger')!
        .getBoundingClientRect();
      const sentenceTail = getComputedStyle(
        document.querySelector('.sentence-ledger')!,
        '::after',
      );
      const sentenceBubbleBottom =
        sentence.bottom - Number.parseFloat(sentenceTail.bottom);
      return [...document.querySelectorAll('.match-player')].map((player) => {
        const frame = player
          .querySelector('.character-frame')!
          .getBoundingClientRect();
        const portraitImage = player.querySelector<HTMLImageElement>(
          '.character-portrait',
        )!;
        const portrait = portraitImage.getBoundingClientRect();
        const hud = player
          .querySelector('.player-hud')!
          .getBoundingClientRect();
        return {
          portraitTopRatio: (portrait.top - frame.top) / frame.height,
          portraitHeightRatio: portrait.height / frame.height,
          portraitTop: portrait.top,
          portraitHeight: portrait.height,
          renderedWidthRatio:
            (portrait.height *
              (portraitImage.naturalWidth / portraitImage.naturalHeight)) /
            frame.height,
          portraitBottomRatio: portrait.bottom / stage.height,
          naturalWidth: portraitImage.naturalWidth,
          naturalHeight: portraitImage.naturalHeight,
          sentenceBubbleBottom,
          clearsHud: portrait.top > hud.bottom,
        };
      });
    });

    expect(
      composition.every(
        (
          {
            portraitTopRatio,
            portraitHeightRatio,
            portraitTop,
            portraitHeight,
            renderedWidthRatio,
            portraitBottomRatio,
            naturalWidth,
            naturalHeight,
            sentenceBubbleBottom,
            clearsHud,
          },
          index,
        ) =>
          Math.abs(portraitTopRatio - 0.3) < 0.01 &&
          Math.abs(portraitHeightRatio - 0.84) < 0.01 &&
          Math.abs(renderedWidthRatio - 0.56) < 0.01 &&
          portraitBottomRatio > 1.1 &&
          portraitBottomRatio < 1.15 &&
          naturalWidth === 1024 &&
          naturalHeight === 1536 &&
          portraitTop +
            portraitHeight * portraitPixelFacts[index]!.topOpaqueRatio >=
            sentenceBubbleBottom &&
          clearsHud,
      ),
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
  }
});

test('keeps the Thunder Tribune tall in the full-body portrait plane', async ({
  page,
}) => {
  await startMatch(page);
  const portrait = page.locator(
    'img.character-portrait[src*="thunder-tribune"]',
  );
  await expect
    .poll(() =>
      portrait.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === 1024 &&
          image.naturalHeight === 1536,
      ),
    )
    .toBe(true);

  const silhouette = await portrait.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minimumX = canvas.width;
    let maximumX = -1;
    let minimumY = canvas.height;
    let maximumY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
        minimumX = Math.min(minimumX, x);
        maximumX = Math.max(maximumX, x);
        minimumY = Math.min(minimumY, y);
        maximumY = Math.max(maximumY, y);
      }
    }
    return {
      heightRatio: (maximumY - minimumY + 1) / canvas.height,
      maximumY,
      minimumX,
      minimumY,
      widthRatio: (maximumX - minimumX + 1) / canvas.width,
    };
  });

  expect(silhouette).toMatchObject({
    heightRatio: expect.any(Number),
    maximumY: expect.any(Number),
    minimumX: expect.any(Number),
    minimumY: expect.any(Number),
    widthRatio: expect.any(Number),
  });
  expect(silhouette.heightRatio).toBeGreaterThanOrEqual(0.95);
  expect(silhouette.heightRatio).toBeLessThanOrEqual(0.98);
  expect(silhouette.minimumY).toBeGreaterThanOrEqual(16);
  expect(silhouette.minimumY).toBeLessThanOrEqual(64);
  expect(silhouette.maximumY).toBeGreaterThanOrEqual(1490);
  expect(silhouette.maximumY).toBeLessThanOrEqual(1515);
  expect(silhouette.minimumX).toBeGreaterThanOrEqual(96);
  expect(silhouette.widthRatio).toBeGreaterThanOrEqual(0.7);
});

test('keeps the physical moderator face clear of drafting UI', async ({
  page,
}) => {
  await startMatch(page);
  const background = page.locator('.broadcast-stage-art');
  await expect
    .poll(() =>
      background.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === 1672 &&
          image.naturalHeight === 941,
      ),
    )
    .toBe(true);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const faceClear = await page.evaluate(() => {
      const background = document.querySelector<HTMLImageElement>(
        '.broadcast-stage-art',
      )!;
      const backgroundBox = background.getBoundingClientRect();
      const scale = Math.max(
        backgroundBox.width / background.naturalWidth,
        backgroundBox.height / background.naturalHeight,
      );
      const drawnWidth = background.naturalWidth * scale;
      const drawnHeight = background.naturalHeight * scale;
      const drawnLeft =
        backgroundBox.left + (backgroundBox.width - drawnWidth) / 2;
      const drawnTop =
        backgroundBox.top + (backgroundBox.height - drawnHeight) / 2;
      const moderatorFace = {
        left: drawnLeft + drawnWidth * 0.342,
        right: drawnLeft + drawnWidth * 0.365,
        top: drawnTop + drawnHeight * 0.39,
        bottom: drawnTop + drawnHeight * 0.45,
      };
      type RectEdges = Readonly<{
        left: number;
        right: number;
        top: number;
        bottom: number;
      }>;
      const overlaps = (first: RectEdges, second: RectEdges) =>
        first.left! < second.right &&
        first.right! > second.left &&
        first.top! < second.bottom &&
        first.bottom! > second.top;
      const draftingRegions = [
        ...document.querySelectorAll(
          '.match-status-rail, .player-hud, .sentence-ledger, .common-phrases, .player-sentence--waiting',
        ),
      ].map((element) => element.getBoundingClientRect());
      return {
        backgroundDimensions:
          background.naturalWidth === 1672 && background.naturalHeight === 941,
        clear: !draftingRegions.some((region) =>
          overlaps(moderatorFace, region),
        ),
      };
    });

    expect(faceClear.backgroundDimensions).toBe(true);
    expect(faceClear.clear, `${viewport.width}x${viewport.height}`).toBe(true);
  }
});

test('the match fits the supported landscape matrix', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.evaluate(async () => document.fonts.ready);

  const fontEvidence = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 24px "Poiret One"', 'THUNDER'),
      document.fonts.load(
        '900 24px "Nunito Variable"',
        'ȘȚĂÎÂ ÎNTR-O COALIȚIE',
      ),
      document.fonts.load(
        '700 16px "Rubik Variable"',
        'o ordonanță de urgență',
      ),
      document.fonts.load('400 24px "Share Tech Mono"', '00:30'),
    ]);
    return {
      feature: getComputedStyle(document.querySelector('.match-player h2')!)
        .fontFamily,
      speech: getComputedStyle(document.querySelector('.sentence-preview')!)
        .fontFamily,
      phrase: getComputedStyle(document.querySelector('.card-phrase')!)
        .fontFamily,
      timer: getComputedStyle(document.querySelector('.timer-fact dd')!)
        .fontFamily,
      loaded: {
        feature: document.fonts.check('400 24px "Poiret One"', 'THUNDER'),
        speech: document.fonts.check(
          '900 24px "Nunito Variable"',
          'ȘȚĂÎÂ ÎNTR-O COALIȚIE',
        ),
        phrase: document.fonts.check(
          '700 16px "Rubik Variable"',
          'o ordonanță de urgență',
        ),
        timer: document.fonts.check('400 24px "Share Tech Mono"', '00:30'),
      },
    };
  });
  expect(fontEvidence.feature).toContain('Poiret One');
  expect(fontEvidence.speech).toContain('Nunito Variable');
  expect(fontEvidence.phrase).toContain('Rubik Variable');
  expect(fontEvidence.timer).toContain('Share Tech Mono');
  expect(Object.values(fontEvidence.loaded).every(Boolean)).toBe(true);

  const longSentence = [
    'A NATIONAL-SALVATION COMMITTEE REPACKAGES AN INFRASTRUCTURE FEASIBILITY STUDY',
    'DURING THE NIGHT, AS THIEVES, BEFORE THE MICROPHONES COOL',
    'AND A COUNTY-COUNCIL MAJORITY COORDINATES A PUBLIC-PROCUREMENT FILE',
    'THROUGH ANOTHER REFORM CYCLE, PENDING FURTHER CONSULTATION',
  ].join(', ');
  await page.mouse.move(0, 0);
  await page
    .locator('grand-transition-match')
    .evaluate(async (element, sentence) => {
      const match = element as HTMLElement & {
        snapshot: Readonly<Record<string, unknown>> & { revision: number };
        updateComplete: Promise<boolean>;
      };
      match.snapshot = {
        ...match.snapshot,
        revision: match.snapshot.revision + 1,
        sentenceText: sentence,
      };
      await match.updateComplete;
    }, longSentence);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.mouse.move(0, 0);
    const facts = await page.evaluate(() => {
      const required = [
        ...document.querySelectorAll<HTMLElement>(
          '.match-status-rail, .match-player, .sentence-ledger, .shared-board > li, .private-hand ol > li, .match-actions button, .match-pause',
        ),
      ];
      const text = [
        ...document.querySelectorAll<HTMLElement>(
          '.match-turn-heading h1, .match-player h2, .shared-board .card-phrase, .sentence-preview',
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
          .map((node) => ({
            text: node.textContent?.trim(),
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
            clientHeight: node.clientHeight,
            scrollHeight: node.scrollHeight,
          })),
        sentence: (() => {
          const node =
            document.querySelector<HTMLElement>('.sentence-preview')!;
          return {
            text: node.textContent?.trim(),
            density: node.dataset.density,
            textOverflow: getComputedStyle(node).textOverflow,
          };
        })(),
      };
    });
    expect(facts.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(facts.documentHeight).toBeLessThanOrEqual(viewport.height);
    expect(facts.requiredInside, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(facts.textClipping, `${viewport.width}x${viewport.height}`).toEqual(
      [],
    );
    expect(facts.sentence.text).toBe(longSentence);
    expect(facts.sentence.density).toBe('dense');
    expect(facts.sentence.textOverflow).not.toBe('ellipsis');
    expect(await actionRailsUseBoardMargins(page)).toBe(true);
    expect(await centeredHeaderControls(page)).toBe(true);
    expect(
      await page
        .locator('[data-turn-state="waiting"] .character-portrait')
        .evaluate((portrait) => getComputedStyle(portrait).opacity),
    ).toBe('1');
    await page.screenshot({
      path: testInfo.outputPath(
        `match-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
});

test('pointer play completes redraw, an immediate grammar mistake, and the other hotseat side', async ({
  page,
}, testInfo) => {
  await startMatch(page);

  const redraw = page.getByRole('button', {
    name: 'Reshuffle private phrases',
  });
  await redraw.click();
  await expect(
    page.getByRole('button', { name: 'Reshuffle used' }),
  ).toBeDisabled();

  const wrongPredicate = page.locator(
    '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
  );
  await expect(wrongPredicate).toBeVisible();
  await wrongPredicate.click();
  const grammarStrike = page.locator('.grammar-strike');
  await expect(grammarStrike).toBeVisible();
  await expect(grammarStrike).toContainText('Off script');
  await expect(grammarStrike).toContainText('Grammar mistake');
  await expect(grammarStrike).toContainText('Red-Folded Chairman');
  await expect(grammarStrike).toContainText('−3 Pride');
  await expect(
    page.locator('[data-reaction-state="grammar-mistake"]'),
  ).toHaveAttribute('data-side', 'red');
  expect(
    await page
      .locator('[data-reaction-state="grammar-mistake"] .character-portrait')
      .evaluate((portrait) => getComputedStyle(portrait).animationName),
  ).toBe('grammar-hit-red');
  expect(
    await grammarStrike.evaluate(
      (element) => getComputedStyle(element).animationDuration,
    ),
  ).toBe('0.52s');
  expect(
    await page
      .locator('.broadcast-stage')
      .evaluate((stage) => getComputedStyle(stage, '::before').animationName),
  ).toBe('grammar-arena-flash');
  await page.waitForTimeout(550);
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
  await expect(page.locator('.private-hand')).toHaveAttribute(
    'data-side',
    'blue',
  );
  await expect(page.locator('.sentence-ledger')).toHaveAttribute(
    'data-speaker-side',
    'blue',
  );
  await expect(page.locator('.player-sentence--waiting')).toHaveCount(1);

  for (let turn = 0; turn < 8; turn += 1) {
    if (
      await page
        .getByRole('button', { name: 'Continue', exact: true })
        .isVisible()
        .catch(() => false)
    )
      break;
    const end = page.getByRole('button', { name: 'End', exact: true });
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

  await expect(page.locator('grand-transition-resolution-results')).toHaveCount(
    0,
  );
  await expect(page.locator('.round-review-dialog')).toBeVisible();
  await page.locator('grand-transition-match').evaluate(async (element) => {
    const match = element as HTMLElement & {
      snapshot: {
        revision: number;
        sentenceText: string;
        sentenceComplete: boolean;
        players: readonly { playerId: string }[];
        reaction: {
          round: number | null;
          outcomeLabel: string;
          players: Record<
            string,
            {
              damage: number;
              comboFactor: number;
              comboBonusDamage: number;
              weaknesses: readonly string[];
            }
          >;
        };
      };
      updateComplete: Promise<boolean>;
    };
    const firstId = match.snapshot.players[0]!.playerId;
    match.snapshot = {
      ...match.snapshot,
      revision: match.snapshot.revision + 1,
      sentenceText:
        'Your party belongs in a party museum, and your voters change the channel.',
      sentenceComplete: true,
      reaction: {
        ...match.snapshot.reaction,
        players: {
          ...match.snapshot.reaction.players,
          [firstId]: {
            ...match.snapshot.reaction.players[firstId]!,
            weaknesses: ['evidence', 'credibility', 'restraint'],
          },
        },
      },
    };
    await match.updateComplete;
  });
  await expect(page.locator('[data-round-result="1"]')).toBeVisible();
  await expect(page.locator('.reaction-outcome')).toContainText(
    /Round 1 (winner:|result: tie)/u,
  );
  await expect(page.locator('.reaction-scores > div')).toHaveCount(2);
  await expect(page.locator('.reaction-scores dd > strong')).toHaveCount(2);
  const reviewSymmetry = await page
    .locator('.round-review-dialog')
    .evaluate((record) => {
      const dialog = record.getBoundingClientRect();
      const cards = Array.from(
        record.querySelectorAll<HTMLElement>('.reaction-scores > div'),
      ).map((card) => card.getBoundingClientRect());
      const heading = record
        .querySelector('.round-review-heading')!
        .getBoundingClientRect();
      const scores = record
        .querySelector('.reaction-scores')!
        .getBoundingClientRect();
      return {
        centered:
          Math.abs(
            dialog.left +
              dialog.width / 2 -
              document.documentElement.clientWidth / 2,
          ) <= 1,
        equalCards:
          cards.length === 2 &&
          Math.abs(cards[0]!.width - cards[1]!.width) <= 1 &&
          Math.abs(cards[0]!.height - cards[1]!.height) <= 1,
        sharedWidth: Math.abs(heading.width - scores.width) <= 1,
      };
    });
  expect(reviewSymmetry).toEqual({
    centered: true,
    equalCards: true,
    sharedWidth: true,
  });
  await expect(page.locator('.weakness-hit')).toContainText('Weakness hit');
  await expect(page.locator('.weakness-hit')).toContainText('Evidence');
  await expect(page.locator('.weakness-hit')).toContainText('Credibility');
  await expect(page.locator('.weakness-hit')).toContainText('Restraint');
  const weaknessGeometry = await page
    .locator('.round-review-dialog')
    .evaluate((record) => {
      const box = record.getBoundingClientRect();
      const viewport = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      };
      return {
        horizontalFit: record.scrollWidth <= record.clientWidth + 1,
        verticalFit: record.scrollHeight <= record.clientHeight + 1,
        insideViewport:
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= viewport.width &&
          box.bottom <= viewport.height,
      };
    });
  expect(weaknessGeometry.horizontalFit).toBe(true);
  expect(weaknessGeometry.verticalFit).toBe(true);
  expect(
    weaknessGeometry.insideViewport,
    JSON.stringify(weaknessGeometry),
  ).toBe(true);
  expect(
    await page.evaluate(() => {
      const reaction = document
        .querySelector('.round-review-dialog')!
        .getBoundingClientRect();
      const waiting = document
        .querySelector('.player-sentence--waiting')!
        .getBoundingClientRect();
      return !(
        reaction.left < waiting.right &&
        reaction.right > waiting.left &&
        reaction.top < waiting.bottom &&
        reaction.bottom > waiting.top
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('round-result-feedback.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Round 2.*turn/u }),
  ).toBeVisible();
});

test('the grammar strike fits the minimum landscape', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await startMatch(page);

  await page
    .locator(
      '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
    )
    .click();
  const strike = page.locator('.grammar-strike');
  await expect(strike).toBeVisible();
  await expect(strike).toContainText('−3 Pride');
  expect(
    await strike.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('grammar-strike-in');
  expect(
    await page
      .locator('[data-reaction-state="grammar-mistake"] .character-portrait')
      .evaluate((portrait) => getComputedStyle(portrait).animationName),
  ).toBe('grammar-hit-red');
  expect(
    await page
      .locator('.broadcast-stage')
      .evaluate((stage) => getComputedStyle(stage, '::before').animationName),
  ).toBe('grammar-arena-flash');
  const geometry = await strike.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const sentence = document
      .querySelector('.sentence-ledger')!
      .getBoundingClientRect();
    const board = document
      .querySelector('.common-phrases')!
      .getBoundingClientRect();
    return {
      inside:
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= window.innerWidth &&
        box.bottom <= window.innerHeight,
      textFits:
        element.scrollWidth <= element.clientWidth + 1 &&
        element.scrollHeight <= element.clientHeight + 1,
      clearsSentence: sentence.bottom <= box.top,
      clearsBoard: box.bottom <= board.top,
    };
  });
  expect(Object.values(geometry).every(Boolean)).toBe(true);
  await expect(
    page.locator(
      '.tutorial, .tactical-help, .card-hint, [data-tutorial], [data-guided-turn]',
    ),
  ).toHaveCount(0);
  await page.waitForTimeout(550);
  await page.screenshot({
    path: testInfo.outputPath('grammar-strike-1024x720.png'),
    fullPage: true,
  });
});

test('reduced motion keeps grammar feedback without movement or flashing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1024, height: 720 });
  await startMatch(page);

  await page
    .locator(
      '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
    )
    .click();
  const strike = page.locator('.grammar-strike');
  await expect(strike).toBeVisible();
  await expect(strike).toContainText('−3 Pride');
  expect(
    await strike.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('[data-reaction-state="grammar-mistake"] .character-portrait')
      .evaluate((portrait) => getComputedStyle(portrait).animationName),
  ).toBe('none');
  expect(
    await page.locator('.broadcast-stage').evaluate((stage) => {
      const style = getComputedStyle(stage, '::before');
      return { animationName: style.animationName, display: style.display };
    }),
  ).toEqual({ animationName: 'none', display: 'none' });
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

test('Pause settings apply to the resumed match', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();

  const thirtySeconds = page.getByRole('button', { name: '30 seconds' });
  const autoCompleteSettings = page
    .locator('.interruption-setting')
    .filter({ hasText: 'Auto-complete' });
  const phraseColorCodingSettings = page
    .locator('.interruption-setting')
    .filter({ hasText: 'Phrase color coding' });
  const autoCompleteOn = autoCompleteSettings.getByRole('button', {
    name: 'On',
    exact: true,
  });
  const phraseColorCodingOn = phraseColorCodingSettings.getByRole('button', {
    name: 'On',
    exact: true,
  });
  await expect(thirtySeconds).toHaveAttribute('aria-pressed', 'true');
  await expect(autoCompleteOn).toHaveAttribute('aria-pressed', 'true');
  await expect(phraseColorCodingOn).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '15 seconds' }).click();
  await autoCompleteSettings
    .getByRole('button', { name: 'Off', exact: true })
    .click();
  await phraseColorCodingSettings
    .getByRole('button', { name: 'Off', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '15 seconds' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    autoCompleteSettings.getByRole('button', { name: 'Off', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    phraseColorCodingSettings.getByRole('button', {
      name: 'Off',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const required = [
        ...document.querySelectorAll<HTMLElement>(
          '.interruption-setting, .interruption-actions button',
        ),
      ];
      const timerSetting = document.querySelector<HTMLElement>(
        '.interruption-setting:first-child',
      )!;
      const phraseColorCodingSetting = document.querySelector<HTMLElement>(
        '.interruption-setting--phrase-color-coding',
      )!;
      const timerBox = timerSetting.getBoundingClientRect();
      const colorCodingBox = phraseColorCodingSetting.getBoundingClientRect();
      return {
        documentFits:
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
        requiredFits: required.every((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= 0 &&
            box.top >= 0 &&
            box.right <= innerWidth &&
            box.bottom <= innerHeight
          );
        }),
        colorCodingStartsNewRow: colorCodingBox.top > timerBox.bottom,
        colorCodingFitsSettingsGrid:
          colorCodingBox.left >= timerBox.left &&
          colorCodingBox.right <=
            document
              .querySelector<HTMLElement>('.interruption-settings')!
              .getBoundingClientRect().right,
      };
    });
    expect(layout.documentFits, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(layout.requiredFits, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(
      layout.colorCodingStartsNewRow,
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
    expect(
      layout.colorCodingFitsSettingsGrid,
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `pause-settings-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeFocused();
  await expect(page.locator('.timer-fact')).toHaveAttribute(
    'data-timer',
    /^(?:14|15)$/u,
  );
  await expect(page.locator('.match-screen')).toHaveAttribute(
    'data-phrase-color-coding',
    'off',
  );
  const sentenceBefore = await page.locator('.sentence-preview').textContent();
  await page
    .locator('[data-role="noun"] button[data-card-state="legal"]')
    .first()
    .hover();
  await expect(page.locator('.sentence-preview')).toHaveText(
    sentenceBefore?.trim() ?? '',
  );

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Unlimited' }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.timer-fact')).toHaveAttribute(
    'data-timer',
    'unlimited',
  );
  await expect(page.locator('.timer-fact dd')).toHaveText('Unlimited');
  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const timerGeometry = await page
      .locator('.timer-fact')
      .evaluate((frame) => {
        const frameBox = frame.getBoundingClientRect();
        const text = frame.querySelector<HTMLElement>('dd')!;
        const textBox = text.getBoundingClientRect();
        return {
          textFitsItsBox: text.scrollWidth <= text.clientWidth,
          textFitsFrame:
            textBox.left >= frameBox.left && textBox.right <= frameBox.right,
        };
      });
    expect(timerGeometry, `${viewport.width}x${viewport.height}`).toEqual({
      textFitsItsBox: true,
      textFitsFrame: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(
        `unlimited-timer-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }
  await page.waitForTimeout(1_100);
  await expect(page.locator('.timer-fact')).toHaveAttribute(
    'data-timer',
    'unlimited',
  );
});

test('paused match returns to the menu only after confirmation', async ({
  page,
}, testInfo) => {
  await startMatch(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Back to menu' }).click();

  await expect(
    page.getByRole('heading', { name: 'End this match?' }),
  ).toBeVisible();
  await expect(
    page.getByText('Current match progress will be lost.'),
  ).toBeVisible();
  await expect(page.locator('.match-screen')).toHaveCount(0);
  await expect(page.locator('.phrase-card')).toHaveCount(0);
  await expect(page.locator('[data-timer]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stay paused' })).toBeFocused();
  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page
      .locator('.interruption-notice')
      .evaluate((notice) => {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const noticeBox = notice.getBoundingClientRect();
        const buttons = [...notice.querySelectorAll('button')].map((button) =>
          button.getBoundingClientRect(),
        );
        return {
          documentFits:
            document.documentElement.scrollWidth <= viewportWidth &&
            document.documentElement.scrollHeight <= viewportHeight,
          noticeFits:
            noticeBox.left >= 0 &&
            noticeBox.top >= 0 &&
            noticeBox.right <= viewportWidth &&
            noticeBox.bottom <= viewportHeight,
          controlsFit: buttons.every(
            (button) =>
              button.left >= noticeBox.left &&
              button.top >= noticeBox.top &&
              button.right <= noticeBox.right &&
              button.bottom <= noticeBox.bottom,
          ),
        };
      });
    expect(geometry, `${viewport.width}x${viewport.height}`).toEqual({
      controlsFit: true,
      documentFits: true,
      noticeFits: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(
        `pause-exit-confirmation-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  }

  await page.getByRole('button', { name: 'Stay paused' }).click();
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to menu' }).click();
  await page.getByRole('button', { name: 'End match' }).click();

  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(page.locator('grand-transition-match')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Set up match' }),
  ).toBeVisible();
});

async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(
    page.getByRole('heading', { name: /Round 1.*turn/u }),
  ).toBeVisible();
}

async function selectSetupCharacter(
  page: Page,
  player: 'one' | 'two',
  characterId: string,
): Promise<void> {
  const fieldId =
    player === 'one' ? '#playerOneCharacterId' : '#playerTwoCharacterId';
  await page.locator(fieldId).click();
  await page
    .locator(`.roster-choice[data-character-id="${characterId}"]`)
    .click();
}

async function setWaitingSentence(
  page: Page,
  sentence: string,
  waitingSide?: 'blue' | 'red',
): Promise<void> {
  await page.locator('grand-transition-match').evaluate(
    async (element, request) => {
      const match = element as HTMLElement & {
        snapshot: {
          activePlayerId: string;
          activePlayerName: string;
          revision: number;
          players: readonly {
            playerId: string;
            characterName: string;
            isActive: boolean;
            sentence: string | null;
          }[];
        };
        updateComplete: Promise<boolean>;
      };
      const waitingIndex =
        request.waitingSide === undefined
          ? match.snapshot.players.findIndex((player) => !player.isActive)
          : request.waitingSide === 'red'
            ? 0
            : 1;
      const players = match.snapshot.players.map((player, index) => ({
        ...player,
        isActive: index !== waitingIndex,
        sentence: index === waitingIndex ? request.sentence : player.sentence,
      }));
      const activePlayer = players[waitingIndex === 0 ? 1 : 0]!;
      match.snapshot = {
        ...match.snapshot,
        activePlayerId: activePlayer.playerId,
        activePlayerName: activePlayer.characterName,
        revision: match.snapshot.revision + 1,
        players,
      };
      await match.updateComplete;
    },
    { sentence, waitingSide },
  );
}

async function portraitAlphaFacts(portraits: Locator): Promise<
  readonly Readonly<{
    bottomRowOpaqueRatio: number;
    chromaKeyGreenRatio: number;
    cornerAlpha: readonly number[];
    lowerThirdOpaqueRatio: number;
    opaqueRatio: number;
    topOpaqueRatio: number;
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
      let bottomRowOpaquePixels = 0;
      let chromaKeyGreenPixels = 0;
      let lowerThirdOpaquePixels = 0;
      let topOpaqueRow = canvas.height;
      for (
        let pixelIndex = 0;
        pixelIndex < canvas.width * canvas.height;
        pixelIndex += 1
      ) {
        const pixelOffset = pixelIndex * 4;
        const alpha = pixels[pixelOffset + 3];
        const row = Math.floor(pixelIndex / canvas.width);
        if (alpha === 0) transparentPixels += 1;
        if (alpha === 255) opaquePixels += 1;
        if (alpha > 0 && row === canvas.height - 1) {
          bottomRowOpaquePixels += 1;
        }
        if (alpha > 0 && row >= Math.floor((canvas.height * 2) / 3)) {
          lowerThirdOpaquePixels += 1;
        }
        if (alpha > 0 && row < topOpaqueRow) topOpaqueRow = row;
        if (
          alpha > 0 &&
          pixels[pixelOffset + 1] >= 180 &&
          pixels[pixelOffset] <= 80 &&
          pixels[pixelOffset + 2] <= 80
        ) {
          chromaKeyGreenPixels += 1;
        }
      }
      const pixelCount = canvas.width * canvas.height;
      return {
        bottomRowOpaqueRatio: bottomRowOpaquePixels / canvas.width,
        chromaKeyGreenRatio: chromaKeyGreenPixels / pixelCount,
        cornerAlpha: [
          context.getImageData(0, 0, 1, 1).data[3],
          context.getImageData(canvas.width - 1, 0, 1, 1).data[3],
          context.getImageData(0, canvas.height - 1, 1, 1).data[3],
          context.getImageData(canvas.width - 1, canvas.height - 1, 1, 1)
            .data[3],
        ],
        lowerThirdOpaqueRatio: lowerThirdOpaquePixels / pixelCount,
        opaqueRatio: opaquePixels / pixelCount,
        topOpaqueRatio: topOpaqueRow / canvas.height,
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

async function actionRailsUseBoardMargins(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('.draft-table');
    const rail = document.querySelector<HTMLElement>('.match-actions');
    if (!board || !rail) return false;

    const boardBox = board.getBoundingClientRect();
    const boardMargin =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) *
      0.8;
    const margins = (['red', 'blue'] as const).map((side) => {
      const probe = rail.cloneNode(true) as HTMLElement;
      probe.dataset.side = side;
      probe.style.animation = 'none';
      probe.style.visibility = 'hidden';
      board.append(probe);
      const railBox = probe.getBoundingClientRect();
      probe.remove();
      return {
        side,
        left: railBox.left - boardBox.left,
        right: boardBox.right - railBox.right,
      };
    });

    const red = margins.find(({ side }) => side === 'red')!;
    const blue = margins.find(({ side }) => side === 'blue')!;
    return (
      Math.abs(red.left - blue.right) <= 1 &&
      Math.abs(red.right - blue.left) <= 1 &&
      Math.abs(red.left - boardMargin) <= 1 &&
      Math.abs(blue.right - boardMargin) <= 1
    );
  });
}

async function centeredHeaderControls(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const stage = document.querySelector('.broadcast-stage')!;
    const rail = document.querySelector('.match-status-rail')!;
    const controls = document.querySelector('.match-header-controls')!;
    const pause = controls.querySelector('.match-pause')!;
    const timer = controls.querySelector('.timer-fact')!;
    const stageBox = stage.getBoundingClientRect();
    const railBox = rail.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    const pauseBox = pause.getBoundingClientRect();
    const timerBox = timer.getBoundingClientRect();
    const stageCenter = stageBox.left + stageBox.width / 2;

    return (
      Math.abs(railBox.left + railBox.width / 2 - stageCenter) <= 1 &&
      Math.abs(controlsBox.left + controlsBox.width / 2 - stageCenter) <= 1 &&
      Math.abs(pauseBox.left + pauseBox.width / 2 - stageCenter) <= 1 &&
      Math.abs(timerBox.left + timerBox.width / 2 - stageCenter) <= 1 &&
      pauseBox.bottom <= timerBox.top + 1
    );
  });
}
