import { page, userEvent } from 'vitest/browser';
import { afterEach, expect, test } from 'vitest';
import { createDefaultSetupSnapshot } from '../../src/app/app-shell.ts';
import {
  GrandTransitionSetup,
  setupChangeEventName,
  type SetupChangeEvent,
  type SetupSnapshot,
} from '../../src/app/screens/setup-screen.ts';
import type { GrandTransitionScenePicker } from '../../src/components/scene-picker.ts';
import { englishGameLocale, gameCatalog, romanianGameLocale } from '../../src/game-content.ts';

const sceneIds = gameCatalog.scenes.map(({ id }) => id);

afterEach(() => {
  document.body.innerHTML = '';
});

const monitor = (): HTMLButtonElement =>
  document.querySelector<HTMLButtonElement>('[data-testid="scene-monitor"]')!;
const dialog = (): HTMLDialogElement => document.querySelector<HTMLDialogElement>('dialog')!;
const tiles = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-testid="scene-tile"]'),
];
const tile = (sceneId: string): HTMLButtonElement =>
  tiles().find((candidate) => candidate.dataset.sceneId === sceneId)!;
const previewName = (): string | undefined =>
  document.querySelector('.scene-preview-caption h3')?.textContent?.trim();

async function mount(
  overrides: Partial<SetupSnapshot> = {},
  gameLocale?: 'en' | 'ro-RO',
): Promise<{ setup: GrandTransitionSetup; changes: string[] }> {
  await page.viewport(1280, 720);
  const setup = document.createElement('grand-transition-setup') as GrandTransitionSetup;
  const snapshot = { ...createDefaultSetupSnapshot(), ...overrides };
  setup.snapshot = snapshot;
  if (gameLocale) setup.gameLocale = gameLocale;
  const changes: string[] = [];
  // The application shell owns the snapshot, so the test plays its part.
  setup.addEventListener(setupChangeEventName, (event) => {
    const { field, value } = (event as SetupChangeEvent).detail;
    if (field !== 'sceneId') return;
    changes.push(String(value));
    setup.snapshot = { ...setup.snapshot!, sceneId: String(value) };
  });
  document.body.append(setup);
  await settle(setup);
  return { setup, changes };
}

async function settle(setup: GrandTransitionSetup): Promise<void> {
  await setup.updateComplete;
  await document.querySelector<GrandTransitionScenePicker>('grand-transition-scene-picker')
    ?.updateComplete;
}

async function open(setup: GrandTransitionSetup): Promise<void> {
  monitor().click();
  await settle(setup);
}

test('shows the selected scene on a monitor button named by its label and scene', async () => {
  await mount();
  expect(document.querySelector('select#sceneId')).toBeNull();
  const button = monitor();
  expect(button.id).toBe('sceneId');
  expect(button.dataset.sceneId).toBe(sceneIds[0]);
  expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  // The label and the scene name both reach assistive technology, once each.
  await expect
    .element(page.getByRole('button', { name: /^Scene\s+Transition-Era Television Studio$/u }))
    .toBeVisible();
  expect(button.querySelector('.scene-monitor-screen')?.getAttribute('aria-hidden')).toBe('true');
  // The default scene has a back layer and a desk foreground.
  expect(button.querySelectorAll('.scene-monitor-screen picture')).toHaveLength(2);
});

test('opens a modal guide with one radio tile per catalog scene in catalog order', async () => {
  const { setup } = await mount();
  expect(dialog().open).toBe(false);
  await open(setup);
  expect(dialog().open).toBe(true);
  expect(tiles().map((candidate) => candidate.dataset.sceneId)).toEqual(sceneIds);
  expect(tiles().filter((candidate) => candidate.getAttribute('aria-checked') === 'true')).toEqual([
    tile(sceneIds[0]!),
  ]);
  expect(document.activeElement).toBe(tile(sceneIds[0]!));
  expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
});

test('previews a scene on pointer and focus without changing the selection', async () => {
  const { setup, changes } = await mount();
  await open(setup);
  const target = tile(sceneIds[3]!);
  target.dispatchEvent(new PointerEvent('pointerenter'));
  await settle(setup);
  expect(previewName()).toBe(englishGameLocale.messages[gameCatalog.scenes[3]!.nameKey]);
  expect(document.querySelector('.scene-preview')?.getAttribute('data-previewing')).toBe('true');
  expect(target.getAttribute('aria-describedby')).toBe('scene-preview-description');
  expect(changes).toEqual([]);
  expect(monitor().dataset.sceneId).toBe(sceneIds[0]);

  // The pointer leaves; focus is still on the selected tile, so it comes back.
  target.dispatchEvent(new PointerEvent('pointerleave'));
  await settle(setup);
  expect(document.querySelector('.scene-preview')?.getAttribute('data-previewing')).toBe('false');
  expect(previewName()).toBe(englishGameLocale.messages[gameCatalog.scenes[0]!.nameKey]);
});

