import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const packagePath = path.resolve(process.cwd(), 'package.json');
const validatorPath = path.resolve(
  process.cwd(),
  'tools',
  'validate-scaffold.mjs',
);
const oxlintPath = path.resolve(
  process.cwd(),
  'node_modules',
  'oxlint',
  'bin',
  'oxlint',
);
const oxlintConfigPath = path.resolve(process.cwd(), '.oxlintrc.json');

type CommandError = Error & { stderr?: string; stdout?: string };

const requiredScripts = [
  'dev',
  'prod',
  'preview',
  'build',
  'assets:build',
  'assets:validate',
  'lint',
  'typecheck',
  'test',
  'test:coverage',
  'test:browser',
  'test:e2e',
  'markdown:lint',
  'content:validate',
  'localization:validate',
  'boundaries:check',
  'simulate',
  'validate',
  'ci',
];

describe('quality-gate scaffold', () => {
  test('exposes every milestone script', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    for (const script of requiredScripts) {
      expect(packageJson.scripts[script], script).toBeTruthy();
    }
  });

  test('starts a fresh production build and strict local preview through prod', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.prod).toBe(
      'npm run build && npm run preview -- --host 127.0.0.1 --strictPort',
    );
  });

  test('keeps the CI phases in the approved order', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const ci = packageJson.scripts.ci;
    const phases = [
      'validate',
      'test',
      'test:browser',
      'test:coverage',
      'test:e2e',
    ];

    let previousIndex = -1;
    for (const phase of phases) {
      const currentIndex = ci.indexOf(`npm run ${phase}`);
      expect(currentIndex, phase).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  test('validates content files and the aggregate content contract', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const contentValidation = packageJson.scripts['content:validate'];

    expect(contentValidation).toContain(
      'node tools/validate-scaffold.mjs --domain content',
    );
    expect(contentValidation).toContain('tests/unit/content-schemas.test.ts');
  });

  test('validates raster provenance, green chroma, and color cast', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['assets:validate']).toContain(
      '.github/skills/repair-scene-composition/scripts/green-chroma-key.mjs validate src/assets',
    );
    expect(packageJson.scripts['assets:validate']).toContain(
      'node tools/validate-asset-color.mjs validate src/assets',
    );
    expect(packageJson.scripts['assets:convert-green']).toContain(
      '.github/skills/repair-scene-composition/scripts/green-chroma-key.mjs convert-tree',
    );
  });

  test('uses markdownlint-cli2 as the only Markdown check', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.scripts['markdown:lint']).toMatch(/^markdownlint-cli2\b/);
    expect(packageJson.scripts['format:check']).toBeUndefined();
    expect(
      Object.keys(packageJson.devDependencies).filter((name) =>
        name.startsWith('markdownlint'),
      ),
    ).toEqual(['markdownlint-cli2']);
  });

  test('uses the TypeScript 7 type-aware linter', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJson.scripts.lint).toContain('oxlint --type-aware');
    expect(packageJson.devDependencies.oxlint).toBeTruthy();
    expect(packageJson.devDependencies['oxlint-tsgolint']).toBeTruthy();
    expect(packageJson.devDependencies.eslint).toBeUndefined();
  });

  test('typed lint rejects an unhandled promise', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-lint-'),
    );
    try {
      await writeFile(
        path.join(fixtureRoot, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
          include: ['invalid.ts'],
        }),
        'utf8',
      );
      await writeFile(
        path.join(fixtureRoot, 'invalid.ts'),
        'async function prepare(): Promise<void> {}\nprepare();\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(
          process.execPath,
          [
            oxlintPath,
            '--type-aware',
            '--config',
            oxlintConfigPath,
            'invalid.ts',
          ],
          { cwd: fixtureRoot },
        );
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(
        /no-floating-promises/i,
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('fast-check failure evidence contains a seed and replay path', () => {
    let failure: Error | undefined;
    try {
      fc.assert(
        fc.property(fc.constant('invalid'), () => false),
        {
          numRuns: 1,
          seed: 20_260_822,
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        failure = error;
      }
    }

    expect(failure).toBeDefined();
    expect(failure?.message).toMatch(/seed/i);
    expect(failure?.message).toMatch(/path/i);
  });

  test('the scaffold validator rejects an invalid fixture', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-quality-'),
    );
    try {
      await mkdir(path.join(fixtureRoot, 'src', 'assets'), { recursive: true });
      await writeFile(
        path.join(fixtureRoot, 'src', 'assets', 'invalid.txt'),
        'not an approved asset',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          validatorPath,
          '--domain',
          'assets',
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(failure?.stderr).toContain('extension ".txt" is not allowed');
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });
});
