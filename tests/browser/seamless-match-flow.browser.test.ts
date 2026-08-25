import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { GrandTransitionApp } from '../../src/app/app-shell';

beforeEach(async () => {
  await page.viewport(1280, 720);
});

afterEach(() => {
  document.body.innerHTML = '';
});

test('starts the next round without a resolution screen or user action', async () => {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();

  let reachedRoundTwo = false;
  for (let turn = 0; turn < 60; turn += 1) {
    expect(
      document.querySelector('grand-transition-resolution-results'),
    ).toBeNull();
    const match = document.querySelector('grand-transition-match');
    if (match?.textContent?.includes('Round 2')) {
      reachedRoundTwo = true;
      break;
    }

    const end = document.querySelector<HTMLButtonElement>(
      '.match-actions .action-primary',
    );
    if (end?.disabled === false) {
      end.click();
    } else {
      document
        .querySelector<HTMLButtonElement>(
          '.shared-board button[data-card-state="legal"], .private-hand button[data-card-state="legal"]',
        )
        ?.click();
    }
    await app.updateComplete;
  }

  expect(reachedRoundTwo).toBe(true);
  expect(
    document.querySelector('grand-transition-resolution-results'),
  ).toBeNull();
  expect(document.querySelector('grand-transition-match')).not.toBeNull();
});
