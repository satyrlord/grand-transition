import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const runner = path.resolve('tools/run-parallel.ts');
const node = JSON.stringify(process.execPath);

const run = (...commands: string[]) =>
  spawnSync(process.execPath, [runner, ...commands], { encoding: 'utf8', timeout: 30_000 });

describe('parallel check runner', () => {
  test('runs every check to the end and fails when one check fails', () => {
    const result = run(
      `${node} -e "setTimeout(() => console.log('slow check done'), 300)"`,
      `${node} -e "console.error('broken check'); process.exit(3)"`,
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('slow check done');
    expect(result.stdout).toMatch(/FAILED \(3\) in [\d.]+ s: .*broken check/u);
    expect(result.stderr).toMatch(/1 failed:\n.*broken check/u);
  });

  test('prints each check output as one block after its heading', () => {
    const result = run(
      `${node} -e "console.log('a1'); setTimeout(() => console.log('a2'), 200)"`,
      `${node} -e "setTimeout(() => console.log('b1'), 100)"`,
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/passed in [\d.]+ s: .*\r?\na1\r?\na2\r?\n/u);
    expect(result.stdout).toMatch(/passed in [\d.]+ s: .*\r?\nb1\r?\n/u);
  });

  test('rejects a call without commands', () => {
    expect(run().status).not.toBe(0);
  });
});
