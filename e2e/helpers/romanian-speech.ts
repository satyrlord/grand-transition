// Shared Romanian speech harness for the production proof and the benchmark.
//
// The app is driven exactly as a player would: enable speech, pick the two
// fighters whose skins map to Liana and Mihai, start a match, then inject a
// complete Romanian construction so the round delivers real grammar output.
// Every worker post-message and platform utterance is recorded, because the
// app's own diagnostics only carry an opaque failure reason.

import { expect, type Page } from '@playwright/test';
import { lockInSetup } from './setup';
import { useFixedBrowserMatchSeed } from './match-flow';
import { loadGameContent } from '../../tools/load-game-content';
import type { MatchState } from '../../src/engine/match-lifecycle';
import {
  prepareRomanianGrammarPhrase,
  romanianGrammarAdapter,
} from '../../src/engine/grammar/romanian-grammar-adapter';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec';

const { gameCatalog, gameLocaleBundles } = loadGameContent();
const romanian = gameLocaleBundles['ro-RO']!;
// Two clauses, as in the English speech spec, so each speaker delivers twice.
const phraseIds = ['common-noun-036', 'common-predicate-015-present', 'common-conjunction-002', 'common-noun-001', 'common-predicate-010-present'];

export type RomanianSpeechEvidence = {
  native: { text: string; name: string }[];
  neural: { voiceId: string; segments: string[] }[];
  messages: unknown[];
  /** Chronological worker traffic, for latency measurement. */
  timeline: { at: number; direction: 'in' | 'out'; data: unknown }[];
  /** Highest sampled JavaScript heap size, in bytes. */
  peakHeapBytes: number;
};

export const romanianInterfaceText = {
  en: { settings: 'Settings', close: 'Close', multiplayer: 'Multiplayer', end: 'End', speech: 'Speech enabled', start: 'Start match' },
  'ro-RO': { settings: 'Setări', close: 'Închide', multiplayer: 'Doi jucători', end: 'Gata', speech: 'Vorbire activată', start: 'Începe meciul' },
} as const;

/** Pick a fighter and cycle to the requested skin, exactly as the English speech spec does. */
async function chooseFighter(page: Page, locator: string, character: string, skin: number): Promise<void> {
  await page.locator(locator).click();
  await page.locator(`.roster-choice[data-character-id="${character}"][data-skin-id="default"]`).click();
  for (let index = 1; index < skin; index++) await page.locator(locator).click({ button: 'right' });
}

export type RomanianSpeechSettings = {
  interfaceLocale: keyof typeof romanianInterfaceText;
  gameLocale: 'en' | 'ro-RO';
  enableSpeech?: boolean;
};

