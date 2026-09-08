import { finishPresentation } from './helpers/presentation';
import type { RoundPresentationFrame } from '../src/app/round-presentation';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const sceneVariantDimensions = [
  [640, 360],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
] as const;

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
    '[data-turn-state="active"] [data-state-visible="true"] .character-state-upper',
  );
  await expect(activePortrait).toHaveCSS('animation-name', 'character-breath');
  const playerSeparation = await page.evaluate(() =>
    [...document.querySelectorAll('.match-player')].map((player) => {
      const hud = player.querySelector('.player-hud')!.getBoundingClientRect();
      const portrait = player
        .querySelector('.character-portrait')!
        .getBoundingClientRect();
      const name = player.querySelector('h2')!;
      const nameBox = name.getBoundingClientRect();
      const nameText = document.createRange();
      nameText.selectNodeContents(name);
      const textBox = nameText.getBoundingClientRect();
      return {
        noOverlap: hud.bottom <= portrait.top + 1,
        completeTwoLineName:
          name.scrollWidth <= name.clientWidth + 1 &&
          name.scrollHeight <= name.clientHeight + 1 &&
          textBox.top >= nameBox.top - 1 && textBox.bottom <= nameBox.bottom + 1 &&
          textBox.height <= 2 * Number.parseFloat(getComputedStyle(name).lineHeight) + 1 &&
          getComputedStyle(name).textOverflow !== 'ellipsis',
        filter: getComputedStyle(player.querySelector('.character-portrait')!)
          .filter,
        state: player.getAttribute('data-turn-state'),
      };
    }),
  );
  expect(
    playerSeparation.every(({ noOverlap, completeTwoLineName }) =>
      Boolean(noOverlap && completeTwoLineName),
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
        const range = document.createRange();
        range.selectNodeContents(heading);
        const textBox = range.getBoundingClientRect();
        return (
          heading.scrollWidth <= heading.clientWidth + 1 &&
          heading.scrollHeight <= heading.clientHeight + 1 &&
          textBox.top >= box.top - 1 && textBox.bottom <= box.bottom + 1 &&
          textBox.height <= 2 * Number.parseFloat(getComputedStyle(heading).lineHeight) + 1 &&
          getComputedStyle(heading).textOverflow !== 'ellipsis'
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
        opaqueRatio > 0.12,
    ),
    JSON.stringify(alphaFacts),
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
  expect(foregroundAlpha?.cornerAlpha.every((alpha) => alpha === 0)).toBe(true);
  expect(foregroundAlpha?.transparentRatio).toBeGreaterThan(0.7);
  expectDeskPlateBounds(foregroundAlpha);
  const sceneStack = await page.evaluate(() => ({
    background: Number(
      getComputedStyle(document.querySelector('.broadcast-stage-art')!).zIndex,
    ),
    portrait: Number(
      getComputedStyle(document.querySelector('.character-portrait')!).zIndex,
    ),
    props: Number(getComputedStyle(document.querySelector('.broadcast-stage-props')!).zIndex),
    foreground: Number(
      getComputedStyle(document.querySelector('.broadcast-stage-foreground')!)
        .zIndex,
    ),
    playerHud: Number(
      getComputedStyle(document.querySelector('.player-hud')!).zIndex,
    ),
  }));
  expect(sceneStack.background).toBeLessThan(sceneStack.portrait);
  expect(sceneStack.props).toBeLessThan(sceneStack.portrait);
  expect(sceneStack.portrait).toBeLessThan(sceneStack.foreground);
  expect(sceneStack.foreground).toBeLessThan(sceneStack.playerHud);
  const splitPlate = await page.evaluate(() => {
    const props = document.querySelector<HTMLImageElement>('.broadcast-stage-props')!;
    const desks = document.querySelector<HTMLImageElement>('.broadcast-stage-foreground')!;
    return {
      sharedResource: props.currentSrc === desks.currentSrc,
      sameGeometry: JSON.stringify(props.getBoundingClientRect()) === JSON.stringify(desks.getBoundingClientRect()),
      propsClip: getComputedStyle(props).clipPath,
      desksClip: getComputedStyle(desks).clipPath,
      inert: [props, desks].every((image) => getComputedStyle(image).pointerEvents === 'none'),
    };
  });
  expect(splitPlate).toEqual({ sharedResource: true, sameGeometry: true,
    propsClip: 'inset(0px 0px 38%)', desksClip: 'inset(62% 0px 0px)', inert: true });
  expect(
    await page.evaluate(() => {
      const background = document
        .querySelector('.broadcast-stage-art')!
        .getBoundingClientRect();
      const foreground = document
        .querySelector('.broadcast-stage-foreground')!
        .getBoundingClientRect();
      return (
        Math.abs(background.left - foreground.left) <= 0.1 &&
        Math.abs(background.top - foreground.top) <= 0.1 &&
        Math.abs(background.width - foreground.width) <= 0.1 &&
        Math.abs(background.height - foreground.height) <= 0.1
      );
    }),
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
  await pauseMatchClock(page);
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
  await finishPresentation(page);
  await expect(
    page.getByRole('heading', { name: /Round 2.*turn/u }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
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
    { width: 1024, height: 1023 },
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
        const range = document.createRange();
        range.selectNodeContents(heading);
        const textBox = range.getBoundingClientRect();
        return (
          heading.scrollWidth <= heading.clientWidth + 1 &&
          heading.scrollHeight <= heading.clientHeight + 1 &&
          textBox.top >= box.top - 1 && textBox.bottom <= box.bottom + 1 &&
          textBox.height <= 2 * Number.parseFloat(getComputedStyle(heading).lineHeight) + 1 &&
          getComputedStyle(heading).textOverflow !== 'ellipsis'
        );
      }),
    ),
  ).toBe(true);
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
        opaqueRatio > 0.12,
    ),
    JSON.stringify(alphaFacts),
  ).toBe(true);
});

