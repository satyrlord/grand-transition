// Romanian neural speech worker.
//
// Mirrors neural-speech-worker.ts but for the spec-029 Romanian package: it
// phonemizes with eSpeak NG carrying Liana's patched Romanian dictionary and it
// loads a voice's weights only when that voice is first asked to speak, so a
// match that uses one voice never fetches the other.
//
// Everything is served from the application origin. The pronunciation runtime
// is told where its data lives so it cannot fall back to a public CDN.

import { getPhonemes, initialize as initializePhonemizer, setVoice } from 'espeak-phonemizer';
import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';
import runtimeModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url&no-inline';
import type { NeuralSpeechCommand, NeuralSpeechMessage } from './speech-port';
import { assertIntegrity, readExactBody } from './asset-integrity';
import { piperControls, piperInput, piperMarkers } from './piper-text';

type Voice = Readonly<{
  id: string;
  name: string;
  lang: string;
  speakerId: number;
  default: boolean;
  model: { files: string[]; bytes: number; sha256: string };
  config: string;
}>;
type Manifest = Readonly<{
  sampleRate: number;
  samplesPerDurationFrame: number;
  voices: Voice[];
  runtime: { path: string; bytes: number; sha256: string };
  files: { path: string; bytes: number; sha256: string }[];
}>;
type Config = {
  audio: { sample_rate: number };
  espeak: { voice: string };
  phoneme_id_map: Record<string, number[]>;
  inference: { noise_scale: number; length_scale: number; noise_w: number };
};

const worker = globalThis as unknown as {
  location: Location;
  onmessage: ((event: MessageEvent<NeuralSpeechCommand>) => void) | null;
  postMessage(message: NeuralSpeechMessage, transfer?: Transferable[]): void;
};
let base: URL;
let manifest: Manifest;
let loading: Promise<void> | null = null;
let queue = Promise.resolve();
const voices = new Map<string, { session: InferenceSession; config: Config; voice: Voice }>();
const pending = new Map<string, Promise<void>>();

async function read(url: URL, record?: { bytes: number; sha256: string },
  progress?: { offset: number; total: number }): Promise<ArrayBuffer> {
  if (url.origin !== worker.location.origin) throw new Error('Romanian speech assets must use the application origin.');
  // Revalidate the manifest after deployment; only content pinned by its hash
  // can safely reuse a cached response without checking for an update.
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: record ? 'force-cache' : 'no-cache' });
  if (!response.ok) throw new Error('The Romanian speech asset is unavailable.');
  const bytes = progress && response.body && record
    ? await readExactBody(response.body, record.bytes, 'Romanian speech asset', (loaded) => {
      worker.postMessage({ type: 'progress', loaded: progress.offset + loaded, total: progress.total });
    })
    : await response.arrayBuffer();
  if (record) await assertIntegrity(bytes, record, 'Romanian speech asset');
  return bytes;
}

async function load(baseUrl: string): Promise<void> {
  base = new URL(baseUrl, worker.location.href);
  if (base.origin !== worker.location.origin || !base.pathname.endsWith('/tts/ro/') || base.search || base.hash) {
    throw new Error('Invalid Romanian speech asset origin.');
  }
  manifest = JSON.parse(new TextDecoder().decode(await read(new URL('manifest.json', base)))) as Manifest;
  if (manifest.sampleRate !== 22050 || manifest.samplesPerDurationFrame !== 256 || !manifest.voices?.length) {
    throw new Error('Unsupported Romanian speech model.');
  }
  // Point the pronunciation runtime at the shipped data so it never reaches for
  // a public fallback, and select Romanian explicitly.
  await initializePhonemizer(new URL('pronounce/', base).href);
  await setVoice(manifest.voices.find((voice) => voice.default)!.lang.slice(0, 2));
  env.wasm.numThreads = 1;
  env.wasm.proxy = false;
  env.wasm.wasmPaths = {
    mjs: new URL(runtimeModuleUrl, worker.location.href).href,
    wasm: new URL(manifest.runtime.path, base).href,
  };
  env.wasm.wasmBinary = await read(new URL(manifest.runtime.path, base), manifest.runtime);
  worker.postMessage({ type: 'ready', voices: manifest.voices.map((voice) => ({
    voiceURI: `piper:${voice.id}`, name: voice.name, lang: voice.lang, default: voice.default,
  })) });
}

