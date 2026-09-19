import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import {
  appSettings,
  configureRomanianSpeech,
  endBothTurns,
  romanianInterfaceText,
  romanianSpeechEvidence,
  type RomanianSpeechEvidence,
} from './helpers/romanian-speech';

// Local names for the shared harness, so the assertions below read unchanged.
type Evidence = RomanianSpeechEvidence;
const interfaceText = romanianInterfaceText;
const configure = configureRomanianSpeech;

test('Romanian game speech uses the shipped Romanian voices and never leaves the device', async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const { requests } = await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  const end = interfaceText.en.end;
  await page.getByRole('button', { name: end, exact: true }).click();
  await page.getByRole('button', { name: end, exact: true }).click();
  await expect(page.getByRole('heading', { name: /R(?:ound|unda) 2/u })).toBeVisible({ timeout: 150_000 });
  const evidence = await page.evaluate(() => {
    const app = document.querySelector('grand-transition-app') as unknown as {
      speechDiagnostics: { snapshot(): import('../src/audio/speech-diagnostics').SpeechDiagnosticsDocument };
    };
    return {
      speech: (window as unknown as { romanianSpeechEvidence: Evidence }).romanianSpeechEvidence,
      diagnostics: app.speechDiagnostics.snapshot(),
      pcm: (window as unknown as { romanianSpeechEvidence: Evidence }).romanianSpeechEvidence.messages
        .filter((message): message is { type: 'speech'; samples: Float32Array; sampleRate: number;
          playbackRate: number; markers: { index: number; seconds: number }[] } =>
          (message as { type?: string }).type === 'speech')
        .map(({ samples, sampleRate, playbackRate, markers }) => ({
          sampleCount: samples.length, sampleRate, playbackRate,
          finite: samples.every(Number.isFinite),
          audible: samples.some((sample) => Math.abs(sample) > 0.001),
          duration: samples.length / sampleRate / playbackRate,
          markers,
        })),
    };
  });
  // A silent delivery hides the cause, so surface the worker's own failures and
  // diagnostics before the voice assertion: an error here is the real defect.
  expect(evidence.speech.messages.filter((message) => (message as { type?: string }).type === 'error')).toEqual([]);
  expect(evidence.diagnostics.events.filter((event) => event.type === 'error' || event.type === 'fallback')).toEqual([]);
  expect(evidence.diagnostics.events.filter((event) => event.type === 'silent-start')).toEqual([]);
  const { speech } = evidence;
  // Both players speak Romanian neural voices: the male player Mihai, the female Liana.
  expect(speech.neural.map((call) => call.voiceId)).toEqual([
    'ro_RO-mihai-medium', 'ro_RO-mihai-medium', 'ro_RO-liana-high', 'ro_RO-liana-high',
  ]);
  expect(evidence.pcm).toHaveLength(4);
  for (const { sampleCount, sampleRate, playbackRate, finite, audible, duration, markers } of evidence.pcm) {
    expect(sampleCount).toBeGreaterThan(0);
    expect(sampleRate).toBe(22_050);
    expect(playbackRate).toBeGreaterThan(0);
    expect(finite).toBe(true);
    expect(audible).toBe(true);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0]!.index).toBe(0);
    expect(markers.every(({ seconds }, index) => Number.isFinite(seconds) && seconds >= 0 &&
      seconds <= duration && (index === 0 || seconds >= markers[index - 1]!.seconds))).toBe(true);
  }
  for (const speakerId of ['player-one', 'player-two']) {
    const events = evidence.diagnostics.events.filter((event) => event.speakerId === speakerId);
    const spoken = events.filter(({ type }) => type === 'segment').map(({ segment }) => segment);
    const displayed = events.filter(({ type }) => type === 'presentation-segment').map(({ segment }) => segment);
    expect(spoken).toEqual([0, 1, 2, 3, 4]);
    expect(displayed).toEqual(spoken);
    for (const [index, segment] of displayed.entries()) {
      const speechPosition = events.findIndex((event) => event.type === 'segment' && event.segment === segment);
      const displayPosition = events.findIndex((event) => event.type === 'presentation-segment' && event.segment === segment);
      expect(displayPosition, `${speakerId} score marker ${index}`).toBeGreaterThan(speechPosition);
    }
    expect(events.findIndex(({ type }) => type === 'presentation-total'))
      .toBeGreaterThan(events.findLastIndex(({ type }) => type === 'presentation-segment'));
  }
  // No English platform voice is ever asked to speak Romanian.
  expect(speech.native).toEqual([]);
  expect(errors).toEqual([]);
  // No phrase leaves the device: every request is same-origin, and no request
  // body carries a word of what was actually spoken.
  const origin = new URL(page.url()).origin;
  expect(requests.every(({ url }) => url.startsWith(origin))).toBe(true);
  const spoken = speech.neural.flatMap((call) => call.segments.join(' ').split(/\s+/u))
    .map((word) => word.replace(/[^\p{Letter}]/gu, '').toLowerCase())
    .filter((word) => word.length >= 6);
  expect(spoken.length).toBeGreaterThan(0);
  const leaked = requests.filter(({ body }) => {
    const carried = body?.toLowerCase() ?? '';
    return spoken.some((word) => carried.includes(word));
  });
  expect(leaked).toEqual([]);
  await writeFile(info.outputPath('romanian-speech.json'), JSON.stringify({ evidence, requests: requests.length }, null, 2));
});

