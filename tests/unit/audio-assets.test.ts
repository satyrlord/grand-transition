import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { gameCatalog } from '../../src/game-content';

const tools = await import(pathToFileURL(path.resolve('tools/audio-assets.mjs')).href);
const valid = { codec: 'vorbis', sampleRate: 48000, integratedLufs: -16, truePeakDbfs: -2 };

describe('audio asset measurements', () => {
  test.each([
    [{ ...valid, sampleRate: 44100 }, 'music', 'ogg', 'sample rate'],
    [{ ...valid, codec: 'mp3' }, 'music', 'ogg', 'codec'],
    [{ ...valid, integratedLufs: -17.01 }, 'music', 'ogg', 'loudness'],
    [{ ...valid, integratedLufs: -14.99 }, 'music', 'ogg', 'loudness'],
    [{ ...valid, truePeakDbfs: -0.99 }, 'effect', 'ogg', 'true peak'],
    [{ ...valid, truePeakDbfs: 0.01 }, 'music', 'ogg', 'true peak'],
    [{ ...valid, truePeakDbfs: NaN }, 'effect', 'ogg', 'true peak'],
  ])('rejects invalid measurement %j', (value, kind, format, message) => {
    expect(() => tools.validateMeasurement(value, kind, format)).toThrow(message);
  });

  test.each([-17, -15])('accepts the music loudness boundary %s', (value) => {
    expect(() => tools.validateMeasurement({ ...valid, integratedLufs: value }, 'music', 'ogg')).not.toThrow();
  });
  test('accepts the effect true-peak boundary', () => {
    expect(() => tools.validateMeasurement({ ...valid, truePeakDbfs: -1 }, 'effect', 'ogg')).not.toThrow();
  });

  test('rejects overlapping and out-of-bounds music edits from the same source', () => {
    const definitions = structuredClone(tools.sceneMusicDefinitions);
    definitions[1].provenance = definitions[0].provenance;
    definitions[1].sourceDurationSeconds = definitions[0].sourceDurationSeconds;
    definitions[1].edit.startSeconds = definitions[0].edit.startSeconds;
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/overlap/u);
    definitions[1].edit.startSeconds = 400;
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/outside the pinned recording/u);
  });

  test('accepts only public-domain and CC BY music with pinned HTTPS provenance', () => {
    const definitions = structuredClone(tools.sceneMusicDefinitions);
    definitions[1].provenance.license = 'CC-BY-NC-4.0';
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/provenance/u);
    definitions[1].provenance.license = 'CC-BY-4.0';
    definitions[1].provenance.source = 'http://example.com/track';
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/provenance/u);
  });
});

describe('complete music loops', () => {
  test('rejects a truncated phrase and an audible waveform jump', () => {
    expect(() => tools.validateLoopMeasurement({ durationSeconds: 60, seamJump: 0 },
      132.41379310344828, 'ogg')).toThrow(/duration/u);
    expect(() => tools.validateLoopMeasurement({ durationSeconds: 132, seamJump: 0.2 },
      132, 'ogg')).toThrow(/discontinuity/u);
  });

  test('repairs a stereo seam without removing frames or fading the body', () => {
    const pcm = Buffer.alloc(4800 * 8);
    for (let frame = 0; frame < 4800; frame += 1) {
      pcm.writeFloatLE(frame / 4800, frame * 8);
      pcm.writeFloatLE(-frame / 4800, frame * 8 + 4);
    }
    const repaired = tools.closeLoopSeam(pcm);
    expect(repaired.length).toBe(pcm.length);
    for (const channel of [0, 1]) {
      expect(repaired.readFloatLE(channel * 4)).toBe(repaired.readFloatLE(repaired.length - 8 + channel * 4));
    }
    expect(repaired.subarray(240 * 8)).toEqual(pcm.subarray(240 * 8));
    expect(pcm.readFloatLE(0)).toBe(0);
  });

  test('extends the source with a distinct breakdown and preserves the original first phrase', () => {
    const pcm = Buffer.alloc(4800 * 8);
    for (let frame = 0; frame < 4800; frame += 1) {
      for (const channel of [0, 1]) pcm.writeFloatLE(Math.sin(frame * 0.9) * 0.3, frame * 8 + channel * 4);
    }
    const arranged = tools.arrangeMusicLoop(pcm, { repetitions: 2, breakdownSeconds: 0.05 });
    expect(arranged.length).toBe(pcm.length * 2);
    expect(arranged.subarray(0, pcm.length)).toEqual(tools.closeLoopSeam(pcm));
    expect(arranged.subarray(pcm.length, pcm.length + 2400 * 8)).not.toEqual(arranged.subarray(0, 2400 * 8));
    expect(arranged.subarray(pcm.length + 2400 * 8)).toEqual(arranged.subarray(2400 * 8, pcm.length));
  });

  test.each(['modern-debate-studio', 'palace-press-hall', 'influencer-campaign-livestream'])(
    'ships a complete continuous phrase in all formats for %s', (sceneId) => {
      const definition = tools.sceneMusicDefinitions.find((entry: { sceneId: string }) => entry.sceneId === sceneId);
      for (const format of ['wav', 'ogg', 'mp3']) {
        const measured = tools.loopMeasurements(`src/assets/audio/${sceneId}-theme.${format}`);
        expect(() => tools.validateLoopMeasurement(measured, definition.duration, format)).not.toThrow();
      }
    });
});

