import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { effectIds } from '../src/audio/audio-port';
import { defaultSettings } from '../src/persistence/codecs/settings-codec';
import { useFixedBrowserMatchSeed } from './helpers/match-flow';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

type AudioEvidence = { starts: Array<{ loop: boolean; at: number; wall: number }>; stops: number[];
  contexts: AudioContext[]; gains: GainNode[]; analyser: AnalyserNode | null;
  speech: Array<{ text: string; voice: { voiceURI: string } | null; rate: number; volume: number; pitch: number }>;
  utterances: SpeechSynthesisUtterance[];
  cancels: number; voices: SpeechSynthesisVoice[]; voiceChange: () => void };
declare global { interface Window { audioEvidence: AudioEvidence; } }

async function recordEvidence(page: Page, info: TestInfo, name: string, result: object) {
  const file = info.outputPath(`${name}.json`);
  await writeFile(file, JSON.stringify({ browser: info.project.name,
    browserVersion: page.context().browser()!.version(), os: process.platform,
    viewport: page.viewportSize(), build: 'npm run build', ...result }, null, 2));
  await info.attach(name, { path: file, contentType: 'application/json' });
}

async function probe(page: Page, unavailable = false) {
  await page.addInitScript(({ unavailable, settings }) => {
    localStorage.setItem('grand-transition.settings.v1', JSON.stringify({ ...settings, turnTimerSeconds: null }));
    const evidence: AudioEvidence = { starts: [], stops: [], contexts: [], gains: [], analyser: null,
      speech: [], utterances: [], cancels: 0, voices: [], voiceChange: () => {} };
    window.audioEvidence = evidence;
    const native = window.AudioContext;
    class MeasuredContext extends (native ?? class {}) {
      constructor() {
        super(); evidence.contexts.push(this);
        evidence.analyser = this.createAnalyser();
        evidence.analyser.fftSize = 2048;
        const silentOutput = super.createGain();
        silentOutput.gain.value = 0;
        evidence.analyser.connect(silentOutput);
        silentOutput.connect(this.destination);
      }
      override createGain() {
        const gain = super.createGain();
        if (evidence.gains.length === 0) {
          const connect = gain.connect.bind(gain);
          gain.connect = ((node: AudioNode) => connect(node === this.destination ? evidence.analyser! : node)) as GainNode['connect'];
        }
        evidence.gains.push(gain); return gain;
      }
      override createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source); const stop = source.stop.bind(source);
        source.start = (at = 0) => { evidence.starts.push({ loop: source.loop, at, wall: performance.now() }); start(at); };
        source.stop = (at = 0) => { evidence.stops.push(at); stop(at); };
        return source;
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable || !native ? undefined : MeasuredContext });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak: () => { throw new Error('Legacy platform speech must not run.'); },
    } });

  }, { unavailable, settings: defaultSettings });
}

async function ready(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    (document.querySelector('grand-transition-app') as unknown as { audio: { status: string } }).audio.status,
  )).toBe('ready');
}

async function samplePeak(page: Page) {
  return page.evaluate(() => {
    const analyser = window.audioEvidence.analyser;
    if (!analyser) return -1;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    return Math.max(...data.map(Math.abs));
  });
}