test('a Romanian interface with an English game language keeps English speech', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await configure(page, { interfaceLocale: 'ro-RO', gameLocale: 'en' });
  const end = interfaceText['ro-RO'].end;
  await page.getByRole('button', { name: end, exact: true }).click();
  await page.getByRole('button', { name: end, exact: true }).click();
  await expect(page.getByRole('heading', { name: /R(?:ound|unda) 2/u })).toBeVisible({ timeout: 150_000 });
  const evidence = await page.evaluate(() => (window as unknown as { romanianSpeechEvidence: Evidence }).romanianSpeechEvidence);
  expect(evidence.neural.map((call) => call.voiceId)).toEqual([
    'vctk-p226', 'vctk-p226', 'vctk-p225', 'vctk-p225',
  ]);
  expect(errors).toEqual([]);
});

/** Play both turns and report the speech evidence, whatever the delivery did. */
async function playRound(page: Page, end: string): Promise<{
  evidence: Evidence; settings: { speechEnabled: boolean; gameLocale: string }; errors: string[];
  diagnostics: import('../src/audio/speech-diagnostics').SpeechDiagnosticsDocument;
}> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await endBothTurns(page, end);
  const diagnostics = await page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speechDiagnostics: { snapshot(): import('../src/audio/speech-diagnostics').SpeechDiagnosticsDocument };
  }).speechDiagnostics.snapshot());
  return { evidence: await romanianSpeechEvidence(page), settings: await appSettings(page), errors, diagnostics };
}

test('speech that is switched off never synthesizes Romanian or any platform voice', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO', enableSpeech: false });
  const { evidence, settings, errors } = await playRound(page, interfaceText.en.end);
  expect({ speechEnabled: settings.speechEnabled, gameLocale: settings.gameLocale })
    .toEqual({ speechEnabled: false, gameLocale: 'ro-RO' });
  expect(evidence.neural).toEqual([]);
  expect(evidence.native).toEqual([]);
  expect(errors).toEqual([]);
});

test('corrupt Romanian weights keep the delivery silent without breaking the match', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  // The Romanian package is fetched lazily, so corrupt it once the app is ready.
  // The worker's own digest check must reject the weights.
  await page.route('**/tts/ro/**/model.onnx', (route) => route.fulfill({
    status: 200, contentType: 'application/octet-stream', body: 'corrupt',
  }));
  const { evidence, diagnostics, errors } = await playRound(page, interfaceText.en.end);
  expect(evidence.neural.map(({ voiceId }) => voiceId)).toEqual(['ro_RO-mihai-medium']);
  expect(evidence.messages.some((message) => (message as { type?: string }).type === 'error')).toBe(true);
  expect(diagnostics.events.some(({ type, reason }) => type === 'error' && reason === 'inference')).toBe(true);
  expect(diagnostics.events.some(({ type }) => type === 'fallback')).toBe(false);
  expect(evidence.native).toEqual([]);
  expect(errors).toEqual([]);
});

