import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const runner = path.resolve('tools/run-quality-gate.mjs');
const phases = ['validate', 'test', 'test:browser', 'test:coverage', 'test:e2e'];

async function runFixture(mode: string, failPhase = '', includeNpm = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grand transition gate '));
  try {
    const npmCli = path.join(root, 'fake npm cli.mjs');
    const capture = path.join(root, 'phases.jsonl');
    await writeFile(npmCli, `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.GT_GATE_CAPTURE, JSON.stringify({
  args: process.argv.slice(2), mode: process.env.GRAND_TRANSITION_QUALITY_GATE,
  marker: process.env.GT_GATE_MARKER,
}) + '\\n');
if (process.argv[3] === process.env.GT_GATE_FAIL_PHASE) process.exit(23);
`);
    const env = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => key.toLowerCase() !== 'npm_execpath'));
    if (includeNpm) env.npm_execpath = npmCli;
    const result = spawnSync(process.execPath, [runner, mode], {
      cwd: root,
      env: { ...env, GT_GATE_CAPTURE: capture, GT_GATE_FAIL_PHASE: failPhase,
        GT_GATE_MARKER: 'preserved value with spaces' },
      encoding: 'utf8',
    });
    const calls = await readFile(capture, 'utf8').then((text) =>
      text.trim().split('\n').map((line) => JSON.parse(line) as {
        args: string[]; mode: string; marker: string;
      }), () => []);
    return { result, calls };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('portable quality gate runner', () => {
  test.each(['quick', 'full'])('runs %s phases using the npm CLI path with spaces', async (mode) => {
    const { result, calls } = await runFixture(mode);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(calls).toEqual(phases.map((phase) => ({
      args: ['run', phase], mode, marker: 'preserved value with spaces',
    })));
  });

  test('preserves the first failing phase exit code and stops later phases', async () => {
    const { result, calls } = await runFixture('quick', 'test:browser');
    expect(result.status, result.stderr).toBe(23);
    expect(calls.map((call) => call.args[1])).toEqual(phases.slice(0, 3));
  });

  test('requires npm invocation when its CLI path is unavailable', async () => {
    const { result, calls } = await runFixture('quick', '', false);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Run this gate through npm run quality:quick or npm run quality:full.');
    expect(calls).toEqual([]);
  });

  test('rejects an unsupported mode before it starts a phase', async () => {
    const { result, calls } = await runFixture('other');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Use run-quality-gate.mjs quick or full.');
    expect(calls).toEqual([]);
  });
});