test('native decoded menu, scene, cues, mute, and exit under production CSP', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await probe(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    if (['xhr', 'websocket'].includes(request.resourceType())) errors.push(`Forbidden request: ${request.resourceType()}`);
    if (request.resourceType() === 'fetch' && !/\/assets\/[^/]+\.(?:ogg|mp3)$/u.test(new URL(request.url()).pathname)) errors.push('Unexpected asset fetch');
    if (!request.url().startsWith('http://127.0.0.1:4173/')) errors.push('Nonlocal request');
  });
  await page.goto('/grand-transition/');
  expect(await page.evaluate(() => window.audioEvidence.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  if (info.project.name === 'webkit-audio' && process.platform === 'win32') {
    expect(await page.evaluate(() => typeof window.AudioContext)).toBe('undefined');
    await expect(page.getByText('Sound is unavailable. You can continue without sound.')).toBeVisible();
    expect(await page.evaluate(() => window.audioEvidence.starts)).toEqual([]);
    expect(errors).toEqual([]);
    await recordEvidence(page, info, 'audio-measurements', {
      nativeAudio: 'unavailable in the Windows Playwright WebKit binary', silentFallback: 'passed',
      audiblePlayback: 'blocked; requires a WebKit environment with Web Audio' });
    return;
  }
  await ready(page);
  await expect.poll(() => samplePeak(page)).toBeGreaterThan(0.001);
  const count = await page.evaluate(() => window.audioEvidence.starts.length);
  await page.getByLabel('Master volume').fill('0');
  await expect.poll(() => samplePeak(page)).toBe(0);
  await page.getByLabel('Master volume').fill('1');
  await expect.poll(() => samplePeak(page)).toBeGreaterThan(0.001);
  expect(await page.evaluate(() => window.audioEvidence.starts.length)).toBe(count);
  await page.getByLabel('Music volume').fill('0');
  await expect.poll(() => samplePeak(page)).toBe(0);
  const cueTimes = [];
  for (const cue of effectIds) {
    await expect.poll(() => samplePeak(page)).toBe(0);
    const result = await page.evaluate(async (id) => {
      const app = document.querySelector('grand-transition-app') as unknown as { audio: { play: (cue: string) => boolean } };
      const before = performance.now();
      const accepted = app.audio.play(id);
      const started = window.audioEvidence.starts.at(-1)!;
      const observedOnsetMs = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('The cue produced no audio signal.')), 1000);
        const samples = new Float32Array(2048);
        const observe = () => {
          window.audioEvidence.analyser!.getFloatTimeDomainData(samples);
          if (samples.some((value) => Math.abs(value) > 0.001)) {
            clearTimeout(timeout); resolve(performance.now() - before);
          } else requestAnimationFrame(observe);
        };
        observe();
      });
      return { cue: id, accepted, elapsedMs: started.wall - before, observedOnsetMs };
    }, cue);
    cueTimes.push(result);
    expect(result.accepted, cue).toBe(true);
    expect(result.elapsedMs, cue).toBeLessThan(100);
    expect(result.observedOnsetMs, cue).toBeLessThan(100);
  }
  await page.getByLabel('Effects volume').fill('0');
  await expect.poll(() => samplePeak(page)).toBe(0);
  await page.getByLabel('Music volume').fill('0.7');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect.poll(() => page.evaluate(() => window.audioEvidence.starts.filter(({ loop }) => loop).length)).toBe(3);
  await expect.poll(() => samplePeak(page)).toBeGreaterThan(0.001);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => samplePeak(page)).toBe(0);
  await page.evaluate(() => document.querySelector('grand-transition-app')!.remove());
  await expect.poll(() => page.evaluate(() => window.audioEvidence.contexts.map((context) => context.state))).toEqual(['closed']);
  expect(errors).toEqual([]);
  await recordEvidence(page, info, 'audio-measurements', {
    cueTimes, menu: 'nonzero samples', scene: 'nonzero samples', mute: 'exact zero samples',
    physicalListening: 'not performed' });
});

test('speech controls omit voice selection and fit supported landscape states', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await probe(page);
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByLabel('Speech rate').fill('1.4');
  await page.getByLabel('Speech volume').fill('0.5');
  for (const [width, height] of [[1024, 720], [1024, 768], [1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect(page.getByRole('dialog')).toBeVisible();
    const geometry = await page.getByRole('dialog').evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return { inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        controlsFit: [...dialog.querySelectorAll('input,select,button')].every((element) => {
          const box = element.getBoundingClientRect();
          return box.left >= rect.left && box.right <= rect.right;
        }) };
    });
    expect(geometry).toEqual({ inside: true, pageOverflow: false, controlsFit: true });
    await page.screenshot({ path: info.outputPath(`settings-${width}x${height}.png`) });
  }
  expect(await page.evaluate(() => window.audioEvidence.speech)).toEqual([]);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
});

test('unavailable services keep the controls usable and the fallback silent', async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 720 }); await probe(page, true);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Sound is unavailable. You can continue without sound.')).toBeVisible();
  await expect(page.getByText('Local neural speech is unavailable. You can continue without narration.')).toBeVisible();
  await page.getByRole('button', { name: 'Retry sound' }).click();
  await page.getByLabel('Master volume').fill('0');
  await page.getByLabel('Speech enabled').check();
  await page.screenshot({ path: info.outputPath('unavailable.png') });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.shared-board')).toBeVisible();
  expect(await page.evaluate(() => ({ sources: window.audioEvidence.starts.length, speech: window.audioEvidence.speech.length })))
    .toEqual({ sources: 0, speech: 0 });
  expect(errors).toEqual([]);
});

