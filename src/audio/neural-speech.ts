import type { NeuralSpeechCommand, NeuralSpeechMessage, SpeechPort, SpeechRequest, SpeechResult, SpeechVoice } from './speech-port';
import { reportSpeech, type SpeechCancellationReason, type SpeechDiagnostic } from './speech-diagnostics';
import { createPiperClarity } from './piper-clarity';

export type NeuralSpeechStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'speaking' | 'unavailable';
type Dependencies = { supported: () => boolean; createContext: () => AudioContext; createWorker: () => Worker; baseUrl: string;
  sampleRate?: number; voicePrefix?: string; defaultVoiceId?: string; startupBufferSeconds?: number; piperClarity?: boolean; initializationTimeoutMs?: number };
type Prepared = Extract<NeuralSpeechMessage, { type: 'speech' }>;
type Pending = { request: SpeechRequest; playback: boolean; key: string; parts: { segments: readonly string[]; offset: number }[];
  prepared: Prepared[]; generated: number; scheduled: number; completed: number };

function preparationKey(request: SpeechRequest): string {
  return JSON.stringify([request.text, request.segments ?? [request.text], request.language,
    request.voiceUri ?? null, request.rate ?? 1, request.pitch ?? 1, request.chunkStarts ?? [0]]);
}

export class LocalNeuralSpeech implements SpeechPort {
  status: NeuralSpeechStatus = 'idle';
  progress: number | null = null;
  voices: readonly SpeechVoice[] = [];
  private worker: Worker | null = null;
  private context: AudioContext | null = null;
  private clarity: ReturnType<typeof createPiperClarity> | null = null;
  private initialized: Promise<boolean> | null = null;
  private finishInitialization: ((ready: boolean) => void) | null = null;
  private readonly pending = new Map<number, Pending>();
  private synthesizing: { id: number; requestId: number; offset: number } | null = null;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private initializationWatchdog: ReturnType<typeof setTimeout> | undefined;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly sources = new Map<AudioBufferSourceNode, GainNode>();
  private playbackEnd = 0;
  private requestSequence = 0;
  private sequence = 0;
  private generation = 0;
  private disposed = false;
  private paused = false;

  constructor(private readonly changed: () => void = () => {}, private readonly dependencies: Dependencies = {
    supported: () => typeof Worker === 'function' && typeof AudioContext === 'function' && typeof WebAssembly === 'object',
    createContext: () => new AudioContext(),
    createWorker: () => new Worker(new URL('./neural-speech-worker.ts', import.meta.url), { type: 'module' }),
    baseUrl: `${import.meta.env.BASE_URL}tts/piper/`,
  }) {}

  get available(): boolean { return !this.disposed && this.status !== 'unavailable' && this.dependencies.supported(); }

