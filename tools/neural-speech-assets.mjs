import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import protobuf from 'protobufjs';

const root = 'public/tts/piper';
const revision = '1162a9173d0ce503555aed757976b7a9912eae4c';
const source = `https://huggingface.co/rhasspy/piper-voices/resolve/${revision}/en/en_GB/vctk/medium/`;
const identity = {
  schemaVersion: 1, model: 'Piper-en_GB-vctk-medium', revision,
  source: 'https://huggingface.co/rhasspy/piper-voices', license: 'MIT; VCTK dataset CC BY 4.0',
  runtime: 'onnxruntime-web@1.29.0', pronunciation: 'phonemizer@1.2.1', sampleRate: 22050,
  samplesPerDurationFrame: 256,
  modification: 'Expose predicted phoneme durations; retain all trained weights. Playback pitch uses compensated model durations.',
  voices: [
    { id: 'vctk-p226', name: 'Piper British male', lang: 'en-GB', speakerId: 95, default: true },
    { id: 'vctk-p225', name: 'Piper British female', lang: 'en-GB', speakerId: 107, default: false },
  ],
};
const sources = [
  ['en_GB-vctk-medium.onnx', '4e9fc85ab9009385319fc6bae7f55577f8a2d7ee77fd9159a5500eb6531f41e6'],
  ['en_GB-vctk-medium.onnx.json', '7f85e6391ed0f7f46e4abd19345929a16be931a0c9945086f96692dce2087fa8'],
  ['MODEL_CARD', '53ec6b1fd90d9125d5bebac55261efd27f7e8d6dc962f605a5b5f796df2ec7fb'],
];
const schemaSource = {
  name: 'onnx.proto',
  url: 'https://raw.githubusercontent.com/onnx/onnx/v1.17.0/onnx/onnx.proto',
  sha256: '2881fcc940635b6a34b7c95e5089b2faa89c3d6e382c1da1706e88c7f32452bc',
};
const manifestSources = [
  ...sources.map(([name, sha256]) => ({ name, sha256 })),
  { name: schemaSource.name, sha256: schemaSource.sha256 },
];
const expectedFiles = [
  { path: 'model.onnx', bytes: 76952867, sha256: '2e141b1a63071d1f257d90939d849569b05a476a96ed5b9def69b654f5868f96' },
  { path: 'config.json', bytes: 6637, sha256: '7f85e6391ed0f7f46e4abd19345929a16be931a0c9945086f96692dce2087fa8' },
  { path: 'MODEL_CARD', bytes: 326, sha256: '53ec6b1fd90d9125d5bebac55261efd27f7e8d6dc962f605a5b5f796df2ec7fb' },
  { path: 'NOTICE.txt', bytes: 765, sha256: '63b8785b0c36155273608df5abaa7901c7ff5fcaf42286a778d1de3b3f7d2ab5' },
  { path: 'piper-LICENSE', bytes: 1071, sha256: '4cd71dece7037f1d6d93cce7570c57ab75ea9ac566fd4990be2f3ab08d15b47f' },
  { path: 'VCTK-LICENSE', bytes: 17416, sha256: 'b34e17103bfb246f2549fc82a279e6ba28834e0cb42f76a92efc14b72e3a3723' },
  { path: 'onnx-runtime-LICENSE', bytes: 1073, sha256: '2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c' },
  { path: 'onnx-runtime-NOTICES', bytes: 336906, sha256: '53d3fa5821ac016ac24dd35775c996efec86e2ae0841e9a3a5e146c0ae916845' },
  { path: 'phonemizer-LICENSE', bytes: 11357, sha256: 'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4' },
  { path: 'ort-wasm-simd-threaded.wasm', bytes: 13961845, sha256: 'ec8580a9d7b9476ceee52e10a7f94124e4dc71a019d666ed6d4726697c109a4d' },
];
const names = expectedFiles.map(({ path: name }) => name);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The pinned speech source is unavailable.');
  return Buffer.from(await response.arrayBuffer());
}
async function build() {
  await mkdir(root, { recursive: true }); await mkdir('tmp/piper-source', { recursive: true });
  const assets = [];
  for (const [name, expected] of sources) {
    const file = path.join('tmp/piper-source', name);
    let bytes;
    try { bytes = await readFile(file); } catch { bytes = await download(source + name); await writeFile(file, bytes); }
    if (hash(bytes) !== expected) throw new Error('The pinned Piper source hash does not match.');
    assets.push(bytes);
  }
  let schema;
  try { schema = await readFile('tmp/piper-source/onnx.proto'); }
  catch { schema = await download(schemaSource.url); await writeFile('tmp/piper-source/onnx.proto', schema); }
  if (hash(schema) !== schemaSource.sha256) throw new Error('The pinned ONNX schema hash does not match.');
  const Model = protobuf.parse(schema.toString('utf8')).root.lookupType('onnx.ModelProto');
  const model = Model.decode(assets[0]);
  if (!model.graph.node.some(node => node.opType === 'Ceil' && node.output.includes('/Ceil_output_0'))) throw new Error('The pinned duration tensor is missing.');
  model.graph.node.push({ name: 'speech_durations', opType: 'Identity', input: ['/Ceil_output_0'], output: ['phoneme_durations'] });
  model.graph.output.push({ name: 'phoneme_durations', type: { tensorType: { elemType: 1, shape: { dim: [{ dimValue: 1 }, { dimValue: 1 }, { dimParam: 'phonemes' }] } } } });
  await writeFile(path.join(root, 'model.onnx'), Model.encode(model).finish());
  await writeFile(path.join(root, 'config.json'), assets[1]); await writeFile(path.join(root, 'MODEL_CARD'), assets[2]);
  await writeFile(path.join(root, 'NOTICE.txt'), [
    'Piper British English VCTK medium. Source: https://huggingface.co/rhasspy/piper-voices',
    `Pinned revision: ${revision}. Published model repository license: MIT.`,
    'VCTK Corpus: Christophe Veaux, Junichi Yamagishi, Kirsten MacDonald (2019), University of Edinburgh.',
    'Dataset: https://datashare.ed.ac.uk/handle/10283/3443 ; license: https://creativecommons.org/licenses/by/4.0/',
    'Selected voices: VCTK p226 (male) and p225 (female). Fine-tuned from the published Lessac medium model.',
    identity.modification,
    'ONNX Runtime: Microsoft Corporation, MIT. See onnx-runtime-LICENSE and onnx-runtime-NOTICES.',
    'Phonemizer.js 1.2.1: Apache-2.0. See phonemizer-LICENSE.', '',
  ].join('\n'));
  for (const [from, to] of [
    ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.wasm'],
    ['node_modules/phonemizer/LICENSE', 'phonemizer-LICENSE'],
  ]) await copyFile(from, path.join(root, to));
  for (const [from, to] of [['LICENSE', 'onnx-runtime-LICENSE'], ['ThirdPartyNotices.txt', 'onnx-runtime-NOTICES']]) {
    await writeFile(path.join(root, to), await download(`https://raw.githubusercontent.com/microsoft/onnxruntime/v1.29.0/${from}`));
  }
  await writeFile(path.join(root, 'piper-LICENSE'), await download('https://raw.githubusercontent.com/rhasspy/piper/73c04d81d5590ecc46e522de3601ce7fb29fc2be/LICENSE.md'));
  await writeFile(path.join(root, 'VCTK-LICENSE'), await download('https://datashare.ed.ac.uk/server/api/core/bitstreams/956a1688-0b59-428c-8a2f-10837433dde3/content'));
  const files = [];
  for (const name of names) { const bytes = await readFile(path.join(root, name)); files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) }); }
  if (!isDeepStrictEqual(files, expectedFiles)) throw new Error('The generated Piper outputs do not match the pinned package.');
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ ...identity, sources: manifestSources, files: expectedFiles }, null, 2) + '\n');
  console.log('Prepared local Piper speech assets.');
}
export async function validateNeuralAssets(assetRoot = root) {
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'manifest.json'), 'utf8'));
  if (!isDeepStrictEqual(manifest, { ...identity, sources: manifestSources, files: expectedFiles })) {
    throw new Error('The neural asset manifest is invalid.');
  }
  if (!isDeepStrictEqual((await readdir(assetRoot)).sort(), [...names, 'manifest.json'].sort())) {
    throw new Error('The neural asset directory has an invalid inventory.');
  }
  for (const file of expectedFiles) {
    const bytes = await readFile(path.join(assetRoot, file.path));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error('Neural asset hash mismatch.');
  }
  if ((await stat(path.join(assetRoot,'model.onnx'))).size >= 100*1024*1024) throw new Error('The neural model exceeds the single-file budget.');
  const config = JSON.parse(await readFile(path.join(assetRoot,'config.json'),'utf8'));
  if (config.audio.sample_rate !== 22050 || config.speaker_id_map.p226 !== 95 || config.speaker_id_map.p225 !== 107) throw new Error('The Piper voice configuration is invalid.');
  console.log('Neural speech asset validation passed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'build') await build();
  else if (process.argv[2] === 'validate') await validateNeuralAssets();
  else throw new Error('Use neural-speech-assets.mjs build or validate.');
}
