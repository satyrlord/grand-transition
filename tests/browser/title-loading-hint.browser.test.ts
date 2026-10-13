import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { seriousHints, sillyHints } from '../../src/app/hints.ts';
import { setInterfaceLocale } from '../../src/app/interface-localization.ts';
import { GrandTransitionTitle, loadingHintRotationMs } from '../../src/app/screens/title-screen.ts';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec.ts';
import '../../src/styles/fonts.css';
import '../../src/styles/title-screen.css';
import '../../src/styles/mobile-layout.css';
import { replaceRenderedText } from './match-state-helpers.ts';

// Milestone 015, AC-015-18: the voice loader of the title shows a hint.

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  await commands.setReducedMotion(false);
  await setInterfaceLocale('en');
});

const hintOf = (title: Element) => title.querySelector<HTMLElement>('.title-voice-hint');
const hintText = (title: Element) => hintOf(title)?.querySelector('span')?.textContent ?? null;
const allHints = () => [...seriousHints, ...sillyHints].map(({ text }) => text());

async function mount(status: GrandTransitionTitle['gpuStatus'] = 'loading') {
  const title = new GrandTransitionTitle();
  title.gpuStatus = status;
  title.gpuProgress = 0.42;
  document.body.replaceChildren(title);
  await title.updateComplete;
  return title;
}

/** The loader renders its hint region empty, and then it fills the first hint. */
async function firstHint(title: GrandTransitionTitle): Promise<string> {
  await title.updateComplete;
  await Promise.resolve();
  await title.updateComplete;
  return hintText(title)!;
}

