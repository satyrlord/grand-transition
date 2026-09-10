import { describe, expect, test, vi } from 'vitest';
import { NeuralVoiceRouter, type NeuralVoiceMode } from '../../src/audio/neural-voice-router';
import type { NeuralSpeechStatus } from '../../src/audio/neural-speech';
import type { SpeechRequest } from '../../src/audio/speech-port';

function harness() {
  const engines: { mode: NeuralVoiceMode; status: NeuralSpeechStatus; progress: number | null;
    voices: { voiceURI: string; name: string; lang: string; default: boolean }[]; available: boolean;
    initialize: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; prepare: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
  const router = new NeuralVoiceRouter(vi.fn(), (mode, changed) => {
    const engine = { mode, status: 'idle' as NeuralSpeechStatus, progress: null, voices: [], available: true,
      initialize: vi.fn(async () => { engine.status = 'loading'; changed(); return true; }),
      speak: vi.fn((_request: SpeechRequest) => ({ accepted: true })), prepare: vi.fn((_request: SpeechRequest) => ({ accepted: true })),
      cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
    engines.push(engine); return engine;
  });
  const ready = (index: number) => { engines[index]!.status = 'ready'; engines[index]!.voices = [{voiceURI:'voice',name:'Voice',lang:'en-GB',default:true}]; };
  return { router, engines, ready };
}
const request = { text: 'Your brother is a snitch.', language: 'en-GB', voiceUri: 'piper:vctk-p226' };

describe('neural engine selection', () => {
  test('menu preparation loads both requested engines without audio activation', async () => {
    const h=harness();h.router.configure({speechEnabled:true,gpuVoices:true});await h.router.preload();
    expect(h.engines).toHaveLength(2);
    for(const engine of h.engines)expect(engine.initialize).toHaveBeenLastCalledWith(false);
    await h.router.initialize();for(const engine of h.engines)expect(engine.initialize).toHaveBeenLastCalledWith(true);
    h.router.dispose();
  });
  test('does not create or download GPU resources without both opt-ins', async () => {
    const h = harness();
    h.router.configure({ speechEnabled:false, gpuVoices:true });
    expect(await h.router.initialize()).toBe(false); expect(h.engines).toHaveLength(1);
    expect(h.engines[0]!.initialize).not.toHaveBeenCalled();
    h.router.configure({ speechEnabled:true, gpuVoices:false }); await h.router.initialize();
    expect(h.engines).toHaveLength(1); expect(h.router.activeMode).toBe('piper');
    h.router.dispose();
  });
  test('starts on Piper during loading and waits until the next match to select ready GPU voices', async () => {
    const h = harness(); h.router.configure({ speechEnabled:true, gpuVoices:true }); await h.router.initialize();
    expect(h.router.gpuStatus).toBe('loading'); h.router.beginMatch(); h.ready(1);
    h.router.speak(request); expect(h.engines[0]!.speak).toHaveBeenCalledOnce();
    expect(h.router.activeMode).toBe('piper');
    h.router.endMatch(); h.router.beginMatch(); h.router.speak(request);
    expect(h.engines[1]!.speak.mock.calls[0]![0].voiceUri).toBe('kokoro:bm_george');
    h.router.dispose();
    expect(h.router.available).toBe(false); expect(h.router.status).toBeDefined();
  });
  test('maps both voices and actual diagnostics consistently for preparation and playback', async () => {
    const h = harness(); h.router.configure({ speechEnabled:true, gpuVoices:true }); await h.router.initialize(); h.ready(1); h.router.beginMatch();
    const onDiagnostic = vi.fn(); const female = {...request, voiceUri:'piper:vctk-p225',onDiagnostic};
    h.router.prepare(female); h.router.speak(female);
    const prepared = h.engines[1]!.prepare.mock.calls[0]![0]; const spoken = h.engines[1]!.speak.mock.calls[0]![0];
    expect(prepared.voiceUri).toBe('kokoro:bf_emma'); expect(spoken.voiceUri).toBe(prepared.voiceUri);
    spoken.onDiagnostic?.({type:'playback-start',provider:'neural'});
    expect(onDiagnostic).toHaveBeenCalledWith({type:'playback-start',provider:'neural',voice:'kokoro:bf_emma'});
    h.router.dispose();
  });
  test('does not replay a failed GPU utterance and uses Piper for subsequent requests', async () => {
    const h = harness(); h.router.configure({ speechEnabled:true, gpuVoices:true }); await h.router.initialize(); h.ready(1); h.router.beginMatch();
    const onError = vi.fn(); h.router.speak({...request,onError});
    h.engines[1]!.status = 'unavailable'; h.engines[1]!.speak.mock.calls[0]![0].onError?.();
    expect(onError).toHaveBeenCalledOnce(); expect(h.engines[0]!.speak).not.toHaveBeenCalled();
    h.router.speak({...request,voiceUri:'kokoro:bf_emma'});
    expect(h.engines[0]!.speak.mock.calls[0]![0].voiceUri).toBe('piper:vctk-p225');
    h.ready(1); expect(h.router.activeMode).toBe('piper'); h.router.dispose();
  });
  test('preserves a match selection through mute and releases GPU when leaving with speech disabled', async () => {
    const h = harness(); h.router.configure({speechEnabled:true,gpuVoices:true}); await h.router.initialize(); h.ready(1); h.router.beginMatch();
    h.router.configure({speechEnabled:false,gpuVoices:true}); expect(h.router.activeMode).toBe('gpu');
    expect(h.engines[1]!.cancel).toHaveBeenCalledWith('settings');
    h.router.pause(); h.router.resume(); expect(h.engines.every(engine => engine.pause.mock.calls.length === 1 && engine.resume.mock.calls.length === 1)).toBe(true);
    h.router.endMatch(); expect(h.engines[1]!.dispose).toHaveBeenCalledOnce(); expect(h.router.gpuStatus).toBe('idle');
    h.router.dispose(); expect(await h.router.initialize()).toBe(false);
  });
  test('disposes an in-flight GPU load when opt-out and creates a fresh instance on explicit retry', async () => {
    const h = harness(); h.router.configure({speechEnabled:true,gpuVoices:true}); await h.router.initialize();
    h.router.configure({speechEnabled:true,gpuVoices:false}); h.ready(1);
    expect(h.router.activeMode).toBe('piper'); expect(h.engines[1]!.dispose).toHaveBeenCalledOnce();
    h.router.configure({speechEnabled:true,gpuVoices:true}); await h.router.initialize(); expect(h.engines).toHaveLength(3);
    h.router.dispose();
  });
});
