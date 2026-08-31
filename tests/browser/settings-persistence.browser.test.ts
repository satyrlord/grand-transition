import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';
import type { GrandTransitionSettings } from '../../src/app/screens/settings-modal';
import type { GrandTransitionMatch } from '../../src/app/screens/match-screen';
import type { MatchState } from '../../src/engine/match-lifecycle';
import {
  decodeSettings,
  defaultSettings,
  encodeSettings,
  type SettingsDocument,
} from '../../src/persistence/codecs/settings-codec';
import {
  settingsPersistenceNotice,
  settingsStorageKey,
} from '../../src/persistence/settings';
import { matchHistoryStorageKey } from '../../src/persistence/match-history';

beforeEach(async () => {
  await page.viewport(1280, 720);
  localStorage.removeItem(settingsStorageKey);
  localStorage.removeItem(matchHistoryStorageKey);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

test('restores every stored setting and applies title changes immediately', async () => {
  const stored: SettingsDocument = Object.freeze({
    schemaVersion: 1,
    masterVolume: 0.55,
    musicVolume: 0.45,
    effectsVolume: 0.35,
    speechVolume: 0.25,
    speechEnabled: true,
    speechVoiceUri: 'urn:grand-transition:saved-voice',
    speechRate: 1.4,
    turnTimerSeconds: 15,
    autoComplete: false,
  });
  localStorage.setItem(settingsStorageKey, encodeSettings(stored));
  let app = await mountApp();
  let settings = await openSettings(app);

  expect(range(settings, 'masterVolume').value).toBe('0.55');
  expect(range(settings, 'musicVolume').value).toBe('0.45');
  expect(range(settings, 'effectsVolume').value).toBe('0.35');
  expect(range(settings, 'speechVolume').value).toBe('0.25');
  expect(checkbox(settings, 'speechEnabled').checked).toBe(true);
  expect(
    settings.querySelector<HTMLSelectElement>('[name="speechVoiceUri"]')!
      .value,
  ).toBe('urn:grand-transition:saved-voice');
  expect(range(settings, 'speechRate').value).toBe('1.4');
  expect(timer(settings, '15 seconds').getAttribute('aria-pressed')).toBe(
    'true',
  );
  expect(checkbox(settings, 'autoComplete').checked).toBe(false);

  changeRange(settings, 'masterVolume', '0.6');
  await app.updateComplete;
  settings = currentSettings();
  checkbox(settings, 'autoComplete').click();
  await app.updateComplete;
  settings = currentSettings();
  timer(settings, 'Unlimited').click();
  await app.updateComplete;

  const serialized = localStorage.getItem(settingsStorageKey);
  expect(serialized).not.toBeNull();
  expect(decodeSettings(serialized!)).toEqual({
    ok: true,
    value: { ...stored, masterVolume: 0.6, turnTimerSeconds: null, autoComplete: true },
  });

  document.body.innerHTML = '';
  app = await mountApp();
  settings = await openSettings(app);
  expect(range(settings, 'masterVolume').value).toBe('0.6');
  expect(timer(settings, 'Unlimited').getAttribute('aria-pressed')).toBe(
    'true',
  );
  expect(checkbox(settings, 'autoComplete').checked).toBe(true);
});

test.each([
  ['malformed data', '{broken'],
  [
    'an unsupported version',
    JSON.stringify({ ...defaultSettings, schemaVersion: 2 }),
  ],
] as const)(
  'uses defaults for %s without overwriting it before a user change',
  async (_case, badBytes) => {
    localStorage.setItem(settingsStorageKey, badBytes);
    const app = await mountApp();

    expect(
      document.querySelector('.title-settings-notice')?.textContent,
    ).toContain(settingsPersistenceNotice);
    expect(localStorage.getItem(settingsStorageKey)).toBe(badBytes);

    let settings = await openSettings(app);
    expect(range(settings, 'masterVolume').value).toBe('1');
    expect(timer(settings, '30 seconds').getAttribute('aria-pressed')).toBe(
      'true',
    );
    changeRange(settings, 'musicVolume', '0.65');
    await app.updateComplete;
    settings = currentSettings();
    await settings.updateComplete;

    expect(localStorage.getItem(settingsStorageKey)).toBe(
      encodeSettings({ ...defaultSettings, musicVolume: 0.65 }),
    );
    expect(settings.querySelector('.settings-persistence-notice')).toBeNull();

    checkbox(settings, 'autoComplete').click();
    await app.updateComplete;
    document.body.innerHTML = '';
    const restoredApp = await mountApp();
    const restoredSettings = await openSettings(restoredApp);
    expect(range(restoredSettings, 'musicVolume').value).toBe('0.65');
    expect(checkbox(restoredSettings, 'autoComplete').checked).toBe(false);
  },
);

test.each([
  ['quota', 'setItem', new DOMException('Full.', 'QuotaExceededError')],
  ['security', 'getItem', new DOMException('Blocked.', 'SecurityError')],
  ['unavailable', 'getItem', new Error('Storage unavailable.')],
] as const)(
  '%s failure uses session fallback, dismisses only the notice, and permits a complete match',
  async (_failure, operation, error) => {
    let app: GrandTransitionApp;
    let settings: GrandTransitionSettings;
    if (operation === 'setItem') {
      app = await mountApp();
      settings = await openSettings(app);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw error;
      });
      changeRange(settings, 'effectsVolume', '0.75');
      await app.updateComplete;
      settings = currentSettings();
      await settings.updateComplete;
    } else {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw error;
      });
      app = await mountApp();
      settings = await openSettings(app);
      changeRange(settings, 'effectsVolume', '0.75');
      await app.updateComplete;
      settings = currentSettings();
      await settings.updateComplete;
    }

    const notice = settings.querySelector('.settings-persistence-notice')!;
    expect(notice.textContent).toContain(settingsPersistenceNotice);
    expect(notice.querySelector('button')?.textContent?.trim()).toBe('Dismiss');
    notice.querySelector<HTMLButtonElement>('button')!.click();
    await app.updateComplete;
    settings = currentSettings();
    await settings.updateComplete;
    expect(settings.querySelector('.settings-persistence-notice')).toBeNull();

    settings.querySelector<HTMLButtonElement>('.settings-close')!.click();
    await app.updateComplete;
    expect(document.querySelector('.title-settings-notice')).toBeNull();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();
    await completeMatch(app);

    expect(document.querySelector('#round-review-title')?.textContent?.trim()).toBe(
      'Victory',
    );
    const match = document.querySelector(
      'grand-transition-match',
    ) as GrandTransitionMatch;
    match.querySelector<HTMLButtonElement>('.round-review-primary')!.click();
    await app.updateComplete;
    expect(
      document.querySelector('.title-settings-notice'),
    ).toBeNull();
  },
);

