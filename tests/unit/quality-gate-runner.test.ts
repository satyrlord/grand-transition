import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { describe, expect, test } from 'vitest';
import type { GateReport } from '../../tools/quality-gate-report.ts';

const runner = path.resolve('tools/run-quality-gate.ts');
const phaseRunner = path.resolve('tools/run-test-phase.ts');
const phases = ['validate', 'test', 'test:coverage', 'test:e2e'];
// The full gate adds the long-running content-balance workload. It is not a
// test phase, so it never takes the `:full` script suffix.
const fullPhases = ['validate', 'balance:validate', 'test', 'test:coverage', 'test:e2e'];
// The release gate is the full gate without the end-to-end phase. It builds
// the bundle that the release workflow deploys.
const releasePhases = ['validate', 'balance:validate', 'test', 'test:coverage', 'build:bundle'];
const fullScriptPhases = new Set(['test', 'test:coverage', 'test:e2e']);

async function runFixture(mode: string, failPhase = '', includeNpm = true, resultsJson = '') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand transition gate '));
  try {
    const npmCli = path.join(root, 'fake npm cli.mjs');
    const capture = path.join(root, 'phases.jsonl');
    await writeFile(
      npmCli,
      `import { appendFileSync, writeFileSync } from 'node:fs';
appendFileSync(process.env.GT_GATE_CAPTURE, JSON.stringify({
  args: process.argv.slice(2), mode: process.env.GRAND_TRANSITION_QUALITY_GATE,
  runner: process.env.GRAND_TRANSITION_QUALITY_GATE_RUNNER,
  marker: process.env.GT_GATE_MARKER,
  validated: process.env.GRAND_TRANSITION_ASSETS_VALIDATED ?? null,
}) + '\\n');
if (process.argv[3] === process.env.GT_GATE_FAIL_PHASE) {
  if (process.env.GT_GATE_RESULTS_JSON && process.env.GRAND_TRANSITION_GATE_RESULTS) {
    writeFileSync(process.env.GRAND_TRANSITION_GATE_RESULTS, process.env.GT_GATE_RESULTS_JSON);
  }
  process.exit(23);
}
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
        // The result paths are absolute, so the fixture root stands in for them.
        GT_GATE_RESULTS_JSON: resultsJson.replaceAll('<root>', root.replaceAll('\\', '/')),
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
    const report = await readFile(
      path.join(root, 'tmp', 'quality-gate', 'report.json'),
      'utf8',
    ).then(
      (text) => JSON.parse(text) as GateReport,
      () => null,
    );
    return { result, calls, report };
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

  test.each(['quick', 'full', 'release'])(
    'runs %s phases using the npm CLI path with spaces',
    async (mode) => {
      const { result, calls } = await runFixture(mode);
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      const expectedPhases =
        mode === 'full' ? fullPhases : mode === 'release' ? releasePhases : phases;
      const gateMode = mode === 'quick' ? 'quick' : 'full';
      expect(calls).toEqual(
        expectedPhases.map((phase) => ({
          args: [
            'run',
            gateMode === 'full' && fullScriptPhases.has(phase) ? `${phase}:full` : phase,
          ],
          mode: gateMode,
          marker: 'preserved value with spaces',
          runner: '1',
          // Only the end-to-end build may skip the asset checks that validate ran.
          validated: phase === 'test:e2e' ? '1' : null,
        })),
      );
    },
  );

  test('runs every phase after a failure and keeps the first failing exit code', async () => {
    const { result, calls, report } = await runFixture('quick', 'test:coverage');
    expect(result.status, result.stderr).toBe(23);
    // Each phase runs once, so the gate does not retry a failed phase.
    expect(calls.map((call) => call.args[1])).toEqual(phases);
    expect(report?.passed).toBe(false);
    expect(report?.phases.map(({ phase, status }) => [phase, status])).toEqual([
      ['validate', 'passed'],
      ['test', 'passed'],
      ['test:coverage', 'failed'],
      ['test:e2e', 'passed'],
    ]);
    expect(report?.record).toBe('not written: a phase failed');
    expect(stripVTControlCharacters(result.stdout)).toContain('Quality gate (quick) FAILED');
  });

  test('names each failed test and a command that runs only that test', async () => {
    const results = JSON.stringify({
      testResults: [
        {
          name: '<root>/tests/browser/match-screen.browser.test.ts',
          status: 'failed',
          assertionResults: [
            { fullName: 'a passing test', status: 'passed' },
            { fullName: 'keeps (long) text reachable', status: 'failed' },
          ],
        },
      ],
    });
    const { result, report } = await runFixture('quick', 'test:coverage', true, results);
    expect(result.status).toBe(23);
    expect(report?.phases[2]?.failures).toEqual([
      {
        phase: 'test:coverage',
        file: 'tests/browser/match-screen.browser.test.ts',
        name: 'keeps (long) text reachable',
        command:
          'npm run test:browser -- tests/browser/match-screen.browser.test.ts -t "keeps \\(long\\) text reachable"',
      },
    ]);
    const summary = stripVTControlCharacters(result.stdout);
    expect(summary).toContain('test:  keeps (long) text reachable');
    expect(summary).toContain('run:   npm run test:browser -- ');
  });

  test('reports a failed end-to-end build as the failure of that phase', async () => {
    const results = JSON.stringify({
      suites: [],
      errors: [{ message: 'Process from config.webServer exited early.' }],
    });
    const { result, report } = await runFixture('quick', 'test:e2e', true, results);
    expect(result.status).toBe(23);
    expect(report?.phases[3]).toMatchObject({ phase: 'test:e2e', status: 'failed', failures: [] });
    expect(report?.phases[3]?.note).toContain('production build or a web server failed');
    expect(report?.phases[3]?.note).toContain('exited early');
  });

  test('requires npm invocation when its CLI path is unavailable', async () => {
    const { result, calls } = await runFixture('quick', '', false);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Run this gate through npm run quality:quick, quality:full, or quality:release.',
    );
    expect(calls).toEqual([]);
  });

  test('rejects an unsupported mode before it starts a phase', async () => {
    const { result, calls } = await runFixture('other');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Use run-quality-gate.ts quick, full, or release.');
    expect(calls).toEqual([]);
  });
});
