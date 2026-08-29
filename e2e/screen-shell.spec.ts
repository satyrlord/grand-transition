import { expect, test } from '@playwright/test';

const supportedViewports = [
  { name: 'minimum-landscape', width: 1024, height: 720 },
  { name: 'four-by-three', width: 1024, height: 768 },
  { name: 'common-landscape', width: 1280, height: 720 },
  { name: 'recommended-pc', width: 1920, height: 1080 },
] as const;

for (const viewport of supportedViewports) {
  test(`${viewport.name} pointer flow stays inside the viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    await expect(
      page.getByRole('heading', { name: 'Grand Transition' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'All characters and events are fictional composites created for satire.',
      ),
    ).toBeVisible();

    const url = page.url();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(
      page.getByRole('heading', { name: 'Select your debaters' }),
    ).toBeVisible();
    expect(page.url()).toBe(url);
    await page
      .getByRole('button', {
        name: 'Player two character: The Thunder Tribune',
      })
      .click();
    await page
      .getByRole('button', {
        name: /Red-Folded Chairman.*Select for player two/u,
      })
      .click();
    await expect(page.locator('.contestant-weaknesses')).toHaveText([
      'Legacy · Modernity · Bureaucracy · Miners',
      'Legacy · Modernity · Bureaucracy · Miners',
    ]);
    const rosterSources = await page
      .locator('.roster-headshot')
      .evaluateAll((portraits) =>
        portraits.map((portrait) => (portrait as HTMLImageElement).src),
      );
    await page
      .getByRole('button', { name: 'Next skin for Player two' })
      .click();
    await expect(page.locator('#playerTwoCharacterId')).toHaveAttribute(
      'data-skin-id',
      'alternate',
    );
    await expect(
      page.locator('.contestant-stage--two .contestant-portrait'),
    ).toHaveAttribute('src', /red-folded-chairman--alternate/u);
    await page.locator('#playerTwoCharacterId').click({ button: 'right' });
    await expect(page.locator('#playerTwoCharacterId')).toHaveAttribute(
      'data-skin-id',
      'default',
    );
    await page.locator('#playerTwoCharacterId').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#playerTwoCharacterId')).toHaveAttribute(
      'data-skin-id',
      'alternate',
    );
    expect(
      await page
        .locator('.roster-headshot')
        .evaluateAll((portraits) =>
          portraits.map((portrait) => (portrait as HTMLImageElement).src),
        ),
    ).toEqual(rosterSources);
    await page.locator('img').evaluateAll(async (portraits) => {
      await Promise.all(
        portraits.map((portrait) => (portrait as HTMLImageElement).decode()),
      );
    });

    const geometry = await page.evaluate(() => {
      const scene = document.querySelector<HTMLSelectElement>('#sceneId')!;
      const sceneStyle = getComputedStyle(scene);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      context.font = sceneStyle.font;
      const selectedScene = scene.selectedOptions[0]?.text ?? '';
      const availableSceneWidth =
        scene.clientWidth -
        Number.parseFloat(sceneStyle.paddingLeft) -
        Number.parseFloat(sceneStyle.paddingRight) -
        12;
      return {
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
        interfaceFont: getComputedStyle(
          document.querySelector<HTMLElement>('.setup-screen')!,
        ).fontFamily,
        headingFont: getComputedStyle(
          document.querySelector<HTMLElement>('#setup-title')!,
        ).fontFamily,
        sceneLabelFits:
          context.measureText(selectedScene).width <= availableSceneWidth,
        controlsInside: [...document.querySelectorAll('select, button')].every(
          (control) => {
            const box = control.getBoundingClientRect();
            return (
              box.left >= 0 &&
              box.right <= document.documentElement.clientWidth &&
              box.top >= 0 &&
              box.bottom <= document.documentElement.clientHeight
            );
          },
        ),
        imagesDecoded: [...document.images].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
        weaknessRecordsInside: [
          ...document.querySelectorAll('.contestant-weaknesses'),
        ].every((record) => {
          const box = record.getBoundingClientRect();
          return (
            box.top >= 0 && box.bottom <= document.documentElement.clientHeight
          );
        }),
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.interfaceFont).toContain('Rubik Variable');
    expect(geometry.headingFont).toContain('Poiret One');
    expect(geometry.interfaceFont + geometry.headingFont).not.toMatch(
      /Barlow|Georgia/u,
    );
    expect(geometry.controlsInside).toBe(true);
    expect(geometry.imagesDecoded).toBe(true);
    expect(geometry.sceneLabelFits).toBe(true);
    expect(geometry.documentHeight).toBeLessThanOrEqual(
      geometry.viewportHeight,
    );
    expect(geometry.weaknessRecordsInside).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-setup.png`),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await expect(page.locator('#playerTwoCharacterId')).toHaveAttribute(
      'data-character-id',
      'red-folded-chairman',
    );
    await expect(page.locator('#playerTwoCharacterId')).toHaveAttribute(
      'data-skin-id',
      'alternate',
    );
  });
}

