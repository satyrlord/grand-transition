import { expect, test } from '@playwright/test';

test('the draft shows one unambiguous continuation cue', async ({ page }) => {
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  const continuation = page.locator('[data-role="continuation"] .phrase-card');
  await expect(continuation).toHaveCount(1);
  await expect(continuation).toBeVisible();
  await expect(continuation).toHaveText('[...]');
});