for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 1024 },
    { width: 2560, height: 1080 },
    { width: 3424, height: 1427 },
    { width: 5120, height: 1440 },
  ]) {
  test(`the selected modern debate studio loads both local scene layers at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      const state = window as typeof window & {
        __sceneCumulativeLayoutShift: number;
      };
      state.__sceneCumulativeLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) {
            state.__sceneCumulativeLayoutShift += shift.value;
          }
        }
      }).observe({ buffered: true, type: 'layout-shift' });
    });
    const sceneVariantRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/assets\/(?:modern-debate|transition-era)-.*\.(?:avif|webp)(?:$|[?#])/u.test(request.url())) {
        sceneVariantRequests.push(request.url());
      }
    });
    await page.reload();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByLabel('Scene').selectOption('modern-debate-studio');
    expect(sceneVariantRequests).toEqual([]);
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
    expect(
      await page.locator(
        'picture[data-scene-asset="modern-debate-studio"] source',
      ).evaluateAll((sources) =>
        sources.map((source) => (source as HTMLSourceElement).type),
      ),
    ).toEqual(['image/avif', 'image/webp']);
    expect(await background.getAttribute('src')).toContain('.webp');
    expect(await background.getAttribute('src')).not.toContain('.png');
    expect(await background.getAttribute('srcset')).toMatch(/640w.*1280w.*1920w/u);
    expect(await foreground.getAttribute('src')).toContain('.webp');
    expect(await foreground.getAttribute('src')).not.toContain('.png');
    expect(await foreground.getAttribute('srcset')).toMatch(/640w.*1280w.*1920w/u);
    const manifestGeometry = await page
      .locator('picture[data-scene-asset="modern-debate-studio"]')
      .evaluate((picture) => ({
        cropCore: picture.getAttribute('data-scene-crop-core'),
        safeRectangles: picture.getAttribute('data-scene-safe-rectangles'),
        styleCoreWidth: getComputedStyle(
          picture.querySelector('img')!,
        ).getPropertyValue('--scene-crop-core-width'),
      }));
    expect(manifestGeometry.cropCore).toContain('"width":0.75');
    expect(manifestGeometry.safeRectangles).toContain('centralInteraction');
    expect(manifestGeometry.styleCoreWidth).toBe('0.75');
    await expect
      .poll(
        () =>
          background.evaluate(
            (image: HTMLImageElement) =>
              image.complete &&
              image.getAttribute('width') === '3840' &&
              image.getAttribute('height') === '2160',
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    await expectDecodedSceneVariant(background);
    await expect
      .poll(() =>
        foreground.evaluate(
          (image: HTMLImageElement) =>
            image.complete &&
            image.getAttribute('width') === '3840' &&
            image.getAttribute('height') === '2160',
        ),
      )
      .toBe(true);
    await expectDecodedSceneVariant(foreground);

    await expect
      .poll(() => background.evaluate((image: HTMLImageElement) => image.currentSrc))
      .toMatch(/\.avif(?:$|[?#])/u);
    await expect.poll(() => sceneVariantRequests.length).toBe(2);
    expect(
      sceneVariantRequests.every((url) => url.includes('modern-debate-studio')),
    ).toBe(true);
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(
        () =>
          (
            window as typeof window & {
              __sceneCumulativeLayoutShift: number;
            }
          ).__sceneCumulativeLayoutShift,
      ),
    ).toBeLessThanOrEqual(0.05);

    const [foregroundAlpha] = await portraitAlphaFacts(foreground);
    expect(foregroundAlpha?.cornerAlpha.every((alpha) => alpha === 0)).toBe(true);
    expect(foregroundAlpha?.chromaKeyGreenRatio).toBeLessThan(0.001);
    expect(foregroundAlpha?.transparentRatio).toBeGreaterThan(0.7);
    expectDeskPlateBounds(foregroundAlpha);
    await expect
      .poll(
        () =>
          page.locator('.character-portrait').evaluateAll((portraits) =>
            portraits.every(
              (portrait) =>
                (portrait as HTMLImageElement).complete &&
                (portrait as HTMLImageElement).naturalWidth > 0,
            ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.setViewportSize(viewport);
    await decodeImages(
      page.locator(
        '.broadcast-stage-art, .broadcast-stage-foreground, .character-portrait',
      ),
    );
    const geometry = await page.evaluate(() => {
      const backgroundBox = document
        .querySelector('.broadcast-stage-art')!
        .getBoundingClientRect();
      const foregroundBox = document
        .querySelector('.broadcast-stage-foreground')!
        .getBoundingClientRect();
      const ratio = innerWidth / innerHeight;
      return {
        documentFits:
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
        backgroundCovers:
          backgroundBox.left <= 0 &&
          backgroundBox.right >= innerWidth &&
          backgroundBox.bottom >= innerHeight,
        layersAligned:
          Math.abs(backgroundBox.left - foregroundBox.left) <= 0.1 &&
          Math.abs(backgroundBox.top - foregroundBox.top) <= 0.1 &&
          Math.abs(backgroundBox.width - foregroundBox.width) <= 0.1 &&
          Math.abs(backgroundBox.height - foregroundBox.height) <= 0.1,
        protectedCoreFitsViewport:
          ratio >= 4 / 3 - 0.0001 ||
          (innerWidth / (backgroundBox.width * 0.75) > 0.999 &&
            innerWidth / (backgroundBox.width * 0.75) < 1.001),
        fullSceneAtSixteenByNine:
          ratio < 16 / 9 - 0.0001 ||
          Math.abs(backgroundBox.width - innerWidth) <= 1,
        fourByThreeCore:
          Math.abs(ratio - 4 / 3) > 0.0001 ||
          Math.abs(backgroundBox.width * 0.75 - innerWidth) <= 1,
        topContinuation:
          ratio < 4 / 3 - 0.0001
            ? backgroundBox.top > 0 && backgroundBox.bottom >= innerHeight
            : backgroundBox.top <= 1,
        extensionSurface: (() => {
          const style = getComputedStyle(
            document.querySelector('.broadcast-stage')!,
          );
          return {
            color: style.backgroundColor,
            image: style.backgroundImage,
            repeat: style.backgroundRepeat,
          };
        })(),
      };
    });
    expect(geometry.documentFits, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(geometry.backgroundCovers, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(geometry.layersAligned, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(
      geometry.protectedCoreFitsViewport,
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
    expect(
      geometry.fullSceneAtSixteenByNine,
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
    expect(geometry.fourByThreeCore, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(geometry.topContinuation, `${viewport.width}x${viewport.height}`).toBe(
      true,
    );
    expect(
      await moderatorFaceIsClearOfPortraits(page),
      `${viewport.width}x${viewport.height}`,
    ).toBe(true);
    expect(geometry.extensionSurface.repeat).toBe('no-repeat');
    if (viewport.width / viewport.height < 4 / 3 - 0.0001) {
      expect(geometry.extensionSurface.color).toBe('rgb(7, 27, 64)');
      expect(geometry.extensionSurface.color).not.toBe('rgb(5, 8, 11)');
      expect(geometry.extensionSurface.image).toBe('none');
    }
    await page.screenshot({
      path: testInfo.outputPath(
        `modern-debate-studio-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  });
}

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
            image.naturalWidth === image.naturalHeight &&
            image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const portraitPixelFacts = await portraitAlphaFacts(portraits);
  await expectDecodedPortraitVariants(portraits);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 1024 },
    { width: 2560, height: 1080 },
    { width: 3424, height: 1427 },
    { width: 5120, height: 1440 },
  ]) {
    await page.setViewportSize(viewport);
    const composition = await page.evaluate(async () => {
      // Let responsive source selection use the new viewport, then decode and
      // measure in the same browser task so another source update cannot race it.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await Promise.all([...document.querySelectorAll<HTMLImageElement>(
        '.broadcast-stage-art, .character-frame img',
      )].map((image) => image.decode()));
      const stage = document
        .querySelector('.broadcast-stage')!
        .getBoundingClientRect();
      const scene = document
        .querySelector('.broadcast-stage-art')!
        .getBoundingClientRect();
      const deskTop = scene.top + scene.height * 0.62;
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
          deskTop,
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
            deskTop,
            clearsHud,
          },
          index,
        ) =>
          Math.abs(portraitTopRatio) < 0.01 &&
          Math.abs(portraitHeightRatio - 1) < 0.01 &&
          Math.abs(renderedWidthRatio - 1) < 0.01 &&
          portraitBottomRatio > 1.03 &&
          portraitBottomRatio < 1.05 &&
          naturalWidth === naturalHeight &&
          naturalWidth > 0 &&
          portraitTop +
            portraitHeight * (portraitPixelFacts[index]!.topOpaqueRatio + 0.22) <
            deskTop &&
          clearsHud,
      ),
      `${viewport.width}x${viewport.height}: ${JSON.stringify(composition)}`,
    ).toBe(true);
  }
});

