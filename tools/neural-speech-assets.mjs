import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import protobuf from 'protobufjs';

const root = 'public/tts/kokoro';
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const source = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${revision}/`;
const sourceSha256 = 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478';
const modelName = 'Kokoro-82M-v1.0-ONNX';
const modelLicense = 'Apache-2.0';
const runtime = 'onnxruntime-web@1.29.0';
const pronunciation = 'phonemizer@1.2.1';
const modification = 'Expose predicted phoneme durations and add a multiplicative F0 pitch input; retain all trained weights.';
const onnxRuntimeRevision = 'v1.29.0';
const kokoroLicenseRevision = 'dfb907a02bba8152ca444717ca5d78747ccb4bec';
const voices = [
  { id: 'af_heart', name: 'Heart', lang: 'en-US' },
  { id: 'af_bella', name: 'Bella', lang: 'en-US' },
  { id: 'am_michael', name: 'Michael', lang: 'en-US' },
  { id: 'am_puck', name: 'Puck', lang: 'en-US' },
  { id: 'bf_emma', name: 'Emma', lang: 'en-GB' },
  { id: 'bm_george', name: 'George', lang: 'en-GB' },
];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/u;
const assetNames = ['model.onnx', 'vocabulary.json', ...voices.map(({ id }) => `${id}.bin`),
  'ort-wasm-simd-threaded.wasm', 'onnx-runtime-LICENSE', 'onnx-runtime-NOTICES',
  'phonemizer-LICENSE', 'kokoro-LICENSE'];

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Neural asset download failed: ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, bytes);
  return bytes;
}

async function build() {
  await mkdir(root, { recursive: true });
  await mkdir('tmp/neural-source', { recursive: true });
  let original;
  try { original = await readFile('tmp/neural-source/kokoro-q8.onnx'); }
  catch { original = await download(source + 'onnx/model_quantized.onnx', 'tmp/neural-source/kokoro-q8.onnx'); }
  if (hash(original) !== sourceSha256) throw new Error('The pinned neural model source hash does not match.');
  let schema;
  try { schema = await readFile('tmp/neural-source/onnx.proto', 'utf8'); }
  catch {
    schema = (await download('https://raw.githubusercontent.com/onnx/onnx/v1.17.0/onnx/onnx.proto',
      'tmp/neural-source/onnx.proto')).toString('utf8');
  }
  const Model = protobuf.parse(schema).root.lookupType('onnx.ModelProto');
  const model = Model.decode(original);
  const durationName = '/encoder/Clip_output_0';
  const pitchName = '/encoder/F0_proj/Conv_output_0';
  const pitchProducer = model.graph.node.findIndex((node) => node.output.includes(pitchName));
  if (pitchProducer < 0 || !model.graph.node.some((node) => node.output.includes(durationName))) {
    throw new Error('The pinned neural graph does not expose the expected duration and pitch tensors.');
  }
  for (const node of model.graph.node) {
    node.input = node.input.map((name) => name === pitchName ? 'grand_transition_f0' : name);
  }
  model.graph.node.splice(pitchProducer + 1, 0, {
    name: 'grand_transition_pitch', opType: 'Mul', input: [pitchName, 'pitch'], output: ['grand_transition_f0'],
  });
  model.graph.input.push({ name: 'pitch', type: { tensorType: { elemType: 1, shape: { dim: [{ dimValue: 1 }] } } } });
  model.graph.output.push({ name: durationName, type: { tensorType: {
    elemType: 1, shape: { dim: [{ dimValue: 1 }, { dimParam: 'sequence_length' }] },
  } } });
  await writeFile(path.join(root, 'model.onnx'), Model.encode(model).finish());
  const tokenizerBytes = await download(source + 'tokenizer.json', 'tmp/neural-source/tokenizer.json');
  const tokenizer = JSON.parse(tokenizerBytes.toString('utf8'));
  await writeFile(path.join(root, 'vocabulary.json'), JSON.stringify(tokenizer.model.vocab) + '\n');
  for (const voice of voices) await download(source + `voices/${voice.id}.bin`, path.join(root, `${voice.id}.bin`));
  await copyFile('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', path.join(root, 'ort-wasm-simd-threaded.wasm'));
  await download(`https://raw.githubusercontent.com/microsoft/onnxruntime/${onnxRuntimeRevision}/LICENSE`, path.join(root, 'onnx-runtime-LICENSE'));
  await download(`https://raw.githubusercontent.com/microsoft/onnxruntime/${onnxRuntimeRevision}/ThirdPartyNotices.txt`, path.join(root, 'onnx-runtime-NOTICES'));
  await copyFile('node_modules/phonemizer/LICENSE', path.join(root, 'phonemizer-LICENSE'));
  await download(`https://raw.githubusercontent.com/hexgrad/kokoro/${kokoroLicenseRevision}/LICENSE`, path.join(root, 'kokoro-LICENSE'));
  const files = [];
  for (const name of assetNames) {
    const bytes = await readFile(path.join(root, name));
    files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
  }
  const manifest = {
    schemaVersion: 1, model: modelName, revision,
    source: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX',
    sourceSha256, license: modelLicense, runtime,
    pronunciation, sampleRate: 24000, samplesPerDurationFrame: 600,
    modification,
    voices, files,
  };
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Prepared local neural speech: ${files.reduce((sum, file) => sum + file.bytes, 0)} bytes.`);
}

export async function validateNeuralAssets(assetRoot = root) {
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'manifest.json'), 'utf8'));
  const identity = {
    schemaVersion: 1,
    model: modelName,
    revision,
    source: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX',
    sourceSha256,
    license: modelLicense,
    runtime,
    pronunciation,
    sampleRate: 24000,
    samplesPerDurationFrame: 600,
    modification,
    voices,
  };
  if (!manifest || typeof manifest !== 'object' ||
    Object.entries(identity).some(([key, value]) => !isDeepStrictEqual(manifest[key], value)) ||
    !Array.isArray(manifest.files)) {
    throw new Error('The neural asset manifest is invalid.');
  }
  const seen = new Set();
  for (const file of manifest.files) {
    if (!file || typeof file !== 'object' || typeof file.path !== 'string' ||
      path.basename(file.path) !== file.path || !assetNames.includes(file.path) ||
      seen.has(file.path) || !Number.isInteger(file.bytes) || file.bytes < 0 ||
      typeof file.sha256 !== 'string' || !hashPattern.test(file.sha256)) {
      throw new Error('The neural asset file inventory is invalid.');
    }
    seen.add(file.path);
    const bytes = await readFile(path.join(assetRoot, file.path));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error(`Neural asset hash mismatch: ${file.path}`);
  }
  if (manifest.files.length !== assetNames.length || assetNames.some((name) => !seen.has(name))) {
    throw new Error('The neural asset file inventory is incomplete.');
  }
  const actualNames = (await readdir(assetRoot)).toSorted((left, right) => left.localeCompare(right, 'en'));
  const expectedNames = ['manifest.json', ...assetNames].toSorted((left, right) => left.localeCompare(right, 'en'));
  if (!isDeepStrictEqual(actualNames, expectedNames)) {
    throw new Error('The neural asset directory contains an unmanifested file.');
  }
  if ((await stat(path.join(assetRoot, 'model.onnx'))).size >= 100 * 1024 * 1024) {
    throw new Error('The neural model exceeds the repository single-file budget.');
  }
  console.log('Neural speech asset validation passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'build') await build();
  else if (process.argv[2] === 'validate') await validateNeuralAssets();
  else throw new Error('Use neural-speech-assets.mjs build or validate.');
}
