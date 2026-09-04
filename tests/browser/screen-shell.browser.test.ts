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
import { sampleContent } from '../../src/game-content';
import {
  createLadderProgress,
  recordLadderResult,
} from '../../src/engine/ladder';
import { encodeLadderProgress } from '../../src/persistence/codecs/ladder-progress-codec';
import { ladderProgressStorageKey } from '../../src/persistence/ladder-progress';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(ladderProgressStorageKey);
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
  await vi.waitFor(() => expect(document.activeElement?.id).toBe('setup-title'));

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
  await vi.waitFor(() => expect(document.activeElement?.id).toBe('game-title'));
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
  await vi.waitFor(() => expect(document.activeElement?.id).toBe('game-title'));
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

  const playerOneTarget = setup.querySelector<HTMLButtonElement>(
    '#playerOneCharacterId',
  )!;
  playerOneTarget.focus();
  playerOneTarget.click();
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')).toBeNull();

  expect(captain.dispatchEvent(contextMenu)).toBe(false);
  captain.dispatchEvent(new PointerEvent('pointerleave'));
  await setup.updateComplete;

  playerOneTarget.focus();
  playerOneTarget.click();
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')).toBeNull();

  setup
    .querySelector('main')!
    .dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')).toBeNull();
});

test('selects Government AI and exposes both robot portrait skins', async () => {
  await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  const setup = document.querySelector(
    'grand-transition-setup',
  ) as GrandTransitionSetup;
  expect(setup.querySelectorAll('.roster-choice')).toHaveLength(18);

  const governmentAi = setup.querySelector<HTMLButtonElement>(
    '.roster-choice[data-character-id="government-ai"]',
  )!;
  expect(governmentAi.dataset.characterSpecies).toBe('robot');
  expect(governmentAi.querySelector('.roster-choice-name')).toBeNull();
  expect(governmentAi.getAttribute('aria-label')).toContain('Government AI');
  governmentAi.focus();
  await setup.updateComplete;
  expect(setup.querySelector('.character-inspector')?.textContent).toMatch(
    /Government AI.*Nepotism.*Corruption.*Spending.*Obsolete/su,
  );

  await page
    .getByRole('button', { name: /Government AI.*Select for player one/u })
    .click();
  const playerOneStage = setup.querySelector<HTMLElement>(
    '.contestant-stage--one',
  )!;
  await expect
    .poll(() => playerOneStage.dataset.characterId)
    .toBe('government-ai');
  expect(playerOneStage.textContent).toMatch(
    /Nepotism.*Corruption.*Spending.*Obsolete/su,
  );
  expect(
    playerOneStage.querySelector<HTMLImageElement>('.contestant-portrait')!.src,
  ).toContain('government-ai-960x960.webp');

  await page.getByRole('button', { name: 'Next skin for Player one' }).click();
  await expect.poll(() => playerOneStage.dataset.skinId).toBe('alternate');
  expect(
    playerOneStage.querySelector('.skin-selector')?.getAttribute('aria-label'),
  ).toBe('Player one: Alternate chassis');
  expect(
    playerOneStage.querySelector<HTMLImageElement>('.contestant-portrait')!.src,
  ).toContain('government-ai--alternate-960x960.webp');
});

test('cycles selected skins without changing roster portraits or character IDs', async () => {
  await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  const setup = document.querySelector(
    'grand-transition-setup',
  ) as GrandTransitionSetup;
  const playerOneStage = setup.querySelector<HTMLElement>(
    '.contestant-stage--one',
  )!;
  const playerOneTarget = setup.querySelector<HTMLButtonElement>(
    '#playerOneCharacterId',
  )!;
  const rosterSources = [...setup.querySelectorAll<HTMLImageElement>('.roster-headshot')].map(
    ({ src }) => src,
  );

  expect(playerOneStage.dataset.characterId).toBe('red-folded-chairman');
  expect(playerOneStage.dataset.skinId).toBe('default');
  await page.getByRole('button', { name: 'Next skin for Player one' }).click();
  await expect
    .poll(() => playerOneStage.dataset.skinId)
    .toBe('alternate');
  expect(
    playerOneStage.querySelector<HTMLImageElement>('.contestant-portrait')!.src,
  ).toContain('red-folded-chairman--alternate');
  expect(
    playerOneStage.querySelector('.skin-selector')?.getAttribute('aria-label'),
  ).toBe('Player one: Alternate skin');
  expect(
    setup.querySelector<HTMLElement>('.contestant-stage--two')!.dataset.skinId,
  ).toBe('default');
  expect(
    [...setup.querySelectorAll<HTMLImageElement>('.roster-headshot')].map(
      ({ src }) => src,
    ),
  ).toEqual(rosterSources);
  expect(rosterSources.every((src) => !src.includes('--alternate'))).toBe(true);

  const contextMenu = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
  });
  expect(playerOneTarget.dispatchEvent(contextMenu)).toBe(false);
  await expect.poll(() => playerOneStage.dataset.skinId).toBe('default');

  playerOneTarget.focus();
  playerOneTarget.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
  );
  await expect.poll(() => playerOneStage.dataset.skinId).toBe('alternate');
  expect(playerOneStage.dataset.characterId).toBe('red-folded-chairman');
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
      aiDifficulty: 'local-radio-caller',
      playerOneCharacterId: 'red-folded-chairman',
      playerOneSkinId: 'default',
      playerTwoCharacterId,
      playerTwoSkinId: 'default',
      sceneId: 'transition-era-television-studio',
    });
  },
);

