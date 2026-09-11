import { expect, test, type Page } from '@playwright/test';

const settingsKey = 'grand-transition.settings.v1';
const exactNotice =
  'Settings storage is unavailable. Changes will not persist after this page closes.';

const supportedViewports = [
  { width: 1024, height: 720 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

test('fresh defaults prepare voices before interaction without starting playback', async ({page}) => {
  await page.addInitScript(() => {
    const Original=window.AudioContext;
    Object.assign(window,{createdAudioContexts:0});
    window.AudioContext=class extends Original {constructor(){super();(window as unknown as {createdAudioContexts:number}).createdAudioContexts++;}};
  });
  const resources: string[]=[];
  page.on('request', request => {if(new URL(request.url()).pathname.includes('/tts/'))resources.push(request.url());});
  await page.goto('/grand-transition/');
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  await expect.poll(()=>resources.length).toBeGreaterThan(0);
  expect(await page.evaluate(()=>(window as unknown as {createdAudioContexts:number}).createdAudioContexts)).toBe(0);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByLabel('Speech enabled',{exact:true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'GPU voices',exact:true})).toBeChecked();
  await expect.poll(()=>resources.length).toBeGreaterThan(0);
});

test('restores the previous saved speech default to 1.00 times and persists the migration', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
    schemaVersion:2,masterVolume:1,musicVolume:0.1,effectsVolume:0.8,speechVolume:0.8,
    speechEnabled:false,gpuVoices:false,speechVoiceUri:'retired:voice',speechRate:1.2,
    turnTimerSeconds:30,autoComplete:true,
  })), settingsKey);
  await page.reload(); await page.getByRole('button',{name:'Settings'}).click();
  await expect(page.locator('#speechRate')).toHaveValue('1');
  await expect(page.locator('output[for="speechRate"]')).toHaveText('1.00×');
  await page.getByLabel('Music volume').fill('0.2');
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!),settingsKey)).toMatchObject({
    schemaVersion:4,basePointsMultiplier:3,speechRate:1,musicVolume:0.2,speechVoiceUri:'retired:voice',
  });
  await page.reload(); await page.getByRole('button',{name:'Settings'}).click();
  await expect(page.locator('#speechRate')).toHaveValue('1');
});

