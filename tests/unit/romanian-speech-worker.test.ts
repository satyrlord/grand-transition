import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from '../../src/audio/speech-port';

const state = vi.hoisted(() => ({ models: [] as Uint8Array[] }));
vi.mock('onnxruntime-web/ort-wasm-simd-threaded.mjs?url&no-inline', () => ({ default: '/grand-transition/assets/runtime.mjs' }));
vi.mock('espeak-phonemizer', () => ({ initialize: async () => {}, setVoice: async () => {},
  getPhonemes: () => [{ phonemes: 'a', terminator: '' }] }));
vi.mock('onnxruntime-web/wasm', () => ({
  env: { wasm: {} },
  Tensor: class { constructor(public type: string, public data: unknown, public dims: number[]) {} dispose() {} },
  InferenceSession: { create: async (model: Uint8Array) => {
    state.models.push(model);
    return { inputNames: ['input', 'input_lengths', 'scales'],
      run: async ({ input }: { input: { data: BigInt64Array } }) => ({
        output: { data: new Float32Array(input.data.length * 256).fill(0.1), dispose() {} },
        phoneme_durations: { data: new Float32Array(input.data.length).fill(1), dispose() {} },
      }) };
  } },
}));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
  state.models.length = 0;
});

async function harness(cachedManifest?: unknown) {
  const origin = 'http://127.0.0.1:4173';
  const base = `${origin}/grand-transition/tts/ro/`;
  const config = json({ audio: { sample_rate: 22050 }, espeak: { voice: 'ro' },
    phoneme_id_map: { '^': [1], '_': [2], '$': [3], a: [4] },
    inference: { noise_scale: 0.667, length_scale: 1, noise_w: 0.8 } });
  const files = new Map([
    ['mihai/model.onnx', new Uint8Array([1, 2, 3])],
    ['liana/model-01.bin', new Uint8Array([4, 5])],
    ['liana/model-02.bin', new Uint8Array([6, 7])],
    ['mihai/config.json', config], ['liana/config.json', config],
    ['../piper/ort-wasm-simd-threaded.wasm', new Uint8Array([8])],
  ]);
  const manifest = {
    sampleRate: 22050, samplesPerDurationFrame: 256,
    runtime: { path: '../piper/ort-wasm-simd-threaded.wasm', bytes: 1, sha256: hash(new Uint8Array([8])) },
    voices: [
      { id: 'ro_RO-mihai-medium', name: 'Mihai', lang: 'ro-RO', speakerId: 0, default: true,
        model: { files: ['mihai/model.onnx'], bytes: 3, sha256: hash(new Uint8Array([1, 2, 3])) }, config: 'mihai/config.json' },
      { id: 'ro_RO-liana-high', name: 'Liana', lang: 'ro-RO', speakerId: 0, default: false,
        model: { files: ['liana/model-01.bin', 'liana/model-02.bin'], bytes: 4, sha256: hash(new Uint8Array([4, 5, 6, 7])) }, config: 'liana/config.json' },
    ],
    files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: hash(bytes) })),
  };
  const messages: NeuralSpeechMessage[] = [];
  const fetched: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: URL, options: RequestInit) => {
    expect(url.origin).toBe(origin);
    const file = [...files.keys(), 'manifest.json'].find((name) => new URL(name, base).href === url.href);
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error' });
    if (file !== 'manifest.json') expect(options.cache).toBe('force-cache');
    fetched.push(file ?? url.href);
    const bytes = file === 'manifest.json'
      ? json(options.cache === 'force-cache' && cachedManifest ? cachedManifest : manifest)
      : files.get(file ?? '');
    return new Response(bytes ? new Uint8Array(bytes) : null, { status: bytes ? 200 : 404 });
  }));
  vi.stubGlobal('location', { origin, href: `${origin}/grand-transition/assets/worker.js` });
  vi.stubGlobal('postMessage', (message: NeuralSpeechMessage) => messages.push(message));
  vi.stubGlobal('onmessage', null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('../../src/audio/romanian-speech-worker');
  const send = (data: NeuralSpeechCommand) =>
    (globalThis.onmessage as unknown as (event: MessageEvent) => void)({ data } as MessageEvent);
  const ready = async () => {
    send({ type: 'load', baseUrl: base });
    await vi.waitFor(() => expect(messages.some(({ type }) => type === 'ready')).toBe(true));
  };
  const speak = (voiceId = 'ro_RO-liana-high', id = 1) =>
    send({ type: 'synthesize', id, segments: ['Public'], voiceId, rate: 1, pitch: 1 });
  return { ready, speak, manifest, messages, fetched, files };
}

