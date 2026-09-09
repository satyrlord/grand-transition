import type { NeuralSpeechCommand, NeuralSpeechMessage, SpeechPort, SpeechRequest, SpeechResult, SpeechVoice } from './speech-port';

export type NeuralSpeechStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'speaking' | 'unavailable';
type Dependencies = { supported: () => boolean; createContext: () => AudioContext; createWorker: () => Worker; baseUrl: string };
type Prepared = Extract<NeuralSpeechMessage, { type: 'speech' }>;
type Pending = { request: SpeechRequest; playback: boolean; key: string; prepared?: Prepared };

function preparationKey(request: SpeechRequest): string {
  return JSON.stringify([request.text, request.segments ?? [request.text], request.language,
    request.voiceUri ?? null, request.rate ?? 1, request.pitch ?? 1]);
}

export class LocalNeuralSpeech implements SpeechPort {
  status: NeuralSpeechStatus = 'idle';
  progress: number | null = null;
  voices: readonly SpeechVoice[] = [];
  private worker: Worker | null = null;
  private context: AudioContext | null = null;
  private initialized: Promise<boolean> | null = null;
  private finishInitialization: ((ready: boolean) => void) | null = null;
  private readonly pending = new Map<number, Pending>();
  private synthesizing: number | null = null;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private sequence = 0;
  private generation = 0;
  private disposed = false;
  private paused = false;

  constructor(private readonly changed: () => void = () => {}, private readonly dependencies: Dependencies = {
    supported: () => typeof Worker === 'function' && typeof AudioContext === 'function' && typeof WebAssembly === 'object',
    createContext: () => new AudioContext(),
    createWorker: () => new Worker(new URL('./neural-speech-worker.ts', import.meta.url), { type: 'module' }),
    baseUrl: `${import.meta.env.BASE_URL}tts/kokoro/`,
  }) {}

  get available(): boolean { return !this.disposed && this.status !== 'unavailable' && this.dependencies.supported(); }

  initialize(): Promise<boolean> {
    if (this.disposed || !this.dependencies.supported()) { this.setStatus('unavailable'); return Promise.resolve(false); }
    try {
      this.context ??= this.dependencies.createContext();
      const generation = this.generation;
      if (!this.paused) void this.context.resume().then(() => {
        if (generation === this.generation) this.pump();
      }).catch(() => { if (generation === this.generation) this.fail(); });
      if (this.initialized) return this.initialized;
      this.progress = null;
      this.setStatus('loading');
      this.initialized = new Promise((resolve) => { this.finishInitialization = resolve; });
      const worker = this.dependencies.createWorker();
      this.worker = worker;
      worker.onmessage = (event) => { if (this.worker === worker) this.receive(event); };
      worker.onerror = () => { if (this.worker === worker) this.fail(); };
      return this.initialized;
    } catch { this.fail(); return Promise.resolve(false); }
  }

  speak(request: SpeechRequest): SpeechResult {
    return this.enqueue(request, true);
  }

  prepare(request: SpeechRequest): SpeechResult {
    return this.enqueue(request, false);
  }

  private enqueue(request: SpeechRequest, playback: boolean): SpeechResult {
    if (!this.available) return { accepted: false, reason: 'unavailable' };
    if (!request.text.trim() || request.volume === 0) return { accepted: false, reason: 'silent' };
    if (!request.language.toLowerCase().startsWith('en')) return { accepted: false, reason: 'unsupported-language' };
    const key = preparationKey(request);
    const existing = [...this.pending.values()].find((pending) => !pending.playback && pending.key === key);
    if (existing) {
      if (playback) { existing.request = request; existing.playback = true; this.pump(); }
      return { accepted: true };
    }
    // Keep at most one future delivery. It is local to this presentation, not a persistent cache.
    for (const [id, pending] of this.pending) if (!pending.playback) {
      this.pending.delete(id);
    }
    const id = ++this.sequence;
    this.pending.set(id, { request, playback, key });
    void this.initialize().then((ready) => {
      if (!this.pending.has(id)) return;
      if (!ready) { this.fail(); return; }
      this.dispatch();
    });
    return { accepted: true };
  }

  cancel(): void {
    this.generation++;
    this.pending.clear();
    this.stopSource();
    if (this.status === 'speaking' || this.status === 'generating') this.setStatus('ready');
  }

  pause(): void {
    this.paused = true;
    if (this.context) void this.context.suspend().catch(() => this.fail());
  }

  resume(): void {
    this.paused = false;
    if (this.context) void this.context.resume().then(() => this.pump()).catch(() => this.fail());
  }

  dispose(): void {
    this.cancel(); this.disposed = true;
    clearTimeout(this.watchdog); this.synthesizing = null;
    this.worker?.terminate(); this.worker = null;
    this.finishInitialization?.(false); this.finishInitialization = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.voices = [];
  }

  private send(message: NeuralSpeechCommand): void { this.worker?.postMessage(message); }

