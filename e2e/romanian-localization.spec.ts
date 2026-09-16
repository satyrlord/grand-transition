import { lockInSetup } from './helpers/setup';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';
import { expect, test, type Page } from '@playwright/test';
import {
  romanianCharacterNames,
  romanianSceneNames,
} from '../src/localization/romanian-display-names';

const settingsKey = 'grand-transition.settings.v1';

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
  await page.evaluate((key) => localStorage.removeItem(key), settingsKey);
  await page.reload();
  await openSettings(page);

  const select = page.locator('select[name="interfaceLocale"]');
  const gameSelect = page.locator('select[name="gameLocale"]');
  await expect(select).toHaveValue('en');
  await expect(gameSelect).toHaveValue('en');
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
  await expect(gameSelect).toHaveValue('en');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe('ro-RO');

  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), settingsKey))
    .toMatchObject({
      schemaVersion: 3,
      interfaceLocale: 'ro-RO',
      gameLocale: 'en',
      tutorialMode: false,
    });

  await page.getByRole('button', { name: 'Închide', exact: true }).first().click();
  await expect(page.locator('.title-settings-action')).toHaveText('Setări');
  await expect(page.locator('.status')).toHaveText('În direct, pe Canalul 3 NTV!');
  await expect(page.getByRole('button', { name: 'Un jucător' })).toBeVisible();

  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Setări');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe('ro-RO');

  await page.locator('.title-settings-action').click();
  await page.locator('select[name="interfaceLocale"]').selectOption('en');
  await expect(page.locator('#settings-title')).toHaveText('Settings');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe('en');
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), settingsKey))
    .toMatchObject({ interfaceLocale: 'en', tutorialMode: false });
});

test('rejects a document stored before the interface language existed', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
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
  })), settingsKey);
  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  await expect(page.locator('.title-settings-notice')).toBeVisible();
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('en');
  // The rejected document keeps its bytes until the next explicit change.
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).schemaVersion, settingsKey)).toBe(1);
});

test('shows Romanian archetype and scene names while English phrases stay annotated', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.evaluate(
    ([key, settings]) => localStorage.setItem(key!, JSON.stringify(settings)),
    [settingsKey, romanianSettings] as const,
  );
  await page.reload();

  await page.getByRole('button', { name: 'Un jucător' }).click();
  const contestantName = page.locator('.contestant-record strong').first();
  const selectedCharacterId = await page.locator('.contestant-stage--one').getAttribute('data-character-id');
  expect(selectedCharacterId).not.toBeNull();
  await expect(contestantName).toHaveText(romanianCharacterNames[selectedCharacterId!]!);
  await expect(contestantName).not.toHaveAttribute('lang', 'en');
  await expect(page.locator('#setup-title')).toHaveText('Alege oratorii');
  for (const [id, name] of Object.entries(romanianCharacterNames)) {
    await expect(page.locator(`.roster-choice[data-character-id="${id}"][data-skin-id="default"]`))
      .toContainText(name);
  }
  for (const [id, name] of Object.entries(romanianSceneNames)) {
    await expect(page.locator(`#sceneId option[value="${id}"]`)).toHaveText(name);
  }
  await expect(page.locator('.roster-choice').first()).toHaveAccessibleName(/Slăbiciuni/u);
  await expect(page.locator('.roster-choice .visually-hidden [lang="en"]').first()).toBeAttached();
  const alternate = page.locator('.roster-choice[data-skin-id="alternate"]').first();
  await expect(alternate).toHaveAccessibleName(/Alternativ/u);
  await expect(alternate.locator('.visually-hidden span').nth(1)).not.toHaveAttribute('lang', 'en');
  await expect(page.locator('.contestant-stage-target').first())
    .toHaveAccessibleName(/^Tu, personaj:/u);
  await expect(page.locator('.contestant-stage-target .visually-hidden [lang="en"]')).toHaveCount(0);
  await expect(page.locator('#sceneId option').first()).not.toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-lock-player="one"]')).toHaveText('Confirmă alegerea');

  await lockInSetup(page);
  await page.getByRole('button', { name: 'Începe meciul' }).click();
  await expect(page.locator('.match-player h2').first())
    .toHaveText(romanianCharacterNames[selectedCharacterId!]!);
  await expect(page.locator('.match-player h2').first()).not.toHaveAttribute('lang', 'en');
  const finishAction = page.locator('.match-actions .action-primary').first();
  await expect(finishAction.locator('.action-title')).toHaveText('Gata');
  for (const viewport of [
    { width: 640, height: 320 }, { width: 700, height: 384 },
    { width: 740, height: 360 }, { width: 780, height: 360 },
    { width: 832, height: 384 }, { width: 915, height: 412 },
    { width: 1024, height: 720 }, { width: 1024, height: 768 },
    { width: 1280, height: 720 }, { width: 1400, height: 1050 },
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
  await expect(page.locator('.sentence-preview')).toHaveText('Alege un substantiv pentru a începe.');
  await expect(page.locator('.card-phrase').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('.shared-board button.phrase-card').first())
    .toHaveAccessibleName(/Comună/u);
  await expect(page.locator('.shared-board button.phrase-card').first())
    .toHaveAttribute('aria-labelledby', /phrase-label-Shared/u);

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

test('fits Romanian settings across the landscape matrix with keyboard and forced colors', async ({
  page,
}) => {
  await page.goto('/grand-transition/');
  await page.evaluate(
    ([key, settings]) => localStorage.setItem(key!, JSON.stringify(settings)),
    [settingsKey, romanianSettings] as const,
  );
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
          clipped: [...document.querySelectorAll('.settings-select, .settings-dialog button')]
            .some((element) => element.getBoundingClientRect().width === 0),
          dialogInside: (() => {
            const box = document.querySelector('.settings-dialog')!.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
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

test('keeps both language drop-downs independent at every combination', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.evaluate((key) => localStorage.removeItem(key), settingsKey);
  await page.reload();
  await openSettings(page);

  const interfaceSelect = page.locator('select[name="interfaceLocale"]');
  const gameSelect = page.locator('select[name="gameLocale"]');

  await gameSelect.focus();
  await gameSelect.selectOption('ro-RO');
  await expect(gameSelect).toHaveValue('ro-RO');
  await expect(interfaceSelect).toHaveValue('en');
  await expect(page.locator('#settings-title')).toHaveText('Settings');
  await expect(gameSelect).toBeFocused();
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), settingsKey))
    .toMatchObject({ schemaVersion: 3, interfaceLocale: 'en', gameLocale: 'ro-RO' });

  await interfaceSelect.focus();
  await interfaceSelect.selectOption('ro-RO');
  await expect(page.locator('#settings-title')).toHaveText('Setări');
  await expect(gameSelect).toHaveValue('ro-RO');
  await expect(interfaceSelect).toBeFocused();

  await page.reload();
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('ro-RO');
  await expect(page.locator('select[name="gameLocale"]')).toHaveValue('ro-RO');
});

test('rejects a document stored before the game language existed', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.evaluate(([key, settings]) => localStorage.setItem(key, JSON.stringify(settings)),
    [settingsKey, { ...romanianSettings, schemaVersion: 2, interfaceLocale: 'en' }] as const);
  await page.reload();
  await expect(page.locator('.title-settings-action')).toHaveText('Settings');
  await openSettings(page);
  await expect(page.locator('select[name="interfaceLocale"]')).toHaveValue('en');
  await expect(page.locator('select[name="gameLocale"]')).toHaveValue('en');
  // The rejected document keeps its bytes until the next explicit change.
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).schemaVersion,
      settingsKey,
    ),
  ).toBe(2);
});