test('real local neural speech narrates both public bubbles before Victory', async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await useFixedBrowserMatchSeed(page, 20260823); await probe(page);
  const errors: string[] = []; const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    const native = window.Worker;
    const commands: Array<{ type: string; segments?: string[]; voiceId?: string; rate?: number; pitch?: number }> = [];
    Object.assign(window, { neuralCommands: commands });
    window.Worker = class extends native {
      override postMessage(message: unknown, transfer?: Transferable[] | StructuredSerializeOptions) {
        commands.push(structuredClone(message) as typeof commands[number]);
        if (Array.isArray(transfer)) super.postMessage(message, transfer);
        else super.postMessage(message, transfer);
      }
    };
  });
  await page.goto('/grand-transition/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Speech enabled').check();
  if (info.project.name === 'webkit-audio' && process.platform === 'win32') {
    await expect(page.getByText('Local neural speech is unavailable. You can continue without narration.')).toBeVisible();
    expect(errors).toEqual([]);
    expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
    return;
  }
  const began = Date.now();
  await expect.poll(() => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speech: { status: string };
  }).speech.status), { timeout: 90_000 }).toBe('ready');
  const readyMs = Date.now() - began;
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Set up match' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  const pick = (role: string) => page.locator(`.shared-board [data-role="${role}"] button`).first().click();
  await pick('noun'); await pick('noun'); await pick('predicate'); await pick('verb');
  await page.getByRole('button', { name: 'End', exact: true }).click(); await pick('noun');
  const synthesized = () => page.evaluate(() => (window as unknown as {
    neuralCommands: Array<{ type: string; segments?: string[]; voiceId?: string; rate?: number; pitch?: number }>
  }).neuralCommands.filter((command) => command.type === 'synthesize'));
  expect(await synthesized()).toEqual([]);
  await page.evaluate(() => {
    const app = document.querySelector('grand-transition-app') as unknown as { matchState: import('../src/engine/match-lifecycle').MatchState };
    const state = app.matchState; const id = state.playerOrder[0]!;
    app.matchState = { ...state, playerStates: { ...state.playerStates, [id]: { ...state.playerStates[id]!, pride: 1 } } };
  });
  await page.getByRole('button', { name: 'End', exact: true }).click();
  const result = await page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    matchState: import('../src/engine/match-lifecycle').MatchState;
  }).matchState.resolutionHistory.at(-1)!);
  for (const [index, id] of ['player-two', 'player-one'].entries()) {
    await expect.poll(async () => (await synthesized()).length, { timeout: 90_000 }).toBe(index + 1);
    await expect(page.locator('.match-screen')).toHaveAttribute('data-delivery-phase', 'reciting', { timeout: 90_000 });
    await expect(page.locator('.sentence-ledger')).toHaveAttribute('data-speaker-side', index === 0 ? 'blue' : 'red');
    await expect(page.locator('.sentence-preview')).toHaveText(result.players[id]!.insultText!);
    await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toHaveCount(0);
    await expect(page.locator('.delivery-total strong')).toHaveText(String(result.players[id]!.outgoingDamage), { timeout: 90_000 });
    await page.screenshot({ path: info.outputPath(`neural-delivery-${id}.png`) });
  }
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible({ timeout: 10_000 });
  const commands = await synthesized();
  expect(commands.map((command) => command.segments!.join(''))).toEqual([
    result.players['player-two']!.insultText, result.players['player-one']!.insultText,
  ]);
  expect(commands.every((command) => command.voiceId === 'bm_george')).toBe(true);
  expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
  expect(errors).toEqual([]);
  await recordEvidence(page, info, 'neural-speech', { readyMs, synthesized: commands,
    model: 'Kokoro-82M-v1.0 q8', engine: 'local ONNX WASM', privateDraftRequests: 0,
    terminalOverlay: 'after both deliveries', physicalListening: 'not performed' });
});