test('chooses on click and keeps the guide open until it is closed', async () => {
  const { setup, changes } = await mount();
  await open(setup);
  tile(sceneIds[2]!).click();
  await settle(setup);
  expect(changes).toEqual([sceneIds[2]]);
  expect(dialog().open).toBe(true);
  expect(tile(sceneIds[2]!).getAttribute('aria-checked')).toBe('true');
  expect(tile(sceneIds[0]!).getAttribute('aria-checked')).toBe('false');
  expect(monitor().dataset.sceneId).toBe(sceneIds[2]);
  // Choosing the scene that is already selected sends nothing.
  tile(sceneIds[2]!).click();
  await settle(setup);
  expect(changes).toEqual([sceneIds[2]]);

  document.querySelector<HTMLButtonElement>('[data-testid="scene-picker-close"]')!.click();
  await settle(setup);
  expect(dialog().open).toBe(false);
  expect(document.activeElement).toBe(monitor());
});

test('moves through the tiles with arrow keys and chooses with Space and Enter', async () => {
  const { setup, changes } = await mount();
  const leaked: string[] = [];
  setup.addEventListener('keydown', (event) => leaked.push(event.key));
  await open(setup);
  await userEvent.keyboard('{ArrowRight}');
  await settle(setup);
  expect(document.activeElement).toBe(tile(sceneIds[1]!));
  expect(previewName()).toBe(englishGameLocale.messages[gameCatalog.scenes[1]!.nameKey]);
  expect(changes).toEqual([]);

  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(tile(sceneIds.at(-1)!));
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(tile(sceneIds[0]!));
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(tile(sceneIds.at(-1)!));
  await userEvent.keyboard('{Home}');
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(tile(sceneIds[2]!));
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(tile(sceneIds[0]!));

  await userEvent.keyboard('{ArrowRight}');
  await userEvent.keyboard(' ');
  await settle(setup);
  expect(changes).toEqual([sceneIds[1]]);
  expect(dialog().open).toBe(true);

  await userEvent.keyboard('{ArrowRight}');
  await userEvent.keyboard('{Enter}');
  await settle(setup);
  expect(changes).toEqual([sceneIds[1], sceneIds[2]]);
  expect(dialog().open).toBe(false);
  expect(monitor().dataset.sceneId).toBe(sceneIds[2]);
  // The guide handles its own keys; the Setup screen never sees them.
  expect(leaked).toEqual([]);
});

test('keeps one tab stop on the selected tile', async () => {
  const { setup } = await mount({ sceneId: sceneIds[4]! });
  await open(setup);
  expect(tiles().filter((candidate) => candidate.tabIndex === 0)).toEqual([tile(sceneIds[4]!)]);
  expect(document.activeElement).toBe(tile(sceneIds[4]!));
});

test('Escape and the backdrop close the guide and keep the selection', async () => {
  const { setup, changes } = await mount();
  await open(setup);
  tile(sceneIds[1]!).dispatchEvent(new PointerEvent('pointerenter'));
  await userEvent.keyboard('{Escape}');
  await settle(setup);
  expect(dialog().open).toBe(false);
  expect(changes).toEqual([]);
  expect(monitor().dataset.sceneId).toBe(sceneIds[0]);

  await open(setup);
  // The preview starts again from the selected scene.
  expect(previewName()).toBe(englishGameLocale.messages[gameCatalog.scenes[0]!.nameKey]);
  dialog().click();
  await settle(setup);
  expect(dialog().open).toBe(false);
  expect(changes).toEqual([]);
});

test('Done keeps one label and closes without choosing the previewed scene', async () => {
  const { setup, changes } = await mount();
  await open(setup);
  const done = (): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>('[data-testid="scene-picker-done"]')!;
  expect(done().textContent?.trim()).toBe('Done');
  // The label and behavior do not follow the pointer from a tile to the button.
  tile(sceneIds[5]!).dispatchEvent(new PointerEvent('pointerenter'));
  await settle(setup);
  expect(done().textContent?.trim()).toBe('Done');
  tile(sceneIds[5]!).dispatchEvent(new PointerEvent('pointerleave'));
  await settle(setup);
  expect(done().textContent?.trim()).toBe('Done');
  expect(done().hasAttribute('data-scene-id')).toBe(false);

  // A click choice stays, and Done keeps it.
  tile(sceneIds[2]!).click();
  await settle(setup);
  tile(sceneIds[5]!).dispatchEvent(new PointerEvent('pointerenter'));
  await settle(setup);
  done().click();
  await settle(setup);
  expect(changes).toEqual([sceneIds[2]]);
  expect(dialog().open).toBe(false);
  expect(monitor().dataset.sceneId).toBe(sceneIds[2]);
});

