import { lockInSetup } from './helpers/setup';
import { expect, test, type Page } from '@playwright/test';
import characterManifest from '../src/assets/characters/character-manifest.json' with { type: 'json' };
import { loadGameContent } from '../tools/load-game-content';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const { sampleContent: catalog } = loadGameContent();

const supportedViewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1920, height: 1080 },
  { width: 360, height: 640 },
  { width: 360, height: 780 },
  { width: 384, height: 832 },
  { width: 412, height: 915 },
  { width: 384, height: 700 },
  { width: 640, height: 320 },
  { width: 780, height: 360 },
  { width: 832, height: 384 },
  { width: 915, height: 412 },
  { width: 700, height: 384 },
  { width: 740, height: 360 },
] as const;

const compactViewports = supportedViewports.filter(
  ({ width, height }) => width < 1024 || height < 720,
);

test.beforeEach(async ({ page }) => {
  await useFixedBrowserMatchSeed(page, 20260913);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const viewport of supportedViewports) {
  test(`all roster skins and scene labels fit setup at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await openSinglePlayerSetup(page, viewport);
    const stage = page.locator('#playerOneCharacterId');
    const stageSurface = page.locator('.contestant-stage--one');

    for (const character of catalog.characters) {
      await stage.click();
      await page.locator(`.roster-choice[data-character-id="${character.id}"][data-skin-id="default"]`).click();
      const expectedSkins = characterManifest.assets.filter(
        ({ ownerId }) => ownerId === character.id,
      );
      const seen = new Set<string>();
      for (let index = 0; index < expectedSkins.length; index += 1) {
        const skinId = await stage.getAttribute('data-skin-id');
        expect(skinId, character.id).toBeTruthy();
        seen.add(skinId!);
        const expectedAsset = expectedSkins.find((asset) => asset.skinId === skinId)!;
        const portrait = stageSurface.locator('.contestant-portrait');
        await expect(portrait).toHaveAttribute('src', new RegExp(expectedAsset.id, 'u'));
        await expect.poll(() => portrait.evaluate((image: HTMLImageElement) =>
          image.complete && image.naturalWidth > 0,
        )).toBe(true);
        expect(await portrait.evaluate((image: HTMLImageElement) => {
          const box = image.getBoundingClientRect();
          const stageBox = image.closest('.contestant-stage')!.getBoundingClientRect();
          return image.naturalWidth > 0 && box.left >= stageBox.left - 1 &&
            box.right <= stageBox.right + 1 && box.top >= stageBox.top - 1 &&
            box.bottom <= stageBox.bottom + 1;
        })).toBe(true);
        if (expectedSkins.length > 1) {
          await page.locator('.contestant-stage--one .skin-cycle--next').click();
        }
      }
      expect(seen, character.id).toEqual(new Set(expectedSkins.map(({ skinId }) => skinId)));
      await expect(stageSurface.locator('.contestant-record strong')).toHaveText(
        catalog.locales[0]!.messages[character.nameKey]!,
      );
    }

    const scene = page.getByLabel('Scene', { exact: true });
    await expect(page.locator('.scene-selected-text')).toHaveCSS('pointer-events', 'none');
    for (const entry of catalog.scenes) {
      await scene.selectOption(entry.id);
      await expect(scene).toHaveValue(entry.id);
    }
    const labelGeometry = await scene.evaluate((select: HTMLSelectElement) => {
      const style = getComputedStyle(select);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = style.font;
      const available = select.clientWidth - Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight) - 12;
      return [...select.options].map((option) => ({
        text: option.text,
        fits: context.measureText(option.text).width <= available,
      }));
    });
    expect(labelGeometry.filter(({ fits }) => !fits)).toEqual([]);

    const characterNames = catalog.characters.map(
      ({ nameKey }) => catalog.locales[0]!.messages[nameKey]!,
    );
    const sceneNames = catalog.scenes.map(
      ({ nameKey }) => catalog.locales[0]!.messages[nameKey]!,
    );
    const longestCharacterName = characterNames.toSorted(
      (left, right) => right.length - left.length,
    )[0]!;
    const longestSceneName = sceneNames.toSorted(
      (left, right) => right.length - left.length,
    )[0]!;
    const longestCharacter = catalog.characters.find(
      ({ nameKey }) => catalog.locales[0]!.messages[nameKey] === longestCharacterName,
    )!;
    await stage.click();
    await page.locator(`.roster-choice[data-character-id="${longestCharacter.id}"][data-skin-id="default"]`).click();
    const expandedLabels = await page.evaluate(({ characterName, sceneName }) => {
      const expand = (value: string) =>
        (value + ' ' + value).slice(0, Math.ceil(value.length * 1.4));
      const character = document.querySelector<HTMLElement>(
        '.contestant-stage--one .contestant-record strong',
      )!;
      const scene = document.querySelector<HTMLElement>(
        '.scene-selected-text',
      )!;
      const sceneSelect = document.querySelector<HTMLSelectElement>('#sceneId')!;
      const sceneOption = [...sceneSelect.options].find((option) => option.text === sceneName)!;
      sceneSelect.value = sceneOption.value;
      sceneOption.text = expand(sceneName);
      character.textContent = expand(characterName);
      scene.textContent = sceneOption.text;
      const evidence = (element: HTMLElement, source: string) => {
        const box = element.getBoundingClientRect();
        const containerBox = element.parentElement!.getBoundingClientRect();
        const textRange = document.createRange();
        textRange.selectNodeContents(element);
        const textBox = textRange.getBoundingClientRect();
        return {
          source,
          rendered: element.textContent!,
          targetLength: Math.ceil(source.length * 1.4),
          horizontallyInside: box.left >= -1 && box.right <= innerWidth + 1,
          textFits: textBox.left >= containerBox.left - 1 &&
            textBox.right <= containerBox.right + 1 &&
            textBox.top >= containerBox.top - 1 &&
            textBox.bottom <= containerBox.bottom + 1,
        };
      };
      return {
        character: evidence(character, characterName),
        scene: evidence(scene, sceneName),
        pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
      };
    }, { characterName: longestCharacterName, sceneName: longestSceneName });
    for (const [label, evidence] of [
      ['character', expandedLabels.character],
      ['scene', expandedLabels.scene],
    ] as const) {
      expect(evidence.rendered).toHaveLength(evidence.targetLength);
      expect(evidence.rendered.length).toBeGreaterThan(evidence.source.length);
      expect(evidence.horizontallyInside).toBe(true);
      expect(evidence.textFits, `${label}: ${JSON.stringify(evidence)}`).toBe(true);
    }
    expect(expandedLabels.pageFits).toBe(true);
  });
}

for (const viewport of [
  { width: 1024, height: 720 },
  { width: 360, height: 640 },
] as const) {
  test(`every discovered skin reaches both match sides at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(300_000);
    for (const asset of characterManifest.assets) {
      await openSinglePlayerSetup(page, viewport);
      await selectSkin(page, 'one', asset);
      await page.getByTestId('lock-player-one').click();
      await selectSkin(page, 'two', asset);
      const longestScene = catalog.scenes.toSorted((left, right) =>
        catalog.locales[0]!.messages[right.nameKey]!.length -
        catalog.locales[0]!.messages[left.nameKey]!.length)[0]!;
      await page.getByLabel('Scene', { exact: true }).selectOption(longestScene.id);
      await lockInSetup(page);
      await page.getByRole('button', { name: 'Start match', exact: true }).click();

      const character = catalog.characters.find(({ id }) => id === asset.ownerId)!;
      const expectedName = catalog.locales[0]!.messages[character.nameKey]!
        .replace(/^The /u, '');
      for (const side of ['red', 'blue'] as const) {
        const player = page.locator(`.match-player[data-side="${side}"]`);
        await expect(player.getByRole('heading')).toHaveText(expectedName);
        await expect(player.locator('.character-frame img').first()).toHaveAttribute(
          'src',
          new RegExp(asset.id, 'u'),
        );
        const geometry = await player.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const heading = element.querySelector<HTMLElement>('h2')!;
          return {
            horizontallyInside: box.left >= -1 && box.right <= innerWidth + 1,
            nameFits: heading.scrollWidth <= heading.clientWidth + 1 &&
              heading.scrollHeight <= heading.clientHeight + 1,
          };
        });
        expect(geometry, `${asset.id}:${side}`).toEqual({
          horizontallyInside: true,
          nameFits: true,
        });
      }
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}

for (const scene of catalog.scenes) {
  test(`${scene.id} stays horizontally contained at every compact viewport`, async ({ page }, testInfo) => {
    await openSinglePlayerSetup(page, compactViewports[0]!);
    await page.getByLabel('Scene', { exact: true }).selectOption(scene.id);
    await lockInSetup(page);
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    for (const viewport of compactViewports) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => page.locator('img').evaluateAll((images) =>
        images.every((image) => {
          const candidate = image as HTMLImageElement;
          return candidate.complete && candidate.naturalWidth > 0;
        }),
      )).toBe(true);
      await expect(page.locator('.broadcast-stage-art')).toHaveAttribute('data-scene-asset', scene.id);
      const geometry = await page.evaluate(() => {
        const required = [...document.querySelectorAll<HTMLElement>(
          '.match-status-rail, .match-player, .sentence-ledger, .shared-board > li, .private-hand ol > li, .match-actions button, .match-pause',
        )];
        const stage = document.querySelector('.match-stage')!.getBoundingClientRect();
        const pool = document.querySelector('.common-phrases')!.getBoundingClientRect();
        return {
          pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
          requiredFit: required.every((element) => {
            const box = element.getBoundingClientRect();
            return box.left >= -1 && box.right <= innerWidth + 1;
          }),
          portraitOrder: innerHeight <= innerWidth || pool.top >= stage.bottom - 1,
        };
      });
      expect(geometry, `${scene.id} ${viewport.width}x${viewport.height}`).toEqual({
        pageFits: true,
        requiredFit: true,
        portraitOrder: true,
      });
    }
    await page.screenshot({ path: testInfo.outputPath(`${scene.id}-compact.png`), fullPage: true });
  });
}

async function openSinglePlayerSetup(
  page: Page,
  viewport: Readonly<{ width: number; height: number }>,
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('');
  if (viewport.height > viewport.width) {
    await page.getByRole('button', { name: 'Continue in portrait' }).click();
  }
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select your debaters' })).toBeVisible();
}

async function selectSkin(
  page: Page,
  side: 'one' | 'two',
  asset: (typeof characterManifest.assets)[number],
): Promise<void> {
  const field = page.locator(side === 'one' ? '#playerOneCharacterId' : '#playerTwoCharacterId');
  const stage = page.locator(`.contestant-stage--${side}`);
  await field.click();
  await page.locator(`.roster-choice[data-character-id="${asset.ownerId}"][data-skin-id="default"]`).click();
  const skinCount = characterManifest.assets.filter(
    ({ ownerId }) => ownerId === asset.ownerId,
  ).length;
  for (let index = 0; index < skinCount && await field.getAttribute('data-skin-id') !== asset.skinId; index += 1) {
    await stage.locator('.skin-cycle--next').click();
  }
  await expect(field).toHaveAttribute('data-character-id', asset.ownerId);
  await expect(field).toHaveAttribute('data-skin-id', asset.skinId);
}
