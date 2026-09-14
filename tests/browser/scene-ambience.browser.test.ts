import { afterEach, expect, test, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { GrandTransitionSceneAmbience } from '../../src/components/scene-ambience';
import styles from '../../src/styles/match-screen.css?raw';

let style: HTMLStyleElement;
afterEach(async () => {
  document.body.innerHTML = '';
  style?.remove();
  vi.restoreAllMocks();
  await commands.setReducedMotion(false);
});

async function mount(sceneId = 'transition-era-television-studio') {
  await page.viewport(1280, 720);
  style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  const stage = document.createElement('div');
  stage.style.cssText = 'position:relative;width:640px;height:360px;';
  const ambience = new GrandTransitionSceneAmbience();
  ambience.sceneId = sceneId;
  stage.append(ambience);
  document.body.append(stage);
  await ambience.updateComplete;
  return ambience;
}

test.each([
  ['transition-era-television-studio', '.scene-ambience-light', 'studio-lamp-breathe'],
  ['modern-debate-studio', '.scene-motion--modern', 'modern-panel-scan'],
  ['county-council-ballroom', '.scene-motion--county', 'county-chandelier-glint'],
  ['midnight-call-in-studio', '.scene-motion--midnight', 'midnight-ticker-crawl'],
  ['palace-press-hall', '.scene-motion--palace', 'palace-press-sweep'],
  ['influencer-campaign-livestream', '.scene-motion--influencer', 'livestream-reaction-rise'],
] as const)('renders distinct pointer-inert motion for %s', async (sceneId, selector, animationName) => {
  const ambience = await mount(sceneId);
  const motion = ambience.querySelector(selector)!;
  const shapes = [...motion.children];
  expect(shapes.length).toBeGreaterThan(0);
  for (const shape of shapes) {
    expect(shape).toBeInstanceOf(SVGGraphicsElement);
    expect(shape.namespaceURI).toBe('http://www.w3.org/2000/svg');
    const bounds = shape.getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  }
  expect(getComputedStyle(motion).animationName).toBe(animationName);
  expect(ambience.querySelector('svg')?.getAttribute('data-scene-id')).toBe(sceneId);
  expect(getComputedStyle(ambience).pointerEvents).toBe('none');
});

test.each([
  ['transition-era-television-studio', '.scene-ambience-light'],
  ['modern-debate-studio', '.scene-motion--modern'],
  ['county-council-ballroom', '.scene-motion--county'],
  ['midnight-call-in-studio', '.scene-motion--midnight'],
  ['palace-press-hall', '.scene-motion--palace'],
  ['influencer-campaign-livestream', '.scene-motion--influencer'],
] as const)('suspends %s motion for pause and reduced motion', async (sceneId, selector) => {
  const ambience = await mount(sceneId);
  const motion = ambience.querySelector(selector)!;
  ambience.paused = true;
  await ambience.updateComplete;
  expect(getComputedStyle(motion).animationName).toBe('none');
  expect(getComputedStyle(motion).opacity).toBe('0');

  ambience.paused = false;
  await ambience.updateComplete;
  await commands.setReducedMotion(true);
  expect(getComputedStyle(motion).animationName).toBe('none');
  expect(getComputedStyle(motion).opacity).toBe('0');
});

test('uses bounded four-second lamp motion without intercepting controls', async () => {
  const ambience = await mount();
  const light = ambience.querySelector('.scene-ambience-light')!;
  expect(ambience.querySelectorAll('polygon')).toHaveLength(4);
  expect(getComputedStyle(light).animationDuration).toBe('4s');
  expect(getComputedStyle(ambience.querySelector('.scene-ambience-light--right')!).animationDelay).toBe('-2s');
  expect(getComputedStyle(ambience).pointerEvents).toBe('none');
  expect(ambience.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  const button = document.createElement('button');
  button.textContent = 'Test control';
  const clicked = vi.fn();
  button.onclick = clicked;
  ambience.parentElement!.prepend(button);
  await page.getByRole('button', { name: 'Test control' }).click();
  expect(clicked).toHaveBeenCalledOnce();
});

test('pause, document hiding, and disconnection stop ambience work', async () => {
  const removeListener = vi.spyOn(document, 'removeEventListener');
  const ambience = await mount();
  const light = ambience.querySelector('.scene-ambience-light')!;
  ambience.paused = true;
  await ambience.updateComplete;
  expect(getComputedStyle(light).animationName).toBe('none');
  expect(getComputedStyle(light).opacity).toBe('0');
  ambience.paused = false;
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  await ambience.updateComplete;
  expect(getComputedStyle(light).animationName).toBe('none');
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  await ambience.updateComplete;
  expect(getComputedStyle(light).animationName).toBe('studio-lamp-breathe');
  ambience.remove();
  expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
});

test('offscreen and reduced-motion modes retain the static lamp artwork', async () => {
  const ambience = await mount();
  const light = ambience.querySelector('.scene-ambience-light')!;
  ambience.parentElement!.style.transform = 'translateX(-2000px)';
  await vi.waitFor(() => expect(getComputedStyle(light).animationName).toBe('none'));
  ambience.parentElement!.style.transform = '';
  await vi.waitFor(() => expect(getComputedStyle(light).animationName).toBe('studio-lamp-breathe'));
  await commands.setReducedMotion(true);
  expect(getComputedStyle(light).animationName).toBe('none');
  expect(getComputedStyle(light).opacity).toBe('0');
});