function setHidden(hidden: boolean): void {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('hint of the title voice loader', () => {
  test.each(['idle', 'checking', 'loading'] as const)(
    'shows one hint under the loader while the GPU voices are %s',
    async (status) => {
      const title = await mount(status);
      // The existing loader stays complete.
      expect(title.querySelector('.title-voice-label')!.textContent).toContain(
        status === 'loading' ? 'Loading GPU voices…' : 'Preparing GPU voices…',
      );
      expect(title.querySelector('[role="progressbar"]')).not.toBeNull();
      const region = hintOf(title)!;
      expect(region.closest('.title-voice-loader')).not.toBeNull();
      const meter = title.querySelector('.title-voice-meter')!.getBoundingClientRect();
      expect(region.getBoundingClientRect().top).toBeGreaterThanOrEqual(meter.bottom);

      // The live region is in the page before its text, so the first hint is announced.
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region.textContent!.trim()).toBe('');
      const text = await firstHint(title);
      expect(allHints()).toContain(text);
      expect(region.querySelector('strong')!.textContent).toBe('Hint:');
      expect(region.getAttribute('aria-live')).toBe('polite');
    },
  );

  test('shows no hint when the voices are ready, unavailable, or off', async () => {
    const title = await mount('loading');
    await firstHint(title);
    for (const change of [
      () => (title.gpuStatus = 'ready'),
      () => (title.gpuStatus = 'unavailable'),
      () => {
        title.gpuStatus = 'loading';
        title.settings = { ...defaultSettings, speechEnabled: false };
      },
      () => (title.settings = { ...defaultSettings, gpuVoices: false }),
    ]) {
      change();
      await title.updateComplete;
      expect(hintOf(title)).toBeNull();
    }
    // A loader that shows again starts with a new announced hint.
    title.settings = defaultSettings;
    await title.updateComplete;
    expect(hintOf(title)!.getAttribute('aria-live')).toBe('polite');
    expect(allHints()).toContain(await firstHint(title));
  });

  test('changes the hint on a slow interval, and announces only the first hint', async () => {
    vi.useFakeTimers();
    const title = await mount();
    title.hintRandom = () => 0.5;
    const shown = [await firstHint(title)];
    expect(loadingHintRotationMs).toBeGreaterThanOrEqual(6_000);
    await vi.advanceTimersByTimeAsync(loadingHintRotationMs - 1);
    await title.updateComplete;
    expect(hintText(title)).toBe(shown[0]);
    expect(hintOf(title)!.getAttribute('aria-live')).toBe('polite');

    for (let rotation = 0; rotation < 6; rotation += 1) {
      await vi.advanceTimersByTimeAsync(rotation === 0 ? 1 : loadingHintRotationMs);
      await title.updateComplete;
      const text = hintText(title)!;
      expect(allHints()).toContain(text);
      expect(text).not.toBe(shown.at(-1));
      // The next hints change the text with no announcement.
      expect(hintOf(title)!.getAttribute('aria-live')).toBe('off');
      shown.push(text);
    }
    expect(title.querySelectorAll('.title-voice-hint')).toHaveLength(1);

    // The loader goes away with its interval.
    title.gpuStatus = 'ready';
    await title.updateComplete;
    expect(hintOf(title)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('stops the interval while the page is hidden', async () => {
    vi.useFakeTimers();
    const title = await mount();
    const first = await firstHint(title);
    setHidden(true);
    await vi.advanceTimersByTimeAsync(loadingHintRotationMs * 4);
    await title.updateComplete;
    expect(hintText(title)).toBe(first);
    expect(vi.getTimerCount()).toBe(0);

    setHidden(false);
    await vi.advanceTimersByTimeAsync(loadingHintRotationMs - 1);
    await title.updateComplete;
    expect(hintText(title)).toBe(first);
    await vi.advanceTimersByTimeAsync(1);
    await title.updateComplete;
    expect(hintText(title)).not.toBe(first);

    // A title that disconnects stops its interval and its listener.
    title.remove();
    expect(vi.getTimerCount()).toBe(0);
    setHidden(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('shows a loader that starts hidden with one hint and no interval', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const title = await mount();
    const first = await firstHint(title);
    expect(allHints()).toContain(first);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('changes the text with no animation, also with reduced motion', async () => {
    for (const reduce of [false, true]) {
      await commands.setReducedMotion(reduce);
      const title = await mount();
      await firstHint(title);
      const style = getComputedStyle(hintOf(title)!);
      expect(style.animationName).toBe('none');
      expect(style.transitionDuration).toBe('0s');
      title.remove();
    }
  });

  test('gives the hint in the interface language', async () => {
    await setInterfaceLocale('ro-RO');
    const title = await mount();
    title.hintRandom = () => 0.5;
    const text = await firstHint(title);
    expect(hintOf(title)!.querySelector('strong')!.textContent).toBe('Sfat:');
    expect(allHints()).toContain(text);
    await setInterfaceLocale('en');
    await title.updateComplete;
    expect(hintOf(title)!.querySelector('strong')!.textContent).toBe('Hint:');
    expect(allHints()).toContain(hintText(title));
  });

  test.each([
    [1024, 720],
    [1024, 768],
    [1280, 720],
    [1400, 1050],
    [1920, 1080],
  ])('keeps the longest hint above the disclaimer at %s by %s', async (width, height) => {
    await page.viewport(width, height);
    await setInterfaceLocale('ro-RO');
    const title = await mount();
    await firstHint(title);
    await document.fonts.ready;
    const bounds = (selector: string) => title.querySelector(selector)!.getBoundingClientRect();
    const action = bounds('.title-setup-action');
    const longest = allHints().toSorted((first, second) => second.length - first.length)[0]!;
    // A hint that is 40 percent longer than the longest shipped hint still wraps in the loader.
    for (const text of [
      longest,
      `${longest} ${longest.slice(0, Math.ceil(longest.length * 0.4))}`,
    ]) {
      replaceRenderedText(hintOf(title)!.querySelector('span')!, text);
      const loader = bounds('.title-voice-loader');
      const hint = bounds('.title-voice-hint');
      expect(hint.bottom).toBeLessThanOrEqual(loader.bottom);
      expect(hint.left).toBeGreaterThanOrEqual(loader.left);
      expect(hint.right).toBeLessThanOrEqual(loader.right);
      expect(loader.top).toBeGreaterThanOrEqual(bounds('.title-secondary-actions').bottom);
      expect(loader.bottom, text).toBeLessThanOrEqual(bounds('.title-disclaimer').top);
      expect(loader.left).toBeGreaterThan(0);
      expect(loader.right).toBeLessThan(width);
      const region = hintOf(title)!;
      expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth + 1);
      expect(Number.parseFloat(getComputedStyle(region).fontSize)).toBeGreaterThanOrEqual(11);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    // The hint does not move the menu actions.
    title.gpuStatus = 'ready';
    await title.updateComplete;
    expect(bounds('.title-setup-action').top).toBe(action.top);
  });

  test.each([
    [360, 640],
    [412, 915],
    [640, 320],
    [915, 412],
    [740, 360],
  ])('lets a compact title scroll to the whole hint at %s by %s', async (width, height) => {
    await page.viewport(width, height);
    await setInterfaceLocale('ro-RO');
    const title = await mount();
    await firstHint(title);
    await document.fonts.ready;
    const longest = allHints().toSorted((first, second) => second.length - first.length)[0]!;
    replaceRenderedText(hintOf(title)!.querySelector('span')!, longest);
    const bounds = (selector: string) => title.querySelector(selector)!.getBoundingClientRect();
    const loader = bounds('.title-voice-loader');
    const hint = bounds('.title-voice-hint');
    expect(hint.bottom).toBeLessThanOrEqual(loader.bottom);
    expect(loader.left).toBeGreaterThanOrEqual(0);
    expect(loader.right).toBeLessThanOrEqual(width);
    expect(loader.top).toBeGreaterThanOrEqual(bounds('.title-secondary-actions').bottom);
    expect(loader.bottom).toBeLessThanOrEqual(bounds('.title-disclaimer').top);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    // The page scrolls vertically, so the loader is reachable.
    expect(loader.bottom + window.scrollY).toBeLessThanOrEqual(
      document.documentElement.scrollHeight,
    );
  });
});
