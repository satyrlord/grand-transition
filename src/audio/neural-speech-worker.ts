import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';
import { phonemize } from 'phonemizer';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from './speech-port';
import runtimeModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url&no-inline';

type Manifest = {
  sampleRate: number;
  samplesPerDurationFrame: number;
  voices: { id: string; name: string; lang: string }[];
  files: { path: string; bytes: number; sha256: string }[];
};
const worker = globalThis as unknown as {
  location: Location;
  onmessage: ((event: MessageEvent<NeuralSpeechCommand>) => void) | null;
  postMessage(message: NeuralSpeechMessage, transfer?: Transferable[]): void;
};
let base: URL;
let manifest: Manifest;
let vocabulary: Record<string, number>;
let session: InferenceSession;
let loading: Promise<void> | null = null;
let queue = Promise.resolve();
const styles = new Map<string, Float32Array>();

async function readAsset(name: string, measured = false): Promise<ArrayBuffer> {
  if (!/^[a-zA-Z0-9_.-]+$/u.test(name)) throw new Error('Invalid neural asset name.');
  const url = new URL(name, base);
  if (url.origin !== worker.location.origin) throw new Error('Neural assets must use the application origin.');
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: 'force-cache' });
  if (!response.ok) throw new Error('The neural asset is unavailable.');
  const record = manifest?.files.find((file) => file.path === name);
  let bytes: ArrayBuffer;
  if (measured && response.body && record) {
    const data = new Uint8Array(record.bytes);
    const reader = response.body.getReader();
    let loaded = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (loaded + value.length > data.length) throw new Error('Neural asset size mismatch.');
      data.set(value, loaded); loaded += value.length;
      worker.postMessage({ type: 'progress', loaded, total: data.length });
    }
    if (loaded !== data.length) throw new Error('Neural asset is incomplete.');
    bytes = data.buffer;
  } else bytes = await response.arrayBuffer();
  if (record) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== record.bytes || hex !== record.sha256) throw new Error('Neural asset integrity failed.');
  }
  return bytes;
}

async function load(baseUrl: string): Promise<void> {
  base = new URL(baseUrl, worker.location.href);
  if (base.origin !== worker.location.origin || !base.pathname.endsWith('/tts/kokoro/')) {
    throw new Error('Invalid neural asset origin.');
  }
  manifest = JSON.parse(new TextDecoder().decode(await readAsset('manifest.json'))) as Manifest;
  if (manifest.sampleRate !== 24000 || manifest.samplesPerDurationFrame !== 600) throw new Error('Unsupported neural model.');
  vocabulary = JSON.parse(new TextDecoder().decode(await readAsset('vocabulary.json'))) as Record<string, number>;
  env.wasm.numThreads = 1;
  env.wasm.proxy = false;
  env.wasm.wasmPaths = {
    mjs: new URL(runtimeModuleUrl, worker.location.href).href,
    wasm: new URL('ort-wasm-simd-threaded.wasm', base).href,
  };
  session = await InferenceSession.create(await readAsset('model.onnx', true), { executionProviders: ['wasm'] });
  worker.postMessage({ type: 'ready', voices: manifest.voices.map((voice) => ({
    voiceURI: `kokoro:${voice.id}`, name: voice.name, lang: voice.lang, default: voice.id === 'am_michael',
  })) });
}