test('keeps the Thunder Tribune selection tall in the final square portrait plane', async ({
  page,
}) => {
  await startMatch(page);
  const portrait = page.locator(
    '[data-state-id="selection"] img[src*="thunder-tribune"]',
  );
  await expect
    .poll(() =>
      portrait.evaluate(
        (image: HTMLImageElement) =>
          image.complete &&
          image.naturalWidth === image.naturalHeight &&
          image.naturalWidth > 0,
      ),
    )
    .toBe(true);

  await expectDecodedPortraitVariants(portrait);
  const silhouette = await portrait.evaluate(async (image: HTMLImageElement) => {
    const bitmap = await createImageBitmap(image);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minimumX = canvas.width;
    let maximumX = -1;
    let minimumY = canvas.height;
    let maximumY = -1;
    let visiblePixels = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
        visiblePixels += 1;
        minimumX = Math.min(minimumX, x);
        maximumX = Math.max(maximumX, x);
        minimumY = Math.min(minimumY, y);
        maximumY = Math.max(maximumY, y);
      }
    }
    return {
      canvasSize: canvas.height,
      heightRatio: (maximumY - minimumY + 1) / canvas.height,
      maximumY,
      minimumX,
      minimumY,
      widthRatio: (maximumX - minimumX + 1) / canvas.width,
      occupiedAreaRatio: visiblePixels / (canvas.width * canvas.height),
    };
  });

  expect(silhouette).toMatchObject({
    canvasSize: expect.any(Number),
    heightRatio: expect.any(Number),
    maximumY: expect.any(Number),
    minimumX: expect.any(Number),
    minimumY: expect.any(Number),
    widthRatio: expect.any(Number),
    occupiedAreaRatio: expect.any(Number),
  });
  expect(silhouette.heightRatio).toBeGreaterThanOrEqual(0.93);
  expect(silhouette.heightRatio).toBeLessThanOrEqual(0.99);
  expect(silhouette.minimumY / silhouette.canvasSize).toBeGreaterThanOrEqual(
    0.01,
  );
  expect(silhouette.minimumY / silhouette.canvasSize).toBeLessThanOrEqual(
    0.05,
  );
  expect(silhouette.maximumY / silhouette.canvasSize).toBeGreaterThanOrEqual(
    0.95,
  );
  expect(silhouette.maximumY / silhouette.canvasSize).toBeLessThan(1);
  expect(silhouette.occupiedAreaRatio).toBeGreaterThanOrEqual(0.12);
});

