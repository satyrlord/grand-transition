import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { MatchState } from '../src/engine/match-lifecycle';
import { englishGrammarAdapter, prepareEnglishGrammarPhrase } from '../src/engine/grammar/english-grammar-adapter';
import { loadGameContent } from '../tools/load-game-content';
import { defaultSettings } from '../src/persistence/codecs/settings-codec';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

const { sampleContent, englishGameLocale } = loadGameContent();
type Choice = { character: string; skin: number; neural: string; microsoft?: 'David' | 'Mark' | 'Zira' };
type Evidence = { native: Array<{ text: string; name: string; local: boolean;
  submitted: number; started?: number; ended?: number; boundaries: Array<{ charIndex: number; at: number }> }>;
  neural: Array<{ voiceId: string; segments: string[] }>; voices: Array<{ name: string; local: boolean }> };

async function configure(page: Page, choices: readonly Choice[]) {
  await useFixedBrowserMatchSeed(page, 20260823);
  await page.addInitScript((settings) => {
    localStorage.setItem('grand-transition.settings.v1', JSON.stringify({ ...settings, turnTimerSeconds: null, musicVolume: 0, effectsVolume: 0 }));
    const evidence: Evidence = { native: [], neural: [], voices: [] };
    Object.assign(window, { skinSpeechEvidence: evidence });
    if (typeof SpeechSynthesis === 'function') {
      const speak = SpeechSynthesis.prototype.speak.bind(speechSynthesis);
      SpeechSynthesis.prototype.speak = function (utterance) {
        const delivery: Evidence['native'][number] = { text: utterance.text, name: utterance.voice?.name ?? '',
          local: utterance.voice?.localService ?? false, submitted: performance.now(), boundaries: [] };
        evidence.native.push(delivery);
        utterance.addEventListener('start', () => { delivery.started = performance.now(); });
        utterance.addEventListener('end', () => { delivery.ended = performance.now(); });
        utterance.addEventListener('boundary', (event) => {
          if (event.name === 'word') delivery.boundaries.push({ charIndex: event.charIndex, at: performance.now() });
        });
        speak(utterance);
      };
    }
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      override postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
        const command = message as { type: string; voiceId: string; segments: string[] };
        if (command.type === 'synthesize') evidence.neural.push({ voiceId: command.voiceId, segments: [...command.segments] });
        if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options);
      }
    };
  }, defaultSettings);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Speech enabled').check();
  await expect.poll(() => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speech: { status: string };
  }).speech.status), { timeout: 60_000 }).toBe('ready');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  for (const [index, choice] of choices.entries()) {
    const id = index === 0 ? '#playerOneCharacterId' : '#playerTwoCharacterId';
    await page.locator(id).click();
    await page.locator(`.roster-choice[data-character-id="${choice.character}"]`).click();
    for (let skin = 1; skin < choice.skin; skin++) await page.locator(id).click({ button: 'right' });
  }
  await page.getByRole('button', { name: 'Start match' }).click();
  const state = await page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as { matchState: MatchState }).matchState);
  const players = { ...state.draft!.playerStates };
  for (const id of state.playerOrder) {
    const player = players[id]!;
    const phrases = ['your-brother', 'is-a-snitch'].map((phraseId) => sampleContent.phrases.find((phrase) => phrase.id === phraseId)!);
    const steps = phrases.map((phrase) => ({ kind: 'phrase' as const, phrase: prepareEnglishGrammarPhrase(phrase, englishGameLocale) }));
    const analyzed = englishGrammarAdapter.analyze({ steps, subjectNumber: player.subjectNumber, objectNumber: player.objectNumber });
    if (!analyzed.accepted) throw new Error('The public speech fixture is not grammatical.');
    players[id] = { ...player, construction: { ...player.construction, steps, analysis: analyzed.analysis,
      previewText: analyzed.analysis.publicText, requiredRoles: analyzed.analysis.nextRoles,
      selectedCards: phrases.map((phrase) => ({ phraseId: phrase.id, source: 'restored' as const })),
    } };
  }
  await page.evaluate((serialized) => {
    const app = document.querySelector('grand-transition-app') as unknown as { matchState: MatchState };
    app.matchState = JSON.parse(serialized) as MatchState;
    (window as unknown as { skinSpeechEvidence: Evidence }).skinSpeechEvidence.voices =
      typeof speechSynthesis === 'object' ? speechSynthesis.getVoices().map((voice) => ({ name: voice.name, local: voice.localService })) : [];
  }, JSON.stringify({ ...state, draft: { ...state.draft!, playerStates: players } }));
}

for (const scenario of [
  { name: 'male and female human skins use British George and Emma', choices: [
    { character: 'red-folded-chairman', skin: 2, neural: 'bf_emma' },
    { character: 'thunder-tribune', skin: 1, neural: 'bm_george' },
  ] },
  { name: 'Robot 1 and Robot 2 use local David and Mark when installed', choices: [
    { character: 'government-ai', skin: 1, neural: 'bm_george', microsoft: 'David' },
    { character: 'government-ai', skin: 2, neural: 'bm_george', microsoft: 'Mark' },
  ] },
  { name: 'the schoolteacher robot uses local Zira when installed', choices: [
    { character: 'government-ai', skin: 3, neural: 'bf_emma', microsoft: 'Zira' },
    { character: 'thunder-tribune', skin: 1, neural: 'bm_george' },
  ] },
] satisfies Array<{ name: string; choices: Choice[] }>) {
  test(scenario.name, async ({ page }, info) => {
    test.setTimeout(150_000); await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await configure(page, scenario.choices);
    const before = await page.evaluate(() => (window as unknown as { skinSpeechEvidence: Evidence }).skinSpeechEvidence);
    expect(before.native).toHaveLength(0); expect(before.neural).toHaveLength(0);
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Round 2/u })).toBeVisible({ timeout: 110_000 });
    const evidence = await page.evaluate(() => (window as unknown as { skinSpeechEvidence: Evidence }).skinSpeechEvidence);
    const nativeExpected: string[] = []; const neuralExpected: string[] = [];
    for (const choice of [...scenario.choices].reverse()) {
      const native = choice.microsoft && before.voices.find((voice) => voice.local && new RegExp(`^Microsoft ${choice.microsoft}\\b`, 'u').test(voice.name));
      if (native) nativeExpected.push(native.name); else neuralExpected.push(choice.neural);
    }
    expect(evidence.native.map(({ name }) => name)).toEqual(nativeExpected);
    expect(evidence.native.every(({ local }) => local)).toBe(true);
    for (const delivery of evidence.native) {
      expect(delivery.text).toBe('Your brother is a snitch.');
      expect(delivery.boundaries.map(({ charIndex }) => charIndex)).toContain(13);
      expect(delivery.ended).toBeGreaterThan(delivery.started!);
    }
    expect(evidence.neural.map(({ voiceId }) => voiceId)).toEqual(neuralExpected);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('skin-and-voice.png') });
    await writeFile(info.outputPath('voices.json'), JSON.stringify(evidence, null, 2));
  });
}