test('a missing Romanian package keeps the delivery silent without breaking the match', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  await page.route('**/tts/ro/manifest.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  const { evidence, diagnostics, errors } = await playRound(page, interfaceText.en.end);
  expect(evidence.neural).toEqual([]);
  expect(evidence.messages.some((message) => (message as { type?: string }).type === 'error')).toBe(true);
  expect(diagnostics.events.some(({ type, reason }) => type === 'error' && reason === 'worker')).toBe(true);
  expect(diagnostics.events.some(({ type }) => type === 'fallback')).toBe(false);
  expect(evidence.native).toEqual([]);
  expect(errors).toEqual([]);
});

test('Pause suspends Romanian playback and Resume completes the public delivery', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await expect.poll(async () => (await romanianSpeechEvidence(page)).neural.length, { timeout: 90_000 })
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const audioState = () => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speech: { romanian: { context: AudioContext } };
  }).speech.romanian.context.state);
  await expect.poll(audioState).toBe('suspended');
  await page.waitForTimeout(250);
  expect(await audioState()).toBe('suspended');
  expect((await romanianSpeechEvidence(page)).native).toEqual([]);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(audioState).toBe('running');
  await expect(page.getByRole('heading', { name: /R(?:ound|unda) 2/u })).toBeVisible({ timeout: 150_000 });
  const completed = await romanianSpeechEvidence(page);
  expect(completed.neural.length).toBeGreaterThan(0);
  expect(completed.native).toEqual([]);
  const events = await page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speechDiagnostics: { snapshot(): import('../src/audio/speech-diagnostics').SpeechDiagnosticsDocument };
  }).speechDiagnostics.snapshot().events.map(({ type }) => type));
  expect(events).toContain('pause');
  expect(events).toContain('resume');
});

test('Romanian inference timeout ends the public delivery without another voice', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  // Keep the production worker and model loader, but drop the synthesis command
  // at the native Worker boundary. The main-thread 60-second watchdog remains real.
  await page.evaluate(() => {
    const nativePrototype = Object.getPrototypeOf(Worker.prototype) as Worker;
    const post = Object.getOwnPropertyDescriptor(nativePrototype, 'postMessage')!.value as
      (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions) => void;
    nativePrototype.postMessage = function (message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
      const command = message as { type?: string; voiceId?: string };
      if (command.type === 'synthesize' && command.voiceId?.startsWith('ro_RO-')) return;
      Reflect.apply(post, this, [message, options]);
    };
  });
  await page.clock.install();
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await expect.poll(async () => (await romanianSpeechEvidence(page)).neural.length, { timeout: 90_000 })
    .toBeGreaterThan(0);
  await page.clock.fastForward(60_001);
  await expect.poll(() => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speechDiagnostics: { snapshot(): import('../src/audio/speech-diagnostics').SpeechDiagnosticsDocument };
  }).speechDiagnostics.snapshot().events.some(({ type, reason }) => type === 'timeout' && reason === 'inference')))
    .toBe(true);
  const nextRound = page.getByRole('heading', { name: /R(?:ound|unda) 2/u });
  for (let attempt = 0; attempt < 12 && !(await nextRound.isVisible()); attempt++) {
    await page.clock.fastForward(10_000);
  }
  await expect(nextRound).toBeVisible();
  const evidence = await romanianSpeechEvidence(page);
  expect(evidence.neural.map(({ voiceId }) => voiceId)).toEqual(['ro_RO-mihai-medium']);
  expect(evidence.native).toEqual([]);
});