describe('audio asset inventory', () => {
  let root: string;
  let original: string;
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-audio-'));
    await cp('src/assets/audio', root, { recursive: true });
    original = await readFile(path.join(root, 'audio-manifest.json'), 'utf8');
  });
  afterAll(async () => { await rm(root, { recursive: true, force: true }); });

  test.each(['owner', 'license', 'source', 'sceneId', 'id', 'kind'])('rejects missing or invalid %s', async (field) => {
    const manifest = JSON.parse(original);
    manifest.assets[0][field] = '';
    await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify(manifest));
    await expect(tools.validateAudio(root)).rejects.toThrow(/ownership|identity/u);
  });
  test('rejects a missing paired runtime format', async () => {
    const manifest = JSON.parse(original);
    manifest.assets[0].files.pop();
    await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify(manifest));
    await expect(tools.validateAudio(root)).rejects.toThrow('formats are incomplete');
  });
  test('rejects altered asset bytes by their manifest hash', async () => {
    const manifest = JSON.parse(original);
    manifest.assets[0].files[0].sha256 = '0'.repeat(64);
    await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify(manifest));
    await expect(tools.validateAudio(root)).rejects.toThrow('hash mismatch');
  });
  test('rejects an incomplete asset inventory', async () => {
    const manifest = JSON.parse(original);
    manifest.assets.pop();
    await writeFile(path.join(root, 'audio-manifest.json'), JSON.stringify(manifest));
    await expect(tools.validateAudio(root)).rejects.toThrow('inventory is incomplete');
  });
  test('ships one distinct manifest-backed treatment per scene and ten effects, with no room tone', () => {
    const manifest = JSON.parse(original);
    const music = manifest.assets.filter((asset: { kind: string }) => asset.kind === 'music');
    expect(music).toHaveLength(8);
    expect(manifest.assets.filter((asset: { kind: string }) => asset.kind === 'effect')).toHaveLength(10);
    expect(manifest.assets).toHaveLength(18);
    expect(manifest.assets.some((asset: { id: string }) => asset.id.includes('room-tone'))).toBe(false);
    expect(new Set(music.map((asset: { id: string }) => asset.id)).size).toBe(8);
    const sceneMusic = new Map(music.map((asset: { id: string; sceneId: string }) => [asset.sceneId, asset.id]));
    expect(sceneMusic.get('menu')).toBe('menu-theme');
    for (const scene of gameCatalog.scenes) {
      expect(sceneMusic.get(scene.id), scene.id).toBe(scene.music.assetId);
    }
    const playableMusic = music.filter((asset: { sceneId: string }) => asset.sceneId !== 'menu');
    expect(new Set(playableMusic.map((asset: { sourceSha256: string }) => asset.sourceSha256)).size).toBe(7);
    expect(playableMusic.every((asset: { license: string }) =>
      ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'Public domain'].includes(asset.license))).toBe(true);
    expect(playableMusic.find((asset: { sceneId: string }) =>
      asset.sceneId === 'influencer-campaign-livestream')?.treatment).toMatch(/trap/iu);
    expect(playableMusic.find((asset: { sceneId: string }) =>
      asset.sceneId === 'civic-cypher-boxing-ring')?.treatment).toMatch(/boom-bap/iu);
  });

  test('keeps the established Scene 1 recording bytes unchanged', () => {
    const manifest = JSON.parse(original);
    const sceneOne = manifest.assets.find((asset: { id: string }) =>
      asset.id === 'transition-era-television-studio-theme');
    expect(sceneOne.files.map((file: { sha256: string }) => file.sha256)).toEqual([
      '799fdb6a00c2f46d1e966d24c506b8e8c152ae48f6fdcd6045b45f240d007c80',
      '370e1a7afe6199028a22f14bb93bcfba9ef8f14d85fb0baf302ae88087be3c1b',
      'df5e1f91ca82fb68e5c072dc422afb9381d096e0c885c3063c38a577bf92f57b',
    ]);
  });

  test('credits every music source and creator in README and CREDITS', async () => {
    const manifest = JSON.parse(original);
    const documents = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('CREDITS.md', 'utf8'),
    ]);
    for (const asset of manifest.assets.filter((entry: { kind: string }) => entry.kind === 'music')) {
      const title = asset.title ?? asset.edit.movement;
      for (const document of documents) {
        expect(document, `${asset.id} title`).toContain(title);
        expect(document, `${asset.id} creator`).toContain(asset.owner);
        expect(document, `${asset.id} source`).toContain(asset.source);
        expect(document, `${asset.id} license`).toContain(
          asset.license.startsWith('CC0') ? 'CC0' : 'CC BY 4.0',
        );
      }
    }
  });
});
