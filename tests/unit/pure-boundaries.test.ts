import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const checkerPath = path.resolve(
  process.cwd(),
  'tools',
  'check-pure-boundaries.mjs',
);
const packagePath = path.resolve(process.cwd(), 'package.json');

type CommandError = Error & { stderr?: string; stdout?: string };

describe('pure-module boundaries', () => {
  test('runs the boundary check during validation', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['boundaries:check']).toBe(
      'node tools/check-pure-boundaries.mjs',
    );
    expect(packageJson.scripts.validate).toContain('npm run boundaries:check');
  });

  test('accepts the current pure modules', async () => {
    const result = await execFileAsync(process.execPath, [checkerPath]);

    expect(result.stdout).toMatch(/passed: checked [1-9]\d* file/u);
  });

  test('rejects Lit and DOM use in a pure module', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'invalid.ts'),
        [
          "import { html } from 'lit';",
          'export const invalid = [html, document];',
          'export const probe = `${window.name}`;',
        ].join('\n') + '\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(
        /forbidden Lit import[\s\S]*forbidden DOM name/u,
      );
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(
        /invalid\.ts:2: forbidden DOM name "document"/u,
      );
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(
        /invalid\.ts:3: forbidden DOM name "window"/u,
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('accepts DOM words inside strings and comments', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'valid.ts'),
        [
          "export const note = 'window document fetch stay inside strings';",
          '// localStorage and navigator in comments are fine too',
          'export const value = 1;',
        ].join('\n') + '\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeUndefined();
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });
});
