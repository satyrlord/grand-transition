import { expect, test } from '@playwright/test';

for (const fixture of [
  { name: 'mechanical default', one: 'government-ai', two: 'government-ai', cycles: 0, facing: ['left', 'left'], mirrored: [true, false] },
  { name: 'mechanical alternate', one: 'government-ai', two: 'government-ai', cycles: 1, facing: ['right', 'right'], mirrored: [false, true] },
  { name: 'foundation and alternate', one: 'algorithmic-prophet', two: 'velvet-mogul', cycles: 3, facing: ['left', 'left'], mirrored: [true, false] },
]) {
  test(`${fixture.name} faces inward in setup and match`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto('');
    await page.getByRole('button', { name: 'Set up match', exact: true }).click();
    for (const [index, field] of ['playerOneCharacterId', 'playerTwoCharacterId'].entries()) {
      await page.locator('#' + field).click();
      await page.locator(`.roster-choice[data-character-id="${index === 0 ? fixture.one : fixture.two}"]`).click();
      const cycles = fixture.name === 'foundation and alternate' && index === 0 ? 0 : fixture.cycles;
      for (let cycle = 0; cycle < cycles; cycle++) await page.locator('#' + field).click({ button: 'right' });
    }
    for (const [index, side] of ['one', 'two'].entries()) {
      const stage = page.locator('.contestant-stage--' + side);
      await expect(stage).toHaveAttribute('data-portrait-facing', fixture.facing[index]!);
      const transform = await stage.locator('.contestant-portrait').evaluate((image) => new DOMMatrix(getComputedStyle(image).transform).a);
      expect(transform).toBe(fixture.mirrored[index] ? -1 : 1);
    }
    await page.getByRole('button', { name: 'Start match', exact: true }).click();
    await page.mouse.move(0, 0);
    for (const [index, side] of ['red', 'blue'].entries()) {
      const frame = page.locator(`.match-player[data-side="${side}"] .character-frame`);
      await expect(frame).toHaveAttribute('data-source-facing', fixture.facing[index]!);
      await expect(frame).toHaveAttribute('data-mirrored', String(fixture.mirrored[index]));
      await frame.locator('img').evaluateAll((images: HTMLImageElement[]) => Promise.all(images.map((image) => image.decode())));
      const transform = await frame.evaluate((element) => {
        const drawing = element.querySelector('[data-state-visible="true"] .character-state-drawing') ?? element.querySelector('picture');
        return new DOMMatrix(getComputedStyle(drawing!).transform).a;
      });
      expect(transform).toBe(fixture.mirrored[index] ? -1 : 1);
    }
    await page.screenshot({ path: testInfo.outputPath('inward-facing-portraits.png') });
  });
}
