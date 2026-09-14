import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { sampleContent } from '../../src/game-content';

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

  test('rejects overlapping and out-of-bounds music edits', () => {
    const definitions = structuredClone(tools.sceneMusicDefinitions);
    definitions[1].edit.startSeconds = definitions[0].edit.startSeconds;
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/overlap/u);
    definitions[1].edit.startSeconds = 400;
    expect(() => tools.validateMusicDefinitions(definitions)).toThrow(/outside the pinned recording/u);
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
  test('ships one distinct manifest-backed treatment per scene and nine effects, with no room tone', () => {
    const manifest = JSON.parse(original);
    const music = manifest.assets.filter((asset: { kind: string }) => asset.kind === 'music');
    expect(music).toHaveLength(7);
    expect(manifest.assets.filter((asset: { kind: string }) => asset.kind === 'effect')).toHaveLength(9);
    expect(manifest.assets).toHaveLength(16);
    expect(manifest.assets.some((asset: { id: string }) => asset.id.includes('room-tone'))).toBe(false);
    expect(new Set(music.map((asset: { id: string }) => asset.id)).size).toBe(7);
    const sceneMusic = new Map(music.map((asset: { id: string; sceneId: string }) => [asset.sceneId, asset.id]));
    expect(sceneMusic.get('menu')).toBe('menu-theme');
    for (const scene of sampleContent.scenes) {
      expect(sceneMusic.get(scene.id), scene.id).toBe(scene.music.assetId);
    }
  });
});
