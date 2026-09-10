import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from '../../src/audio/speech-port';

const state = vi.hoisted(() => ({ manifest: {} as unknown, gpu: true, warmupFailure: false,
  inputs: [] as Array<{ input_ids: { data: BigInt64Array }; pitch: { data: Float32Array }; speed: { data: Float32Array } }>,
}));
vi.mock('../../src/audio/kokoro-gpu-manifest.json', () => ({ default: state.manifest }));
vi.mock('onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url&no-inline', () => ({ default: '/grand-transition/tts/kokoro-gpu/ort-wasm-simd-threaded.asyncify.mjs' }));
vi.mock('phonemizer', () => ({ phonemize: async (text: string) => [text.trim().toLowerCase()] }));
vi.mock('onnxruntime-web/webgpu', () => ({
  env: { wasm: {}, webgpu: { get device() { return state.gpu ? { queue: {} } : undefined; } } },
  Tensor: class { constructor(public type: string, public data: unknown, public dims: number[]) {} dispose() {} },
  InferenceSession: { create: async (_model: unknown, options: unknown) => {
    expect(options).toEqual({ executionProviders: ['webgpu'] });
    return { run: async (input: typeof state.inputs[number]) => {
      state.inputs.push(input);
      if (state.warmupFailure) throw new Error('Internal private failure details');
      return { waveform: { data: new Float32Array(input.input_ids.data.length * 600).fill(0.1), dispose() {} },
        '/encoder/Clip_output_0': { data: new Float32Array(input.input_ids.data.length).fill(1), dispose() {} } };
    } };
  } },
}));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); state.inputs.length = 0; state.gpu = true; state.warmupFailure = false; });
async function harness() {
  const origin = 'http://127.0.0.1:4173';
  const base = origin + '/grand-transition/tts/kokoro-gpu/';
  const files = new Map<string, Uint8Array>([
    ['model-01.bin', new Uint8Array([1, 2, 3])],
    ['vocabulary.json', new TextEncoder().encode(JSON.stringify(Object.fromEntries(Array.from(' abcdefghijklmnopqrstuvwxyz.!').map((letter, index) => [letter, index + 1]))))],
    ['bm_george.bin', new Uint8Array(510 * 256 * 4)], ['bf_emma.bin', new Uint8Array(510 * 256 * 4)],
    ['ort-wasm-simd-threaded.asyncify.mjs', new Uint8Array([4])],
    ['ort-wasm-simd-threaded.asyncify.wasm', new Uint8Array([5])],
  ]);
  const manifest = { modelBytes: 3, modelSha256: hash(files.get('model-01.bin')!), shards: ['model-01.bin'],
    runtimeModule: { path: 'ort-wasm-simd-threaded.asyncify.mjs', bytes: 1, sha256: hash(new Uint8Array([4])) },
    voices: [{ id: 'bm_george', name: 'George', lang: 'en-GB', default: true }, { id: 'bf_emma', name: 'Emma', lang: 'en-GB', default: false }],
    files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: hash(bytes) })),
  };
  state.manifest = manifest;
  files.set('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
  const messages: NeuralSpeechMessage[] = [];
  const fetch = vi.fn(async (url: URL, options: RequestInit) => {
    expect(url.href.startsWith(base)).toBe(true);
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error' });
    const bytes = files.get(url.pathname.split('/').at(-1)!);
    return new Response(bytes ? new Uint8Array(bytes) : null, { status: bytes ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('navigator', { gpu: { requestAdapter: async () => ({ requestDevice: async () => ({ destroy() {} }) }) } });
  vi.stubGlobal('location', { origin, href: origin + '/grand-transition/assets/worker.js' });
  vi.stubGlobal('postMessage', (message: NeuralSpeechMessage) => messages.push(message));
  vi.stubGlobal('onmessage', null);
  await import('../../src/audio/kokoro-gpu-worker');
  const send = (data: NeuralSpeechCommand) => (globalThis.onmessage as unknown as (event: MessageEvent) => void)({ data } as MessageEvent);
  expect(messages).toEqual([{ type: 'booted' }]);
  expect(fetch).not.toHaveBeenCalled();
  return { send, messages, files, fetch, base };
}

test('requires explicit loading, discards warmup PCM, and preserves pitch, tokens, and duration markers', async () => {
  const h = await harness(); h.send({ type: 'load', baseUrl: h.base });
  await vi.waitFor(() => expect(h.messages.some(message => message.type === 'ready')).toBe(true));
  expect(state.inputs).toHaveLength(1);
  expect(h.messages.some(message => message.type === 'speech')).toBe(false);
  state.inputs.length = 0;
  const segments = ['office '.repeat(110).trim(), 'failed.'];
  h.send({ type: 'synthesize', id: 7, segments, voiceId: 'bf_emma', rate: 1.2, pitch: 0.9 });
  await vi.waitFor(() => expect(h.messages.some(message => message.type === 'speech')).toBe(true));
  const audio = h.messages.find(message => message.type === 'speech')!;
  expect(audio.playbackRate).toBe(1);
  expect(audio.sampleRate).toBe(24000);
  expect(audio.markers.map(marker => marker.index)).toEqual([0, 1]);
  expect(audio.markers[1]!.seconds).toBeGreaterThan(audio.markers[0]!.seconds);
  expect(state.inputs.every(input => input.input_ids.data.length <= 512)).toBe(true);
  expect(state.inputs.reduce((sum, input) => sum + input.input_ids.data.length - 2, 0)).toBe(segments.join(' ').length);
  expect(state.inputs[0]!.pitch.data[0]).toBeCloseTo(0.9);
  expect(state.inputs[0]!.speed.data[0]).toBeCloseTo(1.2);
});

test.each(['missing-gpu', 'cpu-session', 'warmup', 'corrupt-shard', 'remote-origin'])('fails closed for %s without private diagnostics', async mode => {
  const h = await harness();
  if (mode === 'missing-gpu') vi.stubGlobal('navigator', {});
  if (mode === 'cpu-session') state.gpu = false;
  if (mode === 'warmup') state.warmupFailure = true;
  if (mode === 'corrupt-shard') h.files.set('model-01.bin', new Uint8Array([9, 9, 9]));
  h.send({ type: 'load', baseUrl: mode === 'remote-origin' ? 'https://invalid.test/tts/kokoro-gpu/' : h.base });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(h.messages.some(message => message.type === 'ready' || message.type === 'speech')).toBe(false);
  expect(h.messages.filter(message => message.type === 'error')).toEqual([{ type: 'error', id: null }]);
  if (mode !== 'warmup') expect(state.inputs).toHaveLength(0);
  if (mode === 'remote-origin' || mode === 'missing-gpu') expect(h.fetch).not.toHaveBeenCalled();
});