test('selected skins reach the match without changing character identity', async (
  { page },
  testInfo,
) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page
    .getByRole('button', { name: 'Next skin for Player one' })
    .click();
  await page.getByRole('button', { name: 'Start match' }).click();

  const redPlayer = page.locator('.match-player[data-side="red"]');
  const bluePlayer = page.locator('.match-player[data-side="blue"]');
  await expect(redPlayer.getByRole('heading')).toHaveText(
    'Red-Folded Chairman',
  );
  await expect(redPlayer.locator('.character-portrait')).toHaveAttribute(
    'src',
    /red-folded-chairman--alternate/u,
  );
  await expect(bluePlayer.getByRole('heading')).toHaveText('Thunder Tribune');
  await expect(bluePlayer.locator('.character-portrait')).toHaveAttribute(
    'src',
    /thunder-tribune(?!.*--alternate)/u,
  );
  await redPlayer.locator('.character-portrait').evaluate(async (portrait) => {
    await (portrait as HTMLImageElement).decode();
  });
  await page.screenshot({
    path: testInfo.outputPath('alternate-skin-match.png'),
    fullPage: true,
  });
});

test('every alternate portrait decodes while roster portraits stay canonical', async (
  { page },
  testInfo,
) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();

  for (const characterId of [
    'red-folded-chairman',
    'thunder-tribune',
    'black-sea-captain',
  ]) {
    await page.locator('#playerOneCharacterId').click();
    await page
      .locator(`.roster-choice[data-character-id="${characterId}"]`)
      .click();
    const stage = page.locator('#playerOneCharacterId');
    if ((await stage.getAttribute('data-skin-id')) !== 'alternate') {
      await page
        .getByRole('button', { name: 'Next skin for Player one' })
        .click();
    }
    await expect(stage).toHaveAttribute('data-skin-id', 'alternate');
    const portrait = page.locator(
      '.contestant-stage--one .contestant-portrait',
    );
    await expect(portrait).toHaveAttribute(
      'src',
      new RegExp(`${characterId}--alternate`, 'u'),
    );
    expect(
      await portrait.evaluate(async (image) => {
        await (image as HTMLImageElement).decode();
        return (image as HTMLImageElement).naturalWidth;
      }),
    ).toBeGreaterThan(0);
  }

  expect(
    await page.locator('.roster-headshot').evaluateAll((portraits) =>
      portraits.every(
        (portrait) => !(portrait as HTMLImageElement).src.includes('--alternate'),
      ),
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('black-sea-captain-alternate-setup.png'),
    fullPage: true,
  });
});

