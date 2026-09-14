import { expect, type Page } from '@playwright/test';

export async function lockInSetup(page: Page): Promise<void> {
  for (const side of ['one', 'two']) {
    const lock = page.locator(`[data-lock-player="${side}"]`);
    if (await lock.getAttribute('aria-pressed') !== 'true') {
      await lock.click();
    }
    await expect(lock).toHaveAttribute('aria-pressed', 'true');
  }
}
