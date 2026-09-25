import { expect, type Page } from '@playwright/test';

const deliveryPhase = (page: Page): Promise<string | null> =>
  page.evaluate(
    () => document.querySelector('.match-screen')?.getAttribute('data-delivery-phase') ?? null,
  );

/** Advance the installed browser clock while an actual presentation owns input. */
export async function finishPresentation(page: Page): Promise<boolean> {
  let observed = false;
  for (let elapsed = 0; elapsed < 120_000; elapsed += 500) {
    // Read without a locator so an absent match screen reports "no
    // presentation" instead of blocking the caller while it waits to attach.
    const phase = await deliveryPhase(page);
    if (!phase) return observed;
    observed = true;
    await page.clock.runFor(500);
  }
  await expect.poll(() => deliveryPhase(page)).toBeNull();
  return observed;
}

/**
 * Freeze the installed browser clock a moment ahead of itself.
 *
 * `pauseAt` fast-forwards to its target, so the target must still be in the
 * mocked clock's future when the call lands. Reading the time and pausing are
 * two separate round trips, which is why a fixed 50 ms margin intermittently
 * failed with "Cannot fast-forward to the past" on a loaded machine. Re-read and
 * retry instead, widening the margin slightly each attempt, so a busy round trip
 * cannot turn into a failed test.
 */
export async function pauseMockedClock(page: Page, marginMs = 50): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const now = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(new Date(now + marginMs * attempt));
      return;
    } catch {
      // The mocked clock passed the target while the call was in flight.
    }
  }
  throw new Error('The mocked clock could not be paused.');
}

export async function reachDeliveryTotal(page: Page, speakerId: string): Promise<void> {
  for (let elapsed = 0; elapsed < 60_000; elapsed += 100) {
    if (
      await page.evaluate((id) => {
        const receipt = document.querySelector('.delivery-receipt');
        return (
          receipt?.getAttribute('data-speaker') === id &&
          Boolean(receipt.querySelector('.delivery-total'))
        );
      }, speakerId)
    )
      return;
    await page.clock.runFor(100);
  }
  throw new Error('The expected speaker did not reach the inline total.');
}

export async function reachDeliveryHesitation(page: Page, speakerId: string): Promise<void> {
  for (let elapsed = 0; elapsed < 60_000; elapsed += 100) {
    if (
      await page.evaluate((id) => {
        const receipt = document.querySelector('.delivery-receipt');
        return (
          receipt?.getAttribute('data-speaker') === id &&
          document.querySelector('.match-screen')?.getAttribute('data-delivery-phase') ===
            'hesitating'
        );
      }, speakerId)
    )
      return;
    await page.clock.runFor(100);
  }
  throw new Error('The expected speaker did not reach the hesitation hold.');
}
