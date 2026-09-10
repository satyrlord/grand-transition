import { LocalNeuralSpeech, type NeuralSpeechStatus } from './neural-speech';
import type { SpeechPort, SpeechRequest, SpeechVoice } from './speech-port';
import type { SpeechCancellationReason } from './speech-diagnostics';

export type NeuralVoiceMode = 'piper' | 'gpu';
type Engine = SpeechPort & { status: NeuralSpeechStatus; progress: number | null; voices: readonly SpeechVoice[];
  initialize(activate?: boolean): Promise<boolean>; dispose(): void };
type Factory = (mode: NeuralVoiceMode, changed: () => void) => Engine;

function createEngine(mode: NeuralVoiceMode, changed: () => void): Engine {
  if (mode === 'piper') return new LocalNeuralSpeech(changed);
  return new LocalNeuralSpeech(changed, {
    supported: () => typeof Worker === 'function' && typeof AudioContext === 'function' &&
      typeof WebAssembly === 'object' && 'gpu' in navigator,
    createContext: () => new AudioContext(),
    createWorker: () => new Worker(new URL('./kokoro-gpu-worker.ts', import.meta.url), { type: 'module' }),
    baseUrl: `${import.meta.env.BASE_URL}tts/kokoro-gpu/`,
    sampleRate: 24000, voicePrefix: 'kokoro:', defaultVoiceId: 'bm_george', startupBufferSeconds: 0.75,
    piperClarity: false,
    initializationTimeoutMs: 120_000,
  });
}

/** Select once per match. A failed GPU delivery ends silently; later requests use Piper. */
export class NeuralVoiceRouter implements SpeechPort {
  private readonly piper: Engine;
  private gpu: Engine | null = null;
  private enabled = false;
  private requested = false;
  private matchMode: NeuralVoiceMode | null = null;
  private disposed = false;

  constructor(private readonly changed: () => void = () => {}, private readonly factory: Factory = createEngine) {
    this.piper = factory('piper', changed);
  }

  get activeMode(): NeuralVoiceMode {
    if (this.matchMode === 'gpu' && this.gpu?.status === 'unavailable') this.matchMode = 'piper';
    return this.matchMode ?? (this.requested && this.gpu?.voices.length && this.gpu.status !== 'unavailable' ? 'gpu' : 'piper');
  }
  private get active(): Engine { return this.activeMode === 'gpu' ? this.gpu! : this.piper; }
  get available(): boolean { return !this.disposed && this.active.available; }
  get status(): NeuralSpeechStatus { return this.active.status; }
  get progress(): number | null { return this.active.progress; }
  get voices(): readonly SpeechVoice[] { return this.active.voices; }
  get gpuStatus(): 'idle' | 'loading' | 'ready' | 'unavailable' {
    const status = this.gpu?.status ?? 'idle';
    return status === 'generating' || status === 'speaking' ? 'ready' : status;
  }
  get gpuProgress(): number | null { return this.gpu?.progress ?? null; }

  configure(settings: { speechEnabled: boolean; gpuVoices: boolean }): void {
    this.enabled = settings.speechEnabled;
    this.requested = settings.gpuVoices;
    if (!this.enabled) this.cancel('settings');
    if ((!this.enabled || !this.requested) && this.matchMode !== 'gpu') this.releaseGpu();
    this.changed();
  }

  initialize(): Promise<boolean> {
    return this.load(true);
  }

  preload(): Promise<boolean> {
    return this.load(false);
  }

  private load(activate: boolean): Promise<boolean> {
    if (this.disposed || !this.enabled) return Promise.resolve(false);
    // Keep Piper ready for immediate match start and for device loss. GPU loading never gates it.
    const ready = this.piper.initialize(activate);
    if (this.requested) {
      this.gpu ??= this.factory('gpu', this.changed);
      if (this.gpu.status !== 'unavailable') void this.gpu.initialize(activate);
    }
    return ready;
  }

  beginMatch(): void {
    this.cancel('replacement');
    this.matchMode = null;
    this.matchMode = this.activeMode;
  }

  endMatch(): void {
    this.cancel('navigation');
    this.matchMode = null;
    if (!this.requested || !this.enabled) this.releaseGpu();
  }

  private request(request: SpeechRequest): SpeechRequest {
    const female = request.voiceUri === 'piper:vctk-p225' || request.voiceUri === 'kokoro:bf_emma';
    const voiceUri = this.activeMode === 'gpu' ? (female ? 'kokoro:bf_emma' : 'kokoro:bm_george') :
      (female ? 'piper:vctk-p225' : 'piper:vctk-p226');
    return { ...request, voiceUri, onDiagnostic: (event) => request.onDiagnostic?.({ ...event, voice: voiceUri }) };
  }
  speak(request: SpeechRequest) { return this.active.speak(this.request(request)); }
  prepare(request: SpeechRequest) { return this.active.prepare?.(this.request(request)) ?? { accepted: false, reason: 'unavailable' }; }
  cancel(reason: SpeechCancellationReason = 'replacement'): void { this.piper.cancel(reason); this.gpu?.cancel(reason); }
  pause(): void { this.piper.pause?.(); this.gpu?.pause?.(); }
  resume(): void { this.piper.resume?.(); this.gpu?.resume?.(); }
  dispose(): void { this.disposed = true; this.matchMode = null; this.piper.dispose(); this.releaseGpu(); }
  private releaseGpu(): void { const gpu = this.gpu; this.gpu = null; gpu?.dispose(); }
}
