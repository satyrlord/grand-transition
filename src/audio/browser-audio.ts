import { effectIds, type AudioPort, type AudioScene, type AudioStatus,
  type EffectId, type MixerSettings } from './audio-port';

const tracks = {
  menu: ['menu-theme'],
  'transition-era-television-studio': [
    'transition-era-television-studio-theme',
  ],
} as const;
const assetIds = [...tracks.menu, ...tracks['transition-era-television-studio'], ...effectIds];
const fadeSeconds = 0.3;
type Format = 'ogg' | 'mp3';
type Dependencies = {
  createContext: () => AudioContext;
  load: (id: string, format: Format) => Promise<ArrayBuffer>;
};
type Source = {
  node: AudioBufferSourceNode;
  gain: GainNode;
  started: number;
};

export class BrowserAudio implements AudioPort {
  status: AudioStatus = 'idle';
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private settings: MixerSettings = { masterVolume: 1, musicVolume: 0.1, effectsVolume: 0.8, speechVolume: 0.8 };
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly sources = new Set<Source>();
  private readonly loops = new Map<string, Source>();
  private scene: AudioScene = 'menu';
  private pending: Promise<void> | null = null;
  private generation = 0;
  private disposed = false;

  constructor(private readonly changed: () => void = () => {},
    private readonly dependencies: Dependencies = browserDependencies()) {}

  enable(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    try {
      const context = this.context ?? this.createGraph();
      const generation = this.generation;
      // Call resume in the user gesture's task, before imports or decoding.
      const resumed = context.resume();
      if (this.pending) {
        void resumed.catch(() => { if (generation === this.generation) this.fail(); });
        return this.pending;
      }
      if (this.status !== 'ready') { this.status = 'loading'; this.changed(); }
      const operation = this.prepare(context, resumed, generation);
      this.pending = operation;
      void operation.finally(() => { if (this.pending === operation) this.pending = null; });
      return operation;
    } catch {
      this.fail();
      return Promise.resolve();
    }
  }

  configure(settings: MixerSettings): void {
    this.settings = settings;
    if (this.context && this.master && this.music && this.effects) {
      const now = this.context.currentTime;
      this.master.gain.setValueAtTime(settings.masterVolume, now);
      this.music.gain.setValueAtTime(settings.musicVolume, now);
      this.effects.gain.setValueAtTime(settings.effectsVolume, now);
      this.syncLoops();
    }
  }

  setScene(scene: AudioScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    // A cue from the old screen never continues into a replacement screen.
    for (const source of this.sources) if (!source.node.loop) this.stop(source);
    this.syncLoops();
  }

  play(cue: EffectId): boolean {
    if (this.status !== 'ready' || this.context?.state !== 'running' ||
      this.settings.masterVolume * this.settings.effectsVolume === 0) return false;
    const buffer = this.buffers.get(cue);
    if (!buffer || !this.effects) return false;
    try {
      const source = this.source(buffer, this.effects, false);
      source.node.start(this.context.currentTime);
      return true;
    } catch { this.fail(); return false; }
  }

  dispose(): void {
    this.disposed = true;
    this.release();
    this.status = 'idle';
  }

  private createGraph(): AudioContext {
    const context = this.dependencies.createContext();
    this.context = context;
    this.master = context.createGain();
    this.music = context.createGain();
    this.effects = context.createGain();
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(context.destination);
    this.configure(this.settings);
    return context;
  }

  private async prepare(context: AudioContext, resumed: Promise<void>, generation: number) {
    try {
      await resumed;
      for (const id of assetIds) {
        if (generation !== this.generation) return;
        if (this.buffers.has(id)) continue;
        let buffer: AudioBuffer;
        try { buffer = await context.decodeAudioData(await this.dependencies.load(id, 'ogg')); }
        catch { buffer = await context.decodeAudioData(await this.dependencies.load(id, 'mp3')); }
        if (generation !== this.generation) return;
        this.buffers.set(id, buffer);
      }
      if (generation !== this.generation) return;
      const changed = this.status !== 'ready';
      this.status = 'ready';
      this.syncLoops();
      if (changed) this.changed();
    } catch { if (generation === this.generation) this.fail(); }
  }

