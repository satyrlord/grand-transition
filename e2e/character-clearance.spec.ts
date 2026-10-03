import { expect, test } from './helpers/fixtures.ts';
import { gateViewports } from './helpers/viewports.ts';
import {
  checkCharacterClearance,
  clearanceFailures,
  clearancePackages,
  clearanceViewports,
  startClearanceMatch,
} from './helpers/character-clearance.ts';

for (const viewport of gateViewports(clearanceViewports)) {
  for (const entry of clearancePackages) {
    test(`${entry.id} protected art clears speech and stage at ${viewport.width} by ${viewport.height}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await startClearanceMatch(page, entry);
      const samples = await checkCharacterClearance(page, entry);
      const failures = clearanceFailures(samples);
      expect(failures.length, JSON.stringify(failures.slice(0, 3), null, 2)).toBe(0);
    });
  }
}

// These fixed cases reproduce the audited 4:3 defects even in the quick gate.
for (const id of [
  'midnight-sensationalist--alternate',
  'red-folded-chairman',
  'thunder-tribune--alternate',
  'velvet-mogul--silk-diplomat',
  'football-tycoon',
  'algorithmic-prophet',
  'government-ai--schoolteacher',
  'government-ai--alternate',
]) {
  test(`${id} keeps cropped-stage protected art visible at 1024 by 768`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    const entry = clearancePackages.find((entry) => entry.id === id)!;
    await startClearanceMatch(page, entry);
    const samples = await checkCharacterClearance(page, entry, {
      stateIds: ['thinking', 'heavy-hit', 'weakness'],
    });
    const failures = clearanceFailures(samples);
    expect(failures.length, JSON.stringify(failures.slice(0, 3), null, 2)).toBe(0);
  });
}
