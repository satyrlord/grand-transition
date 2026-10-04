import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const phase = process.argv[2];
const mode = process.argv[3];
const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const playwright = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
);
const commands: Readonly<Record<string, readonly string[]>> = {
  test: [vitest, 'run', '--config', 'vitest.config.ts'],
  'test:browser': [vitest, 'run', '--config', 'vitest.browser.config.ts'],
  'test:coverage': [vitest, 'run', '--config', 'vitest.browser.config.ts', '--coverage'],
  'test:e2e': [playwright, 'test', '--config', 'playwright.config.ts'],
};
if (!phase || !Object.hasOwn(commands, phase) || !mode || !['quick', 'full'].includes(mode)) {
  throw new Error('Use run-test-phase.ts <test phase> quick or full.');
}

const environment = {
  ...process.env,
  GRAND_TRANSITION_QUALITY_GATE: mode,
  GRAND_TRANSITION_QUALITY_GATE_RUNNER: mode === 'full' ? '1' : '',
};
// The quality gate asks for a machine-readable result file, so that it can name
// each failed test. A direct run does not set the variable and keeps its output.
const resultsFile = process.env.GRAND_TRANSITION_GATE_RESULTS;
const reporterArguments = !resultsFile
  ? []
  : phase === 'test:e2e'
    ? ['--reporter=line,json']
    : ['--reporter=default', '--reporter=json', `--outputFile.json=${resultsFile}`];
const result = spawnSync(
  process.execPath,
  [...commands[phase]!, ...reporterArguments, ...process.argv.slice(4)],
  {
    stdio: 'inherit',
    env: resultsFile ? { ...environment, PLAYWRIGHT_JSON_OUTPUT_NAME: resultsFile } : environment,
  },
);
if (result.error) throw result.error;
if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