test('emits the custom single-player setup with the fixed AI policy', async () => {
  const setup = await mountSetup(
    Object.freeze({ ...createDefaultSetupSnapshot(), mode: 'ai' }),
  );
  const listener = vi.fn<(event: StartMatchEvent) => void>();
  setup.addEventListener(startMatchEventName, listener);

  expect(setup.querySelector<HTMLSelectElement>('#mode')?.value).toBe('ai');
  expect(setup.textContent).toContain('Match settings');
  expect(
    setup.querySelector<HTMLSelectElement>('#aiDifficulty')?.value,
  ).toBe('local-radio-caller');
  expect(setup.querySelector('#aiDifficulty')?.textContent).toContain(
    'Local Radio Caller',
  );
  expect(
    setup.querySelector('#playerTwoCharacterId')?.getAttribute('aria-label'),
  ).toContain('Local Radio Caller character');
  setup
    .querySelector('form')!
    .dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]![0].detail).toMatchObject({
    mode: 'ai',
    playerOneCharacterId: 'red-folded-chairman',
    playerTwoCharacterId: 'thunder-tribune',
  });
});

test('creates, persists, resumes, and resets the ladder setup', async () => {
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
    (array as Uint32Array)[0] = 22_026;
    return array;
  });
  let app = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  const playerTwoTarget = document.querySelector<HTMLButtonElement>(
    '#playerTwoCharacterId',
  )!;
  playerTwoTarget.click();
  let mode = document.querySelector<HTMLSelectElement>('#mode')!;
  mode.value = 'ladder';
  mode.dispatchEvent(new Event('change', { bubbles: true }));
  await vi.waitFor(() =>
    expect(document.querySelector('.ladder-record')?.textContent).toContain(
      'Rung 1/9',
    ),
  );
  expect(
    document.querySelector('.contestant-stage--two .contestant-player')
      ?.textContent,
  ).toContain('Local Radio Caller');
  expect(
    document.querySelector<HTMLButtonElement>('#playerTwoCharacterId')?.disabled,
  ).toBe(true);
  await page
    .getByRole('button', { name: /Black Sea Captain.*Select for player one/u })
    .click();
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLElement>('.contestant-stage--one')?.dataset
        .characterId,
    ).toBe('black-sea-captain'),
  );
  expect(
    document.querySelector<HTMLElement>('.contestant-stage--two')?.dataset
      .characterId,
  ).not.toBe('black-sea-captain');
  expect(
    document
      .querySelector<HTMLButtonElement>(
        '.roster-choice[data-character-id="black-sea-captain"]',
      )
      ?.getAttribute('aria-label'),
  ).toContain('Selected for player one.');
  document.querySelector('grand-transition-setup')!.dispatchEvent(
    new CustomEvent(setupChangeEventName, {
      bubbles: true,
      composed: true,
      detail: Object.freeze({
        type: 'update-setup' as const,
        field: 'playerTwoCharacterId' as const,
        value: 'black-sea-captain',
      }),
    }),
  );
  expect(
    document.querySelector<HTMLElement>('.contestant-stage--two')?.dataset
      .characterId,
  ).not.toBe('black-sea-captain');
  expect(document.querySelector('.setup-heading')?.textContent).toContain(
    'Choose your debater. Your opponent and scene follow ladder progress.',
  );
  expect(document.querySelector('.roster-heading')?.textContent).toContain(
    '18 contestants',
  );
  expect(
    document.querySelectorAll('.contestant-stage--two .skin-cycle'),
  ).toHaveLength(0);
  expect(
    document.querySelector('.contestant-stage--two .contestant-locked-state')
      ?.textContent,
  ).toContain('Opponent fixed by rung');
  expect(document.querySelector('.ladder-field-label')?.textContent).toContain(
    'Rung scene — fixed',
  );
  expect(document.querySelector('.setup-note')?.textContent).toContain(
    'Opponent and scene are fixed by local ladder progress.',
  );
  expect(localStorage.getItem(ladderProgressStorageKey)).not.toBeNull();
  await expect
    .element(page.getByRole('button', { name: 'Start ladder' }))
    .toBeEnabled();

  document.body.innerHTML = '';
  app = await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await vi.waitFor(() =>
    expect(document.querySelector<HTMLSelectElement>('#mode')?.value).toBe(
      'ladder',
    ),
  );
  expect(document.querySelector('.ladder-record')?.textContent).toContain(
    'Rung 1/9',
  );
  expect(app).toBeTruthy();

  vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  await page.getByRole('button', { name: 'Reset ladder' }).click();
  await vi.waitFor(() =>
    expect(localStorage.getItem(ladderProgressStorageKey)).toBeNull(),
  );
  expect(document.querySelector<HTMLSelectElement>('#mode')?.value).toBe(
    'hotseat',
  );
  expect(document.querySelector('.ladder-record')).toBeNull();
  await expect
    .element(page.getByRole('button', { name: 'Ladder complete', exact: true }))
    .not.toBeInTheDocument();
});

