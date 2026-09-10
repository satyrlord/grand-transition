import { expect, test } from '@playwright/test';
import stateManifest from '../src/assets/characters/states/state-manifest.json' with { type: 'json' };
import characterManifest from '../src/assets/characters/character-manifest.json' with { type: 'json' };

for (const entry of stateManifest.packages) {
  test(`${entry.ownerId} ${entry.skinId} renders nine selected states without layout shift`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { characterStateShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) shifts.push((entry as PerformanceEntry & { value: number }).value);
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const stateRequests: string[] = [];
    const allStateIds = stateManifest.assets.map(({ id }) => id);
    page.on('request', (request) => {
      if (allStateIds.some((id) => request.url().includes('/' + id + '-'))) stateRequests.push(request.url());
    });
    await page.goto('');
    await page.locator('.title-emblem').evaluate((image: HTMLImageElement) => image.decode());
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => (window as unknown as { characterStateShifts: number[] }).characterStateShifts.reduce((a, b) => a + b, 0))).toBeLessThanOrEqual(0.05);
    await page.getByRole('button', { name: 'Set up match', exact: true }).click();
    await page.locator('#playerOneCharacterId').click();
    await page.locator(`.roster-choice[data-character-id="${entry.ownerId}"]`).click();
    const skinIds = characterManifest.assets
      .filter(({ ownerId }) => ownerId === entry.ownerId)
      .map(({ skinId }) => skinId)
      // The setup stage cycles skins in runtime order, not manifest order: the
      // default skin first, then the remaining skins by ID.
      .toSorted((left, right) => left === 'default'
        ? -1
        : right === 'default' ? 1 : left.localeCompare(right));
    const skinIndex = skinIds.indexOf(entry.skinId);
    expect(skinIndex).toBeGreaterThanOrEqual(0);
    const stage = page.locator('#playerOneCharacterId');
    for (let index = 0; index < skinIndex; index++) await stage.click({ button: 'right' });
    await expect(stage).toHaveAttribute('data-skin-id', entry.skinId);
    expect(stateRequests).toEqual([]);
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await expect(page.locator('grand-transition-character')).toHaveCount(2);
    await page.locator('grand-transition-character img').evaluateAll((images: HTMLImageElement[]) => Promise.all(images.map((image) => image.decode())));
    // This art-state fixture selects idle explicitly; active-picker thinking is
    // verified by the gameplay presentation tests.
    await page.locator('grand-transition-character').first().evaluate(async (element) => {
      const presenter = element as HTMLElement & { restState: string; updateComplete: Promise<unknown> };
      presenter.restState = 'idle'; await presenter.updateComplete;
    });
    const allowedIds = stateManifest.assets.filter((asset) =>
      (asset.ownerId === entry.ownerId && asset.skinId === entry.skinId) ||
      (asset.ownerId === 'thunder-tribune' && asset.skinId === 'default'),
    ).map(({ id }) => id);
    expect(stateRequests.length).toBeGreaterThan(0);
    expect(stateRequests.every((url) => allowedIds.some((id) => url.includes('/' + id + '-')))).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const player = page.locator('.match-player[data-side="red"]');
    const selectedAssetId = entry.states.find(({ stateId }) => stateId === 'selection')!.assetId;
    await expect(player.locator('[data-state-id="selection"] img')).toHaveAttribute('src', new RegExp('/' + selectedAssetId + '-960x960'));
    await page.locator('.common-phrases, .sentence-ledger, .match-actions').evaluateAll((elements) =>
      Promise.all(elements.flatMap((element) => element.getAnimations({ subtree: true }).map((animation) => animation.finished))),
    );
    const boxes = await page.locator('.common-phrases, .sentence-ledger, .match-actions').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
    await page.evaluate(() => { (window as unknown as { characterStateShifts: number[] }).characterStateShifts.length = 0; });
    for (const [index, state] of entry.states.entries()) {
      // Supply each public presentation cue through the production snapshot
      // boundary. Gameplay projection is verified by pointer-flow tests.
      await page.locator('grand-transition-match').evaluate(async (element, cue) => {
        const match = element as HTMLElement & { snapshot: { revision: number; players: { portraitCue: unknown }[] }; updateComplete: Promise<unknown> };
        match.snapshot = { ...match.snapshot, revision: cue.sequence,
          players: match.snapshot.players.map((player, index) => index === 0 ? { ...player, portraitCue: cue } : player) };
        await match.updateComplete;
      }, { stateId: state.stateId, sequence: 1000 + index });
      const visible = player.locator('[data-state-visible="true"]');
      await expect(visible).toHaveAttribute('data-state-id', state.stateId);
      await expect(visible.locator('img')).toBeVisible();
      expect(await page.locator('.common-phrases, .sentence-ledger, .match-actions').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))).toEqual(boxes);
      if (['idle', 'heavy-hit', 'grammar-mistake'].includes(state.stateId)) {
        await page.screenshot({ path: testInfo.outputPath(`${entry.ownerId}-${entry.skinId}-${state.stateId}.png`) });
      }
    }
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await page.evaluate(() => (window as unknown as { characterStateShifts: number[] }).characterStateShifts)).toEqual([]);
  });
}
