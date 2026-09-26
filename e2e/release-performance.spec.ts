import { chromium, expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { open, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fullQualityGateRequested } from '../tools/quality-gate-mode.ts';
import { sceneMusicTrackIds } from '../src/audio/audio-port.ts';
import { planMatchBrowserFlow } from './helpers/match-flow.ts';
import { lockInSetup } from './helpers/setup.ts';
import { removeStoredDocument, settingsStorageKey, storedDocument } from './helpers/stored-data.ts';
import {
  cumulativeLayoutShift,
  summarizeDecodeIntervals,
} from './helpers/release-performance-metrics.ts';

const viewport = { width: 1920, height: 1080 };
const sceneId = 'transition-era-television-studio';
const network = {
  latency: 150,
  downloadThroughput: 9_000_000 / 8,
  uploadThroughput: 1_500_000 / 8,
};

type TimedValue = { startTime: number; duration: number };
type Shift = { startTime: number; value: number; hadRecentInput: boolean };
type Probe = {
  lcp: number[];
  events: Array<
    TimedValue & {
      name: string;
      interactionId: number;
      processingStart: number;
      processingEnd: number;
    }
  >;
  shifts: Shift[];
  frames: number[];
  decodes: TimedValue[];
  playback: Array<{ at: number; decodedAt: number | null }>;
  workload: boolean;
  clicks: number;
};

declare global {
  interface Window {
    releasePerformance: Probe;
  }
}

// This workload is deliberately unavailable to direct test invocations and the
// quick gate. Only the full-gate runner may request the ten production trials.
test('release performance meets every cold and warm production budget', async ({
  browserName,
}, info) => {
  test.skip(!fullQualityGateRequested(), 'Requires the full quality gate.');
  test.setTimeout(3_600_000);
  const plan = planMatchBrowserFlow();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results: object[] = [];
  const measurements: Array<Awaited<ReturnType<typeof measureTrial>>> = [];
  const reportPath = info.outputPath('release-performance.json');
  const environment = {
    milestone: '030',
    acceptance: 'AC-030-01',
    os: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model ?? 'unavailable',
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
    browser: `Google Chrome stable ${browser.version()}`,
    engine: browserName,
    tool: `Playwright ${JSON.parse(await readFile('node_modules/@playwright/test/package.json', 'utf8')).version}`,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    workingTree: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }),
    build: 'npm run build',
    artifactSha256: createHash('sha256')
      .update(await readFile('dist/index.html'))
      .digest('hex'),
    sceneManifestSha256: createHash('sha256')
      .update(await readFile('src/assets/scenes/scene-manifest.json'))
      .digest('hex'),
    viewport,
    sceneId,
    seed: plan.seed,
    cpuSlowdown: 4,
    network,
    workload:
      'Fresh-default title; Settings selects English, no optional speech, unlimited turns; 40 deterministic draft inputs, then five Pause and Resume pairs; real clock, full motion, native audio',
    eventTiming:
      'One duration per scripted click: maximum reported event duration with a nonzero interactionId. Hover events are excluded. Unreported durations are conservatively bounded by the 16 ms reporting threshold.',
    audioTiming:
      'Union of native decodeAudioData pending intervals: wall time with at least one decoder pending, excluding download and idle gaps. Concurrent intervals count once. The overlapping sum, full span, per-call entries and decoded-before-playback checks are retained separately. No metric estimates CPU time.',
    cache:
      'Each cold trial uses a new context and cleared HTTP cache. Its warm trial reloads the same page and retains the HTTP cache. Storage settings and seed are identical.',
    tracePrivacy:
      'CDP timeline trace and JSON input sequence only. No Playwright tracing, screenshots, DOM snapshots, or source files. Trace events contain timing and resource URLs, not private phrase text.',
  };
  const save = async () => {
    await writeFile(reportPath, JSON.stringify({ environment, trials: results }, null, 2));
  };
  try {
    for (let pair = 1; pair <= 5; pair++) {
      const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.clearBrowserCache');
      await session.send('Network.setCacheDisabled', { cacheDisabled: false });
      await session.send('Network.emulateNetworkConditions', { offline: false, ...network });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript((seed) => {
        // Each navigation measures fresh product defaults. Cache warmth is the
        // only difference between the paired title measurements.
        localStorage.removeItem('grand-transition.settings.v1');
        const nativeRandom = crypto.getRandomValues.bind(crypto);
        let seedPending = true;
        crypto.getRandomValues = ((array: ArrayBufferView) => {
          if (seedPending && array instanceof Uint32Array && array.length === 1) {
            seedPending = false;
            array[0] = seed;
            return array;
          }
          return nativeRandom(array as ArrayBufferView<ArrayBuffer>);
        }) as Crypto['getRandomValues'];
      }, plan.seed);
      await installProbe(page);
      try {
        for (const cache of ['cold', 'warm'] as const) {
          const name = `${cache}-${pair}`;
          const tracePath = info.outputPath(`${name}.trace.json`);
          await session.send('Tracing.start', {
            categories: 'devtools.timeline,blink.user_timing,loading,latencyInfo',
            transferMode: 'ReturnAsStream',
          });
          try {
            const measured = await measureTrial(page, cache, plan);
            measurements.push(measured);
            results.push({
              pair,
              cache,
              ...measured,
              trace: path.basename(tracePath),
            });
          } catch (error) {
            results.push({
              pair,
              cache,
              error: String(error),
              trace: path.basename(tracePath),
            });
            throw error;
          } finally {
            await keepTrace(session, tracePath);
            await save();
            await info.attach(`${name}-trace`, {
              path: tracePath,
              contentType: 'application/json',
            });
          }
        }
      } finally {
        await context.close();
      }
    }
    expect(measurements).toHaveLength(10);
    const cold = measurements.filter((_, index) => index % 2 === 0).map((trial) => trial.lcpMs);
    const warm = measurements.filter((_, index) => index % 2 === 1).map((trial) => trial.lcpMs);
    expect.soft(percentile(cold, 0.5), 'cold LCP median').toBeLessThanOrEqual(2_500);
    expect.soft(Math.max(...cold), 'cold LCP maximum').toBeLessThanOrEqual(3_000);
    expect.soft(percentile(warm, 0.5), 'warm LCP median').toBeLessThanOrEqual(2_000);
    expect.soft(Math.max(...warm), 'warm LCP maximum').toBeLessThanOrEqual(2_500);
    for (const [index, trial] of measurements.entries()) {
      const label = `trial ${index + 1}`;
      expect.soft(trial.inputCount, label).toBe(50);
      expect.soft(trial.inputP95Ms, `${label} input duration`).toBeLessThan(100);
      expect.soft(trial.frameP95Ms, `${label} frame interval`).toBeLessThanOrEqual(18.2);
      expect.soft(trial.longFrameFraction, `${label} frames above 50 ms`).toBeLessThan(0.01);
      expect.soft(trial.initialCls, `${label} initial CLS`).toBeLessThanOrEqual(0.05);
      expect.soft(trial.cardUpdateCls, `${label} card-update CLS`).toBe(0);
      expect
        .soft(trial.initialGzipBytes, `${label} initial JavaScript gzip`)
        .toBeLessThanOrEqual(350 * 1024);
      expect
        .soft(trial.audioDecodeMs, `${label} native audio decode pending wall time`)
        .toBeLessThanOrEqual(500);
      expect
        .soft(trial.audioDecodedBeforePlayback, `${label} decoded audio before playback`)
        .toBe(true);
      expect.soft(trial.unselectedAudioRequests, `${label} unselected scene audio`).toEqual([]);
      expect.soft(trial.pageErrors, `${label} uncaught errors`).toEqual([]);
    }
  } finally {
    await save();
    await info.attach('release-performance', { path: reportPath, contentType: 'application/json' });
    await browser.close();
  }
});

