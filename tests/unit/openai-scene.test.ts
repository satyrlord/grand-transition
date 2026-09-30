import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
import {
  assertReview,
  candidateReviewState,
  inspectImage,
  inspectInputs,
  prepareImage,
  readApiKey,
  selectRoute,
} from '../../.github/skills/generate-scene-openai/scripts/scene-image.ts';

const roots: string[] = [];
const helper = path.resolve('.github/skills/generate-scene-openai/scripts/scene-image.ts');
const prompt =
  'Positive controls:\nNeutral sRGB white balance. Ungraded colors. Warm color is local to authored lights.\nNegative controls:\nNo whole-image color tint.';
const checkNames = [
  'sceneIdentity',
  'style',
  'composition',
  'layering',
  'interfaceClearance',
  'artifacts',
  'color',
];
const reviewFor = (hash: string) => ({
  sha256: hash,
  reviewer: 'Synthetic test fixture',
  issues: [],
  checks: Object.fromEntries(
    checkNames.map((name) => [
      name,
      { pass: true, evidence: 'Synthetic review for conversion testing only.' },
    ]),
  ),
});

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gt-openai-scene-test-'));
  roots.push(dir);
  return dir;
}
async function raster(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#123456' } })
    .png()
    .toBuffer();
}

describe('OpenAI scene generation and credit controls', () => {
  test('defaults to built-in generation at every valid size', () => {
    for (const size of [
      '1280x720',
      '1920x1080',
      '1080x1920',
      '1024x1024',
      '2048x2048',
      '3840x2160',
      '4096x4096',
    ]) {
      expect(selectRoute(size).route).toBe('internal');
    }
    for (const size of ['auto', '0x1080', '-1x1080', '1920.5x1080'])
      expect(() => selectRoute(size)).toThrow();
  });

  test('only an explicit opaque 4K scene background selects Flare', () => {
    expect(
      selectRoute('3840x2160', { assetRole: 'scene-background', background: 'opaque' }).route,
    ).toBe('api');
    for (const assetRole of ['character', 'desk', 'prop', 'foreground', 'other']) {
      for (const size of ['1024x1024', '2048x2048', '3840x2160']) {
        expect(selectRoute(size, { assetRole, background: 'transparent' }).route).toBe('internal');
      }
    }
    expect(() =>
      selectRoute('2048x2048', { assetRole: 'scene-background', background: 'opaque' }),
    ).toThrow('only for 3840x2160');
    expect(() =>
      selectRoute('3840x2160', { assetRole: 'scene-background', background: 'transparent' }),
    ).toThrow('explicit opaque');
    expect(() => selectRoute('3840x2160', { assetRole: 'scene-background' })).toThrow(
      'explicit opaque',
    );
    expect(() => selectRoute('3840x2160', { assetRole: 'unknown' })).toThrow('asset role');
  });

  test('requires alpha review without claiming that bounded preparation can repair every defect', () => {
    expect(candidateReviewState({ valid: false })).toBe('alpha-review-required');
    expect(candidateReviewState({ valid: true })).toBe('visual-review-required');
    expect(candidateReviewState(undefined)).toBe('visual-review-required');
  });

  test.each(['character', 'desk', 'prop', 'foreground', 'other'])(
    'blocks %s API calls before reading inputs or credentials',
    (assetRole) => {
      const result = spawnSync(
        process.execPath,
        [
          helper,
          'generate',
          '--asset-role',
          assetRole,
          '--size',
          '3840x2160',
          '--background',
          'transparent',
          '--prompt',
          'missing-prompt',
          '--out',
          'missing-output',
        ],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('No API request is permitted');
      expect(result.stderr).not.toContain('ENOENT');
    },
  );

  test('the removed exact-size flag cannot bypass built-in routing', () => {
    const result = spawnSync(
      process.execPath,
      [
        helper,
        'generate',
        '--size',
        '1920x1080',
        '--exact-size',
        '--prompt',
        'missing-prompt',
        '--out',
        'tmp/unsupported-hd-source',
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('exact-size');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('rejects invalid background selection before reading inputs', () => {
    const result = spawnSync(
      process.execPath,
      [
        helper,
        'generate',
        '--background',
        'invalid',
        '--prompt',
        'missing-prompt',
        '--out',
        'tmp/missing-output',
        '--dry-run',
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('transparent, opaque, or auto');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('constructs an opaque 4K background edit without credentials, network access or output files', async () => {
    const dir = await root(),
      promptFile = path.join(dir, 'prompt.txt');
    await writeFile(promptFile, prompt);
    const image = path.join(dir, 'reference.png');
    await writeFile(image, await raster(32, 32));
    const result = spawnSync(
      process.execPath,
      [
        helper,
        'generate',
        '--asset-role',
        'scene-background',
        '--background',
        'opaque',
        '--size',
        '3840x2160',
        '--reference',
        image,
        '--prompt',
        promptFile,
        '--out',
        'tmp/background-dry-run',
        '--dry-run',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_HOME: dir,
          OPENAI_API_KEY: 'must-not-be-read',
          OPENAI_BASE_URL: 'https://invalid.example',
        },
      },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      assetRole: 'scene-background',
      background: 'opaque',
      networkRequest: false,
      requestConstructed: true,
      inputMode: 'edit',
      endpoint: 'https://api.openai.com/v1/images/edits',
      requestedSize: '3840x2160',
    });
    expect(result.stdout).not.toContain('must-not-be-read');
    expect(result.stdout).not.toContain(prompt);
    await expect(readFile('tmp/background-dry-run/request-record.json')).rejects.toThrow();
  });

  test('validates private prompts and reference bytes without a network request', async () => {
    const dir = await root(),
      promptFile = path.join(dir, 'prompt.txt'),
      reference = path.join(dir, 'reference.png');
    await writeFile(promptFile, prompt);
    const bytes = await raster(32, 32);
    await writeFile(reference, bytes);
    expect((await inspectInputs(promptFile)).references).toEqual([]);
    expect((await inspectInputs(promptFile, [reference])).references[0]).toMatchObject({
      width: 32,
      height: 32,
      format: 'png',
    });
    expect(await readFile(reference)).toEqual(bytes);
    await expect(inspectInputs(promptFile, Array(17).fill(reference))).rejects.toThrow('16');
    await writeFile(promptFile, 'Uncontrolled warm lighting.');
    await expect(inspectInputs(promptFile)).rejects.toThrow('color guard');
  });

  test('existing run paths fail before credential loading or generation', async () => {
    // A clean checkout has no ignored `tmp/` folder.
    await mkdir(path.resolve('tmp'), { recursive: true });
    const dir = await mkdtemp(path.resolve('tmp/flare-existing-run-'));
    roots.push(dir);
    const result = spawnSync(
      process.execPath,
      [
        helper,
        'generate',
        '--asset-role',
        'scene-background',
        '--background',
        'opaque',
        '--size',
        '3840x2160',
        '--prompt',
        'missing-prompt',
        '--out',
        dir,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('output path is in use');
    expect(result.stderr).not.toContain('ENOENT');
  });

  test('native preparation rejects invalid input without writing output or replacing evidence', async () => {
    await mkdir(path.resolve('tmp'), { recursive: true });
    const dir = await mkdtemp(path.resolve('tmp/flare-native-output-'));
    roots.push(dir);
    const input = path.join(dir, 'input.png'),
      out = path.join(dir, 'prepared.png');
    const bytes = await raster(32, 32);
    await writeFile(input, bytes);
    const invalid = spawnSync(
      process.execPath,
      [helper, 'prepare-native', '--input', input, '--out', out],
      { encoding: 'utf8' },
    );
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('alpha channel');
    await expect(readFile(out)).rejects.toThrow();
    const record = `${out}.preparation.json`;
    await writeFile(record, 'existing evidence');
    const collision = spawnSync(
      process.execPath,
      [helper, 'prepare-native', '--input', input, '--out', out],
      { encoding: 'utf8' },
    );
    expect(collision.status).toBe(1);
    expect(collision.stderr).toContain('output path is in use');
    expect(await readFile(input)).toEqual(bytes);
    expect(await readFile(record, 'utf8')).toBe('existing evidence');
    await expect(readFile(out)).rejects.toThrow();
  });

  test('offline inspection accepts shipping HD dimensions without treating them as an API request', async () => {
    const dir = await root(),
      input = path.join(dir, 'hd.png');
    await writeFile(input, await raster(1920, 1080));
    const result = spawnSync(
      process.execPath,
      [helper, 'inspect', '--input', input, '--size', '1920x1080', '--background', 'transparent'],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    const facts = JSON.parse(result.stdout);
    expect(facts).toMatchObject({
      width: 1920,
      height: 1080,
      alpha: { valid: false, hasAlpha: false },
    });
    expect(result.stderr).not.toContain('Flare dimensions');
  });

  test('rejects lower-resolution results, corrupted files, and stale visual reviews', async () => {
    const small = await raster(1672, 941);
    await expect(inspectImage(small)).rejects.toThrow('3840x2160');
    await expect(inspectImage(small.subarray(0, 40))).rejects.toThrow();
    expect(() => assertReview(reviewFor('old'), { sha256: 'new' })).toThrow(
      'image review for the image at this time',
    );
    const review = reviewFor('same');
    delete review.checks.style;
    expect(() => assertReview(review, { sha256: 'same' })).toThrow('style');
  });

  test('preserves exact 4K masters for studios and foundation scenes without upscaling', async () => {
    const bytes = await raster(3840, 2160),
      facts = await inspectImage(bytes);
    const native = await prepareImage(bytes, reviewFor(facts.sha256), 'modern-debate-studio');
    expect(native.output).toEqual(bytes);
    expect(native.record.operation).toBe('preserve-native-pixels');
    const foundation = await prepareImage(
      bytes,
      reviewFor(facts.sha256),
      'county-council-ballroom',
    );
    expect(foundation.output).toEqual(bytes);
    expect(foundation.record.operation).toBe('preserve-native-pixels');
    const hd = await raster(1920, 1080),
      hdFacts = await inspectImage(hd, { width: 1920, height: 1080 });
    await expect(
      prepareImage(hd, reviewFor(hdFacts.sha256), 'modern-debate-studio', {
        width: 1920,
        height: 1080,
      }),
    ).rejects.toThrow('background source must be exactly 3840x2160');
    await expect(prepareImage(bytes, reviewFor(facts.sha256), 'undeclared-scene')).rejects.toThrow(
      'does not declare this scene master ID',
    );
  });

  test('preserves native foreground dimensions and bytes during optional scene preparation', async () => {
    const bytes = await raster(1536, 864);
    const facts = await inspectImage(bytes, { width: 1536, height: 864 });
    const prepared = await prepareImage(
      bytes,
      reviewFor(facts.sha256),
      'modern-debate-studio-desks',
    );
    expect(prepared.output).toEqual(bytes);
    expect(prepared.record.output).toMatchObject({ width: 1536, height: 864 });
    expect(prepared.record.operation).toBe('preserve-native-pixels');
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
