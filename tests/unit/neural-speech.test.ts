import { afterEach, describe, expect, test, vi } from 'vitest';
import { LocalNeuralSpeech } from '../../src/audio/neural-speech';
import type { NeuralSpeechMessage } from '../../src/audio/speech-port';

const voices = [
  { voiceURI: 'kokoro:am_michael', name: 'Michael', lang: 'en-US', default: true },
  { voiceURI: 'kokoro:bf_emma', name: 'Emma', lang: 'en-GB', default: false },
];
function harness() {
  const workers: { onmessage: ((event: MessageEvent<NeuralSpeechMessage>) => void) | null; onerror: (() => void) | null;
    postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }[] = [];
  const sources: { onended: (() => void) | null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = { currentTime: 10, state: 'running', destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }), suspend: vi.fn(async () => { context.state = 'suspended'; }), close: vi.fn(async () => {}),
    createBuffer: vi.fn(() => ({ copyToChannel: vi.fn() })),
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
    createBufferSource: () => {
      const source = { onended: null, start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: vi.fn(), buffer: null };
      sources.push(source); return source;
    },
  };
  const changed = vi.fn();
  const supported = vi.fn(() => true);
  const speech = new LocalNeuralSpeech(changed, { supported, baseUrl: '/grand-transition/tts/kokoro/',
    createContext: () => context as unknown as AudioContext,
    createWorker: () => {
      const worker = { onmessage: null, onerror: null, postMessage: vi.fn(), terminate: vi.fn() };
      workers.push(worker); return worker as unknown as Worker;
    },
  });
  const emit = (message: NeuralSpeechMessage) => workers.at(-1)!.onmessage!({ data: message } as MessageEvent<NeuralSpeechMessage>);
  async function initialize() {
    const ready = speech.initialize(); emit({ type: 'booted' }); emit({ type: 'ready', voices }); await ready;
  }
  const prepared = (id: number): NeuralSpeechMessage => ({ type: 'speech', id, samples: new Float32Array(48000), sampleRate: 24000,
    markers: [{ index: 0, seconds: 0.4 }, { index: 1, seconds: 0.95 }] });
  return { speech, context, sources, workers, changed, supported, emit, initialize, prepared };
}
afterEach(() => vi.useRealTimers());

describe('local neural speech', () => {
  test('waits for worker readiness before loading and publishes model progress and local voices', async () => {
    const h = harness(); const ready = h.speech.initialize();
    expect(h.context.resume).toHaveBeenCalledOnce(); expect(h.workers[0]!.postMessage).not.toHaveBeenCalled();
    h.emit({ type: 'booted' });
    expect(h.workers[0]!.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'load', baseUrl: '/grand-transition/tts/kokoro/' });
    h.emit({ type: 'progress', loaded: 4, total: 10 }); expect(h.speech.progress).toBe(0.4);
    h.emit({ type: 'ready', voices }); expect(await ready).toBe(true);
    expect(h.speech.status).toBe('ready'); expect(h.speech.voices).toEqual(voices);
    h.speech.dispose(); expect(h.workers[0]!.terminate).toHaveBeenCalledOnce();
  });

  test('uses generated sample timing for start, phrase markers, pause, and completion', async () => {
    vi.useFakeTimers(); const h = harness(); await h.initialize();
    const events = { onStart: vi.fn(), onSegment: vi.fn(), onEnd: vi.fn() };
    h.speech.speak({ text: 'Your office failed.', segments: ['Your office ', 'failed.'], language: 'en-US', voiceUri: 'kokoro:bf_emma',
      rate: 1.4, pitch: 0.9, volume: 0.4, ...events });
    await Promise.resolve();
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith({ type: 'synthesize', id: 1, segments: ['Your office ', 'failed.'],
      voiceId: 'bf_emma', rate: 1.4, pitch: 0.9 });
    h.emit(h.prepared(1)); expect(h.sources[0]!.start).toHaveBeenCalledExactlyOnceWith(10);
    h.context.currentTime = 10.4; vi.advanceTimersByTime(400);
    expect(events.onStart).toHaveBeenCalledOnce(); expect(events.onSegment).toHaveBeenCalledExactlyOnceWith(0);
    h.speech.pause(); vi.advanceTimersByTime(1000); expect(events.onSegment).toHaveBeenCalledTimes(1);
    h.speech.resume(); await Promise.resolve(); h.context.currentTime = 10.95; vi.advanceTimersByTime(550);
    expect(events.onSegment).toHaveBeenLastCalledWith(1);
    h.sources[0]!.onended!(); expect(events.onEnd).toHaveBeenCalledOnce(); expect(h.speech.status).toBe('ready');
    h.speech.dispose();
  });

  test('cancellation discards generated responses and stale completion events', async () => {
    const h = harness(); await h.initialize(); const ended = vi.fn();
    h.speech.speak({ text: 'Public.', language: 'en-US', onEnd: ended }); await Promise.resolve();
    h.speech.cancel(); h.emit(h.prepared(1)); expect(h.sources).toHaveLength(0);
    h.speech.speak({ text: 'Public again.', language: 'en-US', onEnd: ended }); await Promise.resolve();
    h.emit(h.prepared(2)); const stale = h.sources[0]!.onended!;
    h.speech.cancel(); stale(); expect(ended).not.toHaveBeenCalled(); expect(h.sources[0]!.stop).toHaveBeenCalledOnce();
    h.speech.dispose();
  });

  test('unavailable, muted, unsupported-language, and failed-model states stay silent', async () => {
    const h = harness();
    expect(h.speech.speak({ text: 'Public.', language: 'en-US', volume: 0 }).reason).toBe('silent');
    expect(h.speech.speak({ text: 'Public.', language: 'ro-RO' }).reason).toBe('unsupported-language');
    const ready = h.speech.initialize(); const failed = vi.fn();
    h.speech.speak({ text: 'Public.', language: 'en-US', onError: failed });
    h.emit({ type: 'error', id: null }); expect(await ready).toBe(false); expect(failed).toHaveBeenCalledOnce();
    expect(h.speech.available).toBe(false); expect(h.sources).toHaveLength(0);
    h.speech.dispose();
    const missing = harness(); missing.supported.mockReturnValue(false);
    expect(await missing.speech.initialize()).toBe(false); expect(missing.workers).toHaveLength(0);
  });

  test('a stalled inference releases the worker and signals silent fallback within one minute', async () => {
    vi.useFakeTimers(); const h = harness(); await h.initialize(); const failed = vi.fn();
    h.speech.speak({ text: 'Your office failed.', language: 'en-US', onError: failed });
    await Promise.resolve(); vi.advanceTimersByTime(59_999); expect(failed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(failed).toHaveBeenCalledOnce();
    expect(h.speech.status).toBe('unavailable'); expect(h.workers[0]!.terminate).toHaveBeenCalledOnce();
    h.speech.dispose();
  });
});