// Weights are fetched the first time a voice speaks, never at package load.
function ensureVoice(voice: Voice): Promise<void> {
  const existing = voices.get(voice.id);
  if (existing) return Promise.resolve();
  const inFlight = pending.get(voice.id);
  if (inFlight) return inFlight;
  const pendingLoad = (async () => {
    const config = JSON.parse(new TextDecoder().decode(
      await read(new URL(voice.config, base), manifest.files.find(({ path }) => path === voice.config)),
    )) as Config;
    if (config.audio.sample_rate !== manifest.sampleRate || config.espeak.voice !== 'ro' ||
      Object.values(config.phoneme_id_map).some((ids) => ids.length !== 1)) {
      throw new Error('Unsupported Romanian voice configuration.');
    }
    const model = new Uint8Array(voice.model.bytes);
    let offset = 0;
    for (const file of voice.model.files) {
      const record = manifest.files.find(({ path }) => path === file);
      if (!record || offset + record.bytes > model.length) throw new Error('Invalid Romanian model inventory.');
      const bytes = new Uint8Array(await read(new URL(file, base), record, { offset, total: model.length }));
      model.set(bytes, offset);
      offset += bytes.length;
    }
    if (offset !== model.length) throw new Error('Romanian model integrity failed.');
    await assertIntegrity(model, { bytes: model.length, sha256: voice.model.sha256 }, 'Romanian model');
    const session = await InferenceSession.create(model, { executionProviders: ['wasm'] });
    voices.set(voice.id, { session, config, voice });
    pending.delete(voice.id);
  })();
  pending.set(voice.id, pendingLoad);
  return pendingLoad;
}

function phonesFor(text: string): string {
  // Preserve authored punctuation; the pronunciation converter returns phonemes only.
  const sections = text.replace(/[‘’]/gu, "'").replace(/[—–]/gu, '-').replace(/…/gu, '...').split(/([;:,.!?"()-]+)/u);
  let phones = '';
  for (const section of sections) {
    if (/^[;:,.!?"()-]+$/u.test(section)) phones += section;
    else if (section.trim()) {
      // getPhonemes is synchronous; only initialize and setVoice are async.
      const spoken = getPhonemes(section);
      phones += spoken.map(({ phonemes, terminator }) => phonemes + terminator).join(' ');
    }
  }
  return phones;
}

async function synthesize(request: Extract<NeuralSpeechCommand, { type: 'synthesize' }>) {
  await loading;
  if (!manifest || !request.segments.length || request.segments.some((text) => typeof text !== 'string')) {
    throw new Error('Invalid speech request.');
  }
  const voice = manifest.voices.find(({ id }) => id === request.voiceId);
  if (!voice) throw new Error('The requested Romanian voice is unavailable.');
  await ensureVoice(voice);
  const loaded = voices.get(voice.id)!;
  const { config } = loaded;
  const { playbackRate, durationScale } = piperControls(request.rate, request.pitch);
  const phones: string[] = [];
  const starts: { index: number; phone: number }[] = [];
  for (const [index, text] of request.segments.entries()) {
    if (phones.length) phones.push(' ');
    starts.push({ index, phone: phones.length });
    phones.push(...Array.from(phonesFor(text)));
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
    // These exports are single-speaker, so the speaker id is only fed to
    // a graph that declares it: the runtime rejects an undeclared input.
    const feeds = {
      input: new Tensor('int64', BigInt64Array.from(ids), [1, ids.length]),
      input_lengths: new Tensor('int64', new BigInt64Array([BigInt(ids.length)]), [1]),
      scales: new Tensor('float32', new Float32Array([config.inference.noise_scale,
        config.inference.length_scale * durationScale, config.inference.noise_w]), [3]),
      ...(loaded.session.inputNames.includes('sid')
        ? { sid: new Tensor('int64', new BigInt64Array([BigInt(voice.speakerId)]), [1]) }
        : {}),
    };
    const result = await loaded.session.run(feeds);
    const waveform = result.output?.data;
    const durations = result.phoneme_durations?.data;
    if (!(waveform instanceof Float32Array) || !(durations instanceof Float32Array) || durations.length !== ids.length) {
      throw new Error('The Romanian model returned invalid audio or timing.');
    }
    const inside = starts.filter((start) => start.phone >= cursor && start.phone < end);
    const timing = piperMarkers(durations, inside.map((start) => 2 + (start.phone - cursor) * 2),
      waveform.length, manifest.sampleRate, playbackRate);
    for (const [index, marker] of timing.entries()) markers.push({ index: inside[index]!.index,
      seconds: sampleCount / manifest.sampleRate / playbackRate + marker.seconds });
    let peak = 1;
    for (const sample of waveform) {
      if (!Number.isFinite(sample)) throw new Error('Invalid generated audio.');
      peak = Math.max(peak, Math.abs(sample));
    }
    chunks.push(Float32Array.from(waveform, (sample) => sample / peak));
    sampleCount += waveform.length; cursor = end;
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
    queue = queue.then(() => synthesize(data)).catch((error: unknown) => {
      console.error('Romanian speech synthesis failed.', error);
      worker.postMessage({ type: 'error', id: data.id });
    });
  }
};
worker.postMessage({ type: 'booted' });