async function measureTrial(
  page: Page,
  cache: 'cold' | 'warm',
  plan: ReturnType<typeof planMatchBrowserFlow>,
) {
  const pageErrors: string[] = [];
  const onError = (error: Error) => pageErrors.push(error.message);
  page.on('pageerror', onError);
  try {
    if (cache === 'cold') await page.goto('http://127.0.0.1:4173/grand-transition/');
    else {
      await removeStoredDocument(page, settingsStorageKey);
      expect(await storedDocument(page, settingsStorageKey)).toBeNull();
      await page.reload();
    }
    await expect(page.getByRole('heading', { name: 'Grand Transition' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await twoFrames(page);
    const initial = await page.evaluate(() => ({
      lcpMs: window.releasePerformance.lcp.at(-1),
      shifts: window.releasePerformance.shifts.filter((entry) => !entry.hadRecentInput),
      scripts: performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => /\.[cm]?js$/u.test(new URL(name).pathname)),
    }));
    expect(
      initial.lcpMs,
      'Chromium must report a real largest-contentful-paint entry',
    ).toBeGreaterThan(0);
    const initialGzipBytes = (
      await Promise.all(
        [...new Set(initial.scripts)].map(
          async (url) =>
            gzipSync(
              await readFile(path.resolve('dist/assets', path.basename(new URL(url).pathname))),
            ).length,
        ),
      )
    ).reduce((sum, bytes) => sum + bytes, 0);
    expect(initialGzipBytes).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByLabel('Speech enabled', { exact: true })).toBeChecked();
    await expect(page.locator('select[name="gameLocale"]')).toHaveValue('ro-RO');
    await page.getByLabel('Speech enabled', { exact: true }).uncheck();
    await page.locator('select[name="gameLocale"]').selectOption('en');
    await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Multiplayer' }).click();
    await lockInSetup(page);
    await page.getByRole('button', { name: 'Start match' }).click();
    await expect(page.locator(`.broadcast-stage-art[data-scene-asset="${sceneId}"]`)).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect
      .poll(() => page.evaluate(() => window.releasePerformance.playback.length), {
        timeout: 60_000,
      })
      .toBeGreaterThan(0);
    await twoFrames(page);
    await page.evaluate(() => {
      window.releasePerformance.workload = true;
      window.releasePerformance.clicks = 0;
    });
    const inputs: Array<{ kind: string; start: number; end: number }> = [];
    for (const action of plan.actions.slice(0, 40)) {
      await expect(page.locator('.match-screen[data-delivery-phase]')).toHaveCount(0, {
        timeout: 120_000,
      });
      const command = action.command;
      let control: Locator;
      switch (command.type) {
        case 'select-phrase':
          control = page.locator(
            `[data-card-source="${command.payload.card.source}"][data-card-id="${command.payload.card.cardId}"]`,
          );
          break;
        case 'commit-sentence':
          control = page.getByRole('button', { name: 'End', exact: true });
          break;
        case 'redraw-hand':
          control = page.getByRole('button', { name: 'Reshuffle private phrases' });
          break;
        case 'select-comeback':
          control = page.locator('.comeback-action');
          break;
        default:
          throw new Error(`Unsupported performance input: ${command.type}`);
      }
      inputs.push(await clickMeasured(page, control, command.type));
    }
    await expect(page.locator('.match-screen[data-delivery-phase]')).toHaveCount(0, {
      timeout: 120_000,
    });
    for (let pair = 0; pair < 5; pair++) {
      inputs.push(
        await clickMeasured(
          page,
          page.getByRole('button', { name: 'Pause', exact: true }),
          'pause',
        ),
      );
      inputs.push(
        await clickMeasured(
          page,
          page.getByRole('button', { name: 'Resume', exact: true }),
          'resume',
        ),
      );
    }
    // Event Timing reports after rendering; two additional frames flush its observer.
    await twoFrames(page);
    const evidence = await page.evaluate(() => {
      window.releasePerformance.workload = false;
      return {
        ...window.releasePerformance,
        resources: performance.getEntriesByType('resource').map((entry) => entry.toJSON()),
      };
    });
    const eventDurations = inputs.map((input) =>
      Math.max(
        16,
        ...evidence.events
          .filter(
            (event) =>
              event.interactionId > 0 &&
              event.startTime >= input.start &&
              event.startTime <= input.end,
          )
          .map((event) => event.duration),
      ),
    );
    expect(evidence.frames.length, 'real animation frame samples').toBeGreaterThan(100);
    expect(evidence.decodes.length, 'native audio decode samples').toBeGreaterThan(0);
    expect(
      inputs.some((input) => input.kind === 'select-phrase'),
      'real card selection',
    ).toBe(true);
    const cardShifts = evidence.shifts.filter((shift) =>
      inputs.some(
        (input) =>
          input.kind === 'select-phrase' &&
          shift.startTime >= input.start &&
          shift.startTime <= input.end,
      ),
    );
    const audioDecode = summarizeDecodeIntervals(evidence.decodes);
    return {
      lcpMs: initial.lcpMs!,
      initialCls: cumulativeLayoutShift(initial.shifts),
      initialGzipBytes,
      inputCount: evidence.clicks,
      inputP95Ms: percentile(eventDurations, 0.95),
      frameP95Ms: percentile(evidence.frames, 0.95),
      longFrameFraction:
        evidence.frames.filter((duration) => duration > 50).length / evidence.frames.length,
      cardUpdateCls: cumulativeLayoutShift(cardShifts.filter((shift) => !shift.hadRecentInput)),
      cardUpdateRawShift: cardShifts.reduce((sum, shift) => sum + shift.value, 0),
      audioDecodeMs: audioDecode.pendingWallMs,
      audioDecodeCumulativeMs: audioDecode.cumulativeMs,
      audioDecodeSpanMs: audioDecode.spanMs,
      audioDecodedBeforePlayback: evidence.playback.every(
        (entry) => entry.decodedAt !== null && entry.decodedAt <= entry.at,
      ),
      unselectedAudioRequests: evidence.resources
        .filter((entry) =>
          Object.entries(sceneMusicTrackIds).some(
            ([scene, track]) =>
              scene !== sceneId &&
              String(entry.name).includes(track) &&
              /\.(ogg|mp3)(?:\?|$)/u.test(String(entry.name)),
          ),
        )
        .map((entry) => entry.name),
      pageErrors,
      inputs: inputs.map((input, index) => ({
        ...input,
        durationUpperBoundMs: eventDurations[index],
      })),
      entries: evidence,
    };
  } finally {
    page.off('pageerror', onError);
  }
}

async function clickMeasured(page: Page, control: Locator, kind: string) {
  const start = await page.evaluate(() => performance.now());
  await control.click();
  await twoFrames(page);
  return { kind, start, end: await page.evaluate(() => performance.now()) };
}

async function twoFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function installProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: Probe = {
      lcp: [],
      events: [],
      shifts: [],
      frames: [],
      decodes: [],
      playback: [],
      workload: false,
      clicks: 0,
    };
    window.releasePerformance = probe;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) probe.lcp.push(entry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        const entry = item as PerformanceEntry & {
          interactionId: number;
          processingStart: number;
          processingEnd: number;
        };
        probe.events.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          interactionId: entry.interactionId,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
        });
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        const entry = item as PerformanceEntry & { value: number; hadRecentInput: boolean };
        probe.shifts.push({
          startTime: entry.startTime,
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    document.addEventListener(
      'click',
      () => {
        if (probe.workload) probe.clicks++;
      },
      true,
    );
    let previous: number | null = null;
    const frame = (now: number) => {
      if (probe.workload && previous !== null) {
        const entry = performance.measure('release-animation-frame', { start: previous, end: now });
        probe.frames.push(entry.duration);
      }
      previous = probe.workload ? now : null;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    const decoded = new WeakMap<AudioBuffer, number>();
    // Each intercepted call supplies its original receiver through call().
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const nativeDecode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (bytes, success, failure) {
      const start = performance.now();
      // Keep both Web Audio overloads and the real decoder. Only observe completion.
      return nativeDecode.call(this, bytes).then(
        (buffer) => {
          const end = performance.now();
          decoded.set(buffer, end);
          const entry = performance.measure('release-audio-decode', { start, end });
          probe.decodes.push({ startTime: entry.startTime, duration: entry.duration });
          success?.(buffer);
          return buffer;
        },
        (error: DOMException) => {
          failure?.(error);
          throw error;
        },
      );
    };
    // Each intercepted call supplies its original receiver through apply().
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const nativeStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      probe.playback.push({
        at: performance.now(),
        decodedAt: this.buffer ? (decoded.get(this.buffer) ?? null) : null,
      });
      return nativeStart.apply(this, args);
    };
  });
}

async function keepTrace(session: CDPSession, filename: string) {
  const completed = new Promise<{ stream?: string }>((resolve) =>
    session.once('Tracing.tracingComplete', resolve),
  );
  await session.send('Tracing.end');
  const { stream } = await completed;
  if (!stream) throw new Error('Chromium did not return a performance trace.');
  const file = await open(filename, 'w');
  try {
    for (;;) {
      const chunk = await session.send('IO.read', { handle: stream });
      await file.write(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
      if (chunk.eof) break;
    }
  } finally {
    await file.close();
    await session.send('IO.close', { handle: stream });
  }
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) throw new Error('A performance metric has no samples.');
  return values.toSorted((left, right) => left - right)[Math.ceil(values.length * fraction) - 1]!;
}
