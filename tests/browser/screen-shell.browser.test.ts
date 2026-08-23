import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import {
  GrandTransitionApp,
  createDefaultSetupSnapshot,
} from '../../src/app/app-shell';
import {
  GrandTransitionSetup,
  setupChangeEventName,
  startMatchEventName,
  type SetupChangeEvent,
  type SetupSnapshot,
  type StartMatchEvent,
} from '../../src/app/screens/setup-screen';

afterEach(() => {
  document.body.innerHTML = '';
});

test('moves through the two-state graph on one URL and restores setup values', async () => {
  const originalUrl = window.location.href;
  await mountApp();

  await expect
    .element(
      page.getByText(
        'All characters and events are fictional composites created for satire.',
        { exact: true },
      ),
    )
    .toBeVisible();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await expect
    .element(page.getByRole('heading', { name: 'Set up match' }))
    .toHaveFocus();
  expect(window.location.href).toBe(originalUrl);

  await expect.element(page.getByLabelText('Mode')).toHaveValue('hotseat');
  await expect
    .element(page.getByLabelText('Player one character'))
    .toHaveValue('civic-fox');
  await expect
    .element(page.getByLabelText('Player two character'))
    .toHaveValue('brass-peacock');
  await expect
    .element(page.getByLabelText('Scene'))
    .toHaveValue('echo-chamber');
  await expect.element(page.getByLabelText('Timer')).toHaveValue('unlimited');

  await page.getByLabelText('Player two character').selectOptions('civic-fox');
  await page.getByLabelText('Timer').selectOptions('30');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toHaveFocus();
  expect(window.location.href).toBe(originalUrl);

  await page.getByRole('button', { name: 'Set up match' }).click();
  await expect
    .element(page.getByLabelText('Player two character'))
    .toHaveValue('civic-fox');
  await expect.element(page.getByLabelText('Timer')).toHaveValue('30');

  window.history.back();
  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  expect(window.location.href).toBe(originalUrl);
});

test.each([
  {
    timerSeconds: null,
    renderedTimer: 'unlimited default',
    playerTwoCharacterId: 'brass-peacock',
  },
  {
    timerSeconds: 15,
    renderedTimer: '15',
    playerTwoCharacterId: 'brass-peacock',
  },
  {
    timerSeconds: 30,
    renderedTimer: '30',
    playerTwoCharacterId: 'brass-peacock',
  },
  {
    timerSeconds: null,
    renderedTimer: 'unlimited mirror',
    playerTwoCharacterId: 'civic-fox',
  },
] as const)(
  'emits one exact immutable payload for $renderedTimer',
  async ({ timerSeconds, playerTwoCharacterId }) => {
    const host = document.createElement('section');
    const setup = document.createElement(
      'grand-transition-setup',
    ) as GrandTransitionSetup;
    setup.snapshot = Object.freeze({
      ...createDefaultSetupSnapshot(),
      playerTwoCharacterId,
      timerSeconds,
    });
    const listener = vi.fn<(event: StartMatchEvent) => void>();
    host.addEventListener(startMatchEventName, listener);
    host.append(setup);
    document.body.append(host);
    await setup.updateComplete;

    const form = setup.querySelector('form')!;
    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]![0];
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(Object.isFrozen(event.detail)).toBe(true);
    expect(event.detail).toEqual({
      mode: 'hotseat',
      playerOneCharacterId: 'civic-fox',
      playerTwoCharacterId,
      sceneId: 'echo-chamber',
      timerSeconds,
    });
  },
);

test('shows every missing-field error, focuses the first field, and emits no command', async () => {
  const setup = await mountSetup(
    Object.freeze({
      mode: '',
      playerOneCharacterId: '',
      playerTwoCharacterId: '',
      sceneId: '',
      timerSeconds: 45,
    }),
  );
  const listener = vi.fn();
  setup.addEventListener(startMatchEventName, listener);

  setup
    .querySelector('form')!
    .dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
  await setup.updateComplete;

  expect(listener).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(setup.querySelector('#mode'));
  expect(setup.querySelectorAll('.field-error')).toHaveLength(5);
  expect(setup.textContent).toContain('Mode is missing. Choose Hotseat.');
  expect(setup.textContent).toContain(
    'Player one character is missing. Choose a listed character.',
  );
  expect(setup.textContent).toContain(
    'Player two character is missing. Choose a listed character.',
  );
  expect(setup.textContent).toContain(
    'Scene is missing. Choose a listed scene.',
  );
  expect(setup.textContent).toContain(
    'Timer is not supported. Choose 15 seconds, 30 seconds, or Unlimited.',
  );
});

