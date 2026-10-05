import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { isSourcedQuoteReveal } from '../src/content/quote-reveals.ts';
import { encodeQuoteArchive } from '../src/persistence/codecs/quote-archive-codec.ts';
import { defaultSettings, encodeSettings } from '../src/persistence/codecs/settings-codec.ts';
import { quoteArchiveStorageKey } from '../src/persistence/quote-archive.ts';
import { loadGameContent, loadQuoteReveals } from '../tools/load-game-content.ts';
import { readProvenanceRecords, researchFolder } from '../tools/validate-quote-reveals.ts';
import { expect, test } from './helpers/fixtures.ts';
import { useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { lockInSetup } from './helpers/setup.ts';
import { settingsStorageKey, storeDocument, storedJson } from './helpers/stored-data.ts';
import { gateViewports } from './helpers/viewports.ts';

const shipped = loadQuoteReveals();
const sourcedIds = shipped.filter(isSourcedQuoteReveal).map(({ cardId }) => cardId);
const viewports = gateViewports([
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1400, height: 1050 },
  { width: 1920, height: 1080 },
  { width: 640, height: 320 },
]);

test('the build has no private name, link, or source wording (AC-034-02)', () => {
  const provenance = readProvenanceRecords(path.resolve(researchFolder));
  test.skip(provenance === null, 'The private research folder does not exist here.');
  const shippedById = new Map(shipped.map((record) => [record.cardId, record]));
  const values = (cell: string | undefined) =>
    (cell ?? '')
      .split(';')
      .map((value) => value.trim().replace(/^<|>$/gu, ''))
      .filter((value) => value.length > 0);
  const forbidden = new Set<string>();
  // Accurate adaptations can retain a short source fragment in authored card text.
  // The privacy contract forbids additional source wording, not the card itself.
  const publicCardForms = loadGameContent().gameCatalog.locales.flatMap(({ messages }) =>
    Object.entries(messages)
      .filter(([key]) => key.startsWith('phrase.'))
      .map(([, value]) => value.toLowerCase()),
  );
  for (const row of provenance!) {
    for (const value of [...values(row.cells.speaker), ...values(row.cells['source url'])]) {
      forbidden.add(value.toLowerCase());
    }
    // The card of a real quote or a real slogan keeps the real wording.
    const record = shippedById.get(row.cardId);
    if (record?.classification === 'adapted-quote') {
      for (const wording of values(row.cells['source wording'])) {
        if (
          wording.split(/\s+/u).length >= 4 &&
          !publicCardForms.some((form) => form.includes(wording.toLowerCase()))
        ) {
          forbidden.add(wording.toLowerCase());
        }
      }
    }
  }
  expect(forbidden.size).toBeGreaterThan(0);

  const found: string[] = [];
  const scan = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      // Model and audio binaries hold no text. Each other file is searched.
      else if (!/\.(?:onnx|wasm|bin|ogg|mp3|wav)$/u.test(entry.name) && statSync(file).size > 0) {
        const text = readFileSync(file).toString('utf8').toLowerCase();
        for (const value of forbidden) {
          if (text.includes(value)) found.push(`${path.relative('dist', file)}: private value`);
        }
      }
    }
  };
  expect(existsSync('dist')).toBe(true);
  scan('dist');
  // A failure names only the file, so the private value stays out of the report.
  expect(found).toEqual([]);
  // No reveal record has a link or an address.
  expect(JSON.stringify(shipped)).not.toMatch(/http|www\.|@/iu);
});

async function openTitle(page: Page, interfaceLocale: 'en' | 'ro-RO'): Promise<void> {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: settingsStorageKey,
    value: encodeSettings({
      ...defaultSettings,
      interfaceLocale,
      gameLocale: interfaceLocale,
      speechEnabled: false,
      gpuVoices: false,
    }),
  });
  await page.goto('/grand-transition/');
}