test('approved Curtain Call title fits its comp viewport and uses the match fonts', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto('');
  const title = page.locator('.title-screen');
  await expect(title).toBeVisible();
  await expect(page.locator('.title-emblem')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(
    page.getByText('A Verbal Republic', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set up match' }),
  ).toBeVisible();

  const facts = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>('#game-title')!;
    const main = document.querySelector<HTMLElement>('.title-screen')!;
    const emblem = document.querySelector<HTMLElement>('.title-emblem')!;
    const action = document.querySelector<HTMLElement>(
      '.title-transmission button',
    )!;
    const subtitle = document.querySelector<HTMLElement>('.subtitle')!;
    const status = document.querySelector<HTMLElement>('.status')!;
    const transmission = document.querySelector<HTMLElement>(
      '.title-transmission',
    )!;
    const disclaimer =
      document.querySelector<HTMLElement>('.title-disclaimer')!;
    const subtitleBox = subtitle.getBoundingClientRect();
    const statusBox = status.getBoundingClientRect();
    const railStyle = getComputedStyle(transmission, '::after');
    return {
      headingFont: getComputedStyle(heading).fontFamily,
      interfaceFont: getComputedStyle(main).fontFamily,
      actionFont: getComputedStyle(action).fontFamily,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      emblemWidthRatio:
        emblem.getBoundingClientRect().width /
        document.documentElement.clientWidth,
      subtitleStatusGap: statusBox.top - subtitleBox.bottom,
      railHeight: Number.parseFloat(railStyle.height),
      railWidth: Number.parseFloat(railStyle.width),
      railContent: railStyle.content,
      requiredInside: [
        heading,
        emblem,
        subtitle,
        status,
        action,
        disclaimer,
      ].every((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= document.documentElement.clientWidth &&
          box.bottom <= document.documentElement.clientHeight
        );
      }),
    };
  });
  expect(facts.headingFont).toContain('Poiret One');
  expect(facts.actionFont).toContain('Poiret One');
  expect(facts.interfaceFont).toContain('Rubik Variable');
  expect(
    [facts.headingFont, facts.actionFont, facts.interfaceFont].join(' '),
  ).not.toMatch(/Barlow|Georgia/u);
  expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth);
  expect(facts.documentHeight).toBeLessThanOrEqual(facts.viewportHeight);
  expect(facts.requiredInside).toBe(true);
  expect(facts.emblemWidthRatio).toBeGreaterThanOrEqual(0.15);
  expect(facts.subtitleStatusGap).toBeGreaterThanOrEqual(0);
  expect(facts.subtitleStatusGap).toBeLessThanOrEqual(facts.railHeight + 8);
  expect(facts.railWidth).toBe(1);
  expect(facts.railContent).not.toBe('none');

  await page.screenshot({
    path: testInfo.outputPath('title-curtain-call-1672x941.png'),
    fullPage: true,
  });
});

test('character dossier supports hover, right-click pinning, and dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();

  const captain = page.locator(
    '.roster-choice[data-character-id="black-sea-captain"]',
  );
  await captain.hover();
  const dossier = page.locator('.character-inspector');
  await expect(dossier).toContainText('Black Sea Captain');
  await expect(dossier).toContainText('Decorum · Consistency · Securitate');
  await expect(dossier).toHaveAttribute('data-pinned', 'false');

  await captain.click({ button: 'right' });
  await page.mouse.move(20, 20);
  await expect(dossier).toHaveAttribute('data-pinned', 'true');
  await expect(dossier).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dossier).toHaveCount(0);
});

