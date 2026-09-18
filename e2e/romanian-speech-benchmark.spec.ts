// Retained production benchmark for Romanian neural speech (AC-029-16).
//
// Opt-in, because it measures rather than asserts and pays a full cold start:
//   $env:GRAND_TRANSITION_BENCHMARK=1; npx playwright test e2e/romanian-speech-benchmark.spec.ts
// It runs against the production build served by the Playwright webServer, on
// the least-capable supported environment we can reproduce locally: Chromium
// with the CPU throttled to a low-end machine and the HTTP cache disabled.

import { expect, test } from '@playwright/test';
import os from 'node:os';
import { writeFile } from 'node:fs/promises';
import {
  configureRomanianSpeech,
  endBothTurns,
  injectRomanianConstruction,
  romanianInterfaceText,
  romanianSpeechEvidence,
} from './helpers/romanian-speech';

test.skip(process.env.GRAND_TRANSITION_BENCHMARK !== '1',
  'Set GRAND_TRANSITION_BENCHMARK=1 to record the Romanian speech benchmark.');
test.skip(({ browserName }) => browserName !== 'chromium',
  'CPU throttling and heap sampling need Chromium.');

const cpuThrottleRate = 4;
const synthesisTimeoutMs = 60_000;

type Sample = { voiceId: string; cold: boolean; ms: number };

function median(values: readonly number[]): number {
  if (!values.length) throw new Error('A median needs at least one sample.');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function summary(values: readonly number[]): { repetitions: number; medianMs: number; worstMs: number } {
  return { repetitions: values.length, medianMs: Math.round(median(values)), worstMs: Math.round(Math.max(...values)) };
}

test('records the Romanian speech workload on the least-capable supported environment', async ({ page, browser }, info) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottleRate });
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });

  await configureRomanianSpeech(page, { interfaceLocale: 'en', gameLocale: 'ro-RO' });
  const started = Date.now();
  await endBothTurns(page, romanianInterfaceText.en.end);
  const roundMs = Date.now() - started;
  const evidence = await romanianSpeechEvidence(page);

  // The app synthesizes one call per clause and the worker answers one speech
  // message per call, so the two streams pair up in order.
  const requested = evidence.timeline.filter(({ direction }) => direction === 'out');
  const synthesized = evidence.timeline.filter(({ direction, data }) =>
    direction === 'in' && (data as { type?: string }).type === 'speech');
  expect(requested).toHaveLength(4);
  expect(synthesized).toHaveLength(4);
  const seenVoices = new Set<string>();
  const samples: Sample[] = requested.map(({ data }, index) => {
    const voiceId = (data as { voiceId: string }).voiceId;
    const cold = !seenVoices.has(voiceId);
    seenVoices.add(voiceId);
    return { voiceId, cold, ms: synthesized[index]!.at - requested[index]!.at };
  });

  // Cold download: the worker reports its own progress, because fetches made
  // inside a worker do not appear in the page's resource timeline. The packaged
  // size is read from the shipped manifest rather than inferred from those
  // messages, which are per file.
  const progress = evidence.timeline.filter(({ direction, data }) =>
    direction === 'in' && (data as { type?: string }).type === 'progress');
  const packagedBytes = await page.evaluate(async () => {
    const manifest = await (await fetch(new URL('tts/ro/manifest.json', document.baseURI))).json() as
      { files: { bytes: number }[] };
    return manifest.files.reduce((total, { bytes }) => total + bytes, 0);
  });
  const coldDownload = progress.length ? {
    progressMessages: progress.length,
    transferMs: Math.round(progress.at(-1)!.at - progress[0]!.at),
    packagedBytes,
    reportedLoadedBytes: Math.max(...progress.map(({ data }) => (data as { loaded: number }).loaded)),
  } : null;

  // Cancellation: start the next delivery, interrupt it while the first clause
  // is still being synthesized, and confirm the app stops asking the worker.
  const requestedBefore = evidence.neural.length;
  const end = romanianInterfaceText.en.end;
  // The round is over, so both hands are empty again: arm the next delivery
  // before interrupting it.
  await injectRomanianConstruction(page);
  await page.getByRole('button', { name: end, exact: true }).click();
  await page.getByRole('button', { name: end, exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    romanianSpeechEvidence: { neural: unknown[] };
  }).romanianSpeechEvidence.neural.length), { timeout: 120_000 }).toBeGreaterThan(requestedBefore);
  const cancelClickPageTime = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(2_000);
  const afterCancel = await romanianSpeechEvidence(page);
  const further = afterCancel.neural.length - requestedBefore;
  const answers = afterCancel.timeline.filter(({ direction, data }) =>
    direction === 'in' && (data as { type?: string }).type === 'speech');
  const lastAnswer = answers.at(-1);
  const cancellation = {
    clausesInDelivery: samples.length,
    clausesRequestedForTheInterruptedDelivery: further,
    msFromCancelToLastAnswer: lastAnswer ? Math.round(lastAnswer.at - cancelClickPageTime) : null,
    note: 'A clause already being inferred cannot be recalled; the load-bearing observation is that the app requests fewer clauses than the delivery contains, and stops asking for further ones.',
  };

  const warm = samples.filter(({ cold }) => !cold);
  const perVoiceWarm = Object.fromEntries([...new Set(samples.map(({ voiceId }) => voiceId))].map((voiceId) => [
    voiceId,
    summary(samples.filter(({ cold, voiceId: id }) => !cold && id === voiceId).map(({ ms }) => ms)),
  ]));

  const report = {
    criterion: 'AC-029-16',
    recordedAt: new Date().toISOString(),
    environment: {
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cpuCores: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      os: `${os.platform()} ${os.release()}`,
      node: process.version,
      browser: `${browser.browserType().name()} ${browser.version()}`,
      cpuThrottleRate,
      cacheDisabled: true,
      viewport: '1280x720',
      pageStartedAt: new Date(started).toISOString(),
    },
    workload: {
      text: evidence.neural.map(({ segments }) => segments.join('')),
      voices: samples.map(({ voiceId }) => voiceId),
      repetitions: samples.length,
      roundWallClockMs: roundMs,
    },
    coldDownload,
    coldInitializationMs: Math.round(samples.find(({ cold }) => cold)!.ms),
    perVoiceColdInitializationMs: Object.fromEntries(samples.filter(({ cold }) => cold)
      .map(({ voiceId, ms }) => [voiceId, Math.round(ms)])),
    samples: samples.map(({ voiceId, cold, ms }) => ({ voiceId, cold, ms: Math.round(ms) })),
    warmSynthesis: summary(warm.map(({ ms }) => ms)),
    perVoiceWarm,
    perVoiceNote: 'The first synthesis of each voice is cold. Warm samples are one per voice in a single run; the raw samples above carry the real evidence.',
    peakJavaScriptHeapBytes: evidence.peakHeapBytes,
    peakMemoryNote: 'performance.memory reports the JavaScript heap only, quantised by Chromium, and excludes the WebAssembly heap that holds the weights (the shipped package is the figure below). The WebAssembly heap remains unverified; see coldDownload.packagedBytes.',
    cancellation,
    unverified: {
      device: 'No low-end physical device or mobile browser was available; the throttled desktop Chromium run is the reproducible proxy.',
      wasmHeap: true,
    },
  };

  expect(samples.every(({ ms }) => ms < synthesisTimeoutMs)).toBe(true);
  expect(evidence.messages.filter((message) => (message as { type?: string }).type === 'error')).toEqual([]);
  await writeFile(info.outputPath('romanian-speech-benchmark.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
