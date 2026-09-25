import { lockInSetup } from './helpers/setup.ts';
import { useFixedBrowserMatchSeed } from './helpers/match-flow.ts';
import { expect, test, type Page } from '@playwright/test';
import captainContent from '../src/content/characters/black-sea-captain-phrase-cards.json' with { type: 'json' };
// Keep this spec free of application modules that pull in Vite-only virtual
// imports: Playwright loads it through the default ESM loader.
import {
  displayWeaknessName,
  romanianCharacterNames,
  romanianSceneNames,
} from '../src/localization/romanian-display-names.ts';

import {
  removeStoredDocument,
  settingsStorageKey as settingsKey,
  storeDocument,
  storedHistory,
  storedJson,
} from './helpers/stored-data.ts';

const romanianSettings = {
  schemaVersion: 3,
  interfaceLocale: 'ro-RO',
  gameLocale: 'en',
  masterVolume: 1,
  musicVolume: 0,
  effectsVolume: 0.8,
  speechVolume: 0.8,
  speechEnabled: false,
  gpuVoices: false,
  speechVoiceUri: null,
  speechRate: 1,
  turnTimerSeconds: 30,
  autoComplete: true,
  tutorialMode: false,
  basePointsMultiplier: 4,
};

async function openSettings(page: Page): Promise<void> {
  await page.locator('.title-settings-action').click();
  await expect(page.locator('.settings-dialog')).toBeVisible();
}