  private dispatch(): void {
    if (this.synthesizing !== null || !this.worker || !this.voices.length) return;
    const next = [...this.pending.entries()].find(([, pending]) => !pending.prepared);
    if (!next) return;
    const [id, { request }] = next;
    const language = request.language.toLowerCase();
    const voice = this.voices.find(({ voiceURI }) => voiceURI === request.voiceUri) ??
      this.voices.find((candidate) => candidate.lang.toLowerCase() === language && candidate.default) ??
      this.voices.find((candidate) => candidate.lang.toLowerCase() === language) ??
      this.voices.find((candidate) => candidate.default) ?? this.voices[0];
    this.synthesizing = id;
    this.setStatus(this.source ? 'speaking' : 'generating');
    this.watchdog = setTimeout(() => this.fail(), 60_000);
    this.send({ type: 'synthesize', id, segments: request.segments ?? [request.text],
      voiceId: voice?.voiceURI.replace('kokoro:', '') ?? 'am_michael',
      rate: request.rate ?? 1, pitch: request.pitch ?? 1 });
  }

  private readonly receive = ({ data }: MessageEvent<NeuralSpeechMessage>): void => {
    if (this.disposed) return;
    if (data.type === 'booted') {
      this.send({ type: 'load', baseUrl: this.dependencies.baseUrl });
    } else if (data.type === 'progress') {
      const progress = data.total > 0 ? Math.min(1, Math.floor(data.loaded / data.total * 100) / 100) : null;
      if (progress !== this.progress) { this.progress = progress; this.changed(); }
    } else if (data.type === 'ready') {
      this.voices = Object.freeze(data.voices.map((voice) => Object.freeze(voice)));
      this.progress = null;
      this.setStatus('ready');
      this.finishInitialization?.(true); this.finishInitialization = null;
    } else {
      if (data.id === this.synthesizing) { clearTimeout(this.watchdog); this.synthesizing = null; }
      if (data.type === 'error') {
        if (data.id === null || this.pending.has(data.id)) { this.fail(); return; }
      } else {
        const pending = this.pending.get(data.id);
        if (pending) { pending.prepared = data; this.pump(); }
      }
      this.dispatch();
    }
  };

  private pump(): void {
    const context = this.context;
    if (this.paused || this.source || !context || context.state !== 'running') return;
    const first = [...this.pending.entries()].find(([, pending]) => pending.playback);
    if (!first?.[1].prepared) return;
    const [id, { request, prepared }] = first;
    const data = prepared!;
    if (data.sampleRate !== 24000 || !data.samples.length) { this.fail(); return; }
    try {
      const generation = this.generation;
      const buffer = context.createBuffer(1, data.samples.length, data.sampleRate);
      buffer.copyToChannel(data.samples, 0);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = request.volume ?? 0.8;
      source.connect(gain); gain.connect(context.destination);
      this.source = source; this.gain = gain;
      source.onended = () => {
        if (generation !== this.generation || this.source !== source) return;
        this.stopSource(false); this.pending.delete(id);
        this.setStatus([...this.pending.values()].some((pending) => pending.playback) ? 'generating' : 'ready');
        request.onEnd?.(); this.pump();
      };
      const began = context.currentTime;
      const notifyAt = (seconds: number, callback: () => void) => {
        const check = () => {
          if (generation !== this.generation || this.source !== source) return;
          if (this.paused) { schedule(check, 50); return; }
          const remaining = began + seconds - context.currentTime;
          if (remaining > 0.002) { schedule(check, Math.max(4, remaining * 1000)); return; }
          callback();
        };
        const schedule = (callback: () => void, delay: number) => {
          const timer = setTimeout(() => { this.timers.delete(timer); callback(); }, delay);
          this.timers.add(timer);
        };
        schedule(check, Math.max(0, seconds * 1000));
      };
      notifyAt(data.markers[0]?.seconds ?? 0, () => { this.setStatus('speaking'); request.onStart?.(); });
      for (const marker of data.markers) notifyAt(marker.seconds, () => request.onSegment?.(marker.index));
      source.start(began);
    } catch { this.fail(); }
  }

  private stopSource(stop = true): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    if (this.source) {
      this.source.onended = null;
      if (stop) { try { this.source.stop(); } catch { /* The completed source is already silent. */ } }
      this.source.disconnect(); this.source = null;
    }
    this.gain?.disconnect(); this.gain = null;
  }

  private setStatus(status: NeuralSpeechStatus): void {
    if (this.status === status) return;
    this.status = status; this.changed();
  }

  private fail(): void {
    const requests = [...this.pending.values()].filter((pending) => pending.playback).map(({ request }) => request);
    this.cancel();
    clearTimeout(this.watchdog); this.synthesizing = null;
    this.worker?.terminate(); this.worker = null;
    this.finishInitialization?.(false); this.finishInitialization = null;
    this.initialized = null;
    this.setStatus('unavailable');
    for (const request of requests) request.onError?.();
  }
}
