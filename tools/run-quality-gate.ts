import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const mode = process.argv[2];
if (!['quick', 'full'].includes(mode)) {
  throw new Error('Use run-quality-gate.ts quick or full.');
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('Run this gate through npm run quality:quick or npm run quality:full.');
}
const environment = {
  ...process.env,
  GRAND_TRANSITION_QUALITY_GATE: mode,
  GRAND_TRANSITION_QUALITY_GATE_RUNNER: '1',
};
// `test:coverage` runs the complete Browser Mode suite with coverage, so the
// gate does not run `test:browser` a second time.
const phases =
  mode === 'full'
    ? ['validate', 'balance:validate', 'test', 'test:coverage', 'test:e2e']
    : ['validate', 'test', 'test:coverage', 'test:e2e'];
const fullTestPhases = new Set(['test', 'test:coverage', 'test:e2e']);
const timings: string[] = [];
const report = () => console.log(`\nQuality gate (${mode}) phase times:\n${timings.join('\n')}`);
for (const phase of phases) {
  const script = mode === 'full' && fullTestPhases.has(phase) ? `${phase}:full` : phase;
  const started = performance.now();
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    stdio: 'inherit',
    // The validate phase checks every asset that the production build checks,
    // so the end-to-end build after it bundles without validating them again.
    env:
      phase === 'test:e2e'
        ? { ...environment, GRAND_TRANSITION_ASSETS_VALIDATED: '1' }
        : environment,
  });
  timings.push(`  ${script.padEnd(18)} ${((performance.now() - started) / 1000).toFixed(1)} s`);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    report();
    process.exit(result.status ?? 1);
  }
}
report();