test('roster crops candidates to headshots while selected stages reveal full bodies', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();
  const frameOverlay = page.locator(
    '.roster-choice[data-character-id="red-folded-chairman"] .roster-frame-overlay',
  );
  await expect
    .poll(() =>
      frameOverlay.evaluate(
        (image: HTMLImageElement) =>
          image.complete && image.naturalWidth === 1086,
      ),
    )
    .toBe(true);

  const crop = await page.evaluate(() => {
    const rosterPortrait = document.querySelector<HTMLElement>(
      '.roster-choice[data-character-id="red-folded-chairman"] .roster-headshot',
    )!;
    const selectedPortrait = document.querySelector<HTMLElement>(
      '.contestant-stage--one .contestant-portrait',
    )!;
    const rosterFrame = rosterPortrait.closest<HTMLElement>('.roster-choice')!;
    const selectedFrame = document.querySelector<HTMLElement>(
      '.contestant-stage--one .contestant-portrait-frame',
    )!;
    const selectedBox = selectedPortrait.getBoundingClientRect();
    const selectedFrameBox = selectedFrame.getBoundingClientRect();
    const frameOverlay = document.querySelector<HTMLImageElement>(
      '.roster-choice[data-character-id="red-folded-chairman"] .roster-frame-overlay',
    )!;
    const headClearances = [
      ...document.querySelectorAll<HTMLImageElement>('.roster-headshot'),
    ].map((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        Math.floor(canvas.width * 0.2),
        0,
        Math.ceil(canvas.width * 0.6),
        canvas.height,
      );
      let firstOpaqueRow = canvas.height;
      for (let y = 0; y < pixels.height; y += 1) {
        for (let x = 0; x < pixels.width; x += 1) {
          if (pixels.data[(y * pixels.width + x) * 4 + 3]! > 32) {
            firstOpaqueRow = y;
            break;
          }
        }
        if (firstOpaqueRow !== canvas.height) break;
      }
      const scale = new DOMMatrix(getComputedStyle(image).transform).d;
      return (
        (firstOpaqueRow / image.naturalHeight) * image.clientHeight * scale
      );
    });
    const rosterTransform = new DOMMatrix(
      getComputedStyle(rosterPortrait).transform,
    );
    const selectedTransform = new DOMMatrix(
      getComputedStyle(selectedPortrait).transform,
    );
    return {
      rosterScale: rosterTransform.a,
      selectedScale: selectedTransform.a,
      rosterClientHeight: rosterPortrait.clientHeight,
      selectedClientHeight: selectedPortrait.clientHeight,
      rosterFrameRatio:
        rosterFrame.getBoundingClientRect().width /
        rosterFrame.getBoundingClientRect().height,
      selectedObjectFit: getComputedStyle(selectedPortrait).objectFit,
      selectedInside:
        selectedBox.top >= selectedFrameBox.top &&
        selectedBox.left >= selectedFrameBox.left &&
        selectedBox.right <= selectedFrameBox.right &&
        selectedBox.bottom <= selectedFrameBox.bottom,
      selectedFade: getComputedStyle(selectedFrame, '::after').content,
      frameLoaded: frameOverlay.complete && frameOverlay.naturalWidth === 1086,
      headClearances,
    };
  });

  expect(crop.rosterScale).toBeGreaterThanOrEqual(3);
  expect(crop.selectedScale).toBe(1);
  expect(crop.rosterClientHeight).toBeLessThan(crop.selectedClientHeight);
  expect(crop.rosterFrameRatio).toBeCloseTo(0.75, 2);
  expect(crop.selectedObjectFit).toBe('contain');
  expect(crop.selectedInside).toBe(true);
  expect(crop.selectedFade).toBe('none');
  expect(crop.frameLoaded).toBe(true);
  expect(crop.headClearances).toHaveLength(3);
  expect(crop.headClearances.every((clearance) => clearance >= 4)).toBe(true);
});

test('duplicate setup submit dispatches one immutable command', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  await page.getByRole('button', { name: 'Set up match' }).click();

  const eventFacts = await page.evaluate(() => {
    const app = document.querySelector('grand-transition-app')!;
    const facts = { count: 0, frozen: false, composed: false };
    app.addEventListener('start-match', (event) => {
      const command = event as CustomEvent;
      facts.count += 1;
      facts.frozen = Object.isFrozen(command.detail);
      facts.composed = command.composed;
    });
    const form = document.querySelector('form')!;
    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    return facts;
  });

  expect(eventFacts).toEqual({ count: 1, frozen: true, composed: true });
});

for (const viewport of [
  { width: 1023, height: 720 },
  { width: 1024, height: 719 },
  { width: 720, height: 1024 },
  { width: 1200, height: 1600 },
  { width: 1024, height: 1024 },
]) {
  test(`blocks ${viewport.width} by ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('');

    await expect(
      page.locator('[data-interruption="unsupported-viewport"]'),
    ).toBeVisible();
    await expect(page.locator('grand-transition-title')).toHaveCount(0);
    await expect(page.getByText('1024 × 720', { exact: true })).toBeVisible();
    await expect(
      page.getByText('1920 × 1080 on PC', { exact: true }),
    ).toBeVisible();
  });
}