async function expectDialogInViewport(page: Page, selector: string): Promise<void> {
  const facts = await page.locator(selector).evaluate((dialog) => {
    const box = dialog.getBoundingClientRect();
    return {
      inside:
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= window.innerWidth &&
        box.bottom <= window.innerHeight,
      horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(facts).toEqual({ inside: true, horizontalScroll: false });
}

for (const [interfaceLocale, labels] of [
  ['en', { archive: /Quote archive/u, close: 'Close', adapted: 'Adapted from a real statement' }],
  [
    'ro-RO',
    { archive: /Arhiva de citate/u, close: 'Închide', adapted: 'Adaptare după o declarație reală' },
  ],
] as const) {
  test(`the quote archive survives a reload and fits each viewport in ${interfaceLocale} (AC-034-06, AC-034-07)`, async ({
    page,
  }) => {
    await openTitle(page, interfaceLocale);
    await storeDocument(
      page,
      quoteArchiveStorageKey,
      encodeQuoteArchive({
        schemaVersion: 1,
        cardIds: sourcedIds,
        bestGuess: { correct: 3, total: 5 },
      }),
    );
    await page.reload();
    const action = page.getByRole('button', { name: labels.archive });
    const numbers = new Intl.NumberFormat(interfaceLocale);
    await expect(action).toContainText(
      `(${numbers.format(sourcedIds.length)}/${numbers.format(shipped.length)})`,
    );

    // The keyboard opens the archive, stays in it, and closes it.
    await action.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('.quote-archive-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: labels.close })).toBeFocused();
    await expect(dialog.locator('.quote-receipt')).toHaveCount(sourcedIds.length);
    await expect(dialog.locator('.quote-receipt-label').first()).toBeVisible();
    await expect(dialog.getByText(labels.adapted).first()).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('.quote-archive-list')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: labels.close })).toBeFocused();

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expectDialogInViewport(page, '.quote-archive-dialog');
      if (interfaceLocale === 'en') {
        await page.screenshot({
          path: `.impeccable/review/quote-archive-${viewport.width}x${viewport.height}.png`,
        });
      }
    }

    // Forced colors keep the edge of each slip and its text.
    await page.emulateMedia({ forcedColors: 'active' });
    const slip = await dialog
      .locator('.quote-receipt')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const text = getComputedStyle(element.querySelector('.quote-card-text')!);
        return {
          border: style.borderTopWidth,
          sameColors: text.color === style.backgroundColor,
        };
      });
    expect(slip).toEqual({ border: '1px', sameColors: false });
    await page.emulateMedia({ forcedColors: 'none' });

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(action).toBeFocused();
    expect(await storedJson(page, quoteArchiveStorageKey)).toMatchObject({ cardIds: sourcedIds });
  });
}

test('the receipts panel opens from Victory and from match history (AC-034-03, AC-034-07)', async ({
  page,
}) => {
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.locator('grand-transition-app').evaluate(async (element) => {
    const app = element as HTMLElement & {
      matchState: { activePlayerId: string; playerStates: Record<string, { pride: number }> };
      updateComplete: Promise<boolean>;
    };
    const state = app.matchState;
    app.matchState = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [state.activePlayerId]: { ...state.playerStates[state.activePlayerId]!, pride: 3 },
      },
    };
    await app.updateComplete;
  });
  await page.locator('[data-role="predicate"] button[data-card-state="legal"]').first().click();
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();

  const open = page.getByRole('button', { name: 'Who said that?' });
  await open.click();
  const panel = page.locator('.quote-receipts-dialog');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Victory' })).toHaveCount(0);
  await expect(panel.locator('.quote-receipts-sentence')).toHaveCount(2);
  // No sentence was completed, so no card of a private hand is on the panel.
  await expect(panel.locator('.quote-receipt')).toHaveCount(0);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expectDialogInViewport(page, '.quote-receipts-dialog');
    await page.screenshot({
      path: `.impeccable/review/quote-receipts-${viewport.width}x${viewport.height}.png`,
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  // Escape closes only the panel. The terminal state stays.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(open).toBeFocused();
  await page.getByRole('button', { name: 'Return to main menu' }).click();

  await page.getByRole('button', { name: /Match history.*1/iu }).click();
  await page.getByRole('button', { name: 'Who said that?' }).click();
  await expect(panel).toBeVisible();
  await expect(page.locator('.match-history-dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.match-history-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Who said that?' })).toBeFocused();
});
