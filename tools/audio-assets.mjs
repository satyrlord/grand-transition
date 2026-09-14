import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

const musicDefinitions = [
  { id: 'menu-theme', sceneId: 'menu', duration: 72.3,
    edit: { movement: 'Joc cu bâtă', startSeconds: 2.4, durationSeconds: 72.3 } },
  { id: 'transition-era-television-studio-theme', sceneId: 'transition-era-television-studio', duration: 43.7,
    edit: { movement: 'Buciumeana', startSeconds: 181.3, durationSeconds: 43.7 } },
  { id: 'modern-debate-studio-theme', sceneId: 'modern-debate-studio', duration: 31.2,
    edit: { movement: 'Brâul', startSeconds: 76.4, durationSeconds: 31.2 } },
  { id: 'county-council-ballroom-theme', sceneId: 'county-council-ballroom', duration: 32.4,
    edit: { movement: 'Poarga românească', startSeconds: 227.2, durationSeconds: 32.4 } },
  { id: 'midnight-call-in-studio-theme', sceneId: 'midnight-call-in-studio', duration: 28,
    edit: { movement: 'Mărunțel, first section', startSeconds: 260.3, durationSeconds: 28 } },
  { id: 'palace-press-hall-theme', sceneId: 'palace-press-hall', duration: 65.3,
    edit: { movement: 'Pe loc', startSeconds: 111.7, durationSeconds: 65.3 } },
  { id: 'influencer-campaign-livestream-theme', sceneId: 'influencer-campaign-livestream', duration: 29.1,
    edit: { movement: 'Mărunțel, second section', startSeconds: 289, durationSeconds: 29.1 } },
];
export const sceneMusicDefinitions = musicDefinitions.filter(({ sceneId }) => sceneId !== 'menu');
const effectDefinitions = [
  ['role-select', 'effect', 0.16], ['commit', 'effect', 0.32],
  ['hit-light', 'effect', 0.28], ['hit-heavy', 'effect', 0.55],
  ['weakness', 'effect', 0.45], ['combo', 'effect', 0.6],
  ['continuation-break', 'effect', 0.45], ['comeback', 'effect', 0.75],
  ['grammar-mistake', 'effect', 0.3],
];
export const audioDefinitions = [
  ...musicDefinitions.map(({ id, duration }) => [id, 'music', duration]),
  ...effectDefinitions,
];
const sampleRate = 48000;
const recordingDurationSeconds = 322.011;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const recording = {
  owner: 'Chris Breemer', license: 'CC0-1.0',
  source: 'https://imslp.org/wiki/Special:ReverseLookup/991622',
  download: 'https://s9.imslp.org/files/imglnks/usimg/b/ba/IMSLP991622-PMLP3387-bartok-romanian-folk-dances-breemer.mp3',
  sourceSha256: '6a014e07e2f56ae1faffa5ac496aba6b06f4aa456a920b93d992051f14fa4ac6',
  composer: 'Béla Bartók', composition: 'Romanian Folk Dances, Sz.56 (1915)',
  compositionLicense: 'Public domain', recordingYear: 2025,
};
const musicById = new Map(musicDefinitions.map((definition) => [definition.id, definition]));
const originalProvenance = { owner: 'Grand Transition contributors',
  source: 'Original procedural composition; tools/audio-assets.mjs', license: 'CC-BY-NC-4.0' };
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-nostdin', ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
});

export function validateMusicDefinitions(definitions = musicDefinitions) {
  const ids = new Set();
  const sceneIds = new Set();
  const windows = [];
  for (const definition of definitions) {
    if (!definition || typeof definition.id !== 'string' || !definition.id ||
      typeof definition.sceneId !== 'string' || !definition.sceneId ||
      ids.has(definition.id) || sceneIds.has(definition.sceneId)) {
      throw new Error('Music IDs and scene IDs must be present and unique.');
    }
    const { startSeconds, durationSeconds } = definition.edit ?? {};
    if (!Number.isFinite(startSeconds) || !Number.isFinite(durationSeconds) ||
      durationSeconds !== definition.duration || startSeconds < 0 || durationSeconds <= 0 ||
      startSeconds + durationSeconds > recordingDurationSeconds) {
      throw new Error(`Music edit is outside the pinned recording: ${definition.id}.`);
    }
    ids.add(definition.id);
    sceneIds.add(definition.sceneId);
    windows.push({ id: definition.id, start: startSeconds, end: startSeconds + durationSeconds });
  }
  const ordered = windows.toSorted((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].start < ordered[index - 1].end) {
      throw new Error(`Music edits overlap: ${ordered[index - 1].id} and ${ordered[index].id}.`);
    }
  }
  return definitions;
}

