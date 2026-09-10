import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';
import { phonemize } from 'phonemizer';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from './speech-port';
import runtimeModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url&no-inline';
import { piperControls, piperInput, piperMarkers } from './piper-text';

type Manifest = {
  sampleRate: number;
  samplesPerDurationFrame: number;
  voices: { id: string; name: string; lang: string; speakerId: number; default: boolean }[];
  files: { path: string; bytes: number; sha256: string }[];
};
const worker = globalThis as unknown as {
  location: Location;
  onmessage: ((event: MessageEvent<NeuralSpeechCommand>) => void) | null;
  postMessage(message: NeuralSpeechMessage, transfer?: Transferable[]): void;
};
let base: URL;
let manifest: Manifest;
let config: { audio: { sample_rate: number }; espeak: { voice: string }; phoneme_id_map: Record<string, number[]>;
  inference: { noise_scale: number; length_scale: number; noise_w: number } };
let session: InferenceSession;
let loading: Promise<void> | null = null;
let queue = Promise.resolve();

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
  if (base.origin !== worker.location.origin || !base.pathname.endsWith('/tts/piper/') || base.search || base.hash) {
    throw new Error('Invalid neural asset origin.');
  }
  manifest = JSON.parse(new TextDecoder().decode(await readAsset('manifest.json'))) as Manifest;
  if (manifest.sampleRate !== 22050 || manifest.samplesPerDurationFrame !== 256) throw new Error('Unsupported neural model.');
  config = JSON.parse(new TextDecoder().decode(await readAsset('config.json'))) as typeof config;
  if (config.audio.sample_rate !== manifest.sampleRate || Object.values(config.phoneme_id_map).some(ids => ids.length !== 1)) throw new Error('Unsupported phoneme map.');
  env.wasm.numThreads = 1;
  env.wasm.proxy = false;
  env.wasm.wasmPaths = {
    mjs: new URL(runtimeModuleUrl, worker.location.href).href,
    wasm: new URL('ort-wasm-simd-threaded.wasm', base).href,
  };
  env.wasm.wasmBinary = await readAsset('ort-wasm-simd-threaded.wasm');
  session = await InferenceSession.create(await readAsset('model.onnx', true), { executionProviders: ['wasm'] });
  worker.postMessage({ type: 'ready', voices: manifest.voices.map((voice) => ({
    voiceURI: `piper:${voice.id}`, name: voice.name, lang: voice.lang, default: voice.default,
  })) });
}

async function phonesFor(text: string): Promise<string> {
  // Preserve authored punctuation; the pronunciation converter returns phonemes only.
  const sections = text.replace(/[‘’]/gu, "'").replace(/[—–]/gu, '-').replace(/…/gu, '...').split(/([;:,.!?"()-]+)/u);
  let phones = '';
  for (const section of sections) {
    if (/^[;:,.!?"()-]+$/u.test(section)) phones += section;
    else if (section.trim()) phones += (await phonemize(section, config.espeak.voice)).join(' ');
  }
  return phones;
}

async function synthesize(request: Extract<NeuralSpeechCommand, { type: 'synthesize' }>) {
  await loading;
  if (!session || !request.segments.length || request.segments.some((text) => typeof text !== 'string')) throw new Error('Invalid speech request.');
  const { playbackRate, durationScale } = piperControls(request.rate, request.pitch);
  const voice = manifest.voices.find(({ id }) => id === request.voiceId) ?? manifest.voices[0]!;
  const phones: string[] = [];
  const starts: { index: number; phone: number }[] = [];
  for (const [index, text] of request.segments.entries()) {
    if (phones.length) phones.push(' ');
    starts.push({ index, phone: phones.length });
    phones.push(...Array.from(await phonesFor(text)));
  }
  if (!phones.length) throw new Error('The speech request has no pronounceable text.');
  const chunks: Float32Array[] = [];
  const markers: { index: number; seconds: number }[] = [];
  let cursor = 0;
  let sampleCount = 0;
  while (cursor < phones.length) {
    let end = Math.min(cursor + 240, phones.length);
    if (end < phones.length) {
      const space = phones.lastIndexOf(' ', end - 1);
      if (space > cursor) end = space + 1;
    }
    const { ids } = piperInput([phones.slice(cursor, end).join('')], config.phoneme_id_map);
    const feeds = {
      input: new Tensor('int64', BigInt64Array.from(ids), [1, ids.length]),
      input_lengths: new Tensor('int64', new BigInt64Array([BigInt(ids.length)]), [1]),
      scales: new Tensor('float32', new Float32Array([config.inference.noise_scale,
        config.inference.length_scale * durationScale, config.inference.noise_w]), [3]),
      sid: new Tensor('int64', new BigInt64Array([BigInt(voice.speakerId)]), [1]),
    };
    const result = await session.run(feeds);
    const waveform = result.output?.data;
    const durations = result.phoneme_durations?.data;
    if (!(waveform instanceof Float32Array) || !(durations instanceof Float32Array) || durations.length !== ids.length) {
      throw new Error('The neural model returned invalid audio or timing.');
    }
    const inside = starts.filter(start => start.phone >= cursor && start.phone < end);
    const timing = piperMarkers(durations, inside.map(start => 2 + (start.phone - cursor) * 2),
      waveform.length, manifest.sampleRate, playbackRate);
    for (const [index, marker] of timing.entries()) markers.push({ index: inside[index]!.index,
      seconds: sampleCount / manifest.sampleRate / playbackRate + marker.seconds });
    let peak = 1;
    for (const sample of waveform) {
      if (!Number.isFinite(sample)) throw new Error('Invalid generated audio.');
      peak = Math.max(peak, Math.abs(sample));
    }
    const audio = Float32Array.from(waveform, sample => sample / peak);
    chunks.push(audio); sampleCount += audio.length; cursor = end;
    for (const tensor of [...Object.values(result), ...Object.values(feeds)]) tensor.dispose();
  }
  const samples = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
  worker.postMessage({ type: 'speech', id: request.id, samples, markers, sampleRate: manifest.sampleRate, playbackRate }, [samples.buffer]);
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
