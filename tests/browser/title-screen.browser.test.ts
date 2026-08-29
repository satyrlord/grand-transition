import { page } from 'vitest/browser';
import { expect, test } from 'vitest';
import { registerGrandTransitionTitle } from '../../src/app/screens/title-screen';
import '../../src/main';

test('renders the title screen in a real browser', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  await expect
    .element(page.getByText('A Verbal Republic', { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByText('Transmission ready', { exact: true }))
    .toBeVisible();
  expect(document.querySelector('.title-emblem')).not.toBeNull();
  await expect
    .element(page.getByRole('button', { name: 'Set up match' }))
    .toBeVisible();
});

test('uses the match-owned feature and interface fonts', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect.element(page.getByRole('heading')).toHaveStyle({
    fontFamily: '"Poiret One", Arial, sans-serif',
  });
  await expect.element(page.getByRole('main')).toHaveStyle({
    fontFamily: '"Rubik Variable", Arial, sans-serif',
  });
});

test('keeps the display-only title text unselectable', async () => {
  document.body.innerHTML = '<grand-transition-title></grand-transition-title>';

  await expect.element(page.getByRole('main')).toHaveStyle({
    userSelect: 'none',
  });
});

test('preserves an existing title-screen registration', async () => {
  const registeredElement = customElements.get('grand-transition-title');

  registerGrandTransitionTitle();

  expect(customElements.get('grand-transition-title')).toBe(registeredElement);
});
