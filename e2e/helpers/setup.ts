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
