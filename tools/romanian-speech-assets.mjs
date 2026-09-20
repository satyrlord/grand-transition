// Romanian neural speech assets for spec-029 phase 2.
//
// Mirrors tools/neural-speech-assets.mjs: pin the upstream revisions, verify
// every downloaded byte, patch the exported ONNX graphs so they also return
// phoneme durations, vendor the Romanian pronunciation runtime, and write a
// manifest that validateRomanianSpeechAssets() re-checks independently.
//
// Shipped layout under public/tts/ro:
//   mihai/     Mihai weights, configuration and model card (MIT, CC0 data)
//   liana/     Liana weights, configuration and model card (CC BY-NC 4.0)
//   pronounce/ eSpeak NG runtime, Romanian-only data, Liana's patched dictionary
//   NOTICE.txt every licence and the GPL source obligation for eSpeak NG

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import protobuf from 'protobufjs';

const root = 'public/tts/ro';
const cache = 'tmp/ro-speech';
const phonemizerDist = 'node_modules/espeak-phonemizer/dist';
const modelPartBytes = 96 * 1024 * 1024;

// Hugging Face LFS object ids are SHA-256 digests, so the two weight files are
// pinned from upstream metadata. The remaining digests were recorded by the
// first successful build and are asserted by every later one.
const piperRevision = '1162a9173d0ce503555aed757976b7a9912eae4c';
const piperSource = 'https://huggingface.co/rhasspy/piper-voices';
const piperBase = `${piperSource}/resolve/${piperRevision}/ro/ro_RO/mihai/medium/`;
const lianaRevision = 'acfc14ae87bb4c124947f0cb7ee0023ffceb0005';
const lianaSource = 'https://huggingface.co/eduardem/piper-liana-romanian';
const lianaBase = `${lianaSource}/resolve/${lianaRevision}/`;
const espeakRevision = '4870adfa25b1a32b4361592f1be8a40337c58d6c';

const sources = [
  {
    name: 'mihai/ro_RO-mihai-medium.onnx',
    url: `${piperBase}ro_RO-mihai-medium.onnx`,
    bytes: 63201294,
    sha256: 'e0608bbbd53c80267c09ece681b09f5199f54e792356684c8073738e5f15d29f',
  },
  { name: 'mihai/ro_RO-mihai-medium.onnx.json', url: `${piperBase}ro_RO-mihai-medium.onnx.json`, bytes: 4877, sha256: '8cc0c9f077dc0cec3c25a6a055ec8046db8e40a2510591582f2c9c869f4bc47e' },
  { name: 'mihai/MODEL_CARD', url: `${piperBase}MODEL_CARD`, bytes: 278, sha256: 'e06fb69411b3614636fdec4af646ac74548c6c323a8ac4030e34cb54e99016a1' },
  {
    name: 'liana/ro_RO-liana-medium.onnx',
    url: `${lianaBase}voices/liana-medium/ro_RO-liana-medium.onnx`,
    bytes: 63516050,
    sha256: '40c6cbe08905ba702f4df5966a3a8de2bcc232db8ad3784db74bbd948d9953d3',
  },
  { name: 'liana/ro_RO-liana-medium.onnx.json', url: `${lianaBase}voices/liana-medium/ro_RO-liana-medium.onnx.json`, bytes: 4855, sha256: 'bb70ba2e0181a3d98050020ea3531a279f96afd72cc86d571cf5de0920383f46' },
  { name: 'liana/README.md', url: `${lianaBase}README.md`, bytes: 17843, sha256: '24b4471be0f635555d64e74d6aab78ff62fc0d04eea6d6e076996bb5d0b3ae01' },
  { name: 'pronounce/ro_dict', url: `${lianaBase}espeak/ro_dict`, bytes: 72506, sha256: '6cd3b221a33308d802b6c4d7bf1e618db4fb1caa92ef165a327fc775ee82e5ca' },
  { name: 'pronounce/ro_extra', url: `${lianaBase}espeak/ro_extra`, bytes: 13456, sha256: 'bef32cd1d8cc9ca5cba64416845c13782ae82b154ce009dd222495ebbd6089d7' },
  { name: 'pronounce/espeak-ng.pin', url: `${lianaBase}espeak/espeak-ng.pin`, bytes: 174, sha256: '2a81547ac0679e8156551a7d40980985b3cb01a1ca9b9c5c1cfe9090a20f3788' },
];