test('switches the whole interface to Romanian, keeps focus, and restores English', async ({
  page,
}) => {
  await page.goto('/grand-transition/');
  await removeStoredDocument(page, settingsKey);
  await page.reload();
  await openSettings(page);

  const select = page.locator('select[name="interfaceLocale"]');
  const gameSelect = page.locator('select[name="gameLocale"]');
  await expect(select).toHaveValue('en');
  await expect(gameSelect).toHaveValue('ro-RO');
  await expect(select.getByRole('option', { name: 'English', exact: true })).toHaveCount(1);
  await expect(select.getByRole('option', { name: 'Română', exact: true })).toHaveCount(1);
  await expect(gameSelect.getByRole('option', { name: 'English', exact: true })).toHaveCount(1);
  await expect(gameSelect.getByRole('option', { name: 'Română', exact: true })).toHaveCount(1);

  await select.focus();
  await select.selectOption('ro-RO');

  await expect(page.locator('#settings-title')).toHaveText('Setări');
  await expect(page.getByText('Limba interfeței')).toBeVisible();
  await expect(page.getByText('Limba jocului')).toBeVisible();
  await expect(page.locator('.settings-language select')).toHaveCount(2);
  await expect(select).toBeFocused();
  await expect(gameSelect).toHaveValue('ro-RO');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ro-RO');

  await expect
    .poll(() => storedJson(page, settingsKey))
    .toMatchObject({
      schemaVersion: 3,
      interfaceLocale: 'ro-RO',
      gameLocale: 'ro-RO',
      tutorialMode: false,
    });

  await page.getByRole('button', { name: 'Închide', exact: true }).first().click();
  await expect(page.locator('.title-settings-action')).toHaveText('Setări');
  await expect(page.locator('.status')).toHaveText('În direct, pe Canalul 3 NTV!');
  await expect(page.getByRole('button', { name: 'Un jucător' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Doi jucători', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Campanie', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Setări');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ro-RO');

  await page.locator('.title-settings-action').click();
  await page.locator('select[name="interfaceLocale"]').selectOption('en');
  await expect(page.locator('#settings-title')).toHaveText('Settings');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect
    .poll(() => storedJson(page, settingsKey))
    .toMatchObject({ interfaceLocale: 'en', tutorialMode: false });
});

test('rejects a document stored before the interface language existed', async ({ page }) => {
  await page.goto('/grand-transition/');
  await storeDocument(
    page,
    settingsKey,
    JSON.stringify({
      schemaVersion: 1,
      masterVolume: 1,
      musicVolume: 0.1,
      effectsVolume: 0.8,
      speechVolume: 0.8,
      speechEnabled: false,
      gpuVoices: false,
      speechVoiceUri: 'retired:voice',
      speechRate: 1.2,
      turnTimerSeconds: 30,
      autoComplete: true,
      tutorialMode: false,
      basePointsMultiplier: 5,
    }),
  );
  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  await expect(page.locator('.title-settings-notice')).toBeVisible();
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('en');
  // The rejected document keeps its bytes until the next explicit change.
  expect((await storedJson(page, settingsKey))?.schemaVersion).toBe(1);
});

test('keeps the interface Romanian while game text stays in the game language', async ({
  page,
}) => {
  // Baseline: read the English display name the application shows when both
  // languages are English, so the Romanian case can prove it is unchanged.
  await page.goto('/grand-transition/');
  await removeStoredDocument(page, settingsKey);
  await page.reload();
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  const englishName = (await page
    .locator('.contestant-record strong')
    .first()
    .textContent())!.trim();
  const englishCharacterId = await page
    .locator('.contestant-stage--one')
    .getAttribute('data-character-id');
  expect(englishName.length).toBeGreaterThan(0);

  await page.goto('/grand-transition/');
  await storeDocument(page, settingsKey, JSON.stringify(romanianSettings));
  await page.reload();

  await page.getByRole('button', { name: 'Un jucător' }).click();
  const contestantName = page.locator('.contestant-record strong').first();
  const selectedCharacterId = await page
    .locator('.contestant-stage--one')
    .getAttribute('data-character-id');
  expect(selectedCharacterId).toBe(englishCharacterId);
  // A debater name is interface copy, so the Romanian interface shows the
  // Romanian name even though the game language is English.
  expect(englishName).not.toBe(romanianCharacterNames[selectedCharacterId!]);
  await expect(contestantName).toHaveText(romanianCharacterNames[selectedCharacterId!]!);
  await expect(contestantName).not.toHaveAttribute('lang');
  await expect(page.locator('#setup-title')).toHaveText('Alege oratorii');
  for (const [id, name] of Object.entries(romanianCharacterNames)) {
    await expect(
      page.locator(`.roster-choice[data-character-id="${id}"][data-skin-id="default"]`),
    ).toContainText(name);
  }
  await expect(
    page.locator('#sceneId option[value="transition-era-television-studio"]'),
  ).toHaveText(romanianSceneNames['transition-era-television-studio']!);
  await expect(page.locator('.roster-choice').first()).toHaveAccessibleName(/Slăbiciuni/u);
  const alternate = page.locator('.roster-choice[data-skin-id="alternate"]').first();
  await expect(alternate).toHaveAccessibleName(/Alternativ/u);
  await expect(alternate.locator('.visually-hidden span').nth(1)).not.toHaveAttribute('lang');
  await expect(page.locator('.contestant-stage-target').first()).toHaveAccessibleName(
    /^Tu, personaj:/u,
  );
  await expect(page.locator('#sceneId option').first()).not.toHaveAttribute('lang');
  await expect(page.getByTestId('lock-player-one')).toHaveText('Confirmă alegerea');

  await lockInSetup(page);
  await page.getByRole('button', { name: 'Începe meciul' }).click();
  await expect(page.locator('.match-player h2').first()).toHaveText(
    romanianCharacterNames[selectedCharacterId!]!,
  );
  await expect(page.locator('.match-player h2').first()).not.toHaveAttribute('lang');
  const finishAction = page.locator('.match-actions .action-primary').first();
  await expect(finishAction.locator('.action-title')).toHaveText('Gata');
  for (const viewport of [
    { width: 640, height: 320 },
    { width: 700, height: 384 },
    { width: 740, height: 360 },
    { width: 780, height: 360 },
    { width: 832, height: 384 },
    { width: 915, height: 412 },
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const fits = await finishAction.evaluate((button) => {
      const label = button.querySelector('.action-title')!;
      const text = document.createRange();
      text.selectNodeContents(label);
      const glyphs = text.getBoundingClientRect();
      const frame = button.getBoundingClientRect();
      return glyphs.left >= frame.left - 1 && glyphs.right <= frame.right + 1;
    });
    expect(fits, `${viewport.width}×${viewport.height}`).toBe(true);
  }
  await page.setViewportSize({ width: 1024, height: 720 });
  await expect(page.locator('.sentence-preview')).not.toHaveAttribute('lang', 'en');
  await expect(page.locator('.sentence-preview')).toHaveText(
    'Alege un substantiv pentru a începe.',
  );
  await expect(page.locator('.card-phrase').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('.shared-board button.phrase-card').first()).toHaveAccessibleName(
    /Comună/u,
  );
  await expect(page.locator('.shared-board button.phrase-card').first()).toHaveAttribute(
    'aria-labelledby',
    /phrase-label-Shared/u,
  );

  await page.locator('.match-pause').click();
  const pausePanel = page.locator('grand-transition-interruption .interruption-screen');
  await expect(pausePanel).toBeVisible();
  await expect(page.locator('.interruption-actions--paused')).toBeVisible();
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveCount(0);
  await expect(page.locator('select[name="gameLocale"]')).toHaveCount(0);
  await expect(page.locator('.settings-dialog')).toHaveCount(0);
  await expect(pausePanel.getByText('Pauză', { exact: true }).first()).toBeVisible();
  await expect(pausePanel.getByText('Colorarea expresiilor')).toBeVisible();
  await expect(pausePanel.getByRole('button', { name: 'Da' }).first()).toBeVisible();
  await expect(pausePanel.getByRole('button', { name: 'Nu' }).first()).toBeVisible();
});

test('plays Romanian game text under an English interface and annotates it', async ({ page }) => {
  // Baseline: the English interface names the default debater.
  await page.goto('/grand-transition/');
  await removeStoredDocument(page, settingsKey);
  await page.reload();
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  const englishName = (await page
    .locator('.contestant-record strong')
    .first()
    .textContent())!.trim();
  const englishCharacterId = await page
    .locator('.contestant-stage--one')
    .getAttribute('data-character-id');
  expect(englishName.length).toBeGreaterThan(0);

  await page.goto('/grand-transition/');
  await storeDocument(
    page,
    settingsKey,
    JSON.stringify({ ...romanianSettings, interfaceLocale: 'en', gameLocale: 'ro-RO' }),
  );
  await page.reload();

  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  await expect(page.locator('#setup-title')).toHaveText('Select your debaters');

  const contestantName = page.locator('.contestant-record strong').first();
  const selectedCharacterId = await page
    .locator('.contestant-stage--one')
    .getAttribute('data-character-id');
  expect(selectedCharacterId).toBe(englishCharacterId);
  // The interface language names the debater, so the English interface keeps
  // the English name even though the game language is Romanian.
  expect(englishName).not.toBe(romanianCharacterNames[selectedCharacterId!]);
  await expect(contestantName).toHaveText(englishName);
  await expect(contestantName).not.toHaveAttribute('lang');
  for (const [id, name] of Object.entries(romanianCharacterNames)) {
    await expect(
      page.locator(`.roster-choice[data-character-id="${id}"][data-skin-id="default"]`),
    ).not.toContainText(name);
  }
  for (const [id, name] of Object.entries(romanianSceneNames)) {
    await expect(page.locator(`#sceneId option[value="${id}"]`)).not.toHaveText(name);
  }
  // A weakness label is interface copy too, so the English interface keeps the
  // English label while the phrases and sentences are Romanian.
  const captain = page.locator(
    '.roster-choice[data-character-id="black-sea-captain"][data-skin-id="default"]',
  );
  await expect(captain).toHaveAccessibleName(
    new RegExp(
      captainContent.weaknessTags.map((tag) => displayWeaknessName(tag, 'en')).join(', '),
      'u',
    ),
  );
  await expect(captain).not.toHaveAccessibleName(/Fosta Securitate/u);
  await expect(page.locator('#sceneId option').first()).not.toHaveAttribute('lang');
  // With an English interface the unlocked action keeps its English wording.
  await expect(page.getByTestId('lock-player-one')).toHaveText('Confirm selection');

  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).click();
  // The match heading abbreviates a leading "The " from the English name.
  await expect(page.locator('.match-player h2').first()).toHaveText(
    englishName.replace(/^The\s+/u, ''),
  );
  await expect(page.locator('.match-player h2').first()).not.toHaveAttribute('lang');
  await expect(
    page.locator('.match-actions .action-primary').first().locator('.action-title'),
  ).toHaveText('End');
  // Interface copy stays English while game cards are Romanian.
  await expect(page.locator('.sentence-preview')).toHaveText('Select a noun to begin.');
  await expect(page.locator('.card-phrase').first()).toHaveAttribute('lang', 'ro-RO');
});

test('fits Romanian settings across the landscape matrix with keyboard and forced colors', async ({
  page,
}) => {
  await page.goto('/grand-transition/');
  await storeDocument(page, settingsKey, JSON.stringify(romanianSettings));
  await page.reload();

  for (const viewport of [
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1400, height: 1050 },
    { width: 1920, height: 1080 },
    { width: 640, height: 320 },
    { width: 780, height: 360 },
    { width: 832, height: 384 },
    { width: 915, height: 412 },
    { width: 700, height: 384 },
    { width: 740, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await openSettings(page);
    await expect(page.locator('#settings-title')).toHaveText('Setări');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          clipped: [...document.querySelectorAll('.settings-select, .settings-dialog button')].some(
            (element) => element.getBoundingClientRect().width === 0,
          ),
          dialogInside: (() => {
            const box = document.querySelector('.settings-dialog')!.getBoundingClientRect();
            return (
              box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
            );
          })(),
        })),
      )
      .toEqual({ overflow: 0, clipped: false, dialogInside: true });
    await page.locator('select[name="interfaceLocale"]').focus();
    await expect(page.locator('select[name="interfaceLocale"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('select[name="gameLocale"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.settings-dialog')).toContainText('Setări');
    await page.getByRole('button', { name: 'Închide', exact: true }).first().click();
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toBeVisible();
  await expect(page.locator('select[name="gameLocale"]')).toBeVisible();
});

test('defaults a new installation to an English interface and Romanian game text', async ({
  page,
}) => {
  await page.goto('/grand-transition/');
  await removeStoredDocument(page, settingsKey);
  await page.reload();

  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('en');
  await expect(page.locator('select[name="gameLocale"]')).toHaveValue('ro-RO');
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();

  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).click();
  // The interface stays English while the shared board renders Romanian game
  // prose annotated with the game locale it belongs to.
  await expect(
    page.locator('.match-actions .action-primary').first().locator('.action-title'),
  ).toHaveText('End');
  await expect(page.locator('.shared-board .phrase-card .card-phrase').first()).toHaveAttribute(
    'lang',
    'ro-RO',
  );
  // Selecting a shared card passes the tablet, so the draft returns to the
  // first player only after the second shared selection.
  const legalNoun = page.locator(
    '.shared-board [data-role="noun"] button[data-card-state="legal"]',
  );
  await legalNoun.first().click();
  await legalNoun.first().click();
  await expect(page.locator('.sentence-preview')).toHaveAttribute('lang', 'ro-RO');
  await expect(page.locator('.sentence-preview')).not.toHaveText('Select a noun to begin.');
});

test('keeps both language drop-downs independent at every combination', async ({ page }) => {
  await page.goto('/grand-transition/');
  await removeStoredDocument(page, settingsKey);
  await page.reload();
  await openSettings(page);

  const interfaceSelect = page.locator('select[name="interfaceLocale"]');
  const gameSelect = page.locator('select[name="gameLocale"]');
  // The fresh defaults already ship the Romanian game language, so the
  // independence evidence starts from the English selection instead.
  await expect(interfaceSelect).toHaveValue('en');
  await expect(gameSelect).toHaveValue('ro-RO');

  await gameSelect.focus();
  await gameSelect.selectOption('en');
  await expect(gameSelect).toHaveValue('en');
  await expect(interfaceSelect).toHaveValue('en');
  await expect(page.locator('#settings-title')).toHaveText('Settings');
  await expect(gameSelect).toBeFocused();
  await expect
    .poll(() => storedJson(page, settingsKey))
    .toMatchObject({ schemaVersion: 3, interfaceLocale: 'en', gameLocale: 'en' });

  await interfaceSelect.focus();
  await interfaceSelect.selectOption('ro-RO');
  await expect(page.locator('#settings-title')).toHaveText('Setări');
  await expect(gameSelect).toHaveValue('en');
  await expect(interfaceSelect).toBeFocused();

  await page.reload();
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('ro-RO');
  await expect(page.locator('select[name="gameLocale"]')).toHaveValue('en');
});

test('rejects a document stored before the game language existed', async ({ page }) => {
  await page.goto('/grand-transition/');
  await storeDocument(
    page,
    settingsKey,
    JSON.stringify({ ...romanianSettings, schemaVersion: 2, interfaceLocale: 'en' }),
  );
  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('en');
  // The rejected document falls back to the shipped defaults, whose game
  // language is Romanian.
  await expect(page.locator('select[name="gameLocale"]')).toHaveValue('ro-RO');
  // The rejected document keeps its bytes until the next explicit change.
  expect((await storedJson(page, settingsKey))?.schemaVersion).toBe(2);
});

test('uses Romanian history dates without changing stored English match results', async ({
  page,
}) => {
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await storeDocument(
    page,
    settingsKey,
    JSON.stringify({ ...romanianSettings, interfaceLocale: 'en' }),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup(page);
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.locator('grand-transition-app').evaluate(async (element) => {
    const app = element as HTMLElement & {
      matchState: { activePlayerId: string; playerStates: Record<string, { pride: number }> };
      updateComplete: Promise<boolean>;
    };
    const state = app.matchState;
    const loserId = state.activePlayerId;
    app.matchState = {
      ...state,
      playerStates: {
        ...state.playerStates,
        [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
      },
    };
    await app.updateComplete;
  });
  await page.locator('[data-role="predicate"] button[data-card-state="legal"]').first().click();
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to main menu' }).click();
  await expect.poll(async () => (await storedHistory(page)).length).toBe(1);
  const saved = await storedHistory(page);
  const stored = JSON.parse(saved[0]!) as {
    matchLog: {
      winner: string;
      setup: { sceneId: string; players: Array<{ playerId: string; characterId: string }> };
    };
  };
  const recorded = stored.matchLog;
  const winnerId = recorded.setup.players.find(
    ({ playerId }) => playerId === recorded.winner,
  )!.characterId;
  // Read the entry as recorded, in English, before the interface changes. The
  // document language is already English then, so nothing needs an annotation.
  await page.locator('.title-history-action').click();
  const winnerName = (await page
    .locator('.match-history-entry h3 span')
    .first()
    .textContent())!.trim();
  const sceneName = (await page.locator('.match-history-facts dd').nth(2).textContent())!.trim();
  expect(winnerName.length).toBeGreaterThan(0);
  expect(winnerName).not.toBe(romanianCharacterNames[winnerId]);
  expect(sceneName).not.toBe(romanianSceneNames[recorded.setup.sceneId]);
  await expect(page.locator('.match-history-sentence').first()).not.toHaveAttribute('lang');
  await page.locator('.match-history-close').click();

  // Switching the interface language renames the presentation without
  // translating or rescoring the stored entry.
  await openSettings(page);
  await page.locator('select[name="interfaceLocale"]').selectOption('ro-RO');
  await page.getByRole('button', { name: 'Închide', exact: true }).first().click();
  await page.locator('.title-history-action').click();
  await expect(page.locator('.match-history-entry h3 span').first()).toHaveText(
    romanianCharacterNames[winnerId]!,
  );
  await expect(page.locator('.match-history-facts dd').nth(2)).toHaveText(
    romanianSceneNames[recorded.setup.sceneId]!,
  );
  // This fixture ends on a knockout before any sentence is completed, so the
  // modal shows the interface placeholder. Interface text follows the document
  // language and is never annotated.
  await expect(page.locator('.match-history-sentence').first()).toHaveText(
    'Nicio propoziție publică încheiată.',
  );
  await expect(page.locator('.match-history-sentence').first()).not.toHaveAttribute('lang');
  const time = page.locator('.match-history-entry time').first();
  const dateTime = await time.getAttribute('datetime');
  expect(dateTime).not.toBeNull();
  const expected = await page.evaluate(
    (value) =>
      new Intl.DateTimeFormat('ro-RO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    dateTime!,
  );
  await expect(time).toHaveText(expected);
  expect(await storedHistory(page)).toEqual(saved);
});
