import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { fullQualityGateRequested } from '../../tools/quality-gate-mode.ts';

const execFileAsync = promisify(execFile);
const packagePath = path.resolve(process.cwd(), 'package.json');
const validatorPath = path.resolve(process.cwd(), 'tools', 'validate-scaffold.ts');
const balanceValidatorPath = path.resolve(process.cwd(), 'tools', 'validate-content-balance.ts');
const oxlintPath = path.resolve(process.cwd(), 'node_modules', 'oxlint', 'bin', 'oxlint');
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
  'balance:validate',
  'localization:validate',
  'boundaries:check',
  'simulate',
  'quality:quick',
  'quality:full',
  'validate',
  'ci',
];

describe('quality-gate scaffold', () => {
  test('keeps private character research out of Git', async () => {
    const gitignore = await readFile(path.resolve(process.cwd(), '.gitignore'), 'utf8');
    expect(gitignore.split(/\r?\n/u)).toContain('research/');
  });

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
    expect(packageJson.scripts.build).toBe(
      'node tools/brand-assets.ts validate && ' +
        'node tools/validate-scene-assets.ts src/assets/scenes && ' +
        'node tools/validate-character-assets.ts src/assets/characters && ' +
        'node tools/validate-character-states.ts && ' +
        'node tools/audio-assets.ts validate && ' +
        'node tools/neural-speech-assets.ts validate && ' +
        'node tools/kokoro-gpu-assets.ts validate && ' +
        'node tools/romanian-speech-assets.ts validate && ' +
        'node tools/check-final-content-volumes.ts && ' +
        'vite build',
    );
    expect(packageJson.scripts['assets:build']).toContain('node tools/build-character-assets.ts');
    expect(packageJson.scripts['assets:build']).toContain('npm run audio:build');
    expect(packageJson.scripts['assets:validate']).toContain('npm run audio:validate');
    expect(packageJson.scripts['assets:build']).toContain('npm run speech:build');
    expect(packageJson.scripts['assets:validate']).toContain('npm run speech:validate');
    expect(packageJson.scripts['speech:validate']).toContain(
      'node tools/kokoro-gpu-assets.ts validate',
    );
    expect(packageJson.scripts['assets:validate']).toContain(
      'node tools/validate-character-assets.ts src/assets/characters',
    );
    for (const command of [
      'node tools/brand-assets.ts build',
      'node tools/build-character-states.ts',
    ]) {
      expect(packageJson.scripts['assets:build']).toContain(command);
    }
    for (const command of [
      'node tools/brand-assets.ts validate',
      'node tools/validate-character-states.ts',
    ]) {
      expect(packageJson.scripts['assets:validate']).toContain(command);
    }
  });

  test('keeps distinct quick and full quality gates in the approved order', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['quality:quick']).toBe('node tools/run-quality-gate.ts quick');
    expect(packageJson.scripts['quality:full']).toBe('node tools/run-quality-gate.ts full');
    expect(packageJson.scripts.ci).toBe('npm run quality:full');
    for (const phase of ['test', 'test:browser', 'test:coverage', 'test:e2e']) {
      expect(packageJson.scripts[phase]).toBe(`node tools/run-test-phase.ts ${phase} quick`);
      expect(packageJson.scripts[`${phase}:full`]).toBe(
        `node tools/run-test-phase.ts ${phase} full`,
      );
    }
    const gate = await readFile(path.resolve('tools', 'run-quality-gate.ts'), 'utf8');
    expect(gate).toContain(
      "['validate', 'balance:validate', 'test', 'test:browser', 'test:coverage', 'test:e2e']",
    );
    expect(gate).toContain("['validate', 'test', 'test:browser', 'test:coverage', 'test:e2e']");
    expect(gate).toContain('GRAND_TRANSITION_QUALITY_GATE: mode');
    expect(gate).toContain("GRAND_TRANSITION_QUALITY_GATE_RUNNER: '1'");
    expect(gate).toContain('fullTestPhases.has(phase)');
    expect(gate).toContain("['quick', 'full']");
    const [calibration, ladder, lifecycle, gateMode, browserConfig, phaseRunner, balanceValidator] =
      await Promise.all([
        readFile(path.resolve('tests', 'unit', 'replay-and-simulation.test.ts'), 'utf8'),
        readFile(path.resolve('e2e', 'advanced-ai-ladder.spec.ts'), 'utf8'),
        readFile(path.resolve('e2e', 'content-lifecycle.spec.ts'), 'utf8'),
        readFile(path.resolve('tools', 'quality-gate-mode.ts'), 'utf8'),
        readFile(path.resolve('vitest.browser.config.ts'), 'utf8'),
        readFile(path.resolve('tools', 'run-test-phase.ts'), 'utf8'),
        readFile(balanceValidatorPath, 'utf8'),
      ]);
    for (const source of [calibration, ladder, lifecycle]) {
      expect(source).toContain('fullQualityGateRequested');
      expect(source).toContain('test.skip');
      expect(source).not.toContain('GRAND_TRANSITION_QUALITY_GATE ===');
    }
    expect(gateMode).toContain("GRAND_TRANSITION_QUALITY_GATE === 'full'");
    expect(gateMode).toContain("GRAND_TRANSITION_QUALITY_GATE_RUNNER === '1'");
    // Browser Mode inlines the mode verbatim, so a bare `npm run test:browser`
    // cannot promote itself to the full gate.
    expect(browserConfig).toContain("GRAND_TRANSITION_QUALITY_GATE ?? ''");
    expect(browserConfig).toContain("GRAND_TRANSITION_QUALITY_GATE_RUNNER ?? ''");
    expect(browserConfig).not.toContain("'quick' : 'full'");
    expect(phaseRunner).toContain('GRAND_TRANSITION_QUALITY_GATE: mode');
    expect(phaseRunner).toContain(
      "GRAND_TRANSITION_QUALITY_GATE_RUNNER: mode === 'full' ? '1' : ''",
    );
    expect(balanceValidator).toContain('fullQualityGateRequested()');
    expect(balanceValidator).toContain(
      'Content balance validation is only available through npm run quality:full.',
    );
    expect(balanceValidator).toContain('const matchesPerCell = 500;');
    expect(balanceValidator).toContain('const structuralSamplesPerDefender = 64;');
    expect(balanceValidator).not.toContain('process.env.BALANCE_MATCHES');
    expect(balanceValidator).not.toContain('process.env.BALANCE_STRUCTURAL_SAMPLES');
    expect(balanceValidator).not.toContain('process.env.BALANCE_WORKERS');
    expect(balanceValidator).not.toContain('process.env.BALANCE_MODEL');
    expect(
      fullQualityGateRequested({
        GRAND_TRANSITION_QUALITY_GATE: 'full',
        GRAND_TRANSITION_QUALITY_GATE_RUNNER: '1',
      }),
    ).toBe(true);
    expect(fullQualityGateRequested({ GRAND_TRANSITION_QUALITY_GATE: 'full' })).toBe(false);
    expect(fullQualityGateRequested({ GRAND_TRANSITION_QUALITY_GATE: 'quick' })).toBe(false);
    expect(fullQualityGateRequested({ GRAND_TRANSITION_QUALITY_GATE: '' })).toBe(false);
    expect(fullQualityGateRequested({})).toBe(false);
    const phases = [
      'validate',
      'balance:validate',
      'test',
      'test:browser',
      'test:coverage',
      'test:e2e',
    ];

    let previousIndex = -1;
    for (const phase of phases) {
      const currentIndex = gate.indexOf(`'${phase}'`);
      expect(currentIndex, phase).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  test('blocks direct content-balance execution outside the full gate', async () => {
    const environment = { ...process.env };
    delete environment.GRAND_TRANSITION_QUALITY_GATE;
    delete environment.GRAND_TRANSITION_QUALITY_GATE_RUNNER;

    let failure: CommandError | undefined;
    try {
      await execFileAsync(process.execPath, [balanceValidatorPath], {
        cwd: process.cwd(),
        env: environment,
        timeout: 5_000,
      });
    } catch (error) {
      failure = error as CommandError;
    }

    expect(failure).toBeDefined();
    expect(failure?.stderr).toContain(
      'Content balance validation is only available through npm run quality:full.',
    );
  });

  test('validates content files and the aggregate content contract', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const contentValidation = packageJson.scripts['content:validate'];

    expect(contentValidation).toContain('node tools/validate-scaffold.ts --domain content');
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
      'node tools/validate-asset-color.ts validate src/assets',
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
    expect(
      Object.keys(packageJson.devDependencies).filter((name) => name.startsWith('markdownlint')),
    ).toEqual(['markdownlint-cli2']);
  });

  test('checks source formatting with Prettier and leaves Markdown and JSON to other checks', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const ignored = (await readFile(path.resolve(process.cwd(), '.prettierignore'), 'utf8')).split(
      /\r?\n/u,
    );

    expect(packageJson.scripts['format:check']).toBe('prettier --check .');
    expect(packageJson.scripts.validate).toMatch(
      /^npm run markdown:lint && npm run format:check && /u,
    );
    expect(ignored).toEqual(
      expect.arrayContaining(['*.json', '*.md', 'src/localization/generated/']),
    );
  });

  test('keeps the Markdown check dependency list exact', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    expect(
      Object.keys(packageJson.devDependencies).filter((name) => name.startsWith('markdownlint')),
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
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-lint-'));
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
          [oxlintPath, '--type-aware', '--config', oxlintConfigPath, 'invalid.ts'],
          { cwd: fixtureRoot },
        );
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(/no-floating-promises/i);
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
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-quality-'));
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
