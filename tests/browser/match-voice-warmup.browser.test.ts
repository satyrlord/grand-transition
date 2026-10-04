import { lockInSetup } from './setup-test-helpers.ts';
import { page } from 'vitest/browser';
import { afterEach, expect, test, vi } from 'vitest';
import type { GrandTransitionApp } from '../../src/app/app-shell.ts';
import '../../src/app/app-shell.ts';
import { NeuralVoiceRouter } from '../../src/audio/neural-voice-router.ts';
import { defaultSettings, encodeSettings } from '../../src/persistence/codecs/settings-codec.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';
import {
  reloadStoredData,
  resetStoredData,
  writeStoredDocument,
} from './persistence-test-helpers.ts';

afterEach(async () => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  await resetStoredData();
});

test('a Romanian match starts loading the voices of its two speakers before the first delivery', async () => {
  // Keep real voices from loading; this test covers only the warmup request.
  vi.spyOn(NeuralVoiceRouter.prototype, 'preload').mockResolvedValue(false);
  vi.spyOn(NeuralVoiceRouter.prototype, 'initialize').mockResolvedValue(false);
  const warm = vi.spyOn(NeuralVoiceRouter.prototype, 'warmVoices').mockImplementation(() => {});
  await page.viewport(1280, 720);
  writeStoredDocument(
    settingsStorageKey,
    encodeSettings({
      ...defaultSettings,
      interfaceLocale: 'en',
      gameLocale: 'ro-RO',
      speechEnabled: true,
    }),
  );
  await reloadStoredData();
  document.body.innerHTML = '<grand-transition-app></grand-transition-app>';
  const app = document.querySelector('grand-transition-app') as GrandTransitionApp;
  await app.updateComplete;
  await page.getByRole('button', { name: 'Multiplayer' }).click();
  await lockInSetup();
  expect(warm).not.toHaveBeenCalled();

  await page.getByRole('button', { name: 'Start match' }).click();
  await app.updateComplete;

  expect(warm).toHaveBeenCalledTimes(1);
  const [voiceUris] = warm.mock.calls[0]!;
  expect(voiceUris).toHaveLength(2);
  for (const voiceUri of voiceUris)
    expect(voiceUri).toMatch(/^piper:ro_RO-(?:mihai|liana)-medium$/u);
});
