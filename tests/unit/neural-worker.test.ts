import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from '../../src/audio/speech-port';

const inference = vi.hoisted(() => ({ inputs: [] as Array<{ input_ids: { data: BigInt64Array }; pitch: { data: Float32Array } }> }));
vi.mock('phonemizer', () => ({ phonemize: async (text: string) => [text.trim().toLowerCase()] }));
vi.mock('onnxruntime-web/wasm', () => ({
  env: { wasm: {} },
  Tensor: class { constructor(public type: string, public data: unknown, public dims: number[]) {} },
  InferenceSession: { create: async () => ({ run: async (input: typeof inference.inputs[number]) => {
    inference.inputs.push(input);
    return { waveform: { data: new Float32Array(input.input_ids.data.length * 600).fill(0.1), dispose() {} },
      '/encoder/Clip_output_0': { data: new Float32Array(input.input_ids.data.length).fill(1), dispose() {} } };
  } }) },
}));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); inference.inputs.length = 0; });

async function workerHarness() {
  const origin = 'http://127.0.0.1:4173';
  const base = origin + '/grand-transition/tts/kokoro/';
  const vocabulary = Object.fromEntries(Array.from(' abcdefghijklmnopqrstuvwxyz.,!?').map((letter, index) => [letter, index + 1]));
  const files = new Map<string, Uint8Array>([
    ['model.onnx', new Uint8Array([1, 2, 3])],
    ['vocabulary.json', new TextEncoder().encode(JSON.stringify(vocabulary))],
    ['am_michael.bin', new Uint8Array(510 * 256 * 4)],
  ]);
  const manifest = { sampleRate: 24000, samplesPerDurationFrame: 600,
    voices: [{ id: 'am_michael', name: 'Michael', lang: 'en-US' }],
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
  h.send({ type: 'synthesize', id: 7, segments, voiceId: 'am_michael', rate: 1, pitch: 0.9 });
  await vi.waitFor(() => expect(h.messages.some((message) => message.type === 'speech')).toBe(true));
  expect(inference.inputs.length).toBeGreaterThan(1);
  expect(inference.inputs.every((input) => input.input_ids.data.length <= 512)).toBe(true);
  const actualTokens = inference.inputs.reduce((sum, input) => sum + input.input_ids.data.length - 2, 0);
  expect(actualTokens).toBe(segments.join(' ').length);
  const audio = h.messages.find((message) => message.type === 'speech')!;
  expect(audio.markers.map((marker) => marker.index)).toEqual([0, 1]);
  expect(audio.markers[1]!.seconds).toBeGreaterThan(audio.markers[0]!.seconds);
  expect(audio.samples.length).toBe((actualTokens + inference.inputs.length * 2) * 600);
  expect(inference.inputs[0]!.pitch.data[0]).toBeCloseTo(0.9);
});

test('corrupt local resources fail initialization before inference', async () => {
  const h = await workerHarness(); h.files.set('model.onnx', new Uint8Array([4, 5, 6]));
  h.send({ type: 'load', baseUrl: h.base });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(inference.inputs).toHaveLength(0);
});

test('a remote model base is rejected without any request', async () => {
  const h = await workerHarness(); h.send({ type: 'load', baseUrl: 'https://network.invalid/tts/kokoro/' });
  await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'error', id: null }));
  expect(h.fetch).not.toHaveBeenCalled();
});