test('the Settings modal traps focus, closes with Escape, and restores focus', async () => {
  const app = await mountApp();
  const settingsButton = document.querySelector<HTMLButtonElement>(
    '.title-settings-action',
  )!;
  const settings = await openSettings(app);
  const close = settings.querySelector<HTMLButtonElement>('.settings-close')!;
  const controls = [
    ...settings.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled])',
    ),
  ];

  expect(document.activeElement).toBe(close);
  close.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    }),
  );
  expect(document.activeElement).toBe(controls.at(-1));
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await app.updateComplete;

  expect(document.querySelector('grand-transition-settings')).toBeNull();
  expect(document.activeElement).toBe(settingsButton);
});

async function mountApp(): Promise<GrandTransitionApp> {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  return app;
}

async function openSettings(
  app: GrandTransitionApp,
): Promise<GrandTransitionSettings> {
  document.querySelector<HTMLButtonElement>('.title-settings-action')!.click();
  await app.updateComplete;
  const settings = currentSettings();
  await settings.updateComplete;
  return settings;
}

function currentSettings(): GrandTransitionSettings {
  return document.querySelector(
    'grand-transition-settings',
  ) as GrandTransitionSettings;
}

function range(
  settings: GrandTransitionSettings,
  name: string,
): HTMLInputElement {
  return settings.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
}

function checkbox(
  settings: GrandTransitionSettings,
  name: string,
): HTMLInputElement {
  return settings.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
}

function timer(
  settings: GrandTransitionSettings,
  label: string,
): HTMLButtonElement {
  return [...settings.querySelectorAll<HTMLButtonElement>('.settings-options button')].find(
    (button) => button.textContent?.trim() === label,
  )!;
}

function changeRange(
  settings: GrandTransitionSettings,
  name: string,
  value: string,
): void {
  const control = range(settings, name);
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

async function completeMatch(app: GrandTransitionApp): Promise<void> {
  const owner = app as unknown as { matchState: MatchState };
  const state = owner.matchState;
  const loserId = state.activePlayerId;
  owner.matchState = {
    ...state,
    playerStates: {
      ...state.playerStates,
      [loserId]: { ...state.playerStates[loserId]!, pride: 3 },
    },
  };
  await app.updateComplete;
  const match = document.querySelector(
    'grand-transition-match',
  ) as GrandTransitionMatch;
  await match.updateComplete;
  match
    .querySelector<HTMLButtonElement>(
      '[data-role="predicate"] [data-card-state="legal"]',
    )!
    .click();
  await app.updateComplete;
}
