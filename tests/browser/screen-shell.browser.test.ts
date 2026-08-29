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
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

test('requests fresh browser randomness for every new match seed', async () => {
  const generatedSeeds = [0, 0xffff_ffff];
  const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues');
  getRandomValues.mockImplementation((array) => {
    const seed = generatedSeeds.shift();
    if (seed === undefined) throw new Error('Unexpected seed request.');
    (array as Uint32Array)[0] = seed;
    return array;
  });

  const firstApp = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  expect(readInitialSeed(firstApp)).toBe(0);

  const secondApp = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  expect(readInitialSeed(secondApp)).toBe(0xffff_ffff);
  expect(getRandomValues).toHaveBeenCalledTimes(2);
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
  expect(window.location.href).toBe(originalUrl);

  await expect
    .element(page.getByLabelText('Mode', { exact: true }))
    .toHaveValue('hotseat');
  await expect
    .element(
      page.getByRole('button', {
        name: 'Player one character: The Red-Folded Chairman',
      }),
    )
    .toHaveAttribute('data-character-id', 'red-folded-chairman');
  await expect
    .element(
      page.getByRole('button', {
        name: 'Player two character: The Thunder Tribune',
      }),
    )
    .toHaveAttribute('data-character-id', 'thunder-tribune');
  await expect
    .element(page.getByLabelText('Scene'))
    .toHaveValue('transition-era-television-studio');
  const weaknesses = document.querySelectorAll('.contestant-weaknesses');
  expect(weaknesses).toHaveLength(2);
  expect(weaknesses[0]!.textContent).toMatch(
    /Legacy.*Modernity.*Bureaucracy.*Miners/su,
  );
  expect(weaknesses[1]!.textContent).toMatch(
    /Evidence.*Credibility.*Restraint/su,
  );
  const weaknessFixture = document.createElement('span');
  weaknessFixture.className = 'contestant-weaknesses';
  weaknessFixture.style.width = '12rem';
  const completeWeaknessList = document.createElement('span');
  completeWeaknessList.textContent = Array.from(
    { length: 8 },
    () => 'Long public weakness name',
  ).join(' · ');
  weaknessFixture.append(completeWeaknessList);
  document.body.append(weaknessFixture);
  expect(getComputedStyle(completeWeaknessList).whiteSpace).not.toBe('nowrap');
  expect(completeWeaknessList.scrollWidth).toBeLessThanOrEqual(
    completeWeaknessList.clientWidth + 1,
  );
  expect(completeWeaknessList.scrollHeight).toBeLessThanOrEqual(
    completeWeaknessList.clientHeight + 1,
  );
  weaknessFixture.remove();
  await page
    .getByRole('button', { name: 'Player two character: The Thunder Tribune' })
    .click();
  await page
    .getByRole('button', {
      name: /Red-Folded Chairman.*Select for player two/u,
    })
    .click();
  await expect
    .poll(
      () =>
        [...document.querySelectorAll('.contestant-weaknesses')].filter(
          (record) =>
            record.textContent?.trim() ===
            'Legacy · Modernity · Bureaucracy · Miners',
        ).length,
    )
    .toBe(2);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  expect(window.location.href).toBe(originalUrl);

  await page.getByRole('button', { name: 'Set up match' }).click();
  await expect
    .element(
      page.getByRole('button', {
        name: 'Player two character: The Red-Folded Chairman',
      }),
    )
    .toHaveAttribute('data-character-id', 'red-folded-chairman');

  window.history.back();
  await expect
    .element(page.getByRole('heading', { name: 'Grand Transition' }))
    .toBeVisible();
  expect(window.location.href).toBe(originalUrl);
});

test('shows transient and pinned character dossiers with exact public weaknesses', async () => {
  const setup = await mountSetup(createDefaultSetupSnapshot());
  const captain = setup.querySelector<HTMLButtonElement>(
    '.roster-choice[data-character-id="black-sea-captain"]',
  )!;

  captain.focus();
  await setup.updateComplete;
  const transient = setup.querySelector('.character-inspector')!;
  expect(transient.textContent).toMatch(
    /Character dossier.*Black Sea Captain.*Decorum.*Consistency.*Securitate/su,
  );
  expect(transient.getAttribute('data-pinned')).toBe('false');

  captain.blur();
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')).toBeNull();

  const contextMenu = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
  });
  expect(captain.dispatchEvent(contextMenu)).toBe(false);
  captain.dispatchEvent(new PointerEvent('pointerleave'));
  await setup.updateComplete;
  const pinned = setup.querySelector('.character-inspector')!;
  expect(pinned.getAttribute('data-pinned')).toBe('true');
  expect(pinned.textContent).toMatch(
    /Pinned dossier.*Black Sea Captain.*Decorum.*Consistency.*Securitate/su,
  );

  setup
    .querySelector('main')!
    .dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')).toBeNull();
});