// The pinned ONNX schema used to append the duration output, matching the
// English package so both are patched by the same description.
const schemaSource = {
  name: 'onnx.proto',
  url: 'https://raw.githubusercontent.com/onnx/onnx/v1.17.0/onnx/onnx.proto',
  sha256: '2881fcc940635b6a34b7c95e5089b2faa89c3d6e382c1da1706e88c7f32452bc',
};

const identity = {
  schemaVersion: 1,
  package: 'Piper-ro_RO-mihai-medium + Piper-ro_RO-liana-medium',
  sampleRate: 22050,
  runtime: 'onnxruntime-web@1.29.0',
  pronunciation: 'espeak-phonemizer@0.1.2',
  espeakRevision,
  modification:
    'Expose predicted phoneme durations; retain all trained weights. Ship eSpeak NG data trimmed to Romanian with the upstream patched ro_dict.',
  voices: [
    {
      id: 'ro_RO-mihai-medium',
      name: 'Piper Romanian male (Mihai)',
      lang: 'ro-RO',
      speakerId: 0,
      default: true,
      model: {
        files: ['mihai/model.onnx'],
        bytes: 63201408,
        sha256: '240154e6744cb496897bbb4242121dc1709d3279f25e4f1ba5de61b341c9da38',
      },
      config: 'mihai/config.json',
      license: 'MIT; dataset CC0',
    },
    {
      id: 'ro_RO-liana-medium',
      name: 'Piper Romanian female (Liana)',
      lang: 'ro-RO',
      speakerId: 0,
      default: false,
      model: {
        files: ['liana/model.onnx'],
        bytes: 63516164,
        sha256: '6de939f34a464434c982f726a55d9bff06b39ee35fc3d4e87bcda3f88a135a14',
      },
      config: 'liana/config.json',
      license: 'CC BY-NC 4.0',
    },
  ],
};

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Output inventory pinned by the first build. validate() refuses any drift from
// it, including a changed file size, a changed digest, or an extra file.
const expectedFiles = [
  { path: 'NOTICE.txt', bytes: 1589, sha256: '55d966a3897a7a13162d80f2a3aeba5fc022daa8b878062d45acefedabc29018' },
  { path: 'liana/MODEL_CARD', bytes: 17843, sha256: '24b4471be0f635555d64e74d6aab78ff62fc0d04eea6d6e076996bb5d0b3ae01' },
  { path: 'liana/config.json', bytes: 4855, sha256: 'bb70ba2e0181a3d98050020ea3531a279f96afd72cc86d571cf5de0920383f46' },
  { path: 'liana/model.onnx', bytes: 63516164, sha256: '6de939f34a464434c982f726a55d9bff06b39ee35fc3d4e87bcda3f88a135a14' },
  { path: 'mihai/MODEL_CARD', bytes: 278, sha256: 'e06fb69411b3614636fdec4af646ac74548c6c323a8ac4030e34cb54e99016a1' },
  { path: 'mihai/config.json', bytes: 4877, sha256: '8cc0c9f077dc0cec3c25a6a055ec8046db8e40a2510591582f2c9c869f4bc47e' },
  { path: 'mihai/model.onnx', bytes: 63201408, sha256: '240154e6744cb496897bbb4242121dc1709d3279f25e4f1ba5de61b341c9da38' },
  { path: 'pronounce/data/bundle-1.data', bytes: 2071717, sha256: '9fddb3e23492d0e4290cd601cb397c7532e196c3b3e9aa5ac40ff323b9be3495' },
  { path: 'pronounce/data/core.data', bytes: 713784, sha256: '2e0c2a24a667c3a0dc01885fec01f010062f74c0dfb35e8684ba95e95a1c8673' },
  { path: 'pronounce/data/manifest.json', bytes: 6649, sha256: 'e5df411f6d5c8a439c93bc708b3cf5f089a466c1334c474bf9e893d63dbfe30c' },
  { path: 'pronounce/espeak-phonemizer-LICENSE', bytes: 35147, sha256: '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903' },
  { path: 'pronounce/espeak-phonemizer-NOTICES', bytes: 1267, sha256: 'd1f35cb1143a05a3dc67acc6707755ebd2ac71a9b9bd1093cb4a4d27b824327f' },
  { path: 'pronounce/wasm/espeak-ng.wasm', bytes: 306459, sha256: '8b087d038ee043a355b0bf6c0737328becab128e563e7181a663defb1408e587' },
];

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The pinned speech source is unavailable: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

