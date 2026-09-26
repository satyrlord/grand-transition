import { describe, expect, test, vi } from 'vitest';
import { NeuralVoiceRouter, type NeuralEngineMode } from '../../src/audio/neural-voice-router.ts';
import { LocalNeuralSpeech, type NeuralSpeechStatus } from '../../src/audio/neural-speech.ts';
import type { NeuralSpeechMessage, SpeechRequest } from '../../src/audio/speech-port.ts';

function harness() {
  const engines: {
    mode: NeuralEngineMode;
    status: NeuralSpeechStatus;
    progress: number | null;
    voices: { voiceURI: string; name: string; lang: string; default: boolean }[];
    available: boolean;
    initialize: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    notify: () => void;
  }[] = [];
  const changed = vi.fn();
  const router = new NeuralVoiceRouter(changed, (mode, notify) => {
    const engine = {
      mode,
      status: 'idle' as NeuralSpeechStatus,
      progress: null,
      voices: [],
      available: true,
      initialize: vi.fn(async () => {
        engine.status = 'loading';
        notify();
        return true;
      }),
      speak: vi.fn((_request: SpeechRequest) => ({ accepted: true })),
      prepare: vi.fn((_request: SpeechRequest) => ({ accepted: true })),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      dispose: vi.fn(),
      notify,
    };
    engines.push(engine);
    return engine;
  });
  const ready = (index: number) => {
    engines[index]!.status = 'ready';
    engines[index]!.voices = [{ voiceURI: 'voice', name: 'Voice', lang: 'en-GB', default: true }];
  };
  return { router, engines, ready, changed };
}
const request = {
  text: 'Your brother is a snitch.',
  language: 'en-GB',
  voiceUri: 'piper:vctk-p226',
};

