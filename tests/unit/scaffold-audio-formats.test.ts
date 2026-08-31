import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const validatorPath = path.resolve(
  process.cwd(),
  'tools',
  'validate-scaffold.mjs',
);

async function temporaryAssetRoot(files: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-assets-'));
  const assetDirectory = path.join(root, 'src', 'assets');
  await mkdir(assetDirectory, { recursive: true });
  for (const file of files) {
    await writeFile(path.join(assetDirectory, file), '');
  }
  return root;
}

describe('assets scaffold audio formats', () => {
  test('accepts approved Ogg, MP3, and WAV asset extensions', async () => {
    const root = await temporaryAssetRoot([
      'transition-era-theme.ogg',
      'modern-debate-theme.mp3',
      'hit-light.wav',
    ]);

    try {
      const { stdout } = await execFileAsync(process.execPath, [
        validatorPath,
        '--domain',
        'assets',
        '--root',
        root,
      ]);
      expect(stdout).toContain('passed');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('rejects an audio format outside the scaffold allowlist', async () => {
    const root = await temporaryAssetRoot(['legacy-cue.flac']);

    try {
      await expect(
        execFileAsync(process.execPath, [
          validatorPath,
          '--domain',
          'assets',
          '--root',
          root,
        ]),
      ).rejects.toThrow(/not allowed/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