test('shows completed progress without starting a locked rung', async () => {
  let progress = createLadderProgress(
    'red-folded-chairman',
    22_026,
    sampleContent.characters.map(({ id }) => id),
    sampleContent.scenes.map(({ id }) => id),
  );
  for (let index = 0; index < 9; index += 1) {
    progress = recordLadderResult(progress, 'win');
  }
  localStorage.setItem(ladderProgressStorageKey, encodeLadderProgress(progress));

  await mountApp();
  await page.getByRole('button', { name: 'Set up match' }).click();
  expect(document.querySelector('.ladder-record')?.textContent).toContain(
    'Ladder complete',
  );
  expect(document.querySelector('.ladder-record')?.textContent).toContain(
    'Nine victories recorded',
  );
  expect(
    document.querySelector('.contestant-stage--two .contestant-player')
      ?.textContent,
  ).toContain('Ladder complete');
  expect(
    document.querySelector('.contestant-stage--two .contestant-player')
      ?.textContent,
  ).not.toContain('Local Radio Caller');
  expect(
    Number.parseFloat(
      getComputedStyle(
        document.querySelector<HTMLElement>('.contestant-locked-state')!,
      ).fontSize,
    ),
  ).toBeGreaterThanOrEqual(11);
  await expect
    .element(page.getByRole('button', { name: 'Ladder complete', exact: true }))
    .toBeDisabled();
});

test('shows every missing-field error and emits no command', async () => {
  const setup = await mountSetup(
    Object.freeze({
      mode: '',
      aiDifficulty: '',
      playerOneCharacterId: '',
      playerOneSkinId: '',
      playerTwoCharacterId: '',
      playerTwoSkinId: '',
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
  expect(setup.textContent).toContain(
    'Mode is missing. Choose Single player, Hotseat, or Ladder.',
  );
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
      aiDifficulty: 'missing-difficulty',
      playerOneCharacterId: 'missing-one',
      playerOneSkinId: 'missing-skin-one',
      playerTwoCharacterId: 'missing-two',
      playerTwoSkinId: 'missing-skin-two',
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

  expect(setup.textContent).toContain(
    'Mode is not supported. Choose Single player, Hotseat, or Ladder.',
  );
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
    message: 'Mode is missing. Choose Single player, Hotseat, or Ladder.',
  },
  {
    name: 'unsupported mode',
    field: 'mode',
    value: 'network',
    message:
      'Mode is not supported. Choose Single player, Hotseat, or Ladder.',
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
    name: 'missing player one skin',
    field: 'playerOneSkinId',
    value: '',
    message: 'Player one skin is missing. Choose an available skin.',
  },
  {
    name: 'unknown player one skin',
    field: 'playerOneSkinId',
    value: 'missing-skin-one',
    message: 'Player one skin is unknown. Choose an available skin.',
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
    name: 'missing player two skin',
    field: 'playerTwoSkinId',
    value: '',
    message: 'Player two skin is missing. Choose an available skin.',
  },
  {
    name: 'unknown player two skin',
    field: 'playerTwoSkinId',
    value: 'missing-skin-two',
    message: 'Player two skin is unknown. Choose an available skin.',
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
