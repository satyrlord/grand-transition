import { expect, type Page } from '@playwright/test';

/** Advance the installed browser clock while an actual presentation owns input. */
export async function finishPresentation(page: Page): Promise<boolean> {
  let observed = false;
  for (let elapsed = 0; elapsed < 120_000; elapsed += 500) {
    const phase = await page.locator('.match-screen').getAttribute('data-delivery-phase');
    if (!phase) return observed;
    observed = true;
    await page.clock.runFor(500);
  }
  await expect(page.locator('.match-screen')).not.toHaveAttribute('data-delivery-phase', /.+/u);
  return observed;
}

export async function reachDeliveryTotal(page: Page, speakerId: string): Promise<void> {
  for (let elapsed = 0; elapsed < 60_000; elapsed += 100) {
    if (await page.evaluate((id) => {
      const receipt = document.querySelector('.delivery-receipt');
      return receipt?.getAttribute('data-speaker') === id && Boolean(receipt.querySelector('.delivery-total'));
    }, speakerId)) return;
    await page.clock.runFor(100);
  }
  throw new Error('The expected speaker did not reach the inline total.');
}

export async function reachDeliveryHesitation(
  page: Page,
  speakerId: string,
): Promise<void> {
  for (let elapsed = 0; elapsed < 60_000; elapsed += 100) {
    if (await page.evaluate((id) => {
      const receipt = document.querySelector('.delivery-receipt');
      return receipt?.getAttribute('data-speaker') === id &&
        document.querySelector('.match-screen')?.getAttribute(
          'data-delivery-phase',
        ) === 'hesitating';
    }, speakerId)) return;
    await page.clock.runFor(100);
  }
  throw new Error('The expected speaker did not reach the hesitation hold.');
}
