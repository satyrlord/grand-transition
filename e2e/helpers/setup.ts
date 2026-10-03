import { expect, type Locator, type Page } from '@playwright/test';

// Every interaction targets a test id, so visible copy and translations can
// change without rewriting a test.
const lockTestIds = { one: 'lock-player-one', two: 'lock-player-two' } as const;

export function lockControl(page: Page, side: 'one' | 'two'): Locator {
  return page.getByTestId(lockTestIds[side]);
}

export async function lockInSetup(page: Page): Promise<void> {
  for (const side of ['one', 'two'] as const) {
    const lock = lockControl(page, side);
    if ((await lock.getAttribute('aria-pressed')) !== 'true') {
      await lock.click();
    }
    await expect(lock).toHaveAttribute('aria-pressed', 'true');
  }
}

export function sceneMonitor(page: Page): Locator {
  return page.getByTestId('scene-monitor');
}

/** Picks a studio in the guide dialog and closes it, as a player does. */
export async function chooseScene(page: Page, sceneId: string): Promise<void> {
  const monitor = sceneMonitor(page);
  await monitor.click();
  await page.locator(`[data-testid="scene-tile"][data-scene-id="${sceneId}"]`).click();
  await page.getByTestId('scene-picker-close').click();
  await expect(page.locator('dialog.scene-picker')).not.toHaveAttribute('open');
  await expect(monitor).toHaveAttribute('data-scene-id', sceneId);
}
