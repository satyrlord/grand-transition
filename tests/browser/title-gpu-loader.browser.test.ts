import { commands, page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { GrandTransitionTitle } from '../../src/app/screens/title-screen.ts';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec.ts';
import '../../src/styles/title-screen.css';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(status: GrandTransitionTitle['gpuStatus'] = 'loading') {
  const title = new GrandTransitionTitle();
  title.gpuStatus = status;
  title.gpuProgress = 0.42;
  document.body.replaceChildren(title);
  await title.updateComplete;
  return title;
}

test.each(['idle', 'checking', 'loading'] as const)(
  'keeps setup available and prepares in the background during %s',
  async (status) => {
    const title = await mount(status);
    const buttons = [...title.querySelectorAll<HTMLButtonElement>('.title-setup-action')];
    expect(buttons).toHaveLength(3);
    const navigate = vi.fn();
    title.addEventListener('show-setup', navigate);
    expect(title.querySelector<HTMLButtonElement>('.title-settings-action')!.disabled).toBe(false);
    expect(title.querySelector<HTMLButtonElement>('.title-history-action')!.disabled).toBe(false);
    const meter = title.querySelector('[role="progressbar"]')!;
    expect(meter.getAttribute('aria-label')).toBe('GPU voices');
    expect(meter.getAttribute('aria-valuenow')).toBe(status === 'loading' ? '42' : null);
    for (const [index, mode] of ['ai', 'hotseat', 'ladder'].entries()) {
      const button = buttons[index]!;
      expect(button.disabled).toBe(false);
      button.click();
      const event = navigate.mock.calls[index]![0] as CustomEvent;
      expect(event.detail).toEqual({ type: 'show-setup', mode });
      expect(Object.isFrozen(event.detail)).toBe(true);
      expect(event.bubbles && event.composed).toBe(true);
    }
    expect(navigate).toHaveBeenCalledTimes(3);
    // Readiness only removes the loader; it never had to unlock the menu.
    title.gpuStatus = 'ready';
    await title.updateComplete;
    expect(title.querySelector('.title-voice-feedback')).toBeNull();
    expect(buttons.every((button) => !button.disabled)).toBe(true);
  },
);

test('unavailable GPU voices unblock setup with a main-menu fallback notice', async () => {
  const title = await mount('unavailable');
  expect(title.querySelector<HTMLButtonElement>('.title-setup-action')!.disabled).toBe(false);
  expect(title.querySelector('[role="progressbar"]')).toBeNull();
  expect(title.querySelector('.title-voice-fallback')?.textContent).toContain(
    'Using local Piper voices.',
  );
});

test.each(['speechEnabled', 'gpuVoices'] as const)(
  'turning %s off immediately hides status and keeps setup available',
  async (preference) => {
    const title = await mount();
    title.settings = { ...defaultSettings, [preference]: false };
    await title.updateComplete;
    expect(title.querySelector('.title-voice-feedback')).toBeNull();
    expect(title.querySelector<HTMLButtonElement>('.title-setup-action')!.disabled).toBe(false);
    title.gpuStatus = 'unavailable';
    await title.updateComplete;
    expect(title.querySelector('.title-voice-feedback')).toBeNull();
  },
);

test('download completion keeps the preparing label without blocking setup', async () => {
  const title = await mount();
  title.gpuProgress = 1;
  await title.updateComplete;
  expect(title.querySelector<HTMLButtonElement>('.title-setup-action')!.disabled).toBe(false);
  expect(title.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext')).toBe(
    'Preparing GPU voices…',
  );
  title.gpuProgress = Number.NaN;
  await title.updateComplete;
  expect(title.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false);
});

test.each([
  [1024, 720],
  [1024, 768],
  [1280, 720],
  [1920, 1080],
])('fits the menu loader at %s by %s without moving actions', async (width, height) => {
  await page.viewport(width, height);
  const title = await mount();
  const bounds = (selector: string) => title.querySelector(selector)!.getBoundingClientRect();
  const loader = bounds('.title-voice-loader');
  const action = bounds('.title-setup-action');
  expect(loader.top).toBeGreaterThanOrEqual(bounds('.title-secondary-actions').bottom);
  expect(loader.bottom).toBeLessThan(bounds('.title-disclaimer').top);
  expect(bounds('.status').top).toBeGreaterThan(bounds('.subtitle').bottom);
  expect(loader.left).toBeGreaterThan(0);
  expect(loader.right).toBeLessThan(width);
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height);
  title.gpuStatus = 'ready';
  await title.updateComplete;
  expect(bounds('.title-setup-action').top).toBe(action.top);
});

test('indeterminate progress stops motion when reduced motion is requested', async () => {
  await commands.setReducedMotion(true);
  try {
    const title = await mount('checking');
    const meter = title.querySelector('.title-voice-meter span')!;
    expect(getComputedStyle(meter).animationName).toBe('none');
  } finally {
    await commands.setReducedMotion(false);
  }
});