  private source(buffer: AudioBuffer, bus: GainNode, loop: boolean): Source {
    const context = this.context!;
    const node = context.createBufferSource();
    const gain = context.createGain();
    node.buffer = buffer;
    node.loop = loop;
    node.connect(gain);
    gain.connect(bus);
    const source = { node, gain, started: context.currentTime };
    this.sources.add(source);
    node.onended = () => this.detach(source);
    return source;
  }

  private syncLoops(): void {
    const context = this.context;
    if (!context || this.status !== 'ready' || !this.music) return;
    const wanted: readonly string[] = this.scene === null ? [] : tracks[this.scene];
    for (const [id, source] of this.loops) {
      if (wanted.includes(id)) continue;
      this.loops.delete(id);
      const elapsed = context.currentTime - source.started;
      const level = Math.sin(Math.min(1, elapsed / fadeSeconds) * Math.PI / 2);
      // This gain is source-owned. A value curve cannot be removed once it has
      // started, and Firefox rejects any event scheduled during one, so a
      // replacement fade waits for an in-flight fade-in to end instead of
      // stacking a second curve on it. The interrupted loop is still below its
      // fade-in level at that point, and it stops one fade later.
      const fadesAt = Math.max(context.currentTime, source.started + fadeSeconds);
      source.gain.gain.cancelScheduledValues(fadesAt);
      source.gain.gain.setValueCurveAtTime(curve(false, level), fadesAt, fadeSeconds);
      source.node.stop(fadesAt + fadeSeconds);
    }
    if (context.state !== 'running' || this.settings.masterVolume * this.settings.musicVolume === 0) return;
    for (const id of wanted) {
      if (this.loops.has(id)) continue;
      const buffer = this.buffers.get(id);
      if (!buffer) continue;
      const source = this.source(buffer, this.music, true);
      this.loops.set(id, source);
      source.gain.gain.setValueCurveAtTime(curve(true), context.currentTime, fadeSeconds);
      source.node.start(context.currentTime);
    }
  }

  private detach(source: Source): void {
    source.node.onended = null;
    source.node.disconnect();
    source.gain.disconnect();
    this.sources.delete(source);
  }

  private stop(source: Source): void {
    try { source.node.stop(); } catch { /* An ended source is already silent. */ }
    this.detach(source);
  }

  private release(): void {
    this.generation++;
    this.pending = null;
    for (const source of this.sources) this.stop(source);
    this.loops.clear();
    this.buffers.clear();
    this.master?.disconnect(); this.music?.disconnect(); this.effects?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.master = null; this.music = null; this.effects = null;
  }

  private fail(): void {
    this.release();
    this.status = 'unavailable';
    this.changed();
  }
}

function curve(incoming: boolean, level = 1): Float32Array<ArrayBuffer> {
  return Float32Array.from({ length: 65 }, (_, index) => {
    if (index === 64) return incoming ? level : 0;
    return level * (incoming ? Math.sin(index / 64 * Math.PI / 2) : Math.cos(index / 64 * Math.PI / 2));
  });
}

function browserDependencies(): Dependencies {
  const assets = import.meta.glob<string>('../assets/audio/*.{ogg,mp3}', {
    query: '?url&no-inline', import: 'default',
  });
  return {
    createContext: () => new AudioContext(),
    load: async (id, format) => {
      const load = assets[`../assets/audio/${id}.${format}`];
      if (!load) throw new Error('The audio asset is missing.');
      const url = new URL(await load(), location.href);
      if (url.origin !== location.origin) throw new Error('Audio must use the application origin.');
      const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: 'force-cache' });
      if (!response.ok) throw new Error('The audio asset is unavailable.');
      return response.arrayBuffer();
    },
  };
}