test('associates unknown-value errors and revalidates an invalid field after change', async () => {
  const setup = await mountSetup(
    Object.freeze({
      mode: 'network',
      playerOneCharacterId: 'missing-one',
      playerTwoCharacterId: 'missing-two',
      sceneId: 'missing-scene',
      timerSeconds: 60,
    }),
  );
  setup.addEventListener(setupChangeEventName, (event: SetupChangeEvent) => {
    setup.snapshot = Object.freeze({
      ...setup.snapshot!,
      [event.detail.field]: event.detail.value,
    });
  });

  setup
    .querySelector('form')!
    .dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
  await setup.updateComplete;

  expect(setup.textContent).toContain('Mode is not supported. Choose Hotseat.');
  expect(setup.textContent).toContain(
    'Player one character is unknown. Choose a listed character.',
  );
  const playerOne = setup.querySelector<HTMLSelectElement>(
    '#playerOneCharacterId',
  )!;
  expect(playerOne.getAttribute('aria-describedby')).toBe(
    'playerOneCharacterId-error',
  );
  expect(playerOne.getAttribute('aria-invalid')).toBe('true');

  playerOne.value = 'civic-fox';
  playerOne.dispatchEvent(
    new Event('change', { bubbles: true, composed: true }),
  );
  await setup.updateComplete;
  expect(setup.querySelector('#playerOneCharacterId-error')).toBeNull();
  expect(playerOne.getAttribute('aria-invalid')).toBe('false');
});

test.each([
  {
    name: 'missing mode',
    field: 'mode',
    value: '',
    message: 'Mode is missing. Choose Hotseat.',
  },
  {
    name: 'unsupported mode',
    field: 'mode',
    value: 'network',
    message: 'Mode is not supported. Choose Hotseat.',
  },
  {
    name: 'missing player one ID',
    field: 'playerOneCharacterId',
    value: '',
    message: 'Player one character is missing. Choose a listed character.',
  },
  {
    name: 'unknown player one ID',
    field: 'playerOneCharacterId',
    value: 'missing-one',
    message: 'Player one character is unknown. Choose a listed character.',
  },
  {
    name: 'missing player two ID',
    field: 'playerTwoCharacterId',
    value: '',
    message: 'Player two character is missing. Choose a listed character.',
  },
  {
    name: 'unknown player two ID',
    field: 'playerTwoCharacterId',
    value: 'missing-two',
    message: 'Player two character is unknown. Choose a listed character.',
  },
  {
    name: 'missing scene ID',
    field: 'sceneId',
    value: '',
    message: 'Scene is missing. Choose a listed scene.',
  },
  {
    name: 'unknown scene ID',
    field: 'sceneId',
    value: 'missing-scene',
    message: 'Scene is unknown. Choose a listed scene.',
  },
  {
    name: 'unsupported timer',
    field: 'timerSeconds',
    value: 45,
    message:
      'Timer is not supported. Choose 15 seconds, 30 seconds, or Unlimited.',
  },
] as const)(
  'shows one associated $name error, preserves valid values, and emits no command',
  async ({ field, value, message }) => {
    const defaults = createDefaultSetupSnapshot();
    const snapshot = Object.freeze({ ...defaults, [field]: value });
    const setup = await mountSetup(snapshot);
    const listener = vi.fn();
    setup.addEventListener(startMatchEventName, listener);

    setup
      .querySelector('form')!
      .dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true }),
      );
    await setup.updateComplete;

    const control = setup.querySelector<HTMLElement>(`#${field}`)!;
    expect(listener).not.toHaveBeenCalled();
    expect(setup.querySelectorAll('.field-error')).toHaveLength(1);
    expect(setup.textContent).toContain(message);
    expect(document.activeElement).toBe(control);
    expect(control.getAttribute('aria-describedby')).toBe(`${field}-error`);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    for (const defaultField of Object.keys(
      defaults,
    ) as (keyof SetupSnapshot)[]) {
      if (defaultField !== field) {
        expect(setup.snapshot?.[defaultField]).toBe(defaults[defaultField]);
      }
    }
  },
);

test('keeps one frozen shell snapshot and does not own match-state fields', async () => {
  const app = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  const setup = document.querySelector(
    'grand-transition-setup',
  ) as GrandTransitionSetup;

  expect(Object.isFrozen(setup.snapshot)).toBe(true);
  expect(setup.snapshot).toEqual(createDefaultSetupSnapshot());
  for (const field of ['pride', 'board', 'hands', 'phase', 'countdown']) {
    expect(field in setup).toBe(false);
    expect(field in app).toBe(false);
  }

  const tabOrder = Array.from(
    setup.querySelectorAll<HTMLElement>('select, button'),
    (element) =>
      element instanceof HTMLSelectElement
        ? element.name
        : element.textContent?.trim(),
  );
  expect(tabOrder).toEqual([
    'mode',
    'sceneId',
    'timerSeconds',
    'playerOneCharacterId',
    'playerTwoCharacterId',
    'Back',
    'Start match',
  ]);

  setup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(setup.snapshot).toEqual(createDefaultSetupSnapshot());
});

async function mountApp(): Promise<GrandTransitionApp> {
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  return app;
}

async function mountSetup(
  snapshot: SetupSnapshot,
): Promise<GrandTransitionSetup> {
  const setup = document.createElement(
    'grand-transition-setup',
  ) as GrandTransitionSetup;
  setup.snapshot = snapshot;
  document.body.append(setup);
  await setup.updateComplete;
  return setup;
}