/** Enable speech with the requested languages and record every delivery. */
export async function configureRomanianSpeech(
  page: Page,
  settings: RomanianSpeechSettings,
): Promise<{ requests: { url: string; body: string | null }[] }> {
  const text = romanianInterfaceText[settings.interfaceLocale];
  const requests: { url: string; body: string | null }[] = [];
  page.on('request', (request) => requests.push({ url: request.url(), body: request.postData() }));
  await useFixedBrowserMatchSeed(page, 20260823);
  await page.addInitScript((initial) => {
    localStorage.setItem('grand-transition.settings.v1', JSON.stringify({
      ...initial, turnTimerSeconds: null, musicVolume: 0, effectsVolume: 0,
    }));
    const evidence: RomanianSpeechEvidence = { native: [], neural: [], messages: [], timeline: [],
      peakHeapBytes: 0 };
    Object.assign(window, { romanianSpeechEvidence: evidence });
    // Peak memory cannot be recovered after the fact, so sample while it runs.
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (heap) {
      evidence.peakHeapBytes = heap.usedJSHeapSize;
      setInterval(() => { evidence.peakHeapBytes = Math.max(evidence.peakHeapBytes, heap.usedJSHeapSize); }, 250);
    }
    if (typeof SpeechSynthesis === 'function') {
      const speak = SpeechSynthesis.prototype.speak.bind(speechSynthesis);
      SpeechSynthesis.prototype.speak = function (utterance) {
        evidence.native.push({ text: utterance.text, name: utterance.voice?.name ?? '' });
        speak(utterance);
      };
    }
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args: unknown[]) {
        super(...(args as [string | URL, WorkerOptions?]));
        this.addEventListener('message', (event) => {
          const data = (event as MessageEvent<unknown>).data;
          evidence.messages.push(data);
          evidence.timeline.push({ at: performance.now(), direction: 'in', data });
        });
      }
      override postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
        const command = message as { type: string; voiceId: string; segments: string[] };
        if (command.type === 'synthesize') {
          evidence.neural.push({ voiceId: command.voiceId, segments: [...command.segments] });
          evidence.timeline.push({ at: performance.now(), direction: 'out', data: { type: 'synthesize',
            voiceId: command.voiceId, segments: [...command.segments] } });
        }
        if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options);
      }
    };
  }, {
    ...defaultSettings,
    interfaceLocale: settings.interfaceLocale,
    gameLocale: settings.gameLocale,
    gpuVoices: false,
    speechEnabled: settings.enableSpeech !== false,
  });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: text.settings, exact: true }).click();
  if (settings.enableSpeech !== false) {
    await page.getByLabel(text.speech).check();
    await expect.poll(() => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
      speech: { status: string };
    }).speech.status), { timeout: 60_000 }).toBe('ready');
  }
  await page.getByRole('button', { name: text.close, exact: true }).click();
  await page.getByRole('button', { name: text.multiplayer, exact: true }).click();
  // Skin 2 speaks Emma's assignment and skin 1 speaks George's, so the same two
  // fighters cover the female and male Romanian voices.
  await chooseFighter(page, '#playerOneCharacterId', 'red-folded-chairman', 2);
  await page.getByTestId('lock-player-one').click();
  await chooseFighter(page, '#playerTwoCharacterId', 'thunder-tribune', 1);
  await lockInSetup(page);
  await page.getByRole('button', { name: text.start, exact: true }).click();
  await injectRomanianConstruction(page);
  return { requests };
}

/**
 * Install a complete, valid Romanian construction for both players of the
 * running match, so the public delivery is driven by real grammar output
 * rather than by card clicking.
 */
export async function injectRomanianConstruction(page: Page): Promise<void> {
  // Install a complete, valid construction per player so the public delivery is
  // driven by real Romanian grammar output rather than by card clicking.
  const state = await page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    matchState: MatchState;
  }).matchState);
  const players = { ...state.draft!.playerStates };
  for (const id of state.playerOrder) {
    const player = players[id]!;
    const phrases = phraseIds.map((phraseId) => gameCatalog.phrases.find((phrase) => phrase.id === phraseId)!);
    const steps = phrases.map((phrase) => ({
      kind: 'phrase' as const,
      phrase: prepareRomanianGrammarPhrase(phrase, romanian),
    }));
    const analyzed = romanianGrammarAdapter.analyze({
      steps, subjectNumber: player.subjectNumber, objectNumber: player.objectNumber,
    });
    if (!analyzed.accepted) throw new Error('The Romanian speech fixture is not grammatical.');
    players[id] = { ...player, construction: { ...player.construction, steps, analysis: analyzed.analysis,
      previewText: analyzed.analysis.publicText, requiredRoles: analyzed.analysis.nextRoles,
      selectedCards: phrases.map((phrase) => ({ phraseId: phrase.id, source: 'restored' as const })),
    } };
  }
  await page.evaluate((serialized) => {
    const app = document.querySelector('grand-transition-app') as unknown as { matchState: MatchState };
    app.matchState = JSON.parse(serialized) as MatchState;
  }, JSON.stringify({ ...state, draft: { ...state.draft!, playerStates: players } }));
}

export function romanianSpeechEvidence(page: Page): Promise<RomanianSpeechEvidence> {
  return page.evaluate(() => (window as unknown as {
    romanianSpeechEvidence: RomanianSpeechEvidence;
  }).romanianSpeechEvidence);
}

export function appSettings(page: Page): Promise<{ speechEnabled: boolean; gameLocale: string }> {
  return page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    settingsSnapshot: { settings: { speechEnabled: boolean; gameLocale: string } };
  }).settingsSnapshot.settings);
}

/** Finish both turns and return the headline heading of the next round. */
export async function endBothTurns(page: Page, end: string): Promise<void> {
  await page.getByRole('button', { name: end, exact: true }).click();
  await page.getByRole('button', { name: end, exact: true }).click();
  await expect(page.getByRole('heading', { name: /R(?:ound|unda) 2/u })).toBeVisible({ timeout: 150_000 });
}