test('states who opens from the mode and counts live effects', async () => {
  const { setup } = await mount({ mode: 'ai' });
  await open(setup);
  for (const scene of gameCatalog.scenes) {
    tile(scene.id).dispatchEvent(new PointerEvent('pointerenter'));
    await settle(setup);
    const facts = [...document.querySelectorAll('.scene-fact')].map((fact) =>
      fact.textContent?.trim(),
    );
    expect(facts[0]).toBe(scene.openingPlayerIndex === 0 ? 'You open' : 'Opponent opens');
    expect(facts[1]).toBe(scene.backgroundLayers.length > 1 ? 'Desks in front' : 'Open floor');
    expect(facts[2]).toBe(
      scene.effectIds.length === 0
        ? 'Still set'
        : scene.effectIds.length === 1
          ? 'One live effect'
          : `${scene.effectIds.length} live effects`,
    );
  }
  // A mode change closes the guide, so it opens again for the new mode.
  setup.snapshot = { ...setup.snapshot!, mode: 'hotseat' };
  await settle(setup);
  expect(tiles()).toHaveLength(0);
  await open(setup);
  tile(sceneIds[0]!).dispatchEvent(new PointerEvent('pointerenter'));
  await settle(setup);
  expect(document.querySelector('.scene-fact')?.textContent?.trim()).toBe('Player one opens');
});

test('describes the scene in the game language and names a different language', async () => {
  const { setup } = await mount({}, 'en');
  await open(setup);
  const description = (): HTMLElement =>
    document.querySelector<HTMLElement>('#scene-preview-description')!;
  const key = gameCatalog.scenes[0]!.descriptionKey;
  expect(description().textContent?.trim()).toBe(englishGameLocale.messages[key]);
  // The English interface and the English game language need no annotation.
  expect(description().hasAttribute('lang')).toBe(false);
  expect(document.querySelector('.scene-language-cue')).toBeNull();

  setup.gameLocale = 'ro-RO';
  await settle(setup);
  expect(description().textContent?.trim()).toBe(romanianGameLocale.messages[key]);
  expect(description().textContent?.trim()).not.toBe(englishGameLocale.messages[key]);
  expect(description().lang).toBe('ro-RO');
  // A different language also gets a visible label in its own name.
  const cue = document.querySelector<HTMLElement>('.scene-language-cue')!;
  expect(cue.textContent?.trim()).toBe('Română');
  expect(cue.lang).toBe('ro-RO');
  expect(cue.nextElementSibling).toBe(description());
});

test('mounts the scenes and their live ambience only while the guide is open', async () => {
  const { setup } = await mount();
  const ambience = (): (HTMLElement & { sceneId: string }) | null =>
    document.querySelector('grand-transition-scene-ambience');
  // Closed, the guide holds no art, so the setup page loads no hidden images.
  expect(tiles()).toHaveLength(0);
  expect(ambience()).toBeNull();
  expect(dialog().querySelectorAll('img')).toHaveLength(0);

  await open(setup);
  expect(tiles()).toHaveLength(sceneIds.length);
  expect(ambience()!.sceneId).toBe(sceneIds[0]);
  tile(sceneIds[1]!).dispatchEvent(new PointerEvent('pointerenter'));
  await settle(setup);
  expect(ambience()!.sceneId).toBe(sceneIds[1]);

  await userEvent.keyboard('{Escape}');
  await settle(setup);
  expect(tiles()).toHaveLength(0);
  expect(ambience()).toBeNull();
});

test('keeps the guide usable when the stored scene is missing', async () => {
  const { setup, changes } = await mount({ sceneId: '' });
  expect(monitor().dataset.sceneId).toBe('');
  expect(monitor().querySelector('.scene-monitor-text strong')?.textContent?.trim()).toBe(
    'No scene selected',
  );
  await open(setup);
  expect(tiles().filter((candidate) => candidate.getAttribute('aria-checked') === 'true')).toEqual(
    [],
  );
  expect(tiles().filter((candidate) => candidate.tabIndex === 0)).toEqual([tile(sceneIds[0]!)]);
  expect(document.activeElement).toBe(tile(sceneIds[0]!));
  tile(sceneIds[1]!).click();
  await settle(setup);
  expect(changes).toEqual([sceneIds[1]]);
  expect(monitor().dataset.sceneId).toBe(sceneIds[1]);
});

test('shows the fixed ladder scene on a disabled monitor with no guide', async () => {
  await mount({ mode: 'ladder', sceneId: sceneIds[3]! });
  expect(monitor().disabled).toBe(true);
  expect(monitor().dataset.sceneId).toBe(sceneIds[3]);
  expect(monitor().hasAttribute('aria-haspopup')).toBe(false);
  expect(document.querySelector('grand-transition-scene-picker')).toBeNull();
  expect(document.querySelector('label[for="sceneId"]')?.textContent?.trim()).toBe(
    'Rung scene — fixed',
  );
});
