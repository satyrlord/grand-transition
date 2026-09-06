import { afterEach, expect, test, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { GrandTransitionCharacter } from '../../src/components/character-presenter';
import { resolveCharacterAsset } from '../../src/app/character-assets';
import { characterMotion, type CharacterFrame, type CharacterStateId } from '../../src/app/character-motion';
import styles from '../../src/styles/match-screen.css?raw';

const styleElements: HTMLStyleElement[] = [];
declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion(reduce: boolean): Promise<void>;
  }
}
afterEach(() => {
  document.body.innerHTML = '';
  for (const style of styleElements.splice(0)) style.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount(initialState: 'idle' | 'selection' = 'idle', failDeliveryAvif = false) {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  styleElements.push(style);
  const container = document.createElement('div');
  container.className = 'character-frame';
  container.style.cssText = 'position:relative;inset:auto;width:320px;height:320px;';
  const presenter = new GrandTransitionCharacter();
  const asset = resolveCharacterAsset('red-folded-chairman');
  presenter.frames = Object.freeze(Object.keys(characterMotion).map((id) => Object.freeze({
    id: 'fixture-' + id, stateId: id as CharacterStateId,
    url: asset.url, sizes: '320px',
    avif: failDeliveryAvif && id === 'delivery'
      ? { ...asset.avif, srcSet: 'data:image/avif;base64,AAAA 320w' }
      : asset.avif,
    webp: asset.webp,
  } satisfies CharacterFrame)));
  presenter.cue = { stateId: initialState, sequence: 1 };
  container.append(presenter);
  document.body.append(container);
  return presenter;
}

const visibleState = (element: GrandTransitionCharacter) =>
  element.querySelector<HTMLElement>('[data-state-visible="true"]')?.dataset.stateId;
async function ready(element: GrandTransitionCharacter) {
  await vi.waitFor(() => expect(element.querySelectorAll('.character-state-upper')).toHaveLength(9));
  expect(visibleState(element)).toBe('idle');
}

test('reserves one image plane, preloads only its supplied package, and splits decoded body parts', async () => {
  const presenter = mount();
  await ready(presenter);
  expect(presenter.querySelectorAll('picture')).toHaveLength(9);
  expect(presenter.querySelectorAll('.character-portrait')).toHaveLength(1);
  expect(presenter.querySelectorAll('[data-state-visible="true"]')).toHaveLength(1);
  for (const image of presenter.querySelectorAll('img')) {
    expect(image.getAttribute('width')).toBe('2048');
    expect(image.getAttribute('height')).toBe('2048');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.currentSrc).toContain('red-folded-chairman');
    expect(image.currentSrc).toContain('.avif');
  }
  const portrait = presenter.querySelector('.character-portrait')!;
  const upper = presenter.querySelector('[data-state-visible="true"] .character-state-upper')!;
  expect(getComputedStyle(portrait).clipPath).toBe('inset(58% 0px 0px)');
  expect(getComputedStyle(upper).clipPath).toBe('inset(0px 0px 42%)');
  expect(getComputedStyle(presenter).pointerEvents).toBe('none');
  expect(presenter.getBoundingClientRect().width).toBe(320);
  expect(presenter.getBoundingClientRect().height).toBe(320);
});

test('keeps a reaction for its exact duration, then returns to the current rest state', async () => {
  const presenter = mount();
  await ready(presenter);
  vi.useFakeTimers();
  presenter.cue = { stateId: 'heavy-hit', sequence: 2 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('heavy-hit');
  await vi.advanceTimersByTimeAsync(519);
  expect(visibleState(presenter)).toBe('heavy-hit');
  presenter.restState = 'thinking';
  await presenter.updateComplete;
  await vi.advanceTimersByTimeAsync(1);
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('thinking');
});

test('the initial false pause value does not skip the selection state', async () => {
  const presenter = mount('selection');
  await vi.waitFor(() => expect(presenter.querySelectorAll('.character-state-upper')).toHaveLength(9));
  expect(visibleState(presenter)).toBe('selection');
});

test('a failed AVIF decode uses the same state WebP fallback', async () => {
  const presenter = mount('idle', true);
  await ready(presenter);
  const image = presenter.querySelector<HTMLImageElement>('[data-state-id="delivery"] img')!;
  expect(image.currentSrc).toContain('.webp');
  presenter.cue = { stateId: 'delivery', sequence: 2 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('delivery');
});

test('a newer public cue replaces a reaction without waiting for it', async () => {
  const presenter = mount();
  await ready(presenter);
  vi.useFakeTimers();
  presenter.cue = { stateId: 'heavy-hit', sequence: 2 };
  await presenter.updateComplete;
  await vi.advanceTimersByTimeAsync(100);
  presenter.cue = { stateId: 'comeback', sequence: 3 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('comeback');
  await vi.advanceTimersByTimeAsync(420);
  expect(visibleState(presenter)).toBe('comeback');
  await vi.advanceTimersByTimeAsync(80);
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('idle');
});

test('late decode cannot resurrect a superseded state', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(function(this: HTMLImageElement) {
    return this.closest<HTMLElement>('[data-state-id]')?.dataset.stateId === 'delivery'
      ? gate : Promise.resolve();
  });
  const presenter = mount();
  await vi.waitFor(() => expect(presenter.querySelectorAll('.character-state-upper')).toHaveLength(8));
  presenter.cue = { stateId: 'delivery', sequence: 2 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('idle');
  presenter.cue = { stateId: 'grammar-mistake', sequence: 3 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('grammar-mistake');
  release();
  await vi.waitFor(() => expect(presenter.querySelectorAll('.character-state-upper')).toHaveLength(9));
  expect(visibleState(presenter)).not.toBe('delivery');
});

test('pause discards a transient and resume does not replay it', async () => {
  const presenter = mount();
  await ready(presenter);
  presenter.cue = { stateId: 'weakness', sequence: 2 };
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('weakness');
  presenter.paused = true;
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('idle');
  expect(presenter.querySelector('.character-state-layer')?.getAttribute('data-motion-suspended')).toBe('true');
  expect(getComputedStyle(presenter.querySelector('[data-state-visible="true"] .character-state-upper')!).animationPlayState).toBe('paused');
  presenter.paused = false;
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('idle');
});

test('hiding the document discards transient motion and disconnect clears timers', async () => {
  const presenter = mount();
  await ready(presenter);
  vi.useFakeTimers();
  presenter.cue = { stateId: 'light-hit', sequence: 2 };
  await presenter.updateComplete;
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  await presenter.updateComplete;
  expect(visibleState(presenter)).toBe('idle');
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  await presenter.updateComplete;
  presenter.cue = { stateId: 'heavy-hit', sequence: 3 };
  await presenter.updateComplete;
  presenter.remove();
  expect(vi.getTimerCount()).toBe(0);
});

test('reduced motion suppresses loops and reactions while keeping the requested state visible', async () => {
  await commands.setReducedMotion(true);
  try {
    const presenter = mount();
    await ready(presenter);
    const upper = presenter.querySelector('[data-state-visible="true"] .character-state-upper')!;
    expect(getComputedStyle(upper).animationName).toBe('none');
    presenter.cue = { stateId: 'heavy-hit', sequence: 2 };
    await presenter.updateComplete;
    expect(visibleState(presenter)).toBe('heavy-hit');
    expect(getComputedStyle(presenter.querySelector('[data-state-visible="true"]')!).animationName).toBe('none');
  } finally {
    await commands.setReducedMotion(false);
  }
});

test('a reaction does not intercept a pointer action or change the reserved frame', async () => {
  const presenter = mount();
  await ready(presenter);
  const button = document.createElement('button');
  button.textContent = 'Action behind art';
  button.style.cssText = 'position:absolute;left:120px;top:130px;width:100px;height:44px;pointer-events:auto;';
  let clicks = 0;
  button.addEventListener('click', () => { clicks += 1; });
  presenter.parentElement!.prepend(button);
  const before = presenter.getBoundingClientRect().toJSON();
  presenter.cue = { stateId: 'heavy-hit', sequence: 2 };
  await presenter.updateComplete;
  await page.elementLocator(button).click();
  expect(clicks).toBe(1);
  expect(presenter.getBoundingClientRect().toJSON()).toEqual(before);
});
