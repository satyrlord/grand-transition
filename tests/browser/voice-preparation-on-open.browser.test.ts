import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import type { GrandTransitionApp } from '../../src/app/app-shell.ts';
import '../../src/app/app-shell.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import { reloadStoredData, resetStoredData } from './persistence-test-helpers.ts';

const workers: string[] = [];
const commands: string[] = [];

// The workers boot and receive `load`, then stay silent, so the menu keeps its loading state.
class HeldWorker extends EventTarget {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string | URL) {
    super();
    workers.push(String(url));
    queueMicrotask(() =>
      this.onmessage?.(new MessageEvent('message', { data: { type: 'booted' } })),
    );
  }
  postMessage(data: { type: string }) {
    commands.push(data.type);
  }
  terminate() {
    this.onmessage = null;
  }
}

afterEach(async () => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  workers.length = 0;
  commands.length = 0;
  await resetStoredData();
});

async function openMenu(speechEnabled: boolean): Promise<GrandTransitionApp> {
  await page.viewport(1280, 720);
  vi.stubGlobal('Worker', HeldWorker);
  if (!('gpu' in navigator)) vi.stubGlobal('navigator', Object.assign(navigator, { gpu: {} }));
  localStorage.setItem(
    settingsStorageKey,
    encodeSettings({ ...defaultSettings, interfaceLocale: 'en', speechEnabled, gpuVoices: true }),
  );
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  return app;
}

const idle = () => new Promise((resolve) => requestIdleCallback(resolve, { timeout: 1000 }));

test('the loaded menu starts GPU and Piper voice preparation before any gesture', async () => {
  const app = await openMenu(true);
  expect(workers).toEqual([]);
  await vi.waitFor(() => expect(commands.filter((type) => type === 'load')).toHaveLength(2));
  expect(workers.some((url) => url.includes('kokoro-gpu-worker'))).toBe(true);
  expect(workers.some((url) => url.includes('neural-speech-worker'))).toBe(true);
  await app.updateComplete;
  const status = app.querySelector('#title-gpu-status');
  expect(status?.textContent?.replace(/\s+/gu, ' ').trim()).toBe('Loading GPU voices…');
});

test('the loaded menu prepares no voices while speech is off', async () => {
  const app = await openMenu(false);
  await idle();
  await idle();
  await app.updateComplete;
  expect(workers).toEqual([]);
  expect(app.querySelector('#title-gpu-status')).toBeNull();
});

test('a menu removed before the browser is idle prepares no voices', async () => {
  const app = await openMenu(true);
  app.remove();
  await idle();
  await idle();
  expect(workers).toEqual([]);
});
