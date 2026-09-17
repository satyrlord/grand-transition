import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
if (!['quick', 'full'].includes(mode)) {
  throw new Error('Use run-quality-gate.mjs quick or full.');
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
const phases = mode === 'full'
  ? ['validate', 'balance:validate', 'test', 'test:browser', 'test:coverage', 'test:e2e']
  : ['validate', 'test', 'test:browser', 'test:coverage', 'test:e2e'];
const fullTestPhases = new Set(['test', 'test:browser', 'test:coverage', 'test:e2e']);
for (const phase of phases) {
  const script = mode === 'full' && fullTestPhases.has(phase) ? `${phase}:full` : phase;
  const result = spawnSync(process.execPath, [npmCli, 'run', script], { stdio: 'inherit', env: environment });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
