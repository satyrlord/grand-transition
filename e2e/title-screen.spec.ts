import { expect, test } from '@playwright/test';

test('production preview exposes the accessible title surface', async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Grand Transition' }),
  ).toBeVisible();
  await expect(
    page.getByText('A Verbal Republic', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('The chamber is')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