test('uses Romanian history dates without changing stored English match results', async ({ page }) => {
  await useFixedBrowserMatchSeed(page);
  await page.goto('/grand-transition/');
  await page.evaluate(([key, settings]) => localStorage.setItem(key!, JSON.stringify(settings)),
    [settingsKey, { ...romanianSettings, interfaceLocale: 'en' }] as const);
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
      playerStates: { ...state.playerStates, [loserId]: { ...state.playerStates[loserId]!, pride: 3 } },
    };
    await app.updateComplete;
  });
  await page.locator('[data-role="predicate"] button[data-card-state="legal"]').first().click();
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to main menu' }).click();
  const saved = await page.evaluate(() => localStorage.getItem('grand-transition.match-history.v1'));
  expect(saved).not.toBeNull();
  const stored = JSON.parse(saved!) as {
    entries: Array<{
      matchLog: {
        winner: string;
        setup: { sceneId: string; players: Array<{ playerId: string; characterId: string }> };
      };
    }>;
  };
  const recorded = stored.entries[0]!.matchLog;
  const winnerId = recorded.setup.players.find(({ playerId }) => playerId === recorded.winner)!.characterId;
  await openSettings(page);
  await page.locator('select[name="interfaceLocale"]').selectOption('ro-RO');
  await page.getByRole('button', { name: 'Închide', exact: true }).first().click();
  await page.locator('.title-history-action').click();
  await expect(page.locator('.match-history-entry h3').first())
    .toContainText(romanianCharacterNames[winnerId]!);
  await expect(page.locator('.match-history-facts dd').nth(2))
    .toHaveText(romanianSceneNames[recorded.setup.sceneId]!);
  const time = page.locator('.match-history-entry time').first();
  const dateTime = await time.getAttribute('datetime');
  expect(dateTime).not.toBeNull();
  const expected = await page.evaluate((value) => new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value)), dateTime!);
  await expect(time).toHaveText(expected);
  expect(await page.evaluate(() => localStorage.getItem('grand-transition.match-history.v1'))).toBe(saved);
});
