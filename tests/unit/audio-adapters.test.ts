import { describe, expect, test, vi } from 'vitest';
import { BrowserAudio } from '../../src/audio/browser-audio';
import { effectIds, mixerGains } from '../../src/audio/audio-port';
import { defaultSettings } from '../../src/persistence/codecs/settings-codec';

function audioHarness() {
  const params: Array<{
    value: number;
    curves: Float32Array[];
    cancelScheduledValues: ReturnType<typeof vi.fn>;
  }> = [];
  const nodes: Array<{ loop: boolean; onended: (() => void) | null; start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
  const context = {
    currentTime: 10, state: 'running', destination: {},
    resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => ({ duration: 1 })),
    createGain: () => {
      let curveStart: number | null = null;
      let curveEnd = 0;
      const parameter = { value: 1, curves: [] as Float32Array[],
        setValueAtTime(value: number) {
          if (curveStart !== null && context.currentTime < curveEnd) {
            throw new DOMException("Can't add events during a curve event", 'NotSupportedError');
          }
          this.value = value;
        },
        cancelScheduledValues: vi.fn((startTime: number) => {
          // A value curve's event time is its start time, so a curve that has
          // already begun stays active, exactly as Firefox keeps it.
          if (curveStart !== null && curveStart >= startTime && curveStart > context.currentTime) {
            curveStart = null;
          }
        }),
        setValueCurveAtTime(values: Float32Array, startTime: number, duration: number) {
          if (curveStart !== null && startTime < curveEnd) {
            throw new DOMException("Can't add events during a curve event", 'NotSupportedError');
          }
          curveStart = startTime;
          curveEnd = startTime + duration;
          this.curves.push(values);
        },
      };
      params.push(parameter);
      return { gain: parameter, connect: vi.fn(), disconnect: vi.fn() };
    },
    createBufferSource: () => {
      const node = { buffer: null, loop: false, onended: null as (() => void) | null,
        connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      nodes.push(node);
      return node;
    },
  };
  const load = vi.fn(async (_id: string, _format: 'ogg' | 'mp3') => new ArrayBuffer(1));
  const changed = vi.fn();
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const audio = new BrowserAudio(changed, { createContext, load });
  return { audio, context, createContext, params, nodes, load, changed };
}

describe('audio adapters', () => {
  test.each([0, 1])('mixer equations at volume %s', (value) => {
    expect(mixerGains({ masterVolume: value, musicVolume: value, effectsVolume: value, speechVolume: value }))
      .toEqual({ music: value, effects: value, speech: value });
    expect(mixerGains({ ...defaultSettings, masterVolume: value }))
      .toEqual({ music: 0.1 * value, effects: 0.8 * value, speech: 0.8 * value });
  });

  test('resumes in the gesture task, decodes once, and starts every distinct cue at the public event time', async () => {
    const { audio, context, nodes, load, createContext, params, changed } = audioHarness();
    expect(audio.play('commit')).toBe(false);
    const pending = audio.enable();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(load).not.toHaveBeenCalled();
    await pending;
    expect(audio.status).toBe('ready');
    expect(nodes).toHaveLength(1);
    expect(params.slice(0, 3).map(({ value }) => value)).toEqual([1, 0.1, 0.8]);
    for (const cue of effectIds) {
      const eventTime = context.currentTime;
      expect(audio.play(cue)).toBe(true);
      expect(nodes.at(-1)!.start).toHaveBeenCalledExactlyOnceWith(eventTime);
      nodes.at(-1)!.onended!();
      expect(nodes.at(-1)!.disconnect).toHaveBeenCalledOnce();
    }
    const notifications = changed.mock.calls.length;
    await Promise.all([audio.enable(), audio.enable()]);
    expect(changed).toHaveBeenCalledTimes(notifications);
    expect(createContext).toHaveBeenCalledOnce();
    expect(load.mock.calls.map(([id]) => id)).toEqual([
      'menu-theme', 'transition-era-television-studio-theme', ...effectIds,
    ]);
    expect(nodes.filter((node) => node.loop)).toHaveLength(1);
    audio.dispose();
    expect(context.close).toHaveBeenCalledOnce();
  });

  test('Ogg failure selects MP3, while both failures produce silent fallback and permit retry', async () => {
    const { audio, load, context } = audioHarness();
    load.mockImplementation(async (_id, format) => {
      if (format === 'ogg') throw new Error('unsupported');
      return new ArrayBuffer(1);
    });
    await audio.enable();
    expect(audio.status).toBe('ready');
    expect(load.mock.calls.map(([, format]) => format)).toEqual(Array.from({ length: 11 }, () => ['ogg', 'mp3']).flat());
    audio.dispose();
    const failed = audioHarness();
    failed.load.mockRejectedValue(new Error('missing'));
    await failed.audio.enable();
    expect(failed.audio.status).toBe('unavailable');
    expect(failed.audio.play('commit')).toBe(false);
    expect(failed.context.close).toHaveBeenCalledOnce();
    failed.load.mockResolvedValue(new ArrayBuffer(1));
    await failed.audio.enable();
    expect(failed.audio.status).toBe('ready');
    failed.audio.dispose();
    expect(context.close).toHaveBeenCalledOnce();
  });

  test('equal-power crossfade and exit stop all old sources within 300 ms', async () => {
    const { audio, context, nodes, params } = audioHarness();
    await audio.enable();
    context.currentTime += 1;
    audio.setScene('transition-era-television-studio');
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.stop).toHaveBeenCalledExactlyOnceWith(11.3);
    const outgoing = params[3]!.curves.at(-1)!;
    const incoming = params[4]!.curves.at(-1)!;
    for (let index = 0; index < incoming.length; index++) {
      expect(incoming[index]! ** 2 + outgoing[index]! ** 2).toBeCloseTo(1, 6);
    }
    nodes[0]!.onended!();
    context.currentTime += 1;
    audio.setScene(null);
    expect(nodes[1]!.stop).toHaveBeenCalledExactlyOnceWith(12.3);
    nodes[1]!.onended!();
    expect(nodes.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
    audio.dispose();
  });

  test('mute sets exact zero and never restarts a source; silent scene changes create no sources', async () => {
    const { audio, nodes, params } = audioHarness();
    await audio.enable();
    audio.configure({ ...defaultSettings, masterVolume: 0 });
    expect(params[0]!.value).toBe(0);
    expect(audio.play('commit')).toBe(false);
    await audio.enable();
    expect(nodes).toHaveLength(1);
    audio.configure(defaultSettings);
    expect(nodes).toHaveLength(1);
    audio.configure({ ...defaultSettings, musicVolume: 0, effectsVolume: 0 });
    expect(params[1]!.value).toBe(0); expect(params[2]!.value).toBe(0);
    audio.setScene('transition-era-television-studio');
    expect(nodes).toHaveLength(1);
    audio.configure(defaultSettings);
    expect(nodes).toHaveLength(2);
    audio.dispose();
  });

  test('disposal during decode prevents late playback or state updates', async () => {
    const { audio, load, nodes, changed } = audioHarness();
    let finish!: (value: ArrayBuffer) => void;
    load.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = audio.enable();
    await Promise.resolve();
    audio.dispose();
    const calls = changed.mock.calls.length;
    finish(new ArrayBuffer(1));
    await pending;
    expect(nodes).toHaveLength(0); expect(changed).toHaveBeenCalledTimes(calls);
    expect(audio.status).toBe('idle');
    await audio.enable();
    expect(nodes).toHaveLength(0);
  });

  test('rapid scene replacement retires every interrupted loop once', async () => {
    const { audio, context, nodes, params } = audioHarness();
    await audio.enable();
    context.currentTime += 0.05;
    audio.setScene('transition-era-television-studio');
    const fade = params[3]!.curves.at(-1)!;
    expect(fade[0]).toBeCloseTo(Math.sin(0.05 / 0.3 * Math.PI / 2));
    // The interrupted fade-in curve cannot be removed, and Firefox rejects any
    // event scheduled during it, so the replacement fade starts when it ends.
    expect(params[3]!.cancelScheduledValues).toHaveBeenLastCalledWith(10.3);
    expect(nodes[0]!.stop).toHaveBeenCalledOnce();
    expect(nodes[0]!.stop.mock.calls[0]![0]).toBeCloseTo(10.6, 6);
    context.currentTime += 0.05;
    audio.setScene('menu');
    context.currentTime += 0.05;
    audio.setScene(null);
    for (const node of nodes) {
      expect(node.stop).toHaveBeenCalledOnce();
      expect(node.stop.mock.calls[0]![0]).toBeLessThanOrEqual(
        context.currentTime + 2 * 0.3,
      );
      node.onended!();
      expect(node.disconnect).toHaveBeenCalledOnce();
    }
    audio.dispose();
  });

  test('a late repeated-resume rejection cannot change a disposed adapter', async () => {
    const { audio, context, load, changed } = audioHarness();
    let finish!: (value: ArrayBuffer) => void;
    let rejectResume!: (reason: Error) => void;
    load.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = audio.enable();
    await Promise.resolve();
    context.resume.mockReturnValue(new Promise((_, reject) => { rejectResume = reject; }));
    const repeated = audio.enable();
    audio.dispose();
    const calls = changed.mock.calls.length;
    rejectResume(new Error('old context'));
    finish(new ArrayBuffer(1));
    await Promise.all([pending, repeated]);
    expect(audio.status).toBe('idle'); expect(changed).toHaveBeenCalledTimes(calls);
  });

  test('unavailable construction and rejected resume leave no orphan source', async () => {
    const first = audioHarness();
    first.createContext.mockImplementation(() => { throw new Error('unsupported'); });
    await first.audio.enable();
    expect(first.audio.status).toBe('unavailable');
    const second = audioHarness();
    second.context.resume.mockRejectedValue(new Error('denied'));
    await second.audio.enable();
    expect(second.audio.status).toBe('unavailable');
    expect(second.nodes).toHaveLength(0);
    expect(second.context.close).toHaveBeenCalledOnce();
  });
});
