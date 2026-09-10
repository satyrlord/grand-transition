import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import protobuf from 'protobufjs';

const root = 'public/tts/kokoro-gpu';
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const source = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX';
const sourceSha256 = '8fbea51ea711f2af382e88c833d9e288c6dc82ce5e98421ea61c058ce21a34cb';
const modelSha256 = '0aaa97abbfe500710add4632920c7b54cd1a37c711d4db7df6dce1676dfd36ee';
const schemaSha256 = '2881fcc940635b6a34b7c95e5089b2faa89c3d6e382c1da1706e88c7f32452bc';
const shards = ['model-01.bin', 'model-02.bin', 'model-03.bin', 'model-04.bin'];
const identity = {
  schemaVersion: 1, model: 'Kokoro-82M-v1.0-ONNX-FP32', revision, source, sourceSha256,
  license: 'Apache-2.0', runtime: 'onnxruntime-web@1.29.0', pronunciation: 'phonemizer@1.2.1',
  sampleRate: 24000, samplesPerDurationFrame: 600,
  modification: 'Expose predicted phoneme durations and add a multiplicative F0 pitch input; retain all trained weights.',
  modelBytes: 325532390, modelSha256, shards,
  runtimeModule: {"path": "ort-wasm-simd-threaded.asyncify.mjs", "bytes": 51407, "sha256": "5d25483158d53d8f34d0e9c06a654d56c8dca4ebdf370ea0982ef11315a00e0e"},
  voices: [
    { id: 'bm_george', name: 'George', lang: 'en-GB', default: true },
    { id: 'bf_emma', name: 'Emma', lang: 'en-GB', default: false },
  ],
};
const files = [
  {
    "path": "bf_emma.bin",
    "bytes": 522240,
    "sha256": "669fe0647f9dd04fcab92f1439a40eeb4c8b4ab1f82e4996fe3d918ce4a63b73"
  },
  {
    "path": "bm_george.bin",
    "bytes": 522240,
    "sha256": "c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc"
  },
  {
    "path": "kokoro-LICENSE",
    "bytes": 11357,
    "sha256": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
  },
  {
    "path": "model-01.bin",
    "bytes": 100663296,
    "sha256": "0d3fa6861b98a5fb6695fe37423a2a36f21268c4b81a335b05a5a7dba621948b"
  },
  {
    "path": "model-02.bin",
    "bytes": 100663296,
    "sha256": "d24229e32994441d8b9e456738b399098667a847e4d03c0169862f69f8e81499"
  },
  {
    "path": "model-03.bin",
    "bytes": 100663296,
    "sha256": "04a5a53b3ecd494ad0c699f43ceaaba312c1b9a7c11ce22bd65274a4e95c2c17"
  },
  {
    "path": "model-04.bin",
    "bytes": 23542502,
    "sha256": "e667a34ab6c8ddf47741a0cfc53065491cee653586c4d66cc8ce7e68646094b9"
  },
  {
    "path": "NOTICE.txt",
    "bytes": 566,
    "sha256": "a049696c6525749b8ec3fa3faeb0df1c5fb93c7781b0c522a967fdf70a502053"
  },
  {
    "path": "onnx-runtime-LICENSE",
    "bytes": 1073,
    "sha256": "2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c"
  },
  {
    "path": "onnx-runtime-NOTICES",
    "bytes": 336906,
    "sha256": "53d3fa5821ac016ac24dd35775c996efec86e2ae0841e9a3a5e146c0ae916845"
  },
  {
    "path": "ort-wasm-simd-threaded.asyncify.wasm",
    "bytes": 25749873,
    "sha256": "503d17cb7411b79781b9fad1cf0978f03cf06b050c7d399c730e914f473bf549"
  },
  {
    "path": "phonemizer-LICENSE",
    "bytes": 11357,
    "sha256": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
  },
  {
    "path": "vocabulary.json",
    "bytes": 924,
    "sha256": "05ec9cdf7bee8335bab4a644a736fa66c303d8ee47e69092fc5aaf782f463cb7"
  }
];
const vocabulary = "{\"$\":0,\";\":1,\":\":2,\",\":3,\".\":4,\"!\":5,\"?\":6,\"\u2014\":9,\"\u2026\":10,\"\\\"\":11,\"(\":12,\")\":13,\"\u201c\":14,\"\u201d\":15,\" \":16,\"\u0303\":17,\"\u02a3\":18,\"\u02a5\":19,\"\u02a6\":20,\"\u02a8\":21,\"\u1d5d\":22,\"\uab67\":23,\"A\":24,\"I\":25,\"O\":31,\"Q\":33,\"S\":35,\"T\":36,\"W\":39,\"Y\":41,\"\u1d4a\":42,\"a\":43,\"b\":44,\"c\":45,\"d\":46,\"e\":47,\"f\":48,\"h\":50,\"i\":51,\"j\":52,\"k\":53,\"l\":54,\"m\":55,\"n\":56,\"o\":57,\"p\":58,\"q\":59,\"r\":60,\"s\":61,\"t\":62,\"u\":63,\"v\":64,\"w\":65,\"x\":66,\"y\":67,\"z\":68,\"\u0251\":69,\"\u0250\":70,\"\u0252\":71,\"\u00e6\":72,\"\u03b2\":75,\"\u0254\":76,\"\u0255\":77,\"\u00e7\":78,\"\u0256\":80,\"\u00f0\":81,\"\u02a4\":82,\"\u0259\":83,\"\u025a\":85,\"\u025b\":86,\"\u025c\":87,\"\u025f\":90,\"\u0261\":92,\"\u0265\":99,\"\u0268\":101,\"\u026a\":102,\"\u029d\":103,\"\u026f\":110,\"\u0270\":111,\"\u014b\":112,\"\u0273\":113,\"\u0272\":114,\"\u0274\":115,\"\u00f8\":116,\"\u0278\":118,\"\u03b8\":119,\"\u0153\":120,\"\u0279\":123,\"\u027e\":125,\"\u027b\":126,\"\u0281\":128,\"\u027d\":129,\"\u0282\":130,\"\u0283\":131,\"\u0288\":132,\"\u02a7\":133,\"\u028a\":135,\"\u028b\":136,\"\u028c\":138,\"\u0263\":139,\"\u0264\":140,\"\u03c7\":142,\"\u028e\":143,\"\u0292\":147,\"\u0294\":148,\"\u02c8\":156,\"\u02cc\":157,\"\u02d0\":158,\"\u02b0\":162,\"\u02b2\":164,\"\u2193\":169,\"\u2192\":171,\"\u2197\":172,\"\u2198\":173,\"\u1d7b\":177}\n";
const notice = "Kokoro-82M v1.0 FP32. Source: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX\nPinned revision: 1939ad2a8e416c0acfeecc08a694d14ef25f2231. Apache-2.0.\nBritish voices: George (bm_george) and Emma (bf_emma).\nExpose predicted phoneme durations and add a multiplicative F0 pitch input; retain all trained weights.\nThe model is split into ordered static shards and reassembled without changing bytes.\nONNX Runtime Web 1.29.0: Microsoft Corporation, MIT. See onnx-runtime-LICENSE and onnx-runtime-NOTICES.\nPhonemizer.js 1.2.1: Apache-2.0. See phonemizer-LICENSE.\n";

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function pinnedInput(cache, url, expected) {
  let bytes;
  try { bytes = await readFile(cache); } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error('The pinned GPU speech source is unavailable.');
    bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== expected) throw new Error('The pinned GPU speech source hash does not match.');
    await mkdir(path.dirname(cache), { recursive: true }); await writeFile(cache, bytes);
  }
  if (hash(bytes) !== expected) throw new Error('The pinned GPU speech source hash does not match.');
  return bytes;
}
async function build() {
  const sourceBytes = await pinnedInput('tmp/tts-comparison-2026-09-09/assets/kokoro-fp32-original.onnx',
    `${source}/resolve/${revision}/onnx/model.onnx`, sourceSha256);
  const schema = await pinnedInput('tmp/tts-comparison-2026-09-09/assets/onnx.proto',
    'https://raw.githubusercontent.com/onnx/onnx/v1.17.0/onnx/onnx.proto', schemaSha256);
  const Model = protobuf.parse(schema.toString()).root.lookupType('onnx.ModelProto');
  const model = Model.decode(sourceBytes);
  const duration = '/encoder/Clip_output_0';
  const pitch = '/encoder/F0_proj/Conv_output_0';
  const producer = model.graph.node.findIndex(node => node.output.includes(pitch));
  if (producer < 0 || !model.graph.node.some(node => node.output.includes(duration))) throw new Error('The pinned GPU graph is invalid.');
  for (const node of model.graph.node) node.input = node.input.map(name => name === pitch ? 'grand_transition_f0' : name);
  model.graph.node.splice(producer + 1, 0, { name: 'grand_transition_pitch', opType: 'Mul', input: [pitch, 'pitch'], output: ['grand_transition_f0'] });
  model.graph.input.push({ name: 'pitch', type: { tensorType: { elemType: 1, shape: { dim: [{ dimValue: 1 }] } } } });
  model.graph.output.push({ name: duration, type: { tensorType: { elemType: 1, shape: { dim: [{ dimValue: 1 }, { dimParam: 'sequence_length' }] } } } });
  const derived = Model.encode(model).finish();
  if (derived.length !== identity.modelBytes || hash(derived) !== modelSha256) throw new Error('The derived GPU model hash does not match.');
  await mkdir(root, { recursive: true });
  for (const [index, name] of shards.entries()) await writeFile(path.join(root, name), derived.subarray(index * 96 * 1024 * 1024, (index + 1) * 96 * 1024 * 1024));
  await writeFile(path.join(root, 'vocabulary.json'), vocabulary);
  await writeFile(path.join(root, 'NOTICE.txt'), notice);
  for (const name of ['ort-wasm-simd-threaded.asyncify.wasm']) {
    await writeFile(path.join(root, name), await readFile(path.join('node_modules/onnxruntime-web/dist', name)));
  }
  await writeFile(path.join(root, 'phonemizer-LICENSE'), await readFile('node_modules/phonemizer/LICENSE'));
  for (const [name, url] of [
    ...['bm_george', 'bf_emma'].map(id => [`${id}.bin`, `${source}/resolve/${revision}/voices/${id}.bin`]),
    ['kokoro-LICENSE', `${source}/resolve/${revision}/LICENSE`],
    ['onnx-runtime-LICENSE', 'https://raw.githubusercontent.com/microsoft/onnxruntime/v1.29.0/LICENSE'],
    ['onnx-runtime-NOTICES', 'https://raw.githubusercontent.com/microsoft/onnxruntime/v1.29.0/ThirdPartyNotices.txt'],
  ]) await pinnedInput(path.join(root, name), url, files.find(file => file.path === name).sha256);
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ ...identity, files }, null, 2) + '\n');
  await writeFile('src/audio/kokoro-gpu-manifest.json', JSON.stringify({ ...identity, files }, null, 2) + '\n');
  await validateKokoroGpuAssets();
}
export async function validateKokoroGpuAssets(assetRoot = root, compiledManifestPath = 'src/audio/kokoro-gpu-manifest.json') {
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'manifest.json'), 'utf8'));
  if (!isDeepStrictEqual(manifest, { ...identity, files })) throw new Error('The GPU speech manifest or file inventory is invalid.');
  const compiled = JSON.parse(await readFile(compiledManifestPath, 'utf8'));
  if (!isDeepStrictEqual(compiled, manifest)) throw new Error('The compiled GPU speech manifest is stale.');
  if (!isDeepStrictEqual((await readdir(assetRoot)).sort(), [...files.map(file => file.path), 'manifest.json'].sort())) throw new Error('The GPU speech directory has an invalid inventory.');
  const moduleBytes = await readFile(path.join('node_modules/onnxruntime-web/dist', identity.runtimeModule.path));
  if (moduleBytes.length !== identity.runtimeModule.bytes || hash(moduleBytes) !== identity.runtimeModule.sha256) throw new Error('The GPU runtime module hash does not match.');
  const modelHash = createHash('sha256');
  let modelBytes = 0;
  for (const file of files) {
    const bytes = await readFile(path.join(assetRoot, file.path));
    if (bytes.length >= 100 * 1024 * 1024 || bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error('GPU speech asset hash or size mismatch.');
    if (shards.includes(file.path)) { modelHash.update(bytes); modelBytes += bytes.length; }
  }
  if (modelBytes !== identity.modelBytes || modelHash.digest('hex') !== modelSha256) throw new Error('The reassembled GPU model hash does not match.');
  console.log(`GPU speech asset validation passed (${files.reduce((sum, file) => sum + file.bytes, 0)} manifested bytes).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'build') await build();
  else if (process.argv[2] === 'validate') await validateKokoroGpuAssets();
  else throw new Error('Use kokoro-gpu-assets.mjs build or validate.');
}
