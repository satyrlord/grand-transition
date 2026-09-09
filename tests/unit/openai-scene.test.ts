import { execFileSync, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test, vi } from 'vitest';
// @ts-expect-error The scene helper is a native ECMAScript module.
import { apiEnvironment, assertReview, cliArguments, inspectImage, inspectInputs, prepareImage, readApiKey, runApiCli, selectRoute } from '../../.github/skills/generate-scene-openai/scripts/scene-image.mjs';

const roots: string[] = [];
const helper = path.resolve('.github/skills/generate-scene-openai/scripts/scene-image.mjs');
const prompt = 'Positive controls:\nNeutral sRGB white balance. Ungraded colors. Warm color is local to authored lights.\nNegative controls:\nNo whole-image color tint.';
const checkNames = ['sceneIdentity', 'style', 'composition', 'layering', 'interfaceClearance', 'artifacts', 'color'];
const reviewFor = (hash: string) => ({ sha256: hash, reviewer: 'Synthetic test fixture', issues: [],
  checks: Object.fromEntries(checkNames.map((name) => [name, { pass: true, evidence: 'Synthetic review for conversion testing only.' }])) });
const cliOptions = { cli: 'installed/image_gen.py', prompt: 'private/prompt.txt', output: 'tmp/candidate.png', size: '3840x2160' };

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gt-openai-scene-test-'));
  roots.push(dir);
  return dir;
}
async function raster(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#123456' } }).png().toBuffer();
}

describe('OpenAI scene generation and credit controls', () => {
  test('routes by requested pixel count and keeps exactly 1080p internal', () => {
    for (const size of ['1280x720', '1920x1080', '1080x1920', '1024x1024', '1600x1200']) {
      expect(selectRoute(size).route).toBe('internal');
    }
    for (const size of ['1920x1088', '2048x2048', '3840x2160', '2160x3840']) {
      expect(selectRoute(size).route).toBe('api');
    }
    for (const size of ['auto', '0x1080', '-1x1080', '1920.5x1080']) expect(() => selectRoute(size)).toThrow();
  });

  test('blocks small API calls before spawning a process or reading inputs', async () => {
    const runner = vi.fn();
    await expect(runApiCli({ ...cliOptions, size: '1920x1080' }, 'synthetic-key', runner)).rejects.toThrow('internal image generator');
    expect(runner).not.toHaveBeenCalled();
    const result = spawnSync(process.execPath, [helper, 'generate', '--size', '1280x720', '--prompt', 'missing-prompt', '--out', 'missing-output'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No API request is permitted');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('uses the installed API CLI with explicit native size and reference mode only when requested', () => {
    const text = cliArguments(cliOptions);
    expect(text).toContain('generate');
    expect(text).not.toContain('--image');
    expect(text[text.indexOf('--size') + 1]).toBe('3840x2160');
    expect(text[text.indexOf('--model') + 1]).toBe('gpt-image-2.5-sunburst');
    expect(text).toContain('--no-augment');
    const reference = cliArguments({ ...cliOptions, references: ['first.png', 'second.webp'] });
    expect(reference).toContain('edit');
    expect(reference.filter((arg: string) => arg === '--image')).toHaveLength(2);
    expect(() => cliArguments({ ...cliOptions, size: '3841x2160' })).toThrow('supported');
    expect(() => cliArguments({ ...cliOptions, size: '1921x1081' })).toThrow('supported');
  });

  test('validates private prompts and reference bytes without a network request', async () => {
    const dir = await root(), promptFile = path.join(dir, 'prompt.txt'), reference = path.join(dir, 'reference.png');
    await writeFile(promptFile, prompt);
    const bytes = await raster(32, 32);
    await writeFile(reference, bytes);
    expect((await inspectInputs(promptFile)).references).toEqual([]);
    expect((await inspectInputs(promptFile, [reference])).references[0]).toMatchObject({ width: 32, height: 32, format: 'png' });
    expect(await readFile(reference)).toEqual(bytes);
    await expect(inspectInputs(promptFile, Array(17).fill(reference))).rejects.toThrow('16');
    await writeFile(promptFile, 'Uncontrolled warm lighting.');
    await expect(inspectInputs(promptFile)).rejects.toThrow('color guard');
  });

  test('rejects lower-resolution results, corrupted files, and stale visual reviews', async () => {
    const small = await raster(1672, 941);
    await expect(inspectImage(small)).rejects.toThrow('3840x2160');
    await expect(inspectImage(small.subarray(0, 40))).rejects.toThrow();
    expect(() => assertReview(reviewFor('old'), { sha256: 'new' })).toThrow('current image review');
    const review = reviewFor('same');
    delete review.checks.style;
    expect(() => assertReview(review, { sha256: 'same' })).toThrow('style');
  });

  test('preserves exact 4K masters and downscales only for a smaller declared master', async () => {
    const bytes = await raster(3840, 2160), facts = await inspectImage(bytes);
    const native = await prepareImage(bytes, reviewFor(facts.sha256), 'modern-debate-studio');
    expect(native.output).toEqual(bytes);
    expect(native.record.operation).toBe('preserve-native-pixels');
    const smaller = await prepareImage(bytes, reviewFor(facts.sha256), 'county-council-ballroom');
    expect(await sharp(smaller.output).metadata()).toMatchObject({ width: 1920, height: 1080 });
    const hd = await raster(1920, 1080), hdFacts = await inspectImage(hd, { width: 1920, height: 1080 });
    await expect(prepareImage(hd, reviewFor(hdFacts.sha256), 'modern-debate-studio', { width: 1920, height: 1080 })).rejects.toThrow('Do not upscale');
    await expect(prepareImage(bytes, reviewFor(facts.sha256), 'undeclared-scene')).rejects.toThrow('not declared');
  });

  test('isolates credentials and does not repeat failed CLI attempts', async () => {
    expect(apiEnvironment('synthetic-file-key', { OPENAI_API_KEY: 'ambient', OPENAI_BASE_URL: 'https://invalid.example', OPENAI_LOG: 'debug' }))
      .toEqual({ OPENAI_API_KEY: 'synthetic-file-key' });
    const runner = vi.fn(() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit('close', 1));
      return child;
    });
    await expect(runApiCli(cliOptions, 'synthetic-file-key', runner)).rejects.toThrow('exit code 1');
    expect(runner).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(runner.mock.calls[0]?.slice(0, 2))).not.toContain('synthetic-file-key');
  });

  test('reads only the ignored OpenAI credential file and rejects tracked credentials', async () => {
    const dir = await root();
    execFileSync('git', ['init', '--quiet', dir]);
    await writeFile(path.join(dir, '.gitignore'), '.env.local\n');
    await writeFile(path.join(dir, '.env.local'), 'OPENAI_API_KEY="synthetic-file-key"\n');
    expect(await readApiKey(dir)).toBe('synthetic-file-key');
    execFileSync('git', ['add', '-f', '.env.local'], { cwd: dir });
    await expect(readApiKey(dir)).rejects.toThrow('untracked');
  });
});
