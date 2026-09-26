import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { describe, expect, test } from 'vitest';

const runner = path.resolve('tools/run-quality-gate.ts');
const phaseRunner = path.resolve('tools/run-test-phase.ts');
const phases = ['validate', 'test', 'test:coverage', 'test:e2e'];
// The full gate adds the long-running content-balance workload. It is not a
// test phase, so it never takes the `:full` script suffix.
const fullPhases = ['validate', 'balance:validate', 'test', 'test:coverage', 'test:e2e'];
const fullScriptPhases = new Set(['test', 'test:coverage', 'test:e2e']);

async function runFixture(mode: string, failPhase = '', includeNpm = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand transition gate '));
  try {
    const npmCli = path.join(root, 'fake npm cli.mjs');
    const capture = path.join(root, 'phases.jsonl');
    await writeFile(
      npmCli,
      `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.GT_GATE_CAPTURE, JSON.stringify({
  args: process.argv.slice(2), mode: process.env.GRAND_TRANSITION_QUALITY_GATE,
  runner: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
  marker: process.env.GT_GATE_MARKER,
  validated: process.env.GRAND_TRANSITION_ASSETS_VALIDATED ?? null,
}) + '\\n');
if (process.argv[3] === process.env.GT_GATE_FAIL_PHASE) process.exit(23);
`,
    );
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_execpath'),
    );
    if (includeNpm) env.npm_execpath = npmCli;
    const result = spawnSync(process.execPath, [runner, mode], {
      cwd: root,
      env: {
        ...env,
        GT_GATE_CAPTURE: capture,
        GT_GATE_FAIL_PHASE: failPhase,
        GT_GATE_MARKER: 'preserved value with spaces',
      },
      encoding: 'utf8',
    });
    const calls = await readFile(capture, 'utf8').then(
      (text) =>
        text
          .trim()
          .split('\n')
          .map(
            (line) =>
              JSON.parse(line) as {
                args: string[];
                mode: string;
                marker: string;
                runner: string;
                validated: string | null;
              },
          ),
      () => [],
    );
    return { result, calls };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('portable quality gate runner', () => {
  test('direct quick phase ignores inherited full-mode variables', () => {
    const result = spawnSync(
      process.execPath,
      [phaseRunner, 'test', 'quick', 'tests/unit/replay-and-simulation.test.ts', '-t', '500-match'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          GRAND_TRANSITION_QUALITY_GATE: 'full',
          GRAND_TRANSITION_QUALITY_GATE_RUNNER: '1',
        },
        encoding: 'utf8',
        // A nested vitest run competes with the six-worker local pool, so the
        // budget tolerates a fully loaded machine. The assertion is unchanged.
        timeout: 120_000,
      },
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(stripVTControlCharacters(result.stdout)).toMatch(/Tests\s+\d+ skipped \(\d+\)/u);
  }, 125_000);

  test.each(['quick', 'full'])(
    'runs %s phases using the npm CLI path with spaces',
    async (mode) => {
      const { result, calls } = await runFixture(mode);
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      const expectedPhases = mode === 'full' ? fullPhases : phases;
      expect(calls).toEqual(
        expectedPhases.map((phase) => ({
          args: ['run', mode === 'full' && fullScriptPhases.has(phase) ? `${phase}:full` : phase],
          mode,
          marker: 'preserved value with spaces',
          runner: '1',
          // Only the end-to-end build may skip the asset checks that validate ran.
          validated: phase === 'test:e2e' ? '1' : null,
        })),
      );
    },
  );

  test('preserves the first failing phase exit code and stops later phases', async () => {
    const { result, calls } = await runFixture('quick', 'test:coverage');
    expect(result.status, result.stderr).toBe(23);
    expect(calls.map((call) => call.args[1])).toEqual(phases.slice(0, 3));
  });

  test('requires npm invocation when its CLI path is unavailable', async () => {
    const { result, calls } = await runFixture('quick', '', false);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Run this gate through npm run quality:quick or npm run quality:full.',
    );
    expect(calls).toEqual([]);
  });

  test('rejects an unsupported mode before it starts a phase', async () => {
    const { result, calls } = await runFixture('other');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Use run-quality-gate.ts quick or full.');
    expect(calls).toEqual([]);
  });
});