export function audioMeasurements(file) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', file,
    '-af', 'loudnorm=I=-16:TP=-1:LRA=7:print_format=json', '-f', 'null', '-'], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Audio decode failed: ${file}\n${result.stderr}`);
  const report = /\{\s*"input_i"[\s\S]*?\}/u.exec(result.stderr);
  const stream = /Audio: ([^,]+), (\d+) Hz/u.exec(result.stderr);
  if (!report || !stream) throw new Error(`Audio measurement is missing: ${file}`);
  const values = JSON.parse(report[0]);
  return { codec: stream[1].split(' ')[0], sampleRate: Number(stream[2]),
    integratedLufs: Number(values.input_i), truePeakDbfs: Number(values.input_tp) };
}

export function validateMeasurement(value, kind, format) {
  if (value.sampleRate !== sampleRate) throw new Error('Audio sample rate must be 48000 Hz.');
  const codec = format === 'ogg' ? 'vorbis' : format === 'mp3' ? 'mp3' : 'pcm_s16le';
  if (value.codec !== codec) throw new Error(`Audio codec must be ${codec}.`);
  if (!Number.isFinite(value.truePeakDbfs) || value.truePeakDbfs > (kind === 'effect' ? -1 : 0)) {
    throw new Error('Audio true peak exceeds the permitted limit.');
  }
  if (kind === 'music') {
    const target = -16;
    const tolerance = 1;
    if (!Number.isFinite(value.integratedLufs) || Math.abs(value.integratedLufs - target) > tolerance) {
      throw new Error('Audio loudness is outside the permitted range.');
    }
  }
}

export async function validateAudio(root = 'src/assets/audio') {
  validateMusicDefinitions();
  const manifest = JSON.parse(await readFile(path.join(root, 'audio-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.assets.length !== audioDefinitions.length) {
    throw new Error('Audio inventory is incomplete.');
  }
  const expected = ['audio-manifest.json'];
  const runtimeHashes = new Set();
  for (const [id, kind] of audioDefinitions) {
    const asset = manifest.assets.find((entry) => entry.id === id);
    const music = musicById.get(id);
    const provenance = kind === 'music'
      ? { ...recording, sceneId: music?.sceneId, edit: music?.edit }
      : originalProvenance;
    if (!asset || asset.kind !== kind || Object.entries(provenance).some(([key, value]) =>
      JSON.stringify(asset[key]) !== JSON.stringify(value))) {
      throw new Error(`Audio ownership or identity is invalid: ${id}`);
    }
    if (asset.files.length !== 3) throw new Error(`Audio formats are incomplete: ${id}`);
    for (const format of ['wav', 'ogg', 'mp3']) {
      const fileName = `${id}.${format}`;
      expected.push(fileName);
      const entry = asset.files.find((file) => file.path === fileName);
      if (!entry) throw new Error(`Audio format is missing: ${fileName}`);
      const digest = hash(await readFile(path.join(root, fileName)));
      if (digest !== entry.sha256) throw new Error(`Audio hash mismatch: ${fileName}`);
      if (format !== 'wav' && runtimeHashes.has(digest)) throw new Error('Audio assets must be distinct.');
      if (format !== 'wav') runtimeHashes.add(digest);
      const actual = audioMeasurements(path.join(root, fileName));
      validateMeasurement(actual, kind, format);
      if (JSON.stringify(actual) !== JSON.stringify(entry.measurements)) {
        throw new Error(`Audio measurements are stale: ${fileName}`);
      }
    }
  }
  if (JSON.stringify((await readdir(root)).sort()) !== JSON.stringify(expected.sort())) {
    throw new Error('Audio directory contains unmanifested files.');
  }
  return manifest;
}

function compose(index, duration) {
  const buffer = Buffer.alloc(Math.round(duration * sampleRate) * 4);
  for (let frame = 0; frame < buffer.length / 4; frame++) {
    const t = frame / sampleRate;
    const u = t / duration;
    const envelope = Math.min(1, t / 0.005) * (1 - u) ** 3;
    const frequencies = [920, 660, 180, 85, 1240, 520, 300, 390, 145];
    const frequency = frequencies[index];
    const rising = [1, 4, 5, 7].includes(index);
    const phase = 2 * Math.PI * frequency * (t + (rising ? 1 : -0.45) * t * t / duration);
    const impact = [2, 3, 6, 8].includes(index) ?
      0.12 * Math.sin(phase * 2.3) * Math.exp(-t * 35) : 0;
    const left = envelope * (0.5 * Math.sin(phase) + 0.15 * Math.sin(phase * 1.5) + impact);
    const right = left;
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), frame * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), frame * 4 + 2);
  }
  return buffer;
}

async function buildAudio(root = 'src/assets/audio') {
  validateMusicDefinitions();
  await mkdir(root, { recursive: true });
  const temporary = path.resolve('tmp/audio-build');
  await mkdir(temporary, { recursive: true });
  const reference = path.join(temporary, 'romanian-folk-dances-breemer.mp3');
  let referenceBytes;
  try { referenceBytes = await readFile(reference); } catch {
    const response = await fetch(recording.download);
    if (!response.ok) throw new Error('The public-domain music download failed.');
    referenceBytes = Buffer.from(await response.arrayBuffer());
  }
  if (hash(referenceBytes) !== recording.sourceSha256) throw new Error('The public-domain recording hash does not match.');
  await writeFile(reference, referenceBytes);
  const assets = [];
  for (const [id, kind, duration] of audioDefinitions) {
    const raw = path.join(temporary, `${id}.pcm`);
    const master = path.resolve(root, `${id}.wav`);
    const establishedMusic = ['menu-theme', 'transition-era-television-studio-theme'].includes(id);
    const filter = kind === 'effect' ? 'volume=0.7' : 'loudnorm=I=-16:TP=-2:LRA=7';
    if (kind === 'music') {
      const edit = musicById.get(id)?.edit;
      if (!edit) throw new Error(`Music edit is missing: ${id}`);
      const prepared = establishedMusic ? master : path.join(temporary, `${id}-prepared.wav`);
      run(['-y', '-ss', String(edit.startSeconds), '-t', String(duration), '-i', reference,
        '-af', `afade=t=in:d=0.04,afade=t=out:st=${duration - 0.25}:d=0.25,${filter}`,
        '-map_metadata', '-1', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', prepared]);
      if (!establishedMusic) {
        const adjustmentDb = -16 - audioMeasurements(prepared).integratedLufs;
        run(['-y', '-i', prepared, '-af', `volume=${adjustmentDb}dB`, '-map_metadata', '-1',
          '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', master]);
      }
    } else {
      const effectIndex = effectDefinitions.findIndex(([effectId]) => effectId === id);
      await writeFile(raw, compose(effectIndex, duration));
      run(['-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', raw, '-af', filter,
        '-ar', '48000', '-c:a', 'pcm_s16le', master]);
    }
    const files = [];
    for (const format of ['wav', 'ogg', 'mp3']) {
      const fileName = `${id}.${format}`;
      const fullPath = path.join(root, fileName);
      if (format !== 'wav') run(['-y', '-i', master, '-map_metadata', '-1', '-ar', '48000',
        ...(format === 'ogg' ? ['-c:a', 'libvorbis', '-q:a', '4'] : ['-c:a', 'libmp3lame', '-b:a', '128k']), fullPath]);
      const measurements = audioMeasurements(fullPath);
      validateMeasurement(measurements, kind, format);
      files.push({ path: fileName, sha256: hash(await readFile(fullPath)), measurements });
    }
    assets.push({ id, kind, duration,
      ...(kind === 'music'
        ? { ...recording, sceneId: musicById.get(id).sceneId, edit: musicById.get(id).edit }
        : originalProvenance), files });
    console.log(`Built ${id}.`);
  }
  await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify({ schemaVersion: 1, assets }, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  if (action === 'build') await buildAudio();
  else if (action === 'validate') {
    const manifest = await validateAudio();
    console.log(`Audio validation passed: ${manifest.assets.length} masters and ${manifest.assets.length * 2} runtime files.`);
  } else throw new Error('Use audio-assets.mjs build or validate.');
}
