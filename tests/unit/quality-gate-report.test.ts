import { describe, expect, test } from 'vitest';
import {
  namePattern,
  playwrightFailures,
  singleTestCommand,
  vitestFailures,
} from '../../tools/quality-gate-report.ts';

const quick = { phase: 'test:e2e', mode: 'quick', repositoryRoot: 'D:\\repo' } as const;
const full = { ...quick, mode: 'full' } as const;

describe('quality gate failure report', () => {
  test('escapes regular expression characters and neutralizes shell characters', () => {
    expect(namePattern('keeps (a+b) [x]? ok')).toBe('keeps \\(a\\+b\\) \\[x\\]\\? ok');
    expect(namePattern(`it's "quoted" $HOME \`x\` 100% done!`)).toBe(
      'it.s .quoted. .HOME .x. 100. done.',
    );
  });

  test('gives one command that runs only a Playwright test in the mode of the gate', () => {
    expect(singleTestCommand(quick, 'e2e/a.spec.ts', 'first run starts', 'chromium')).toBe(
      'npm run test:e2e -- e2e/a.spec.ts --project=chromium --no-deps -g "first run starts"',
    );
    expect(singleTestCommand(full, 'e2e/a.spec.ts', 'first run starts', 'chromium')).toBe(
      'npm run test:e2e:full -- e2e/a.spec.ts --project=chromium --no-deps -g "first run starts"',
    );
  });

  test('does not run the dependency projects of a failed benchmark again', () => {
    // release-performance depends on every other project, so without --no-deps
    // the hint ran the whole end-to-end suite before the single benchmark.
    expect(
      singleTestCommand(
        full,
        'e2e/release-performance.spec.ts',
        'meets budgets',
        'release-performance',
      ),
    ).toContain('--project=release-performance --no-deps');
  });

  test('runs a failed test of the coverage phase in Browser Mode', () => {
    const coverage = { ...quick, phase: 'test:coverage' } as const;
    expect(singleTestCommand(coverage, 'tests/browser/a.browser.test.ts', 'one two')).toBe(
      'npm run test:browser -- tests/browser/a.browser.test.ts -t "one two"',
    );
    expect(singleTestCommand({ ...coverage, mode: 'full' }, 'tests/browser/a.ts', null)).toBe(
      'npm run test:browser:full -- tests/browser/a.ts',
    );
  });

  test('lists each failed Vitest test and each file that failed to run', () => {
    const failures = vitestFailures(
      {
        testResults: [
          {
            name: 'D:\\repo\\tests\\unit\\one.test.ts',
            status: 'failed',
            assertionResults: [
              { fullName: 'group passes', status: 'passed' },
              { fullName: 'group fails', status: 'failed' },
            ],
          },
          { name: 'D:\\repo\\tests\\unit\\two.test.ts', status: 'failed', assertionResults: [] },
          { name: 'D:\\repo\\tests\\unit\\three.test.ts', status: 'passed', assertionResults: [] },
        ],
      },
      { ...quick, phase: 'test' },
    );
    expect(failures).toEqual([
      {
        phase: 'test',
        file: 'tests/unit/one.test.ts',
        name: 'group fails',
        command: 'npm run test -- tests/unit/one.test.ts -t "group fails"',
      },
      {
        phase: 'test',
        file: 'tests/unit/two.test.ts',
        name: '(the test file failed to run)',
        command: 'npm run test -- tests/unit/two.test.ts',
      },
    ]);
  });

  test('lists each failed Playwright test with its describe titles and project', () => {
    const summary = playwrightFailures(
      {
        errors: [],
        suites: [
          {
            title: 'settings-persistence.spec.ts',
            file: 'settings-persistence.spec.ts',
            specs: [
              {
                title: 'passes',
                file: 'settings-persistence.spec.ts',
                tests: [{ projectName: 'chromium', status: 'expected', results: [] }],
              },
            ],
            suites: [
              {
                title: 'first run',
                specs: [
                  {
                    title: 'a new browser gets one rehearsal match',
                    file: 'settings-persistence.spec.ts',
                    tests: [
                      { projectName: 'chromium', status: 'unexpected', results: [] },
                      { projectName: 'mobile-chromium', status: 'skipped', results: [] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      quick,
    );
    expect(summary.executed).toBe(2);
    expect(summary.failures).toEqual([
      {
        phase: 'test:e2e',
        file: 'e2e/settings-persistence.spec.ts',
        name: 'first run a new browser gets one rehearsal match',
        command:
          'npm run test:e2e -- e2e/settings-persistence.spec.ts --project=chromium --no-deps -g "first run a new browser gets one rehearsal match"',
      },
    ]);
  });

  test('counts no executed test when the build fails before the tests start', () => {
    const summary = playwrightFailures(
      { suites: [], errors: [{ message: 'Process from config.webServer exited early.' }] },
      quick,
    );
    expect(summary).toEqual({
      failures: [],
      executed: 0,
      errors: ['Process from config.webServer exited early.'],
    });
  });
});
