import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test } from 'vitest';
import type { GrandTransitionApp } from '../../src/app/app-shell.ts';
import '../../src/app/app-shell.ts';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { decodeSettings, defaultSettings } from '../../src/persistence/codecs/settings-codec.ts';
import {
  reloadStoredData,
  resetStoredData,
  storedDocument,
  storedHistory,
} from './persistence-test-helpers.ts';
import { lockInSetup } from './setup-test-helpers.ts';
import { firstRun } from './stored-profile.ts';

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(async () => {
  document.body.innerHTML = '';
  await resetStoredData();
});

async function startFirstMatch(): Promise<GrandTransitionMatch> {
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();
  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;
  const match = document.querySelector('grand-transition-match') as GrandTransitionMatch;
  await match.updateComplete;
  return match;
}

test('the default profile is a returning player with default settings and no history', async () => {
  expect(decodeSettings((await storedDocument(settingsStorageKey))!)).toEqual({
    ok: true,
    value: defaultSettings,
  });
  expect(await storedHistory()).toEqual([]);
  const match = await startFirstMatch();
  expect(match.tutorialMode).toBe(false);
  expect(match.turnTimerSeconds).toBe(defaultSettings.turnTimerSeconds);
  expect(document.querySelector('.setup-rehearsal-note')).toBeNull();
});

test(
  'the first-run profile has no stored settings or history and starts a rehearsal',
  firstRun,
  async () => {
    expect(await storedDocument(settingsStorageKey)).toBeNull();
    expect(await storedHistory()).toEqual([]);
    const match = await startFirstMatch();
    expect(match.tutorialMode).toBe(true);
    expect(match.turnTimerSeconds).toBeNull();
  },
);