test('keeps the physical moderator face clear of drafting UI', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await startMatch(page);
  const background = page.locator('.broadcast-stage-art');
  await expect
    .poll(
      () =>
        background.evaluate(
          (image: HTMLImageElement) =>
            image.complete &&
            image.getAttribute('width') === '3840' &&
            image.getAttribute('height') === '2160',
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  await expectDecodedSceneVariant(background);
  await expect
    .poll(
      () =>
        page.locator('.character-portrait').evaluateAll((portraits) =>
          portraits.every(
            (portrait) =>
              (portrait as HTMLImageElement).complete &&
              (portrait as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await decodeImages(
      page.locator('.broadcast-stage-art, .character-portrait'),
    );
    await expectModeratorFaceClearance(page, `${viewport.width}x${viewport.height}`);
  }
});

test('waits for a replacement portrait before measuring moderator clearance', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Set up match' }).click();
  await selectSetupCharacter(page, 'one', 'retiring-cassandra');
  await page.getByRole('button', { name: 'Start match' }).click();
  await decodeImages(page.locator('.broadcast-stage-art, .character-portrait'));
  let releasePortrait!: () => void;
  let requestStarted!: () => void;
  const responseReleased = new Promise<void>((resolve) => {
    releasePortrait = resolve;
  });
  const portraitRequested = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  await page.route('**/*?clearance-reload', async (route) => {
    requestStarted();
    await responseReleased;
    await route.continue();
  });
  const portrait = page.locator('.character-portrait').first();
  await portrait.evaluate((element) => {
    const image = element as HTMLImageElement;
    const replacement = image.cloneNode(true) as HTMLImageElement;
    replacement.removeAttribute('srcset');
    replacement.src = `${image.currentSrc}?clearance-reload`;
    image.closest('picture')!.replaceChildren(replacement);
  });
  try {
    await portraitRequested;
    expect(
      await portrait.evaluate((image) => ({
        complete: (image as HTMLImageElement).complete,
        naturalWidth: (image as HTMLImageElement).naturalWidth,
      })),
    ).toEqual({ complete: false, naturalWidth: 0 });
    expect(await readModeratorFaceClearance(page)).toMatchObject({ ready: false });
  } finally {
    releasePortrait();
  }
  await expectModeratorFaceClearance(page, 'replacement portrait');
  await page.locator('.common-phrases').evaluate((element) => {
    Object.assign((element as HTMLElement).style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
    });
  });
  expect(await readModeratorFaceClearance(page)).toMatchObject({
    ready: true,
    clear: false,
  });
});

for (const viewport of [
    { width: 1024, height: 1023 },
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1080 },
    { width: 3424, height: 1427 },
    { width: 5120, height: 1440 },
  ]) {
  test(`the match fits the supported landscape matrix at ${viewport.width}x${viewport.height}`, async ({
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

    await page.setViewportSize(viewport);
    await page.mouse.move(0, 0);
    await decodeImages(page.locator('.broadcast-stage-art'));
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
        ambienceAligned: (() => {
          const scene = document.querySelector('.broadcast-stage-art')!.getBoundingClientRect();
          const ambience = document.querySelector('.broadcast-stage-ambience')!.getBoundingClientRect();
          return ['x', 'y', 'width', 'height'].every((key) =>
            Math.abs(scene[key as 'x' | 'y' | 'width' | 'height'] - ambience[key as 'x' | 'y' | 'width' | 'height']) < 0.5);
        })(),
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
    expect(facts.ambienceAligned).toBe(true);
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
  });
}

for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 3424, height: 1427 },
    { width: 5120, height: 1440 },
  ]) {
  test(`grammar feedback stays below speech and expires without player input at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await useFixedBrowserMatchSeed(page);
    await pauseMatchClock(page);
    await page.goto('');
    await page.setViewportSize(viewport);
    await startMatch(page);
    await page.locator('.shared-board [data-role="predicate"] button[data-card-state="legal"]').first().click();
    const strike = page.locator('.grammar-strike');
    await expect(strike).toBeVisible();
    const geometry = await page.evaluate(() => {
      const speech = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
      const strike = document.querySelector('.grammar-strike')!.getBoundingClientRect();
      const tailHeight = parseFloat(getComputedStyle(document.querySelector('.sentence-ledger')!, '::after').height);
      return {
        belowSpeechAndTail: strike.top >= speech.bottom + tailHeight,
        insideViewport: strike.left >= 0 && strike.right <= innerWidth && strike.bottom <= innerHeight,
      };
    });
    expect(geometry, JSON.stringify(viewport)).toEqual({ belowSpeechAndTail: true, insideViewport: true });
    if (viewport.width === 3424) {
      await page.clock.runFor(550);
      await page.screenshot({ path: testInfo.outputPath('grammar-toast-ultrawide.png'), animations: 'disabled' });
    }
    await page.clock.fastForward(3_000);
    await expect(strike).toHaveCount(0);
  });
}

test('pointer play completes redraw, an immediate grammar mistake, and the other hotseat side', async ({
  page,
}, testInfo) => {
  await pauseMatchClock(page);
  await startMatch(page);
  await decodeImages(page.locator('.character-frame img'));

  const redraw = page.getByRole('button', {
    name: 'Reshuffle private phrases',
  });
  await redraw.click();
  await expect(
    page.getByRole('button', { name: 'Reshuffle used' }),
  ).toBeDisabled();

  const wrongPredicate = page.locator(
    '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
  ).first();
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
      .locator('[data-reaction-state="grammar-mistake"] [data-state-id="grammar-mistake"][data-state-visible="true"]')
      .evaluate((portrait) => getComputedStyle(portrait).animationName),
  ).toBe('character-pause');
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
  await page.clock.runFor(550);
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
    '[data-turn-state="active"] [data-state-visible="true"] .character-state-upper',
  );
  await expect(incomingPortrait).toHaveCSS('animation-name', 'character-breath');
  await expect(incomingPortrait).toHaveCSS('animation-duration', '3s');
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
    if (await page.locator('.match-screen').getAttribute('data-delivery-phase')) break;
    await page.getByRole('button', { name: 'End', exact: true }).click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // A public long receipt fixture tests the same component renderer at all viewports.
  await page.locator('grand-transition-match').evaluate(async (element) => {
    const match = element as HTMLElement & { presentation: RoundPresentationFrame; updateComplete: Promise<boolean> };
    const base = { narrationIndex: 1, restrictionFactor: 1, weaknessFactor: 1, comboFactor: 1, weaknessTags: [] };
    match.presentation = { ...match.presentation, phase: 'total', total: 51,
      text: 'Your party belongs in a party museum, and your voters change the channel.',
      components: [
        { ...base, kind: 'clause', phraseText: 'Your party belongs in a party museum', base: 10,
          amount: 30, weaknessFactor: 1.5, comboFactor: 2, weaknessTags: ['evidence', 'credibility', 'restraint'] },
        { ...base, kind: 'finisher', phraseText: 'By emergency ordinance.', base: 3, amount: 3 },
        { ...base, kind: 'comeback', phraseText: 'And that closes the record.', base: 18, amount: 18 },
      ] };
    await match.updateComplete;
  });
  const receipt = page.locator('.delivery-receipt');
  await expect(receipt.locator('.delivery-score')).toHaveCount(3);
  await expect(receipt.locator('.score-factor--weakness')).toHaveText('×1.5');
  await expect(receipt.locator('.score-factor--combo')).toHaveText('×2');
  await expect(receipt.locator('[data-score-amount="30"]')).toContainText(/=\s*30/u);
  await expect(receipt.locator('[data-score-kind="comeback"]')).toContainText(/Comeback.*And that closes the record.*\+18/su);
  await expect(receipt.locator('.delivery-total')).toContainText(/Total\s*51/u);
  await expect(receipt.locator('.delivery-score-weakness')).toHaveText('Evidence · Credibility · Restraint');
  expect(await receipt.locator('.delivery-score').first().evaluate((step) => getComputedStyle(step).animationName)).toBe('none');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 720 },
    { width: 1024, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const geometry = await receipt.evaluate((record) => {
      const box = record.getBoundingClientRect();
      const bubble = document.querySelector('.sentence-ledger')!.getBoundingClientRect();
      return { inside: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
        horizontalFit: record.scrollWidth <= record.clientWidth + 1,
        bubbleClear: box.top >= bubble.bottom || box.right <= bubble.left || box.left >= bubble.right,
        copySize: Number.parseFloat(getComputedStyle(record.querySelector('.delivery-score-text')!).fontSize) };
    });
    expect(geometry.inside).toBe(true); expect(geometry.horizontalFit).toBe(true);
    expect(geometry.bubbleClear).toBe(true); expect(geometry.copySize).toBeGreaterThanOrEqual(11);
    await page.screenshot({ path: testInfo.outputPath(`inline-feedback-${viewport.width}x${viewport.height}.png`) });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await receipt.locator('.delivery-score').first().evaluate((step) => getComputedStyle(step).animationName)).toBe('none');
  await finishPresentation(page);
  await expect(page.getByRole('heading', { name: /Round 2.*turn/u })).toBeVisible();
});

test('the grammar strike fits the minimum landscape', async ({
  page,
}, testInfo) => {
  await pauseMatchClock(page);
  await page.setViewportSize({ width: 1024, height: 720 });
  await startMatch(page);
  await decodeImages(page.locator('.character-frame img'));

  await page
    .locator(
      '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
    )
    .first()
    .click();
  const strike = page.locator('.grammar-strike');
  await expect(strike).toBeVisible();
  await expect(strike).toContainText('−3 Pride');
  expect(
    await strike.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('grammar-strike-in');
  expect(
    await page
      .locator('[data-reaction-state="grammar-mistake"] [data-state-id="grammar-mistake"][data-state-visible="true"]')
      .evaluate((portrait) => getComputedStyle(portrait).animationName),
  ).toBe('character-pause');
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
  await page.clock.runFor(550);
  await page.screenshot({
    path: testInfo.outputPath('grammar-strike-1024x720.png'),
    fullPage: true,
  });
});

test('reduced motion keeps grammar feedback without movement or flashing', async ({
  page,
}) => {
  await pauseMatchClock(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1024, height: 720 });
  await startMatch(page);
  await decodeImages(page.locator('.character-frame img'));

  const sideControls = page.locator('.private-hand, .match-actions');
  const readSideControlMotion = () => sideControls.evaluateAll((controls) =>
    controls.map((control) => ({
      side: control.getAttribute('data-side'),
      animation: getComputedStyle(control).animationName,
    })),
  );
  expect(await readSideControlMotion()).toEqual([
    { side: 'red', animation: 'none' },
    { side: 'red', animation: 'none' },
  ]);

  await page
    .locator(
      '.shared-board [data-role="predicate"] button[data-card-state="legal"]',
    )
    .first()
    .click();
  const strike = page.locator('.grammar-strike');
  await expect(strike).toBeVisible();
  await expect(strike).toContainText('−3 Pride');
  expect(await readSideControlMotion()).toEqual([
    { side: 'blue', animation: 'none' },
    { side: 'blue', animation: 'none' },
  ]);
  expect(
    await strike.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('[data-reaction-state="grammar-mistake"] [data-state-id="grammar-mistake"][data-state-visible="true"]')
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

async function pauseMatchClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-09-06T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-06T12:01:00Z'));
}

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
    outsideDeskExtractionPixels: number;
    deskFocalPixels: readonly number[];
    lowerThirdOpaqueRatio: number;
    nonTransparentBounds: Readonly<{
      left: number;
      right: number;
      top: number;
      bottom: number;
    }>;
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
      let minimumX = canvas.width;
      let maximumX = -1;
      let minimumY = canvas.height;
      let maximumY = -1;
      let topOpaqueRow = canvas.height;
      let outsideDeskExtractionPixels = 0;
      const deskFocalPixels: [number, number] = [0, 0];
      for (
        let pixelIndex = 0;
        pixelIndex < canvas.width * canvas.height;
        pixelIndex += 1
      ) {
        const pixelOffset = pixelIndex * 4;
        const alpha = pixels[pixelOffset + 3];
        const row = Math.floor(pixelIndex / canvas.width);
        if (alpha === 0) transparentPixels += 1;
        if (alpha > 0) {
          const x = pixelIndex % canvas.width;
          const normalizedX = x / canvas.width;
          const normalizedY = row / canvas.height;
          if (normalizedY < 0.54 || !(
            (normalizedX >= 0.125 && normalizedX < 0.32) ||
            (normalizedX >= 0.68 && normalizedX < 0.875)
          )) outsideDeskExtractionPixels += 1;
          if (normalizedY >= 0.56 && normalizedY < 0.72) {
            if (normalizedX >= 0.26 && normalizedX < 0.32) deskFocalPixels[0] += 1;
            if (normalizedX >= 0.68 && normalizedX < 0.74) deskFocalPixels[1] += 1;
          }
          minimumX = Math.min(minimumX, x);
          maximumX = Math.max(maximumX, x);
          minimumY = Math.min(minimumY, row);
          maximumY = Math.max(maximumY, row);
        }
        if (alpha === 255) opaquePixels += 1;
        if (alpha > 0 && row === canvas.height - 1) {
          bottomRowOpaquePixels += 1;
        }
        if (alpha > 0 && row >= Math.floor((canvas.height * 2) / 3)) {
          lowerThirdOpaquePixels += 1;
        }
        if (alpha > 0 && row < topOpaqueRow) topOpaqueRow = row;
        if (
          alpha > 16 &&
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
        outsideDeskExtractionPixels,
        deskFocalPixels,
        nonTransparentBounds: {
          left: minimumX / canvas.width,
          right: (maximumX + 1) / canvas.width,
          top: minimumY / canvas.height,
          bottom: (maximumY + 1) / canvas.height,
        },
        opaqueRatio: opaquePixels / pixelCount,
        topOpaqueRatio: topOpaqueRow / canvas.height,
        transparentRatio: transparentPixels / pixelCount,
      };
    }),
  );
}

async function expectModeratorFaceClearance(
  page: Page,
  label: string,
): Promise<void> {
  let measurement: Awaited<ReturnType<typeof readModeratorFaceClearance>> | undefined;
  await expect.poll(
    async () => {
      measurement = await readModeratorFaceClearance(page);
      return measurement;
    },
    { timeout: 15_000, message: label },
  ).toMatchObject({ ready: true });
  expect(measurement, label).toMatchObject({
    backgroundDimensions: true,
    clear: true,
    portraitClear: true,
  });
}

async function readModeratorFaceClearance(page: Page) {
  return page.evaluate(() => {
    const background = document.querySelector<HTMLImageElement>(
      '.broadcast-stage-art',
    );
    const portraits = [
      ...document.querySelectorAll<HTMLImageElement>('.character-portrait'),
    ];
    if (!background || portraits.length !== 2) {
      return { ready: false, reason: 'The scene images are missing.' };
    }
    const images = [background, ...portraits].map((image) => {
      const box = image.getBoundingClientRect();
      return {
        source: image.currentSrc,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width: box.width,
        height: box.height,
      };
    });
    if (images.some((image) =>
      !image.complete ||
      !image.source ||
      image.naturalWidth <= 0 ||
      image.naturalHeight <= 0 ||
      image.width <= 0 ||
      image.height <= 0,
    )) {
      return { ready: false, images };
    }
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
    const picture = background.closest('picture')!;
    const [faceX, faceY] = picture
      .getAttribute('data-scene-focal-point')!
      .split(',')
      .map(Number) as [number, number];
    if (![faceX, faceY].every(Number.isFinite)) {
      throw new Error('The scene focal coordinates must be finite numbers.');
    }
    const moderatorFace = {
      left: drawnLeft + drawnWidth * (faceX - 0.02),
      right: drawnLeft + drawnWidth * (faceX + 0.02),
      top: drawnTop + drawnHeight * (faceY - 0.035),
      bottom: drawnTop + drawnHeight * (faceY + 0.035),
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
    const portraitOverlapsFace = portraits.some((portrait) => {
      const box = portrait.getBoundingClientRect();
      const portraitScale = Math.min(
        box.width / portrait.naturalWidth,
        box.height / portrait.naturalHeight,
      );
      const portraitWidth = portrait.naturalWidth * portraitScale;
      const portraitHeight = portrait.naturalHeight * portraitScale;
      const portraitLeft = box.left + (box.width - portraitWidth) / 2;
      const portraitTop = box.bottom - portraitHeight;
      const sourceLeft = Math.max(
        0,
        Math.floor((moderatorFace.left - portraitLeft) / portraitScale),
      );
      const sourceRight = Math.min(
        portrait.naturalWidth,
        Math.ceil((moderatorFace.right - portraitLeft) / portraitScale),
      );
      const sourceTop = Math.max(
        0,
        Math.floor((moderatorFace.top - portraitTop) / portraitScale),
      );
      const sourceBottom = Math.min(
        portrait.naturalHeight,
        Math.ceil((moderatorFace.bottom - portraitTop) / portraitScale),
      );
      if (sourceLeft >= sourceRight || sourceTop >= sourceBottom) return false;

      const canvas = document.createElement('canvas');
      canvas.width = portrait.naturalWidth;
      canvas.height = portrait.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(portrait, 0, 0);
      const pixels = context.getImageData(
        sourceLeft,
        sourceTop,
        sourceRight - sourceLeft,
        sourceBottom - sourceTop,
      ).data;
      for (let offset = 3; offset < pixels.length; offset += 4) {
        if (pixels[offset]! > 0) return true;
      }
      return false;
    });
    return {
      ready: true,
      backgroundDimensions:
        background.getAttribute('width') === '3840' &&
        background.getAttribute('height') === '2160',
      clear: !draftingRegions.some((region) =>
        overlaps(moderatorFace, region),
      ),
      portraitClear: !portraitOverlapsFace,
    };
  });
}

async function expectDecodedSceneVariant(image: Locator): Promise<void> {
  await expect
    .poll(
      () =>
        image.evaluate((element, dimensions) => {
          const image = element as HTMLImageElement;
          return {
            complete: image.complete,
            currentSrc: image.currentSrc,
            naturalHeight: image.naturalHeight,
            naturalWidth: image.naturalWidth,
            valid:
              image.complete &&
              dimensions.some(
                ([width, height]) =>
                  image.naturalWidth === width && image.naturalHeight === height,
              ),
          };
        }, sceneVariantDimensions),
      { timeout: 15_000 },
    )
    .toMatchObject({ valid: true });
}

async function decodeImages(images: Locator): Promise<void> {
  await images.evaluateAll((elements) =>
    Promise.all(
      elements.map((element) => (element as HTMLImageElement).decode()),
    ).then(() => undefined),
  );
}

async function expectDecodedPortraitVariants(images: Locator): Promise<void> {
  const dimensions = await images.evaluateAll(async (elements: HTMLImageElement[]) =>
    Promise.all(elements.map(async (image) => {
      await image.decode();
      // Natural dimensions are density-corrected by responsive sizes. The
      // bitmap exposes the actual decoded raster dimensions.
      const bitmap = await createImageBitmap(image);
      const dimensions = [bitmap.width, bitmap.height];
      bitmap.close();
      return dimensions;
    })),
  );
  for (const [width, height] of dimensions) {
    expect([320, 640, 960]).toContain(width);
    expect(height).toBe(width);
  }
}

function expectDeskPlateBounds(
  alpha:
    | Readonly<{
        outsideDeskExtractionPixels: number;
        deskFocalPixels: readonly number[];
        nonTransparentBounds: Readonly<{
          left: number;
          right: number;
          top: number;
          bottom: number;
        }>;
      }>
    | undefined,
): void {
  expect(alpha).toBeDefined();
  const bounds = alpha!.nonTransparentBounds;
  // Specification 023 defines extraction zones and prop focal regions, not
  // one fixed silhouette edge for every regenerated desk plate.
  expect(alpha!.outsideDeskExtractionPixels).toBe(0);
  expect(alpha!.deskFocalPixels).toHaveLength(2);
  expect(alpha!.deskFocalPixels.every((count) => count > 0)).toBe(true);
  expect(bounds.left).toBeGreaterThanOrEqual(0.124);
  expect(bounds.left).toBeLessThanOrEqual(0.32);
  expect(bounds.right).toBeGreaterThanOrEqual(0.68);
  expect(bounds.right).toBeLessThanOrEqual(0.876);
  expect(bounds.top).toBeGreaterThanOrEqual(0.54);
  expect(bounds.top).toBeLessThanOrEqual(0.72);
  expect(bounds.bottom).toBeGreaterThanOrEqual(0.999);
}

async function moderatorFaceIsClearOfPortraits(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const background = document.querySelector<HTMLImageElement>(
      '.broadcast-stage-art',
    )!;
    const backgroundBox = background.getBoundingClientRect();
    const picture = background.closest('picture')!;
    const focalPoint = picture.getAttribute('data-scene-focal-point');
    if (!focalPoint) return true;
    const [faceX, faceY] = focalPoint.split(',').map(Number) as [number, number];
    const moderatorFace = {
      left: backgroundBox.left + backgroundBox.width * (faceX - 0.02),
      right: backgroundBox.left + backgroundBox.width * (faceX + 0.02),
      top: backgroundBox.top + backgroundBox.height * (faceY - 0.035),
      bottom: backgroundBox.top + backgroundBox.height * (faceY + 0.035),
    };

    return ![
      ...document.querySelectorAll<HTMLImageElement>('.character-portrait'),
    ].some((portrait) => {
      const box = portrait.getBoundingClientRect();
      const scale = Math.min(
        box.width / portrait.naturalWidth,
        box.height / portrait.naturalHeight,
      );
      const drawnWidth = portrait.naturalWidth * scale;
      const drawnHeight = portrait.naturalHeight * scale;
      const drawnLeft = box.left + (box.width - drawnWidth) / 2;
      const drawnTop = box.bottom - drawnHeight;
      const sourceLeft = Math.max(
        0,
        Math.floor((moderatorFace.left - drawnLeft) / scale),
      );
      const sourceRight = Math.min(
        portrait.naturalWidth,
        Math.ceil((moderatorFace.right - drawnLeft) / scale),
      );
      const sourceTop = Math.max(
        0,
        Math.floor((moderatorFace.top - drawnTop) / scale),
      );
      const sourceBottom = Math.min(
        portrait.naturalHeight,
        Math.ceil((moderatorFace.bottom - drawnTop) / scale),
      );
      if (sourceLeft >= sourceRight || sourceTop >= sourceBottom) return false;

      const canvas = document.createElement('canvas');
      canvas.width = portrait.naturalWidth;
      canvas.height = portrait.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(portrait, 0, 0);
      const pixels = context.getImageData(
        sourceLeft,
        sourceTop,
        sourceRight - sourceLeft,
        sourceBottom - sourceTop,
      ).data;
      for (let offset = 3; offset < pixels.length; offset += 4) {
        if (pixels[offset]! > 0) return true;
      }
      return false;
    });
  });
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