  initialize(activate = true): Promise<boolean> {
    if (this.disposed || !this.dependencies.supported()) { this.setStatus('unavailable'); return Promise.resolve(false); }
    try {
      if (activate) {
        this.context ??= this.dependencies.createContext();
        const generation = this.generation;
        if (!this.paused) void this.context.resume().then(() => {
          if (generation === this.generation) this.pump();
        }).catch(() => { if (generation === this.generation) this.fail(); });
      }
      if (this.initialized) return this.initialized;
      this.progress = null;
      this.setStatus('loading');
      this.initialized = new Promise((resolve) => { this.finishInitialization = resolve; });
      const worker = this.dependencies.createWorker();
      this.worker = worker;
      worker.onmessage = (event) => { if (this.worker === worker) this.receive(event); };
      worker.onerror = () => { if (this.worker === worker) this.fail('worker'); };
      this.watchInitialization();
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
    const segments = request.segments ?? [request.text];
    const starts = request.chunkStarts ?? [0];
    if (!segments.length || segments.join('') !== request.text || starts[0] !== 0 || starts.some((start, index) => !Number.isInteger(start) ||
      start < 0 || start >= segments.length || (index > 0 && start <= starts[index - 1]!))) {
      return { accepted: false, reason: 'invalid-segments' };
    }
    const parts = starts.map((offset, index) => ({ offset, segments: segments.slice(offset, starts[index + 1] ?? segments.length) }));
    // Keep at most one future delivery. It is local to this presentation, not a persistent cache.
    for (const [id, pending] of this.pending) if (!pending.playback) {
      reportSpeech(pending.request, { type: 'cancel', provider: 'neural', reason: 'replacement' });
      this.pending.delete(id);
    }
    const id = ++this.requestSequence;
    this.pending.set(id, { request, playback, key, parts, prepared: [], generated: 0, scheduled: 0, completed: 0 });
    if (!this.voices.length) reportSpeech(request, { type: 'model-loading', provider: 'neural' });
    void this.initialize().then((ready) => {
      if (!this.pending.has(id)) return;
      if (!ready) { this.fail(); return; }
      this.dispatch();
    });
    return { accepted: true };
  }

  cancel(reason: SpeechCancellationReason = 'replacement'): void {
    this.generation++;
    for (const pending of this.pending.values()) reportSpeech(pending.request, { type: 'cancel', provider: 'neural', reason });
    this.pending.clear();
    this.stopSource();
    if (this.status === 'speaking' || this.status === 'generating') this.setStatus('ready');
  }

  pause(): void {
    if (!this.paused) for (const pending of this.pending.values()) reportSpeech(pending.request, { type: 'pause', provider: 'neural' });
    this.paused = true;
    if (this.context) void this.context.suspend().catch(() => this.fail());
  }

  resume(): void {
    if (this.paused) for (const pending of this.pending.values()) reportSpeech(pending.request, { type: 'resume', provider: 'neural' });
    this.paused = false;
    if (this.context) void this.context.resume().then(() => this.pump()).catch(() => this.fail());
  }

  dispose(): void {
    this.cancel(); this.disposed = true;
    clearTimeout(this.watchdog); this.synthesizing = null;
    clearTimeout(this.initializationWatchdog);
    this.worker?.terminate(); this.worker = null;
    this.finishInitialization?.(false); this.finishInitialization = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.voices = [];
  }

  private send(message: NeuralSpeechCommand): void { this.worker?.postMessage(message); }

  private watchInitialization(): void {
    if (!this.finishInitialization || !this.dependencies.initializationTimeoutMs) return;
    clearTimeout(this.initializationWatchdog);
    this.initializationWatchdog = setTimeout(() => this.fail('worker'), this.dependencies.initializationTimeoutMs);
  }

  private dispatch(): void {
    if (this.synthesizing !== null || !this.worker || !this.voices.length) return;
    const entries = [...this.pending.entries()];
    const next = entries.find(([, pending]) => pending.playback && pending.generated < pending.parts.length) ??
      entries.find(([, pending]) => pending.generated < pending.parts.length);
    if (!next) return;
    const [requestId, pending] = next;
    const request = pending.request;
    const part = pending.parts[pending.generated]!;
    const id = ++this.sequence;
    const language = request.language.toLowerCase();
    const voice = this.voices.find(({ voiceURI }) => voiceURI === request.voiceUri) ??
      this.voices.find((candidate) => candidate.lang.toLowerCase() === language && candidate.default) ??
      this.voices.find((candidate) => candidate.lang.toLowerCase() === language) ??
      this.voices.find((candidate) => candidate.default) ?? this.voices[0];
    this.synthesizing = { id, requestId, offset: part.offset };
    this.setStatus(this.sources.size ? 'speaking' : 'generating');
    this.watchdog = setTimeout(() => {
      reportSpeech(request, { type: 'timeout', provider: 'neural', reason: 'inference' });
      this.fail('inference');
    }, 60_000);
    reportSpeech(request, { type: 'synthesis-start', provider: 'neural', voice: voice?.voiceURI });
    this.send({ type: 'synthesize', id, segments: part.segments,
      voiceId: voice?.voiceURI.replace(this.dependencies.voicePrefix ?? 'piper:', '') ?? this.dependencies.defaultVoiceId ?? 'vctk-p226',
      rate: request.rate ?? 1, pitch: request.pitch ?? 1 });
  }

  private readonly receive = ({ data }: MessageEvent<NeuralSpeechMessage>): void => {
    if (this.disposed) return;
    if (data.type === 'booted') {
      this.watchInitialization();
      this.send({ type: 'load', baseUrl: this.dependencies.baseUrl });
    } else if (data.type === 'progress') {
      this.watchInitialization();
      const progress = data.total > 0 ? Math.min(1, Math.floor(data.loaded / data.total * 100) / 100) : null;
      if (progress !== this.progress) { this.progress = progress; this.changed(); }
    } else if (data.type === 'ready') {
      clearTimeout(this.initializationWatchdog);
      this.voices = Object.freeze(data.voices.map((voice) => Object.freeze(voice)));
      this.progress = null;
      this.setStatus('ready');
      for (const pending of this.pending.values()) reportSpeech(pending.request, { type: 'model-ready', provider: 'neural' });
      this.finishInitialization?.(true); this.finishInitialization = null;
    } else {
      const active = this.synthesizing;
      const current = active?.id === data.id;
      if (current) { clearTimeout(this.watchdog); this.synthesizing = null; }
      if (data.type === 'error') {
        if (data.id === null || (current && this.pending.has(active!.requestId))) { this.fail(data.id === null ? 'worker' : 'inference'); return; }
      } else if (current) {
        const pending = this.pending.get(active!.requestId);
        if (pending) {
          reportSpeech(pending.request, { type: 'pcm-ready', provider: 'neural', durationMs: data.samples.length / data.sampleRate / data.playbackRate * 1000 });
          pending.generated++;
          pending.prepared.push({ ...data, markers: data.markers.map(marker => ({ ...marker, index: marker.index + active!.offset })) });
          this.pump();
        }
      }
      this.dispatch();
    }
  };

  private pump(): void {
    const context = this.context;
    if (this.paused || !context || context.state !== 'running') return;
    const first = [...this.pending.entries()].find(([, pending]) => pending.playback);
    if (!first) return;
    const [id, pending] = first;
    const request = pending.request;
    if (pending.completed === pending.parts.length) {
      this.pending.delete(id); this.playbackEnd = 0;
      this.setStatus([...this.pending.values()].some(value => value.playback) ? 'generating' : 'ready');
      reportSpeech(request, { type: 'playback-end', provider: 'neural' });
      request.onEnd?.(); this.pump(); return;
    }
    for (const data of pending.prepared.splice(0)) {
      if (data.sampleRate !== (this.dependencies.sampleRate ?? 22050) || !data.samples.length || !Number.isFinite(data.playbackRate) || data.playbackRate < 0.5 || data.playbackRate > 2) { this.fail(); return; }
      try {
        const generation = this.generation;
        const firstChunk = pending.scheduled++ === 0;
        const buffer = context.createBuffer(1, data.samples.length, data.sampleRate);
        buffer.copyToChannel(data.samples, 0);
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer; source.playbackRate.value = data.playbackRate;
        gain.gain.value = request.volume ?? 0.8;
        if (this.dependencies.piperClarity !== false) this.clarity ??= createPiperClarity(context);
        source.connect(gain); gain.connect(this.clarity?.input ?? context.destination);
        this.sources.set(source, gain);
        source.onended = () => {
          if (generation !== this.generation || !this.sources.has(source)) return;
          source.onended = null; source.disconnect(); gain.disconnect(); this.sources.delete(source);
          pending.completed++; this.pump();
        };
        const needsBuffer = firstChunk && pending.generated < pending.parts.length;
        const began = Math.max(context.currentTime + (needsBuffer ? this.dependencies.startupBufferSeconds ?? 0 : 0), this.playbackEnd);
        this.playbackEnd = began + buffer.duration / data.playbackRate;
        const notifyAt = (seconds: number, callback: () => void) => {
          const schedule = (action: () => void, delay: number) => {
            const timer = setTimeout(() => { this.timers.delete(timer); action(); }, delay);
            this.timers.add(timer);
          };
          const check = () => {
            if (generation !== this.generation || !this.sources.has(source)) return;
            if (this.paused) { schedule(check, 50); return; }
            const remaining = began + seconds - context.currentTime;
            if (remaining > 0.002) { schedule(check, Math.max(4, remaining * 1000)); return; }
            callback();
          };
          schedule(check, Math.max(0, (began + seconds - context.currentTime) * 1000));
        };
        if (firstChunk) notifyAt(0, () => reportSpeech(request, { type: 'playback-start', provider: 'neural' }));
        if (firstChunk) notifyAt(data.markers[0]?.seconds ?? 0, () => { this.setStatus('speaking'); request.onStart?.(); });
        for (const marker of data.markers) notifyAt(marker.seconds, () => {
          reportSpeech(request, { type: 'segment', provider: 'neural', segment: marker.index });
          request.onSegment?.(marker.index);
        });
        source.start(began);

      } catch { this.fail('audio'); return; }
    }
  }

  private stopSource(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear(); this.playbackEnd = 0;
    for (const [source, gain] of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* The completed source is already silent. */ }
      source.disconnect(); gain.disconnect();
    }
    this.sources.clear();
    this.clarity?.disconnect(); this.clarity = null;
  }

  private setStatus(status: NeuralSpeechStatus): void {
    if (this.status === status) return;
    this.status = status; this.changed();
  }

  private fail(reason: SpeechDiagnostic['reason'] = 'audio'): void {
    clearTimeout(this.initializationWatchdog);
    for (const pending of this.pending.values()) reportSpeech(pending.request, { type: 'error', provider: 'neural', reason });
    const requests = [...this.pending.values()].filter((pending) => pending.playback).map(({ request }) => request);
    this.cancel('failure');
    clearTimeout(this.watchdog); this.synthesizing = null;
    this.worker?.terminate(); this.worker = null;
    this.finishInitialization?.(false); this.finishInitialization = null;
    this.initialized = null;
    this.setStatus('unavailable');
    for (const request of requests) request.onError?.();
  }
}
