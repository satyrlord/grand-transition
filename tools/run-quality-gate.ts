import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  formatSummary,
  phaseTestKind,
  playwrightFailures,
  vitestFailures,
  type GateFailure,
  type GatePhaseReport,
  type GateReport,
} from './quality-gate-report.ts';
import { workingTreeIsClean, writeGateRecord } from './quality-gate-record.ts';

const mode = process.argv[2];
if (!['quick', 'full', 'release'].includes(mode)) {
  throw new Error('Use run-quality-gate.ts quick, full, or release.');
}
// The release gate is the full gate without the end-to-end phase. It builds
// the bundle that the release workflow smokes and deploys. See Milestone 031.
const gateMode = mode === 'release' ? 'full' : mode;

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('Run this gate through npm run quality:quick, quality:full, or quality:release.');
}
const environment = {
  ...process.env,
  GRAND_TRANSITION_QUALITY_GATE: gateMode,
  GRAND_TRANSITION_QUALITY_GATE_RUNNER: '1',
};
// `test:coverage` runs the complete Browser Mode suite with coverage, so the
// gate does not run `test:browser` a second time.
const phases =
  mode === 'full'
    ? ['validate', 'balance:validate', 'test', 'test:coverage', 'test:e2e']
    : mode === 'release'
      ? ['validate', 'balance:validate', 'test', 'test:coverage', 'build:bundle']
      : ['validate', 'test', 'test:coverage', 'test:e2e'];
const fullTestPhases = new Set(['test', 'test:coverage', 'test:e2e']);

// Every phase runs, also after an earlier phase failed, so one run reports all
// the failures. The gate never retries a failed test: a test that passes at
// the second attempt is a defect of that test.
const reportDirectory = path.resolve('tmp', 'quality-gate');
mkdirSync(reportDirectory, { recursive: true });
rmSync(path.join(reportDirectory, 'last-pass.json'), { force: true });
const cleanBefore = workingTreeIsClean();
const startedAt = new Date().toISOString();
const reports: GatePhaseReport[] = [];

for (const phase of phases) {
  const script = gateMode === 'full' && fullTestPhases.has(phase) ? `${phase}:full` : phase;
  const kind = phaseTestKind(phase);
  const resultsFile = path.join(reportDirectory, `${phase.replaceAll(':', '-')}.json`);
  rmSync(resultsFile, { force: true });
  const started = performance.now();
  // The validate phase checks every asset that the production build checks,
  // so the end-to-end build after it bundles without validating them again.
  const phaseEnvironment =
    phase === 'test:e2e' ? { ...environment, GRAND_TRANSITION_ASSETS_VALIDATED: '1' } : environment;
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    stdio: 'inherit',
    env: kind
      ? { ...phaseEnvironment, GRAND_TRANSITION_GATE_RESULTS: resultsFile }
      : phaseEnvironment,
  });
  if (result.error) throw result.error;
  const exitCode = result.status ?? 1;
  const seconds = (performance.now() - started) / 1000;
  let failures: GateFailure[] = [];
  let note: string | undefined;
  if (exitCode !== 0 && kind) {
    const context = {
      phase,
      mode: gateMode as 'quick' | 'full',
      repositoryRoot: process.cwd(),
    };
    try {
      const results: unknown = JSON.parse(readFileSync(resultsFile, 'utf8'));
      if (kind === 'vitest') {
        failures = vitestFailures(results, context);
      } else {
        const summary = playwrightFailures(results, context);
        failures = summary.failures;
        if (summary.executed === 0) {
          note =
            `the production build or a web server failed before any test ran. ${summary.errors.join(' ')}`.trim();
        }
      }
    } catch {
      note = 'the phase wrote no result file.';
    }
    if (failures.length === 0 && !note) {
      note = 'no test failed. A coverage threshold or the runner itself failed.';
    }
  }
  reports.push({
    phase,
    script,
    status: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    seconds,
    failures,
    ...(note ? { note } : {}),
  });
}

const failedPhase = reports.find(({ status }) => status === 'failed');
let record = 'not written: the release gate leaves no record';
if (mode !== 'release') {
  if (failedPhase) {
    record = 'not written: a phase failed';
  } else {
    const written = writeGateRecord(gateMode as 'quick' | 'full', { cleanBefore });
    record = written.written ? 'tmp/quality-gate/last-pass.json' : `not written: ${written.reason}`;
  }
}
const report: GateReport = {
  mode,
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: !failedPhase,
  record,
  phases: reports,
};
writeFileSync(path.join(reportDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(formatSummary(report));
if (failedPhase) process.exit(failedPhase.exitCode);
