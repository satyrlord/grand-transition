import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
// @ts-expect-error The scene helper is a native ECMAScript module.
import { assertReview, candidateReviewState, inspectImage, inspectInputs, prepareImage, readApiKey, selectRoute } from '../../.github/skills/generate-scene-openai/scripts/scene-image.mjs';

const roots: string[] = [];
const helper = path.resolve('.github/skills/generate-scene-openai/scripts/scene-image.mjs');
const prompt = 'Positive controls:\nNeutral sRGB white balance. Ungraded colors. Warm color is local to authored lights.\nNegative controls:\nNo whole-image color tint.';
const checkNames = ['sceneIdentity', 'style', 'composition', 'layering', 'interfaceClearance', 'artifacts', 'color'];
const reviewFor = (hash: string) => ({ sha256: hash, reviewer: 'Synthetic test fixture', issues: [],
  checks: Object.fromEntries(checkNames.map((name) => [name, { pass: true, evidence: 'Synthetic review for conversion testing only.' }])) });

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

  test('routes transparent and exact-size masters directly to Sunburst', () => {
    expect(selectRoute('1024x1024', { background: 'transparent' }).route).toBe('api');
    expect(selectRoute('1024x1024', { exactSize: true }).route).toBe('api');
    expect(() => selectRoute('1920x1080', { exactSize: true })).toThrow('supported Sunburst dimensions');
    expect(selectRoute('1920x1080', { background: 'opaque' }).route).toBe('internal');
    expect(selectRoute('2048x2048', { background: 'transparent' }).route).toBe('api');
  });

  test('requires alpha review without claiming that bounded preparation can repair every defect', () => {
    expect(candidateReviewState({ valid: false })).toBe('alpha-review-required');
    expect(candidateReviewState({ valid: true })).toBe('visual-review-required');
    expect(candidateReviewState(undefined)).toBe('visual-review-required');
  });

  test('blocks unintended small opaque API calls before reading inputs', () => {
    const result = spawnSync(process.execPath, [helper, 'generate', '--size', '1280x720', '--prompt', 'missing-prompt', '--out', 'missing-output'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No API request is permitted');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('unsupported native HD dimensions fail before inputs; HD masters use a supported 4K source', () => {
    const result = spawnSync(process.execPath, [helper, 'generate', '--size', '1920x1080', '--exact-size',
      '--prompt', 'missing-prompt', '--out', 'tmp/unsupported-hd-source', '--dry-run'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('supported Sunburst dimensions');
    expect(result.stderr).not.toContain('ENOENT');
    expect(selectRoute('3840x2160', { exactSize: true }).route).toBe('api');
  });

  test('rejects invalid background selection before reading inputs', () => {
    const result = spawnSync(process.execPath, [helper, 'generate', '--background', 'invalid',
      '--prompt', 'missing-prompt', '--out', 'tmp/missing-output', '--dry-run'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('transparent, opaque, or auto');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('constructs a transparent edit request without an installed CLI, credential read or output files', async () => {
    const dir = await root(), promptFile = path.join(dir, 'prompt.txt');
    await writeFile(promptFile, prompt);
    const image = path.join(dir, 'reference.png');
    await writeFile(image, await raster(32, 32));
    const result = spawnSync(process.execPath, [helper, 'generate', '--background', 'transparent',
      '--size', '2048x2048', '--reference', image,
      '--prompt', promptFile, '--out', 'tmp/transparency-dry-run', '--dry-run'],
    { encoding: 'utf8', env: { ...process.env, CODEX_HOME: dir, OPENAI_API_KEY: 'must-not-be-read', OPENAI_BASE_URL: 'https://invalid.example' } });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ background: 'transparent', networkRequest: false,
      requestConstructed: true, inputMode: 'edit', endpoint: 'https://api.openai.com/v1/images/edits', requestedSize: '2048x2048' });
    expect(result.stdout).not.toContain('must-not-be-read');
    expect(result.stdout).not.toContain(prompt);
    await expect(readFile('tmp/transparency-dry-run/request-record.json')).rejects.toThrow();
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

  test('existing run paths fail before credential loading or generation', async () => {
    const dir = await mkdtemp(path.resolve('tmp/sunburst-existing-run-'));
    roots.push(dir);
    const result = spawnSync(process.execPath, [helper, 'generate', '--background', 'transparent',
      '--size', '2048x2048', '--prompt', 'missing-prompt', '--out', dir], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('output path already exists');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('native preparation rejects invalid input without writing output or replacing evidence', async () => {
    const dir = await mkdtemp(path.resolve('tmp/sunburst-native-output-'));
    roots.push(dir);
    const input = path.join(dir, 'input.png'), out = path.join(dir, 'prepared.png');
    const bytes = await raster(32, 32);
    await writeFile(input, bytes);
    const invalid = spawnSync(process.execPath, [helper, 'prepare-native', '--input', input, '--out', out], { encoding: 'utf8' });
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('alpha channel');
    await expect(readFile(out)).rejects.toThrow();
    const record = `${out}.preparation.json`;
    await writeFile(record, 'existing evidence');
    const collision = spawnSync(process.execPath, [helper, 'prepare-native', '--input', input, '--out', out], { encoding: 'utf8' });
    expect(collision.status).toBe(1);
    expect(collision.stderr).toContain('output path already exists');
    expect(await readFile(input)).toEqual(bytes);
    expect(await readFile(record, 'utf8')).toBe('existing evidence');
    await expect(readFile(out)).rejects.toThrow();
  });

  test('offline inspection accepts shipping HD dimensions without treating them as an API request', async () => {
    const dir = await root(), input = path.join(dir, 'hd.png');
    await writeFile(input, await raster(1920, 1080));
    const result = spawnSync(process.execPath, [helper, 'inspect', '--input', input, '--size', '1920x1080',
      '--background', 'transparent'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    const facts = JSON.parse(result.stdout);
    expect(facts).toMatchObject({ width: 1920, height: 1080, alpha: { valid: false, hasAlpha: false } });
    expect(result.stderr).not.toContain('Sunburst dimensions');
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