test('revalidates a cached package manifest so a deployed voice change loads the current model', async () => {
  const h = await harness({ sampleRate: 22050, samplesPerDurationFrame: 256,
    voices: [{ id: 'ro_RO-liana-medium', default: true, lang: 'ro-RO', model: 'liana/model.onnx' }] });
  await h.ready();
  expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/grand-transition/tts/ro/manifest.json' }),
    expect.objectContaining({ cache: 'no-cache' }));
  h.speak();
  await vi.waitFor(() => expect(h.messages.some(({ type }) => type === 'speech')).toBe(true));
  expect(state.models.map((model) => Array.from(model))).toEqual([[4, 5, 6, 7]]);
});

test.each([
  ['ro_RO-mihai-medium', [1, 2, 3], ['mihai/model.onnx']],
  ['ro_RO-liana-high', [4, 5, 6, 7], ['liana/model-01.bin', 'liana/model-02.bin']],
] as const)('loads only %s on demand and supplies its exact assembled model to inference', async (voice, bytes, paths) => {
  const h = await harness();
  await h.ready();
  expect(h.fetched.some((path) => path.includes('model'))).toBe(false);
  h.speak(voice);
  await vi.waitFor(() => expect(h.messages.some(({ type }) => type === 'speech')).toBe(true));
  expect(state.models.map((model) => Array.from(model))).toEqual([bytes]);
  expect(h.fetched.filter((path) => path.includes('model'))).toEqual(paths);
  const progress = h.messages.filter((message) => message.type === 'progress');
  expect(progress.at(-1)).toEqual({ type: 'progress', loaded: bytes.length, total: bytes.length });
  expect(progress.every((message, index) => message.total === bytes.length &&
    (index === 0 || message.loaded >= progress[index - 1]!.loaded))).toBe(true);
  h.speak(voice, 2);
  await vi.waitFor(() => expect(h.messages.filter(({ type }) => type === 'speech')).toHaveLength(2));
  expect(state.models).toHaveLength(1);
  expect(h.fetched.filter((path) => path.includes('model'))).toEqual(paths);
});

test.each(['missing', 'corrupt', 'unmanifested', 'reordered', 'wrong-size', 'wrong-digest'] as const)(
  'rejects %s model parts before creating an inference session', async (failure) => {
    const h = await harness();
    if (failure === 'missing') h.files.delete('liana/model-02.bin');
    if (failure === 'corrupt') h.files.set('liana/model-02.bin', new Uint8Array([9, 9]));
    if (failure === 'unmanifested') h.manifest.files = h.manifest.files.filter(({ path }) => path !== 'liana/model-02.bin');
    if (failure === 'reordered') h.manifest.voices[1]!.model.files.reverse();
    if (failure === 'wrong-size') h.manifest.voices[1]!.model.bytes = 5;
    if (failure === 'wrong-digest') h.manifest.voices[1]!.model.sha256 = 'f'.repeat(64);
    await h.ready();
    h.speak();
    await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: 1 }));
    expect(state.models).toHaveLength(0);
    expect(h.messages.some(({ type }) => type === 'speech')).toBe(false);
  },
);
