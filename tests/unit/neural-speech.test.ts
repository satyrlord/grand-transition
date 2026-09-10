import { afterEach, describe, expect, test, vi } from 'vitest';
import { LocalNeuralSpeech } from '../../src/audio/neural-speech';
import type { NeuralSpeechMessage } from '../../src/audio/speech-port';

const voices = [
  { voiceURI: 'piper:vctk-p226', name: 'Michael', lang: 'en-US', default: true },
  { voiceURI: 'piper:vctk-p225', name: 'Emma', lang: 'en-GB', default: false },
];
function harness(options: { sampleRate?: number; voicePrefix?: string; defaultVoiceId?: string; startupBufferSeconds?: number; piperClarity?: boolean; initializationTimeoutMs?: number } = {}) {
  const filters: { disconnect: ReturnType<typeof vi.fn> }[] = [];
  const workers: { onmessage: ((event: MessageEvent<NeuralSpeechMessage>) => void) | null; onerror: (() => void) | null;
    postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }[] = [];
  const sources: { onended: (() => void) | null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = { currentTime: 10, state: 'running', destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }), suspend: vi.fn(async () => { context.state = 'suspended'; }), close: vi.fn(async () => {}),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({ duration: length / sampleRate, copyToChannel: vi.fn() })),
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
    createBiquadFilter: () => {
      const filter = {type:'',frequency:{value:0},Q:{value:0},gain:{value:0},connect:vi.fn(),disconnect:vi.fn()};
      filters.push(filter); return filter;
    },
    createBufferSource: () => {
      const source = { onended: null, start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: vi.fn(), playbackRate: { value: 1 }, buffer: null };
      sources.push(source); return source;
    },
  };
  const changed = vi.fn();
  const supported = vi.fn(() => true);
  const speech = new LocalNeuralSpeech(changed, { ...options, supported, baseUrl: '/grand-transition/tts/piper/',
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
  const prepared = (id: number): NeuralSpeechMessage => ({ type: 'speech', id, samples: new Float32Array(44100), sampleRate: 22050, playbackRate: 1,
    markers: [{ index: 0, seconds: 0.4 }, { index: 1, seconds: 0.95 }] });
  return { speech, context, sources, workers, changed, supported, emit, initialize, prepared, filters };
}
afterEach(() => vi.useRealTimers());

describe('local neural speech', () => {
  test('preloads without an audio context and resumes playback only on activation', async () => {
    const h=harness(); const ready=h.speech.initialize(false);
    h.emit({type:'booted'}); h.emit({type:'ready',voices}); expect(await ready).toBe(true);
    expect(h.context.resume).not.toHaveBeenCalled(); expect(h.sources).toHaveLength(0);
    await h.speech.initialize(); expect(h.context.resume).toHaveBeenCalledOnce(); h.speech.dispose();
  });
  test('GPU initialization expires after inactivity but progress keeps loading alive', async () => {
    vi.useFakeTimers(); const h=harness({initializationTimeoutMs:120000});
    const ready=h.speech.initialize(false); h.emit({type:'booted'});
    vi.advanceTimersByTime(119000); h.emit({type:'progress',loaded:10,total:100});
    vi.advanceTimersByTime(119000); expect(h.speech.status).toBe('loading');
    vi.advanceTimersByTime(1000); expect(await ready).toBe(false); expect(h.speech.status).toBe('unavailable');
    expect(h.workers[0]!.terminate).toHaveBeenCalledOnce(); h.speech.dispose();
  });
  test('ready GPU initialization clears its inactivity timeout', async () => {
    vi.useFakeTimers(); const h=harness({initializationTimeoutMs:120000}); await h.initialize();
    vi.advanceTimersByTime(240000); expect(h.speech.status).toBe('ready'); h.speech.dispose();
  });
  test('Piper reuses its filter across chunks and clears its tail on cancellation', async () => {
    const h=harness(); await h.initialize();
    h.speech.speak({text:'One. Two.',segments:['One.',' Two.'],chunkStarts:[0,1],language:'en-GB'}); await Promise.resolve();
    h.emit(h.prepared(1)); h.emit(h.prepared(2)); expect(h.filters).toHaveLength(2);
    h.speech.cancel(); expect(h.filters.every(filter=>filter.disconnect.mock.calls.length===1)).toBe(true);
    h.speech.speak({text:'Again.',language:'en-GB'}); await Promise.resolve(); h.emit(h.prepared(3));
    expect(h.filters).toHaveLength(4); h.speech.dispose();
  });
  test('GPU playback bypasses Piper filtering', async () => {
    const h=harness({piperClarity:false}); await h.initialize();
    h.speech.speak({text:'Public.',language:'en-GB'}); await Promise.resolve(); h.emit(h.prepared(1));
    expect(h.filters).toHaveLength(0); h.speech.dispose();
  });
  test('reports GPU playback only when its audio clock starts and suppresses canceled startup', async () => {
    vi.useFakeTimers(); const h = harness({sampleRate:24000,startupBufferSeconds:0.75}); await h.initialize();
    const onDiagnostic = vi.fn();
    const request = {text:'One. Two.',segments:['One.',' Two.'],chunkStarts:[0,1],language:'en-GB',onDiagnostic};
    h.speech.speak(request); await Promise.resolve();
    h.emit({type:'speech',id:1,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    vi.advanceTimersByTime(749); expect(onDiagnostic.mock.calls.some(([event]) => event.type === 'playback-start')).toBe(false);
    h.speech.pause(); vi.advanceTimersByTime(1000);
    expect(onDiagnostic.mock.calls.some(([event]) => event.type === 'playback-start')).toBe(false);
    h.speech.resume(); await Promise.resolve(); h.context.currentTime = 10.75; vi.advanceTimersByTime(50);
    expect(onDiagnostic.mock.calls.filter(([event]) => event.type === 'playback-start')).toHaveLength(1);
    h.speech.cancel(); h.emit({type:'error',id:2}); onDiagnostic.mockClear();
    h.speech.speak(request); await Promise.resolve();
    h.emit({type:'speech',id:3,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    h.speech.cancel('navigation'); h.context.currentTime = 12; vi.advanceTimersByTime(2000);
    expect(onDiagnostic.mock.calls.some(([event]) => event.type === 'playback-start')).toBe(false); h.speech.dispose();
  });

  test('GPU multi-chunk playback buffers once, preserves marker offsets, and cancels scheduled audio', async () => {
    const h = harness({sampleRate:24000,voicePrefix:'kokoro:',defaultVoiceId:'bm_george',startupBufferSeconds:0.75});
    const ready = h.speech.initialize(); h.emit({type:'booted'});
    h.emit({type:'ready',voices:[{voiceURI:'kokoro:bm_george',name:'George',lang:'en-GB',default:true}]}); await ready;
    h.speech.speak({text:'One. Two.',segments:['One.',' Two.'],chunkStarts:[0,1],language:'en-GB'}); await Promise.resolve();
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({voiceId:'bm_george'}));
    h.emit({type:'speech',id:1,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    h.context.currentTime = 10.6;
    h.emit({type:'speech',id:2,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    expect(h.sources[0]!.start).toHaveBeenCalledExactlyOnceWith(10.75);
    expect(h.sources[1]!.start).toHaveBeenCalledExactlyOnceWith(11.75);
    h.speech.cancel('navigation'); expect(h.sources.every(source => source.stop.mock.calls.length === 1)).toBe(true);
    h.speech.dispose();
  });

  test('GPU single-chunk speech starts immediately without the streaming buffer', async () => {
    const h = harness({sampleRate:24000,startupBufferSeconds:0.75}); await h.initialize();
    h.speech.speak({text:'Public.',language:'en-GB'}); await Promise.resolve();
    h.emit({type:'speech',id:1,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    expect(h.sources[0]!.start).toHaveBeenCalledExactlyOnceWith(10); h.speech.dispose();
  });

  test('a fully prepared GPU delivery starts immediately even when it has multiple chunks', async () => {
    const h = harness({sampleRate:24000,startupBufferSeconds:0.75}); await h.initialize();
    const request = {text:'One. Two.',segments:['One.',' Two.'],chunkStarts:[0,1],language:'en-GB'};
    h.speech.prepare(request); await Promise.resolve();
    for (const id of [1,2]) h.emit({type:'speech',id,samples:new Float32Array(24000),sampleRate:24000,playbackRate:1,markers:[{index:0,seconds:0}]});
    expect(h.sources).toHaveLength(0); h.speech.speak(request);
    expect(h.sources[0]!.start).toHaveBeenCalledExactlyOnceWith(10);
    expect(h.sources[1]!.start).toHaveBeenCalledExactlyOnceWith(11); h.speech.dispose();
  });

  test('streams contiguous chunks, prioritizes the current speaker, and completes only after the final audio', async () => {
    const h = harness(); await h.initialize(); const ended = vi.fn();
    const first = { text: 'Your office failed, and your audit failed.', language: 'en-GB',
      segments: ['Your office ', 'failed,', ' and ', 'your audit failed.'], chunkStarts: [0,2], onEnd: ended };
    const future = { text: 'The public record disagrees.', language: 'en-GB' };
    h.speech.speak(first); h.speech.prepare(future); await Promise.resolve();
    h.emit(h.prepared(1));
    expect(h.sources).toHaveLength(1);
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id:2, segments:first.segments.slice(2) }));
    h.context.currentTime = 10.5; h.emit(h.prepared(2));
    expect(h.sources[1]!.start).toHaveBeenCalledExactlyOnceWith(12);
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id:3, segments:[future.text] }));
    h.emit(h.prepared(3)); expect(h.sources).toHaveLength(2);
    h.sources[0]!.onended!(); expect(ended).not.toHaveBeenCalled();
    h.sources[1]!.onended!(); expect(ended).toHaveBeenCalledOnce();
    expect(h.sources).toHaveLength(2); h.speech.speak(future); expect(h.sources).toHaveLength(3);
    h.speech.dispose();
  });

  test('Piper playback pitch schedules the following chunk at the compensated end time', async () => {
    const h = harness(); await h.initialize();
    h.speech.speak({ text:'One. Two.', segments:['One.', ' Two.'], chunkStarts:[0,1], language:'en-GB', pitch:0.8 });
    await Promise.resolve();
    h.emit({ ...h.prepared(1), type:'speech', id:1, samples:new Float32Array(44100), sampleRate:22050, playbackRate:0.8, markers:[{index:0,seconds:0.1}] });
    h.emit({ ...h.prepared(2), type:'speech', id:2, samples:new Float32Array(44100), sampleRate:22050, playbackRate:0.8, markers:[{index:0,seconds:0.1}] });
    expect(h.sources[1]!.start).toHaveBeenCalledExactlyOnceWith(12.5);
    h.speech.cancel(); expect(h.sources.every(source => source.stop.mock.calls.length === 1)).toBe(true);
    h.speech.dispose();
  });
  test('prepares the next delivery during playback, holds it through the reaction, and reuses its audio', async () => {
    const h = harness(); await h.initialize();
    const second = { text: 'The public record disagrees.', language: 'en-GB', voiceUri: 'piper:vctk-p225', rate: 1.2, pitch: 0.9 };
    h.speech.speak({ text: 'Your office failed.', language: 'en-US' });
    h.speech.prepare(second); await Promise.resolve();
    expect(h.workers[0]!.postMessage.mock.calls.filter(([message]) => message.type === 'synthesize')).toHaveLength(1);
    h.emit(h.prepared(1));
    expect(h.workers[0]!.postMessage.mock.calls.filter(([message]) => message.type === 'synthesize')).toHaveLength(2);
    h.emit(h.prepared(2));
    expect(h.sources).toHaveLength(1);
    h.sources[0]!.onended!(); expect(h.sources).toHaveLength(1);
    expect(h.speech.status).toBe('ready');
    const ended = vi.fn(); h.speech.speak({ ...second, volume: 0.4, onEnd: ended });
    expect(h.sources).toHaveLength(2);
    expect(h.workers[0]!.postMessage.mock.calls.filter(([message]) => message.type === 'synthesize')).toHaveLength(2);
    h.sources[1]!.onended!(); expect(ended).toHaveBeenCalledOnce();
    h.speech.dispose();
  });

  test('adopts in-flight preparation while paused without duplicate synthesis or early playback', async () => {
    const h = harness(); await h.initialize();
    const request = { text: 'Public.', language: 'en-US' };
    h.speech.prepare(request); h.speech.prepare(request); await Promise.resolve();
    h.speech.pause(); h.speech.speak(request); h.emit(h.prepared(1));
    expect(h.sources).toHaveLength(0);
    h.speech.resume(); await Promise.resolve(); expect(h.sources).toHaveLength(1);
    expect(h.workers[0]!.postMessage.mock.calls.filter(([message]) => message.type === 'synthesize')).toHaveLength(1);
    h.speech.dispose();
  });

  test('the next synthesis gets its full timeout after a slow first synthesis', async () => {
    vi.useFakeTimers(); const h = harness(); await h.initialize(); const onError = vi.fn();
    h.speech.speak({ text: 'First public insult.', language: 'en-US', onError });
    const second = { text: 'Second public insult.', language: 'en-US', onError };
    h.speech.prepare(second); await Promise.resolve();
    vi.advanceTimersByTime(50_000); h.emit(h.prepared(1));
    h.sources[0]!.onended!(); h.speech.speak(second);
    vi.advanceTimersByTime(59_999); expect(onError).not.toHaveBeenCalled();
    h.emit(h.prepared(2)); expect(h.sources).toHaveLength(2);
    h.speech.dispose();
  });

  test('replacement waits for canceled computation without replaying its audio or leaving the queue unbounded', async () => {
    const h = harness(); await h.initialize();
    h.speech.prepare({ text: 'Old public insult.', language: 'en-US' }); await Promise.resolve();
    h.speech.cancel(); h.speech.speak({ text: 'New public insult.', language: 'en-US' }); await Promise.resolve();
    expect(h.workers[0]!.postMessage.mock.calls.filter(([message]) => message.type === 'synthesize')).toHaveLength(1);
    h.emit(h.prepared(1)); expect(h.sources).toHaveLength(0);
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ segments: ['New public insult.'] }));
    h.emit(h.prepared(2)); expect(h.sources).toHaveLength(1);
    h.speech.dispose();
  });

  test.each(['rate', 'pitch', 'voiceUri', 'language', 'segments'] as const)('does not reuse preparation with a different %s', async (field) => {
    const h = harness(); await h.initialize();
    const request = { text: 'Public.', language: 'en-US', voiceUri: 'piper:vctk-p226', rate: 1, pitch: 1, segments: ['Public.'] };
    h.speech.prepare(request); await Promise.resolve(); h.emit(h.prepared(1));
    const values = { rate: 1.2, pitch: 0.9, voiceUri: 'piper:vctk-p225', language: 'en-GB', segments: ['Public', '.'] };
    h.speech.speak({ ...request, [field]: values[field] }); await Promise.resolve();
    expect(h.sources).toHaveLength(0);
    h.emit(h.prepared(2)); expect(h.sources).toHaveLength(1);
    h.speech.dispose();
  });

  test('cancellation discards prepared audio and preparation alone never emits delivery callbacks', async () => {
    const h = harness(); await h.initialize();
    const onError = vi.fn(); const request = { text: 'Public.', language: 'en-US', onError };
    h.speech.prepare(request); await Promise.resolve(); h.speech.cancel(); h.emit(h.prepared(1));
    expect(h.sources).toHaveLength(0);
    h.speech.prepare(request); await Promise.resolve(); h.emit({ type: 'error', id: 2 });
    expect(onError).not.toHaveBeenCalled(); h.speech.dispose();
  });

  test('waits for worker readiness before loading and publishes model progress and local voices', async () => {
    const h = harness(); const ready = h.speech.initialize();
    expect(h.context.resume).toHaveBeenCalledOnce(); expect(h.workers[0]!.postMessage).not.toHaveBeenCalled();
    h.emit({ type: 'booted' });
    expect(h.workers[0]!.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'load', baseUrl: '/grand-transition/tts/piper/' });
    h.emit({ type: 'progress', loaded: 4, total: 10 }); expect(h.speech.progress).toBe(0.4);
    h.emit({ type: 'ready', voices }); expect(await ready).toBe(true);
    expect(h.speech.status).toBe('ready'); expect(h.speech.voices).toEqual(voices);
    h.speech.dispose(); expect(h.workers[0]!.terminate).toHaveBeenCalledOnce();
  });

  test('uses generated sample timing for start, phrase markers, pause, and completion', async () => {
    vi.useFakeTimers(); const h = harness(); await h.initialize();
    const events = { onStart: vi.fn(), onSegment: vi.fn(), onEnd: vi.fn(), onDiagnostic: vi.fn() };
    h.speech.speak({ text: 'Your office failed.', segments: ['Your office ', 'failed.'], language: 'en-US', voiceUri: 'piper:vctk-p225',
      rate: 1.4, pitch: 0.9, volume: 0.4, ...events });
    await Promise.resolve();
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith({ type: 'synthesize', id: 1, segments: ['Your office ', 'failed.'],
      voiceId: 'vctk-p225', rate: 1.4, pitch: 0.9 });
    h.emit(h.prepared(1)); expect(h.sources[0]!.start).toHaveBeenCalledExactlyOnceWith(10);
    h.context.currentTime = 10.4; vi.advanceTimersByTime(400);
    expect(events.onStart).toHaveBeenCalledOnce(); expect(events.onSegment).toHaveBeenCalledExactlyOnceWith(0);
    h.speech.pause(); vi.advanceTimersByTime(1000); expect(events.onSegment).toHaveBeenCalledTimes(1);
    h.speech.resume(); await Promise.resolve(); h.context.currentTime = 10.95; vi.advanceTimersByTime(550);
    expect(events.onSegment).toHaveBeenLastCalledWith(1);
    h.sources[0]!.onended!(); expect(events.onEnd).toHaveBeenCalledOnce(); expect(h.speech.status).toBe('ready');
    expect(events.onDiagnostic.mock.calls.map(([event]) => event.type)).toEqual([
      'synthesis-start', 'pcm-ready', 'playback-start', 'segment', 'pause', 'resume', 'segment', 'playback-end',
    ]);
    expect(events.onDiagnostic).toHaveBeenCalledWith({ type: 'pcm-ready', provider: 'neural', durationMs: 2000 });
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
    const onDiagnostic = vi.fn();
    h.speech.speak({ text: 'Your office failed.', language: 'en-US', onError: failed, onDiagnostic });
    await Promise.resolve(); vi.advanceTimersByTime(59_999); expect(failed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(failed).toHaveBeenCalledOnce();
    expect(h.speech.status).toBe('unavailable'); expect(h.workers[0]!.terminate).toHaveBeenCalledOnce();
    expect(onDiagnostic.mock.calls.map(([event]) => event.type)).toEqual(['synthesis-start', 'timeout', 'error', 'cancel']);
    h.speech.dispose();
  });
});