test('visibility and menu navigation stop Romanian playback within 100 ms', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  await page.evaluate(() => {
    const stops: number[] = [];
    Object.assign(window, { romanianSourceStops: stops });
    const stop = Reflect.get(AudioBufferSourceNode.prototype, 'stop') as
      (this: AudioBufferSourceNode, when?: number) => void;
    AudioBufferSourceNode.prototype.stop = function (when?: number) {
      stops.push(performance.now());
      Reflect.apply(stop, this, [when]);
    };
  });
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await page.getByRole('button', { name: interfaceText.en.end, exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const app = document.querySelector('grand-transition-app') as unknown as {
      speech: { romanian: { sources: Map<AudioBufferSourceNode, GainNode> } };
    };
    return app.speech.romanian?.sources.size ?? 0;
  }), { timeout: 90_000 }).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const audioState = () => page.evaluate(() => (document.querySelector('grand-transition-app') as unknown as {
    speech: { romanian: { context: AudioContext } };
  }).speech.romanian.context.state);
  await expect.poll(audioState).toBe('suspended');
  const result = await page.evaluate(async () => {
    const app = document.querySelector('grand-transition-app') as unknown as {
      updateComplete: Promise<boolean>; matchState: unknown;
      speech: { romanian: { sources: Map<AudioBufferSourceNode, GainNode> } };
    };
    const sourceCount = app.speech.romanian.sources.size;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await app.updateComplete;
    (document.querySelector('.match-pause') as HTMLButtonElement).click();
    await app.updateComplete;
    const match = document.querySelector('grand-transition-match') as HTMLElement &
      { updateComplete: Promise<boolean> };
    await match.updateComplete;
    const interruption = document.querySelector('grand-transition-interruption') as HTMLElement &
      { updateComplete: Promise<boolean> };
    await interruption.updateComplete;
    interruption.querySelector<HTMLButtonElement>('.interruption-exit')!.click();
    await interruption.updateComplete;
    const began = performance.now();
    interruption.querySelector<HTMLButtonElement>('.interruption-danger')!.click();
    const stops = (window as unknown as { romanianSourceStops: number[] }).romanianSourceStops;
    return { sourceCount, stoppedAfterMs: stops.length ? stops.at(-1)! - began : null,
      remainingSources: app.speech.romanian.sources.size, matchEnded: app.matchState === null };
  });
  expect(result.sourceCount).toBeGreaterThan(0);
  expect(result.stoppedAfterMs).not.toBeNull();
  expect(result.stoppedAfterMs!).toBeGreaterThanOrEqual(0);
  expect(result.stoppedAfterMs!).toBeLessThan(100);
  expect(result.remainingSources).toBe(0);
  expect(result.matchEnded).toBe(true);
  expect((await romanianSpeechEvidence(page)).native).toEqual([]);
});

test('a long public Romanian sentence with all diacritics yields complete PCM and markers', async ({ page }) => {
  test.setTimeout(180_000);
  await configure(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  const segment = 'Ștefan ține o hârtie în mână, iar țara așteaptă răspunsuri. ';
  const segments = Array.from({ length: 8 }, () => segment);
  const accepted = await page.evaluate((parts) => {
    const app = document.querySelector('grand-transition-app') as unknown as {
      speech: { speak(request: import('../src/audio/speech-port').SpeechRequest): { accepted: boolean } };
    };
    const record = { markers: [] as number[], ended: false, error: false };
    Object.assign(window, { romanianLongSpeech: record });
    return app.speech.speak({ text: parts.join(''), segments: parts, chunkStarts: [0],
      language: 'ro-RO', voiceUri: 'piper:ro_RO-mihai-medium', volume: 1,
      onSegment: (index) => record.markers.push(index),
      onEnd: () => { record.ended = true; }, onError: () => { record.error = true; } }).accepted;
  }, segments);
  expect(accepted).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    romanianLongSpeech: { ended: boolean; error: boolean };
  }).romanianLongSpeech), { timeout: 120_000 }).toMatchObject({ ended: true, error: false });
  const result = await page.evaluate(() => {
    const record = (window as unknown as { romanianLongSpeech: { markers: number[] } }).romanianLongSpeech;
    const messages = (window as unknown as { romanianSpeechEvidence: Evidence }).romanianSpeechEvidence.messages;
    const speech = messages.filter((message): message is { type: 'speech'; samples: Float32Array;
      markers: { index: number; seconds: number }[]; sampleRate: number } =>
      (message as { type?: string }).type === 'speech');
    return { delivered: record.markers, chunks: speech.length,
      sampleCount: speech.reduce((total, message) => total + message.samples.length, 0),
      finite: speech.every((message) => message.samples.every(Number.isFinite)),
      audible: speech.some((message) => message.samples.some((sample) => Math.abs(sample) > 0.001)),
      lastMarker: speech.at(-1)?.markers.at(-1)?.index,
      native: (window as unknown as { romanianSpeechEvidence: Evidence }).romanianSpeechEvidence.native };
  });
  expect(result.chunks).toBe(1);
  expect(result.sampleCount).toBeGreaterThan(22_050);
  expect(result.finite).toBe(true);
  expect(result.audible).toBe(true);
  expect(result.lastMarker).toBe(7);
  expect(result.delivered).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(result.native).toEqual([]);
});