test('settings persist in the production build and fit every supported viewport', async ({
  page,
}) => {
  await page.setViewportSize(supportedViewports[0]);
  await page.goto('/grand-transition/');
  await page.evaluate((key) => localStorage.removeItem(key), settingsKey);
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();

  await page.getByLabel('Master volume').fill('0.55');
  await page.getByLabel('Music volume').fill('0.45');
  await page.getByLabel('Effects volume').fill('0.35');
  await expect(page.getByRole('checkbox', { name: 'GPU voices', exact: true })).toBeChecked();
  await expect(page.getByLabel('Speech enabled', { exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'GPU voices', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'GPU voices', exact: true }).uncheck();
  await page.getByLabel('Speech enabled').check();
  await expect(page.getByRole('checkbox', { name: 'GPU voices', exact: true })).toBeEnabled();
  await page.getByLabel('Speech volume').fill('0.25');
  await page.getByLabel('Speech rate').fill('1.4');
  await page.getByRole('button', { name: 'Unlimited' }).click();
  await page.getByLabel('Auto-complete').uncheck();
  const multiplierGroup = page.getByRole('group', { name: 'Scoring multiplier', exact: true });
  for (const multiplier of [1, 2, 3, 4, 5]) {
    await multiplierGroup.getByRole('button', { name: `×${multiplier}`, exact: true }).click();
    await expect(multiplierGroup.locator('[aria-pressed="true"]')).toHaveText(`×${multiplier}`);
  }

  for (const viewport of supportedViewports) {
    await page.setViewportSize(viewport);
    await assertDialogGeometry(page);
    await page.screenshot({
      path: `tmp/settings-multiplier/settings-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  }

  const stored = await page.evaluate((key) => localStorage.getItem(key), settingsKey);
  expect(JSON.parse(stored!)).toEqual({
    schemaVersion: 4,
    basePointsMultiplier: 5,
    gpuVoices: false,
    masterVolume: 0.55,
    musicVolume: 0.45,
    effectsVolume: 0.35,
    speechVolume: 0.25,
    speechEnabled: true,
    speechVoiceUri: null,
    speechRate: 1.4,
    turnTimerSeconds: null,
    autoComplete: false,
  });
  expect(stored?.endsWith('\n')).toBe(true);

  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Master volume')).toHaveValue('0.55');
  await expect(page.getByLabel('Speech enabled')).toBeChecked();
  await expect(page.getByLabel('Speech rate')).toHaveValue('1.4');
  await expect(page.getByRole('button', { name: 'Unlimited' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Auto-complete')).not.toBeChecked();
  await expect(multiplierGroup.getByRole('button', { name: '×5', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ forcedColors: 'active' });
  const selectedTimerStyle = await page
    .getByRole('button', { name: 'Unlimited' })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
  const unselectedTimerBackground = await page
    .getByRole('button', { name: '15 seconds' })
    .evaluate((button) => getComputedStyle(button).backgroundColor);
  expect(selectedTimerStyle).toMatchObject({
    outlineStyle: 'solid',
    outlineWidth: '2px',
  });
  expect(selectedTimerStyle.backgroundColor).not.toBe(
    unselectedTimerBackground,
  );
  const selectedMultiplier = multiplierGroup.getByRole('button', { name: '×5', exact: true });
  await selectedMultiplier.hover();
  await selectedMultiplier.focus();
  const selection = await selectedMultiplier.evaluate((button) => {
    const style = getComputedStyle(button);
    return { background: style.backgroundColor, color: style.color, outline: style.outlineStyle };
  });
  expect(selection.background).not.toBe(selection.color);
  expect(selection.outline).toBe('solid');
  await page.screenshot({ path: 'tmp/settings-multiplier/forced-colors.png', fullPage: true });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('[data-timer="unlimited"]')).toBeVisible();
  expect(await page.locator('grand-transition-app').evaluate((app) =>
    (app as HTMLElement & { matchState: { setup: { basePointsMultiplier: number } } }).matchState.setup.basePointsMultiplier,
  )).toBe(5);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Unlimited' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page
      .getByRole('group', { name: 'Auto-complete' })
      .getByRole('button', { name: 'Off' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('GPU voices on unsupported hardware retain the preference and use Piper without a GPU download', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, 'gpu');
    Reflect.deleteProperty(navigator, 'gpu');
  });
  const gpuRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/tts/kokoro-gpu/')) gpuRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const gpu = page.getByRole('checkbox', { name: 'GPU voices', exact: true });
  await expect(gpu).toBeChecked();
  await expect(gpu).toBeEnabled();
  expect(gpuRequests).toEqual([]);
  await expect(page.getByRole('link', { name: 'GPU voice credits' })).toHaveAttribute(
    'href', '/grand-transition/tts/kokoro-gpu/NOTICE.txt',
  );
  await page.getByLabel('Speech enabled', { exact: true }).check();
  await gpu.check();
  await expect(page.locator('grand-transition-settings').getByText('GPU voices are unavailable. Using local Piper voices.', { exact: true })).toHaveCount(0);
  await expect(gpu).toBeChecked();
  await expect(gpu).toBeEnabled();
  expect(gpuRequests).toEqual([]);
  await assertDialogGeometry(page);
  await page.screenshot({ path: 'tmp/settings-multiplier/settings-gpu-unavailable-1024x720.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(gpu).toBeChecked();
  await expect(page.locator('grand-transition-settings').getByText('GPU voices are unavailable. Using local Piper voices.', { exact: true })).toHaveCount(0);
  await page.getByLabel('Speech enabled', { exact: true }).uncheck();
  await expect(gpu).toBeChecked();
  await expect(gpu).toBeEnabled();
  await gpu.uncheck();
  await expect(gpu).toBeDisabled();
  expect(gpuRequests).toEqual([]);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), settingsKey);
  expect(stored).toMatchObject({ schemaVersion: 4, gpuVoices: false, speechEnabled: false });
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Set up match'})).toBeEnabled();
});

test('settings keyboard order includes both credit links and returns to the menu', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const close = page.getByRole('button', { name: 'Close', exact: true });
  const credits = page.getByRole('link', { name: 'Voice credits', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(credits).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'GPU voice credits', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
});

for (const failure of ['quota', 'security', 'unavailable'] as const) {
  test(`${failure} storage failure keeps setup and a complete match available`, async ({
    page,
  }) => {
    await installSettingsStorageFailure(page, failure);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/grand-transition/');

    if (failure === 'quota') {
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByLabel('Effects volume').fill('0.75');
      await expect(page.locator('.settings-persistence-notice')).toHaveText(
        /Settings storage is unavailable.*Changes will not persist after this page closes\..*Dismiss/su,
      );
    } else {
      await expect(page.locator('.title-settings-notice')).toHaveText(
        /Settings storage is unavailable.*Changes will not persist after this page closes\..*Dismiss/su,
      );
      await page.getByRole('button', { name: 'Settings' }).click();
    }

    await expect(
      page.locator('.settings-persistence-notice').getByText(exactNotice, {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .locator('.settings-persistence-notice')
      .getByRole('button', { name: 'Dismiss' })
      .click();
    await expect(page.getByText(exactNotice, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Set up match' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();
    await prepareLethalGrammarMistake(page);
    await page
      .locator('[data-role="predicate"] button[data-card-state="legal"]')
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
    await page.getByRole('button', { name: 'Return to main menu' }).click();
    await expect(page.locator('.title-settings-notice')).toHaveCount(0);
  });
}

async function installSettingsStorageFailure(
  page: Page,
  failure: 'quota' | 'security' | 'unavailable',
): Promise<void> {
  await page.addInitScript(
    ({ key, kind }) => {
      const originalGet = Storage.prototype.getItem.bind(localStorage);
      const originalSet = Storage.prototype.setItem.bind(localStorage);
      if (kind === 'quota') {
        Storage.prototype.setItem = function (storageKey, value) {
          if (storageKey === key) {
            throw new DOMException('Storage is full.', 'QuotaExceededError');
          }
          return originalSet(storageKey, value);
        };
        return;
      }
      Storage.prototype.getItem = function (storageKey) {
        if (storageKey === key) {
          if (kind === 'security') {
            throw new DOMException('Storage is blocked.', 'SecurityError');
          }
          throw new Error('Storage is unavailable.');
        }
        return originalGet(storageKey);
      };
    },
    { key: settingsKey, kind: failure },
  );
}

async function prepareLethalGrammarMistake(page: Page): Promise<void> {
  await page.locator('grand-transition-app').evaluate(async (element) => {
    const app = element as HTMLElement & {
      matchState: {
        activePlayerId: string;
        playerStates: Record<string, { pride: number }>;
      };
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
}

async function assertDialogGeometry(page: Page): Promise<void> {
  const facts = await page.locator('.settings-dialog').evaluate((dialog) => {
    const box = dialog.getBoundingClientRect();
    const controls = [
      ...dialog.querySelectorAll<HTMLElement>('button, input, select'),
    ];
    const minimumTargets = [
      ...dialog.querySelectorAll<HTMLElement>('button, select, .settings-toggle'),
    ];
    return {
      inside:
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= window.innerWidth &&
        box.bottom <= window.innerHeight,
      pageScrolls:
        document.documentElement.scrollHeight >
          document.documentElement.clientHeight ||
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      controlsInside: controls.every((control) => {
        const controlBox = control.getBoundingClientRect();
        return (
          controlBox.left >= box.left &&
          controlBox.top >= box.top &&
          controlBox.right <= box.right &&
          controlBox.bottom <= box.bottom
        );
      }),
      minimumTargets: minimumTargets.every((control) => {
          const controlBox = control.getBoundingClientRect();
          return controlBox.width >= 44 && controlBox.height >= 44;
        }),
    };
  });
  expect(facts).toEqual({
    inside: true,
    pageScrolls: false,
    controlsInside: true,
    minimumTargets: true,
  });
}