async function tokensFor(text: string, language: string): Promise<number[]> {
  // Preserve authored punctuation; the pronunciation converter returns phonemes only.
  const sections = text.replace(/[‘’]/gu, "'").split(/([;:,.!?—…"()]+)/u);
  let phones = '';
  for (const section of sections) {
    if (/^[;:,.!?—…"()]+$/u.test(section)) phones += section;
    else if (section.trim()) phones += (await phonemize(section, language)).join(' ');
  }
  phones = phones.replace(/ʲ/gu, 'j').replace(/r/gu, 'ɹ').replace(/x/gu, 'k').replace(/ɬ/gu, 'l');
  return Array.from(phones).flatMap((phone) => vocabulary[phone] === undefined ? [] : [vocabulary[phone]!]);
}

async function synthesize(request: Extract<NeuralSpeechCommand, { type: 'synthesize' }>) {
  await loading;
  if (!session || !request.segments.length || request.segments.some((text) => typeof text !== 'string')) throw new Error('Invalid speech request.');
  if (!Number.isFinite(request.rate) || request.rate < 0.5 || request.rate > 2 ||
    !Number.isFinite(request.pitch) || request.pitch < 0 || request.pitch > 2) throw new Error('Invalid speech controls.');
  const voice = manifest.voices.find(({ id }) => id === request.voiceId) ?? manifest.voices.find(({ id }) => id === 'am_michael')!;
  let style = styles.get(voice.id);
  if (!style) { style = new Float32Array(await readAsset(`${voice.id}.bin`)); styles.set(voice.id, style); }
  const tokens: number[] = [];
  const starts: { index: number; token: number }[] = [];
  for (const [index, text] of request.segments.entries()) {
    if (tokens.length) tokens.push(vocabulary[' ']!);
    starts.push({ index, token: tokens.length });
    tokens.push(...await tokensFor(text, voice.lang === 'en-GB' ? 'en' : 'en-us'));
  }
  if (!tokens.length) throw new Error('The speech request has no pronounceable text.');
  const chunks: Float32Array[] = [];
  const markers: { index: number; seconds: number }[] = [];
  let cursor = 0;
  let sampleCount = 0;
  while (cursor < tokens.length) {
    let end = Math.min(cursor + 510, tokens.length);
    if (end < tokens.length) {
      const space = tokens.lastIndexOf(vocabulary[' ']!, end - 1);
      if (space > cursor) end = space + 1;
    }
    const part = tokens.slice(cursor, end);
    const ids = BigInt64Array.from([0, ...part, 0].map(BigInt));
    const result = await session.run({
      input_ids: new Tensor('int64', ids, [1, ids.length]),
      style: new Tensor('float32', style.slice(Math.min(part.length, 509) * 256, (Math.min(part.length, 509) + 1) * 256), [1, 256]),
      speed: new Tensor('float32', new Float32Array([request.rate]), [1]),
      pitch: new Tensor('float32', new Float32Array([request.pitch]), [1]),
    });
    const waveform = result.waveform?.data;
    const durations = result['/encoder/Clip_output_0']?.data;
    if (!(waveform instanceof Float32Array) || !(durations instanceof Float32Array) || durations.length !== ids.length) {
      throw new Error('The neural model returned invalid audio or timing.');
    }
    const offsets = [0];
    for (const duration of durations) {
      if (!Number.isInteger(duration) || duration < 1) throw new Error('Invalid phoneme duration.');
      offsets.push(offsets.at(-1)! + duration * 600);
    }
    if (offsets.at(-1) !== waveform.length) throw new Error('Speech timing does not match the generated samples.');
    for (const start of starts) if (start.token >= cursor && start.token < end) {
      markers.push({ index: start.index, seconds: (sampleCount + offsets[start.token - cursor + 1]!) / 24000 });
    }
    const audio = new Float32Array(waveform.length);
    let peak = 1;
    for (const sample of waveform) { if (!Number.isFinite(sample)) throw new Error('Invalid generated audio.'); peak = Math.max(peak, Math.abs(sample)); }
    for (let i = 0; i < waveform.length; i++) audio[i] = waveform[i]! / peak;
    chunks.push(audio); sampleCount += audio.length; cursor = end;
    for (const tensor of Object.values(result)) tensor.dispose();
  }
  const samples = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
  worker.postMessage({ type: 'speech', id: request.id, samples, markers, sampleRate: 24000 }, [samples.buffer]);
}

worker.onmessage = ({ data }) => {
  if (data.type === 'load') {
    loading ??= load(data.baseUrl);
    void loading.catch(() => worker.postMessage({ type: 'error', id: null }));
  } else if (data.type === 'synthesize') {
    queue = queue.then(() => synthesize(data)).catch(() => worker.postMessage({ type: 'error', id: data.id }));
  }
};
worker.postMessage({ type: 'booted' });
