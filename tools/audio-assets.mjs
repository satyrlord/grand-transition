import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

export const audioDefinitions = [
  ['menu-theme', 'music', 72.3],
  ['transition-era-television-studio-theme', 'music', 43.7],
  ['role-select', 'effect', 0.16], ['commit', 'effect', 0.32],
  ['hit-light', 'effect', 0.28], ['hit-heavy', 'effect', 0.55],
  ['weakness', 'effect', 0.45], ['combo', 'effect', 0.6],
  ['continuation-break', 'effect', 0.45], ['comeback', 'effect', 0.75],
  ['grammar-mistake', 'effect', 0.3],
];
const sampleRate = 48000;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const recording = {
  owner: 'Chris Breemer', license: 'CC0-1.0',
  source: 'https://imslp.org/wiki/Special:ReverseLookup/991622',
  download: 'https://s9.imslp.org/files/imglnks/usimg/b/ba/IMSLP991622-PMLP3387-bartok-romanian-folk-dances-breemer.mp3',
  sourceSha256: '6a014e07e2f56ae1faffa5ac496aba6b06f4aa456a920b93d992051f14fa4ac6',
  composer: 'Béla Bartók', composition: 'Romanian Folk Dances, Sz.56 (1915)',
  compositionLicense: 'Public domain', recordingYear: 2025,
};
const musicEdits = {
  'menu-theme': { movement: 'Joc cu bâtă', startSeconds: 2.4, durationSeconds: 72.3 },
  'transition-era-television-studio-theme': { movement: 'Buciumeana', startSeconds: 181.3, durationSeconds: 43.7 },
};
const originalProvenance = { owner: 'Grand Transition contributors',
  source: 'Original procedural composition; tools/audio-assets.mjs', license: 'CC-BY-NC-4.0' };
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-nostdin', ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
});

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
  const manifest = JSON.parse(await readFile(path.join(root, 'audio-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.assets.length !== audioDefinitions.length) {
    throw new Error('Audio inventory is incomplete.');
  }
  const expected = ['audio-manifest.json'];
  const runtimeHashes = new Set();
  for (const [id, kind] of audioDefinitions) {
    const asset = manifest.assets.find((entry) => entry.id === id);
    const provenance = kind === 'music' ? { ...recording, edit: musicEdits[id] } : originalProvenance;
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
  for (const [index, [id, kind, duration]] of audioDefinitions.entries()) {
    const raw = path.join(temporary, `${id}.pcm`);
    const master = path.join(root, `${id}.wav`);
    const filter = kind === 'effect' ? 'volume=0.7' : 'loudnorm=I=-16:TP=-2:LRA=7';
    if (kind === 'music') {
      const edit = musicEdits[id];
      run(['-y', '-ss', String(edit.startSeconds), '-t', String(duration), '-i', reference,
        '-af', `afade=t=in:d=0.04,afade=t=out:st=${duration - 0.25}:d=0.25,${filter}`,
        '-map_metadata', '-1', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', master]);
    } else {
      await writeFile(raw, compose(index - 2, duration));
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
      ...(kind === 'music' ? { ...recording, edit: musicEdits[id] } : originalProvenance), files });
    console.log(`Built ${id}.`);
  }
  await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify({ schemaVersion: 1, assets }, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  if (action === 'build') await buildAudio();
  else if (action === 'validate') {
    await validateAudio();
    console.log('Audio validation passed: 11 masters and 22 runtime files.');
  } else throw new Error('Use audio-assets.mjs build or validate.');
}