test.each([
  {
    name: 'default match',
    playerTwoCharacterId: 'thunder-tribune',
  },
  {
    name: 'mirror match',
    playerTwoCharacterId: 'red-folded-chairman',
  },
] as const)(
  'emits one exact immutable payload for $name',
  async ({ playerTwoCharacterId }) => {
    const host = document.createElement('section');
    const setup = document.createElement(
      'grand-transition-setup',
    ) as GrandTransitionSetup;
    setup.snapshot = Object.freeze({
      ...createDefaultSetupSnapshot(),
      playerTwoCharacterId,
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
      playerOneCharacterId: 'red-folded-chairman',
      playerTwoCharacterId,
      sceneId: 'transition-era-television-studio',
    });
  },
);

test('shows every missing-field error and emits no command', async () => {
  const setup = await mountSetup(
    Object.freeze({
      mode: '',
      playerOneCharacterId: '',
      playerTwoCharacterId: '',
      sceneId: '',
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
  expect(setup.querySelectorAll('.field-error')).toHaveLength(4);
  const mode = setup.querySelector<HTMLSelectElement>('#mode')!;
  expect(mode.getAttribute('aria-invalid')).toBe('true');
  expect(mode.getAttribute('aria-describedby')).toBe('mode-error');
  expect(document.activeElement).toBe(mode);
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
});

test('shows unknown-value errors and revalidates after change', async () => {
  const setup = await mountSetup(
    Object.freeze({
      mode: 'network',
      playerOneCharacterId: 'missing-one',
      playerTwoCharacterId: 'missing-two',
      sceneId: 'missing-scene',
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
  setup
    .querySelector<HTMLButtonElement>(
      '.roster-choice[data-character-id="red-folded-chairman"]',
    )!
    .click();
  await setup.updateComplete;
  expect(setup.querySelector('#playerOneCharacterId-error')).toBeNull();
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

    expect(listener).not.toHaveBeenCalled();
    expect(setup.querySelectorAll('.field-error')).toHaveLength(1);
    expect(setup.textContent).toContain(message);
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
});

test.each([
  { width: 1023, height: 720 },
  { width: 1024, height: 719 },
  { width: 720, height: 1024 },
  { width: 1200, height: 1600 },
  { width: 1024, height: 1024 },
])('blocks an unsupported $width by $height viewport', async (viewport) => {
  await page.viewport(viewport.width, viewport.height);
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;

  expect(
    app.querySelector('[data-interruption="unsupported-viewport"]'),
  ).not.toBeNull();
  expect(app.querySelector('grand-transition-title')).toBeNull();
  expect(app.textContent).toContain('1024 × 720');
  expect(app.textContent).toContain('1920 × 1080 on PC');
});

test('restores setup state after the viewport becomes supported again', async () => {
  const app = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page
    .getByRole('button', { name: 'Player two character: The Thunder Tribune' })
    .click();
  await page
    .getByRole('button', {
      name: /Red-Folded Chairman.*Select for player two/u,
    })
    .click();

  await page.viewport(1023, 720);
  await vi.waitFor(() =>
    expect(
      app.querySelector('[data-interruption="unsupported-viewport"]'),
    ).not.toBeNull(),
  );
  expect(app.querySelector('grand-transition-setup')).toBeNull();

  await page.viewport(1024, 720);
  await vi.waitFor(() =>
    expect(app.querySelector('grand-transition-setup')).not.toBeNull(),
  );
  await expect
    .element(
      page.getByRole('button', {
        name: 'Player two character: The Red-Folded Chairman',
      }),
    )
    .toHaveAttribute('data-character-id', 'red-folded-chairman');
});

async function mountApp(): Promise<GrandTransitionApp> {
  await page.viewport(1280, 720);
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector(
    'grand-transition-app',
  ) as GrandTransitionApp;
  await app.updateComplete;
  return app;
}

function readInitialSeed(app: GrandTransitionApp): number | null {
  return (
    app as unknown as {
      matchInitialSeed: number | null;
    }
  ).matchInitialSeed;
}

async function mountSetup(
  snapshot: SetupSnapshot,
): Promise<GrandTransitionSetup> {
  await page.viewport(1280, 720);
  const setup = document.createElement(
    'grand-transition-setup',
  ) as GrandTransitionSetup;
  setup.snapshot = snapshot;
  document.body.append(setup);
  await setup.updateComplete;
  return setup;
}