describe('neural engine selection', () => {
  test('speech off terminates a real adapter worker and settles pending initialization', async () => {
    const workers: {
      onmessage: ((event: MessageEvent<NeuralSpeechMessage>) => void) | null;
      onerror: (() => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    const router = new NeuralVoiceRouter(
      vi.fn(),
      (_mode, changed) =>
        new LocalNeuralSpeech(changed, {
          supported: () => true,
          baseUrl: '/grand-transition/tts/piper/',
          createContext: () =>
            ({ resume: async () => {}, close: async () => {} }) as unknown as AudioContext,
          createWorker: () => {
            const worker = {
              onmessage: null,
              onerror: null,
              postMessage: vi.fn(),
              terminate: vi.fn(),
            };
            workers.push(worker);
            return worker as unknown as Worker;
          },
        }),
    );
    router.configure({ speechEnabled: true, gpuVoices: false });
    const pending = router.preload();
    const onDiagnostic = vi.fn();
    expect(router.prepare({ ...request, onDiagnostic }).accepted).toBe(true);
    expect(workers).toHaveLength(1);
    const lateMessage = workers[0]!.onmessage!;
    router.configure({ speechEnabled: false, gpuVoices: false });
    expect(await pending).toBe(false);
    expect(workers[0]!.terminate).toHaveBeenCalledOnce();
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cancel', reason: 'settings' }),
    );
    lateMessage(new MessageEvent('message', { data: { type: 'ready', voices: [] } }));
    expect(router.status).toBe('idle');
    router.configure({ speechEnabled: true, gpuVoices: false });
    const renewed = router.preload();
    expect(workers).toHaveLength(2);
    workers[1]!.onmessage!(
      new MessageEvent('message', {
        data: {
          type: 'ready',
          voices: [{ voiceURI: request.voiceUri, name: 'Voice', lang: 'en-GB', default: true }],
        },
      }),
    );
    expect(await renewed).toBe(true);
    expect(router.status).toBe('ready');
    router.dispose();
    expect(workers[1]!.terminate).toHaveBeenCalledOnce();
  });

  test('Romanian availability survives an unavailable English engine', () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    h.engines[0]!.available = false;
    expect(h.router.available).toBe(true);
    expect(h.engines.map(({ mode }) => mode)).toEqual(['piper', 'ro']);
    expect(h.engines[1]!.initialize).not.toHaveBeenCalled();
    h.router.speak({ text: 'Bună ziua.', language: 'ro-RO', voiceUri: 'piper:ro_RO-mihai-medium' });
    expect(h.engines[1]!.speak).toHaveBeenCalledOnce();
    expect(h.engines[0]!.speak).not.toHaveBeenCalled();
    h.router.dispose();
  });
  test('Romanian speech creates its own engine on first use and never uses the English engines', () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    // Nothing Romanian is created before Romanian speech is actually requested.
    expect(h.engines.map((engine) => engine.mode)).toEqual(['piper']);
    h.router.speak({ text: 'Bună ziua.', language: 'ro-RO', voiceUri: 'piper:ro_RO-liana-medium' });
    expect(h.engines.map(({ mode }) => mode)).toEqual(['piper', 'ro']);
    const romanian = h.engines.find((engine) => engine.mode === 'ro')!;
    expect(romanian.speak).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceUri: 'piper:ro_RO-liana-medium',
        language: 'ro-RO',
      }),
    );
    expect(h.engines[0]!.speak).not.toHaveBeenCalled();
    h.router.dispose();
  });
  test('menu preparation loads both requested engines without audio activation', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.preload();
    expect(h.engines).toHaveLength(2);
    for (const engine of h.engines) expect(engine.initialize).toHaveBeenLastCalledWith(false);
    await h.router.initialize();
    for (const engine of h.engines) expect(engine.initialize).toHaveBeenLastCalledWith(true);
    h.router.dispose();
  });
  test('does not create or download GPU resources without both opt-ins', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: false, gpuVoices: true });
    expect(await h.router.initialize()).toBe(false);
    expect(h.engines).toHaveLength(1);
    expect(h.engines[0]!.initialize).not.toHaveBeenCalled();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    await h.router.initialize();
    expect(h.engines).toHaveLength(1);
    expect(h.router.activeMode).toBe('piper');
    h.router.dispose();
  });
  test('starts on Piper during loading and waits until the next match to select ready GPU voices', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    expect(h.router.gpuStatus).toBe('loading');
    h.router.beginMatch();
    h.ready(1);
    h.router.speak(request);
    expect(h.engines[0]!.speak).toHaveBeenCalledOnce();
    expect(h.router.activeMode).toBe('piper');
    h.router.endMatch();
    h.router.beginMatch();
    h.router.speak(request);
    expect(h.engines[1]!.speak.mock.calls[0]![0].voiceUri).toBe('kokoro:bm_george');
    h.router.dispose();
    expect(h.router.available).toBe(false);
    expect(h.router.status).toBeDefined();
  });
  test('re-applying settings neither releases nor restarts an in-flight GPU preparation', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    expect(h.engines.map(({ mode }) => mode)).toEqual(['piper', 'gpu']);
    const gpu = h.engines[1]!;
    // Every Settings change re-applies the accepted document; preparation survives it.
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.preload();
    expect(h.engines).toHaveLength(2);
    expect(gpu.dispose).not.toHaveBeenCalled();
    expect(h.router.gpuStatus).toBe('loading');
    h.ready(1);
    expect(h.router.gpuStatus).toBe('ready');
    h.router.dispose();
  });
  test('maps both voices and actual diagnostics consistently for preparation and playback', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    h.ready(1);
    h.router.beginMatch();
    const onDiagnostic = vi.fn();
    const female = { ...request, voiceUri: 'piper:vctk-p225', onDiagnostic };
    h.router.prepare(female);
    h.router.speak(female);
    const prepared = h.engines[1]!.prepare.mock.calls[0]![0];
    const spoken = h.engines[1]!.speak.mock.calls[0]![0];
    expect(prepared.voiceUri).toBe('kokoro:bf_emma');
    expect(spoken.voiceUri).toBe(prepared.voiceUri);
    spoken.onDiagnostic?.({ type: 'playback-start', provider: 'neural' });
    expect(onDiagnostic).toHaveBeenCalledWith({
      type: 'playback-start',
      provider: 'neural',
      voice: 'kokoro:bf_emma',
    });
    h.router.dispose();
  });
  test('does not replay a failed GPU utterance and uses Piper for subsequent requests', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    h.ready(1);
    h.router.beginMatch();
    const onError = vi.fn();
    h.router.speak({ ...request, onError });
    h.engines[1]!.status = 'unavailable';
    h.engines[1]!.speak.mock.calls[0]![0].onError?.();
    expect(onError).toHaveBeenCalledOnce();
    expect(h.engines[0]!.speak).not.toHaveBeenCalled();
    h.router.speak({ ...request, voiceUri: 'kokoro:bf_emma' });
    expect(h.engines[0]!.speak.mock.calls[0]![0].voiceUri).toBe('piper:vctk-p225');
    h.ready(1);
    expect(h.router.activeMode).toBe('piper');
    h.router.dispose();
  });
  test('reading the active mode has no side effect and a failed GPU match can release its engine', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    h.ready(1);
    h.router.beginMatch();
    expect(h.router.activeMode).toBe('gpu');
    h.engines[1]!.status = 'unavailable';
    expect(h.router.activeMode).toBe('piper');
    expect(h.router.activeMode).toBe('piper');
    expect(h.engines[1]!.dispose).not.toHaveBeenCalled();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    expect(h.engines[1]!.dispose).toHaveBeenCalledOnce();
    expect(h.router.activeMode).toBe('piper');
    h.router.dispose();
  });
  test('preserves a GPU match when only the GPU preference is off and releases it on leaving', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    h.ready(1);
    h.router.beginMatch();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    expect(h.router.activeMode).toBe('gpu');
    expect(h.engines[1]!.dispose).not.toHaveBeenCalled();
    h.router.pause();
    h.router.resume();
    expect(
      h.engines.every(
        (engine) => engine.pause.mock.calls.length === 1 && engine.resume.mock.calls.length === 1,
      ),
    ).toBe(true);
    h.router.endMatch();
    expect(h.engines[1]!.dispose).toHaveBeenCalledOnce();
    expect(h.router.gpuStatus).toBe('idle');
    h.router.dispose();
    expect(await h.router.initialize()).toBe(false);
  });
  test.each(['loading', 'ready', 'generating'] as const)(
    'speech off disposes %s engines and re-enables fresh engines without stale callbacks',
    async (status) => {
      const h = harness();
      h.router.configure({ speechEnabled: true, gpuVoices: true });
      await h.router.preload();
      h.ready(1);
      h.router.beginMatch();
      const romanian = {
        text: 'Bună ziua.',
        language: 'ro-RO',
        voiceUri: 'piper:ro_RO-liana-medium',
      };
      h.router.prepare(request);
      h.router.speak(request);
      h.router.prepare(romanian);
      expect(h.engines.map(({ mode }) => mode)).toEqual(['piper', 'gpu', 'ro']);
      const retired = [...h.engines];
      for (const engine of retired) engine.status = status;
      h.router.configure({ speechEnabled: false, gpuVoices: true });
      for (const engine of retired) {
        expect(engine.cancel).toHaveBeenCalledWith('settings');
        expect(engine.dispose).toHaveBeenCalledOnce();
      }
      expect(h.router.status).toBe('idle');
      expect(h.router.progress).toBeNull();
      expect(h.router.voices).toEqual([]);
      expect(h.router.available).toBe(true);
      expect(h.router.speak(request).accepted).toBe(false);
      expect(h.router.prepare(romanian).accepted).toBe(false);
      expect(await h.router.initialize()).toBe(false);
      h.router.pause();
      h.router.resume();
      h.router.configure({ speechEnabled: false, gpuVoices: true });
      expect(h.engines).toHaveLength(3);
      expect(retired.every((engine) => engine.pause.mock.calls.length === 0)).toBe(true);

      h.router.configure({ speechEnabled: true, gpuVoices: true });
      expect(h.engines).toHaveLength(3);
      await h.router.preload();
      expect(h.engines.map(({ mode }) => mode)).toEqual(['piper', 'gpu', 'ro', 'piper', 'gpu']);
      h.ready(4);
      expect(h.router.activeMode).toBe('piper');
      h.router.speak(request);
      expect(h.engines[3]!.speak).toHaveBeenCalledOnce();
      h.router.endMatch();
      h.router.beginMatch();
      expect(h.router.activeMode).toBe('gpu');
      h.changed.mockClear();
      for (const engine of retired) {
        engine.status = 'unavailable';
        engine.notify();
      }
      expect(h.changed).not.toHaveBeenCalled();
      expect(h.router.activeMode).toBe('gpu');
      expect(h.engines[4]!.dispose).not.toHaveBeenCalled();
      h.router.prepare(romanian);
      expect(h.engines[5]!.mode).toBe('ro');
      expect(h.engines[5]!.prepare).toHaveBeenCalledOnce();
      expect(retired.every((engine) => engine.dispose.mock.calls.length === 1)).toBe(true);
      h.router.dispose();
      expect(h.router.available).toBe(false);
      expect(h.router.speak(request).accepted).toBe(false);
      expect(h.router.prepare(romanian).accepted).toBe(false);
      expect(h.engines).toHaveLength(6);
    },
  );
  test('disposes an in-flight GPU load when opt-out and creates a fresh instance on explicit retry', async () => {
    const h = harness();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    h.router.configure({ speechEnabled: true, gpuVoices: false });
    h.ready(1);
    expect(h.router.activeMode).toBe('piper');
    expect(h.engines[1]!.dispose).toHaveBeenCalledOnce();
    h.router.configure({ speechEnabled: true, gpuVoices: true });
    await h.router.initialize();
    expect(h.engines).toHaveLength(3);
    h.router.dispose();
  });
});
