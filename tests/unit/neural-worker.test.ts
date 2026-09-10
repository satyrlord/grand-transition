import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from '../../src/audio/speech-port';

const inference = vi.hoisted(() => ({ inputs: [] as Array<{ input: { data: BigInt64Array }; scales: { data: Float32Array } }> }));
vi.mock('phonemizer', () => ({ phonemize: async (text: string) => [text.trim().toLowerCase()] }));
vi.mock('onnxruntime-web/wasm', () => ({
  env: { wasm: {} },
  Tensor: class { constructor(public type: string, public data: unknown, public dims: number[]) {} dispose() {} },
  InferenceSession: { create: async () => ({ run: async (input: typeof inference.inputs[number]) => {
    inference.inputs.push(input);
    return { output: { data: new Float32Array(input.input.data.length * 256).fill(0.1), dispose() {} },
      'phoneme_durations': { data: new Float32Array(input.input.data.length).fill(1), dispose() {} } };
  } }) },
}));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); inference.inputs.length = 0; });

async function workerHarness() {
  const origin = 'http://127.0.0.1:4173';
  const base = origin + '/grand-transition/tts/piper/';
  const vocabulary = Object.fromEntries(Array.from('_^$ abcdefghijklmnopqrstuvwxyz.,!?').map((letter, index) => [letter, [index]]));
  const files = new Map<string, Uint8Array>([
    ['model.onnx', new Uint8Array([1, 2, 3])],
    ['config.json', new TextEncoder().encode(JSON.stringify({ audio: { sample_rate: 22050 }, espeak: { voice: 'en' }, phoneme_id_map: vocabulary, inference: { noise_scale: 0.333, length_scale: 1, noise_w: 0.333 } }))],
    ['ort-wasm-simd-threaded.wasm', new Uint8Array([4, 5, 6])],
  ]);
  const manifest = { sampleRate: 22050, samplesPerDurationFrame: 256,
    voices: [{ id: 'vctk-p226', name: 'Piper male', lang: 'en-GB', speakerId: 95, default: true }],
    files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') })),
  };
  files.set('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
  const messages: NeuralSpeechMessage[] = [];
  const fetch = vi.fn(async (url: URL, options: RequestInit) => {
    expect(url.href.startsWith(base)).toBe(true);
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error' });
    const bytes = files.get(url.pathname.split('/').at(-1)!);
    return new Response(bytes ? new Uint8Array(bytes) : null, { status: bytes ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('location', { origin, href: origin + '/grand-transition/assets/worker.js' });
  vi.stubGlobal('postMessage', (message: NeuralSpeechMessage) => messages.push(message));
  vi.stubGlobal('onmessage', null);
  await import('../../src/audio/neural-speech-worker');
  const send = (data: NeuralSpeechCommand) => {
    const handler = globalThis.onmessage as unknown as (event: MessageEvent) => void;
    handler({ data } as MessageEvent);
  };
  expect(messages).toEqual([{ type: 'booted' }]);
  return { send, messages, files, fetch, base };
}

test('long public speech crosses model chunks without losing tokens or segment markers', async () => {
  const h = await workerHarness(); h.send({ type: 'load', baseUrl: h.base });
  await vi.waitFor(() => expect(h.messages.some((message) => message.type === 'ready')).toBe(true));
  const segments = ['office '.repeat(110).trim(), 'failed.'];
  h.send({ type: 'synthesize', id: 7, segments, voiceId: 'vctk-p226', rate: 1, pitch: 0.9 });
  await vi.waitFor(() => expect(h.messages.some((message) => message.type === 'speech')).toBe(true));
  expect(inference.inputs.length).toBeGreaterThan(1);
  expect(inference.inputs.every((input) => input.input.data.length <= 512)).toBe(true);
  const actualTokens = inference.inputs.reduce((sum, input) => sum + (input.input.data.length - 3) / 2, 0);
  expect(actualTokens).toBe(segments.join(' ').length);
  const audio = h.messages.find((message) => message.type === 'speech')!;
  expect(audio.markers.map((marker) => marker.index)).toEqual([0, 1]);
  expect(audio.markers[1]!.seconds).toBeGreaterThan(audio.markers[0]!.seconds);
  expect(audio.samples.length).toBe((actualTokens * 2 + inference.inputs.length * 3) * 256);
  expect(inference.inputs[0]!.scales.data[1]).toBeCloseTo(0.9);
});

test.each(['model.onnx', 'ort-wasm-simd-threaded.wasm'])('corrupt local %s fails initialization before inference', async (file) => {
  const h = await workerHarness(); h.files.set(file, new Uint8Array([9, 9, 9]));
  h.send({ type: 'load', baseUrl: h.base });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(inference.inputs).toHaveLength(0);
});

test('a remote model base is rejected without any request', async () => {
  const h = await workerHarness(); h.send({ type: 'load', baseUrl: 'https://network.invalid/tts/piper/' });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(h.fetch).not.toHaveBeenCalled();
});

test('a model base with URL state is rejected without any request', async () => {
  const h = await workerHarness(); h.send({ type: 'load', baseUrl: `${h.base}?variant=remote` });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(h.fetch).not.toHaveBeenCalled();
});