// Sources are cached so a repeated build does not re-download 177 MB of weights.
async function fetchPinned({ name, url, bytes, sha256 }) {
  const file = path.join(cache, name);
  let content;
  try {
    content = await readFile(file);
  } catch {
    content = await download(url);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  if (bytes !== undefined && content.length !== bytes) {
    throw new Error(`The pinned source size changed: ${name}`);
  }
  if (sha256 && hash(content) !== sha256) {
    throw new Error(`The pinned source hash does not match: ${name}`);
  }
  return content;
}

function patchModel(bytes, Model, label) {
  const model = Model.decode(bytes);
  const hasDurationTensor = model.graph.node.some(
    (node) => node.opType === 'Ceil' && node.output.includes('/Ceil_output_0'),
  );
  if (!hasDurationTensor) throw new Error(`The pinned duration tensor is missing: ${label}`);
  model.graph.node.push({
    name: 'speech_durations',
    opType: 'Identity',
    input: ['/Ceil_output_0'],
    output: ['phoneme_durations'],
  });
  model.graph.output.push({
    name: 'phoneme_durations',
    type: {
      tensorType: {
        elemType: 1,
        shape: {
          dim: [{ dimValue: 1 }, { dimValue: 1 }, { dimParam: 'phonemes' }],
        },
      },
    },
  });
  return Buffer.from(Model.encode(model).finish());
}

// Trim the 113-language eSpeak data to what Romanian needs: the shared core plus
// one bucket, with Liana's patched dictionary replacing the stock ro_dict. The
// packed format is plain concatenation, so offsets are recomputed here.
async function buildPronunciation(patchedDictionary) {
  const manifest = JSON.parse(
    await readFile(`${phonemizerDist}/data/manifest.json`, 'utf8'),
  );
  const bucketName = manifest.voiceToBucket.ro;
  if (!bucketName) throw new Error('The pinned phonemizer data has no Romanian voice.');
  const bucket = manifest.buckets[bucketName];
  const packed = await readFile(`${phonemizerDist}/data/${bucketName}.data`);
  const entries = Object.entries(bucket.files).sort(
    ([, left], [, right]) => left.offset - right.offset,
  );
  const parts = [];
  const files = {};
  let offset = 0;
  for (const [name, entry] of entries) {
    const content = name === 'ro_dict'
      ? patchedDictionary
      : packed.subarray(entry.offset, entry.offset + entry.length);
    files[name] = { offset, length: content.length };
    parts.push(content);
    offset += content.length;
  }
  await mkdir(`${root}/pronounce/data`, { recursive: true });
  await mkdir(`${root}/pronounce/wasm`, { recursive: true });
  await writeFile(`${root}/pronounce/data/${bucketName}.data`, Buffer.concat(parts));
  await writeFile(`${root}/pronounce/data/core.data`, await readFile(`${phonemizerDist}/data/core.data`));
  await writeFile(`${root}/pronounce/wasm/espeak-ng.wasm`, await readFile(`${phonemizerDist}/wasm/espeak-ng.wasm`));
  await writeFile(`${root}/pronounce/espeak-phonemizer-LICENSE`, await readFile('node_modules/espeak-phonemizer/LICENSE'));
  await writeFile(`${root}/pronounce/espeak-phonemizer-NOTICES`, await readFile('node_modules/espeak-phonemizer/THIRD_PARTY_NOTICES.md'));
  await writeFile(
    `${root}/pronounce/data/manifest.json`,
    `${JSON.stringify(
      {
        generatedAt: manifest.generatedAt,
        core: manifest.core,
        buckets: { [bucketName]: { path: `${bucketName}.data`, files, totalBytes: offset } },
        voiceToBucket: { ro: bucketName },
      },
      null,
      2,
    )}\n`,
  );
  return { bucketName, dictionaryBytes: patchedDictionary.length };
}

// The ONNX runtime web assembly is shared with the English Piper package rather
// than duplicated. Its pinned digest is read from that package's own manifest,
// so there is one source of truth for the runtime identity.
async function sharedRuntime() {
  const manifest = JSON.parse(await readFile('public/tts/piper/manifest.json', 'utf8'));
  const record = manifest.files?.find(({ path: name }) => name === 'ort-wasm-simd-threaded.wasm');
  if (!record) throw new Error('The English speech package does not pin the ONNX runtime.');
  return { path: '../piper/ort-wasm-simd-threaded.wasm', bytes: record.bytes, sha256: record.sha256 };
}

async function build() {
  await mkdir(cache, { recursive: true });
  // Rebuild from scratch: a stale asset from an earlier layout must not survive
  // into a package the pinned inventory does not describe. That includes the
  // retired Liana high weights, now replaced by the medium tier.
  await rm(root, { recursive: true, force: true });
  const loaded = new Map();
  for (const source of sources) {
    const content = await fetchPinned(source);
    loaded.set(source.name, content);
    if (!source.sha256) {
      console.log(`pin ${source.name}: bytes ${content.length}, sha256 ${hash(content)}`);
    }
  }
  let schema;
  try {
    schema = await readFile(path.join(cache, schemaSource.name));
  } catch {
    schema = await download(schemaSource.url);
    await writeFile(path.join(cache, schemaSource.name), schema);
  }
  if (hash(schema) !== schemaSource.sha256) throw new Error('The pinned ONNX schema hash does not match.');
  const Model = protobuf.parse(schema.toString('utf8')).root.lookupType('onnx.ModelProto');
  const voiceStems = { mihai: 'ro_RO-mihai-medium', liana: 'ro_RO-liana-medium' };
  for (const [voice, stem] of Object.entries(voiceStems)) {
    const patched = patchModel(loaded.get(`${voice}/${stem}.onnx`), Model, voice);
    const model = identity.voices.find(({ id }) => id === stem).model;
    if (patched.length !== model.bytes || hash(patched) !== model.sha256) {
      throw new Error(`The derived Romanian model hash does not match: ${voice}`);
    }
    await mkdir(`${root}/${voice}`, { recursive: true });
    for (const [index, file] of model.files.entries()) {
      await writeFile(path.join(root, file), patched.subarray(index * modelPartBytes, (index + 1) * modelPartBytes));
    }
    await writeFile(`${root}/${voice}/config.json`, loaded.get(`${voice}/${stem}.onnx.json`));
  }
  await writeFile(`${root}/mihai/MODEL_CARD`, loaded.get('mihai/MODEL_CARD'));
  await writeFile(`${root}/liana/MODEL_CARD`, loaded.get('liana/README.md'));
  const pronunciation = await buildPronunciation(loaded.get('pronounce/ro_dict'));
  await writeFile(path.join(root, 'NOTICE.txt'), notice(pronunciation.bucketName));
  const files = [];
  for (const name of await inventory(root)) {
    const content = await readFile(path.join(root, name));
    files.push({ path: name, bytes: content.length, sha256: hash(content) });
  }
  console.log(`pin ${root}/manifest.json files:`);
  for (const file of files) console.log(`  ${file.bytes} ${file.sha256} ${file.path}`);
  await writeFile(
    path.join(root, 'manifest.json'),
    `${JSON.stringify(
      {
        ...identity,
        samplesPerDurationFrame: 256,
        runtime: await sharedRuntime(),
        sources: sources.map(({ name, url, bytes, sha256 }) => ({ name, url, bytes, sha256 })),
        files,
      },
      null,
      2,
    )}\n`,
  );
  console.log('Prepared local Romanian speech assets.');
}

function notice(bucketName) {
  return [
    'Romanian neural speech assets. Local inference only; no phrase leaves the device.',
    '',
    `Mihai (ro_RO-mihai-medium): ${piperSource}`,
    `Pinned revision: ${piperRevision}. Published model repository license: MIT. Training data: CC0 (https://github.com/OHF-Voice/voice-datasets).`,
    '',
    `Liana (ro_RO-liana-medium): ${lianaSource}`,
    `Pinned revision: ${lianaRevision}. Published model repository license: CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/).`,
    'Liana is a third-party voice and is not project code; do not relabel it as MIT. Non-commercial use only per its published terms.',
    `The shipped pronunciation dictionary ro_dict and its source ro_extra come from the same revision.`,
    '',
    'Pronunciation runtime: espeak-phonemizer 0.1.2, GPL-3.0-only, inherited from eSpeak NG.',
    `eSpeak NG source revision: ${espeakRevision} (release 1.52.0).`,
    'GPL obligation: the complete corresponding source of eSpeak NG is available at',
    'https://github.com/espeak-ng/espeak-ng and https://github.com/OHF-Voice/piper1-gpl at the pinned revisions above.',
    'See espeak-phonemizer-LICENSE and espeak-phonemizer-NOTICES in this directory.',
    `The shipped pronouncing data is trimmed to Romanian: core.data plus ${bucketName}.data.`,
    '',
    identity.modification,
    'ONNX Runtime is supplied by onnxruntime-web@1.29.0, Microsoft Corporation, MIT; its licence ships with the English Piper package.',
    '',
  ].join('\n');
}

async function inventory(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) names.push(...(await inventory(path.join(directory, entry.name), relative)));
    else names.push(relative);
  }
  return names.sort(comparePaths);
}

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function validateRomanianSpeechAssets(assetRoot = root) {
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'manifest.json'), 'utf8'));
  const expectedManifest = {
    ...identity,
    samplesPerDurationFrame: 256,
    runtime: await sharedRuntime(),
    sources: sources.map(({ name, url, bytes, sha256 }) => ({ name, url, bytes, sha256 })),
    files: expectedFiles,
  };
  if (!isDeepStrictEqual(manifest, expectedManifest)) {
    throw new Error('The Romanian speech asset manifest is invalid.');
  }
  const expectedInventory = [...expectedFiles.map(({ path: name }) => name), 'manifest.json'].sort(comparePaths);
  if (!isDeepStrictEqual(await inventory(assetRoot), expectedInventory)) {
    throw new Error('The Romanian speech asset directory has an invalid inventory.');
  }
  for (const file of expectedFiles) {
    const content = await readFile(path.join(assetRoot, file.path));
    if (content.length !== file.bytes || hash(content) !== file.sha256) {
      throw new Error(`Romanian speech asset hash mismatch: ${file.path}`);
    }
    // Each transport file must fit GitHub's regular Git file limit. Larger
    // models are split without changing the bytes supplied to inference.
    if (content.length >= 100 * 1024 * 1024) {
      throw new Error(`A Romanian speech asset exceeds the single-file budget: ${file.path}`);
    }
  }
  for (const { id, model } of identity.voices) {
    if (model.bytes >= 120 * 1024 * 1024) {
      throw new Error(`A Romanian model exceeds the assembled-model budget: ${id}`);
    }
    const modelHash = createHash('sha256');
    let bytes = 0;
    for (const file of model.files) {
      const content = await readFile(path.join(assetRoot, file));
      modelHash.update(content);
      bytes += content.length;
    }
    if (bytes !== model.bytes || modelHash.digest('hex') !== model.sha256) {
      throw new Error(`The reassembled Romanian model hash does not match: ${id}`);
    }
  }
  for (const [voice, speakerCount] of [['mihai', 1], ['liana', 1]]) {
    const config = JSON.parse(await readFile(`${assetRoot}/${voice}/config.json`, 'utf8'));
    const speakerIdMap = Object.keys(config.speaker_id_map ?? {});
    if (
      config.audio.sample_rate !== identity.sampleRate ||
      config.espeak?.voice !== 'ro' ||
      config.phoneme_type !== 'espeak' ||
      config.num_speakers !== speakerCount ||
      speakerIdMap.length > 1
    ) {
      throw new Error(`The ${voice} Romanian voice configuration is invalid.`);
    }
  }
  const pronunciation = JSON.parse(await readFile(`${assetRoot}/pronounce/data/manifest.json`, 'utf8'));
  if (!isDeepStrictEqual(Object.keys(pronunciation.voiceToBucket), ['ro'])) {
    throw new Error('The shipped pronunciation data must carry Romanian only.');
  }
  // The dictionary is embedded in the bucket, so prove the shipped bytes are
  // Liana's patched dictionary rather than the stock one it replaced.
  const bucket = pronunciation.buckets[pronunciation.voiceToBucket.ro];
  const dictionary = bucket?.files?.ro_dict;
  if (!dictionary) throw new Error('The shipped pronunciation data has no Romanian dictionary.');
  const bundle = await readFile(`${assetRoot}/pronounce/data/${bucket.path}`);
  const shipped = bundle.subarray(dictionary.offset, dictionary.offset + dictionary.length);
  const pinned = sources.find(({ name }) => name === 'pronounce/ro_dict');
  if (shipped.length !== pinned.bytes || hash(shipped) !== pinned.sha256) {
    throw new Error('The shipped Romanian dictionary is not the pinned patched dictionary.');
  }
  console.log('Romanian speech asset validation passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'build') await build();
  else if (process.argv[2] === 'validate') await validateRomanianSpeechAssets();
  else throw new Error('Use romanian-speech-assets.mjs build or validate.');
}
