import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const validatorPath = path.resolve('tools', 'validate-generation-prompt.mjs');
const validPrompt = `
Neutral sRGB white balance, ungraded colors, clean charcoal and navy shadows,
clear blue and oxblood separation, and neutral light anchors. Warm color is local
to named brass, wood, cream, skin, oxide-red, or lamp shapes. No whole-image
color tint.
`;

test('accepts a prompt with the shared color controls', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-pass-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'valid.prompt.txt');
    await writeFile(promptPath, validPrompt, 'utf8');

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).resolves.toMatchObject({
      stdout: expect.stringContaining('Generation prompt color validation passed'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('accepts positive controls followed by a negative-control section', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-sections-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'sections.prompt.txt');
    await writeFile(
      promptPath,
      'Positive controls: Neutral sRGB white balance, ungraded colors. Warm color is local to named materials.\nNegative controls: No whole-image color tint. Avoid global amber wash and warm studio lighting.\n',
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).resolves.toBeDefined();
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('allows warm-studio wording when it is explicitly a negative control', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-negative-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'negative.prompt.txt');
    await writeFile(
      promptPath,
      `${validPrompt}\nNegative: avoid warm studio lighting.\n`,
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).resolves.toBeDefined();
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('rejects a global warm grade even when the required controls are present', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-global-wash-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'global-wash.prompt.txt');
    await writeFile(
      promptPath,
      `${validPrompt}\nUse a global amber wash across the complete image.\n`,
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).rejects.toMatchObject({
      stderr: expect.stringContaining('contains a global warm color grade'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('does not treat negative space as a negative lighting control', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-negative-space-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'negative-space.prompt.txt');
    await writeFile(
      promptPath,
      `${validPrompt}\nNegative space frames the subject. Warm studio lighting fills the scene.\n`,
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).rejects.toMatchObject({
      stderr: expect.stringContaining('contains unqualified warm studio lighting'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('does not accept required positive controls inside a negative section', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-negated-controls-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'negated-controls.prompt.txt');
    await writeFile(
      promptPath,
      'Negative controls: avoid neutral sRGB white balance, ungraded colors, and warm color is local to named materials. No whole-image color tint.\n',
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).rejects.toMatchObject({
      stderr: expect.stringContaining('missing neutral sRGB white balance, ungraded colors, local warm color scope'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('does not let a positive-section heading override a local negation', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-local-negation-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'local-negation.prompt.txt');
    await writeFile(
      promptPath,
      'Positive controls: Avoid neutral sRGB white balance. Use ungraded colors. Warm color is local to named materials.\nNegative controls: No whole-image color tint.\n',
      'utf8',
    );

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).rejects.toMatchObject({
      stderr: expect.stringContaining('missing neutral sRGB white balance'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);

test('rejects unqualified warm studio lighting and missing controls', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'grand-transition-prompt-fail-'),
  );
  try {
    const promptPath = path.join(fixtureRoot, 'invalid.prompt.txt');
    await writeFile(promptPath, 'Warm studio key lighting with a rich amber grade.', 'utf8');

    await expect(execFileAsync(process.execPath, [validatorPath, promptPath])).rejects.toMatchObject({
      stderr: expect.stringContaining('generation prompt color guard failed'),
    });
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}, 30_000);
