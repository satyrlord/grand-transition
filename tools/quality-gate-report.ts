// Parses the machine-readable results of the test phases, so the gate can name
// each failed test and give one command that runs only that test.

export type GateFailure = Readonly<{
  phase: string;
  file: string;
  name: string;
  command: string;
}>;

export type GatePhaseReport = Readonly<{
  phase: string;
  script: string;
  status: 'passed' | 'failed';
  exitCode: number;
  seconds: number;
  failures: readonly GateFailure[];
  note?: string;
}>;

export type GateReport = Readonly<{
  mode: string;
  startedAt: string;
  finishedAt: string;
  passed: boolean;
  record: string;
  phases: readonly GatePhaseReport[];
}>;

type PhaseKind = 'vitest' | 'playwright';

type PhaseContext = Readonly<{
  phase: string;
  mode: 'quick' | 'full';
  repositoryRoot: string;
}>;

/** The phases that run a test runner, and the single-test script of each. */
const testPhases: Readonly<Record<string, Readonly<{ kind: PhaseKind; script: string }>>> = {
  test: { kind: 'vitest', script: 'test' },
  // The coverage phase runs the whole Browser Mode suite, so a single test of it
  // runs in Browser Mode too.
  'test:coverage': { kind: 'vitest', script: 'test:browser' },
  'test:e2e': { kind: 'playwright', script: 'test:e2e' },
};

export function phaseTestKind(phase: string): PhaseKind | undefined {
  return testPhases[phase]?.kind;
}

/**
 * Escapes a test name for a regular expression that stays valid in a double
 * quoted argument of Bash and PowerShell. A character that either shell treats
 * as special becomes a wildcard instead of an escape.
 */
export function namePattern(name: string): string {
  return name.replace(/[\s\S]/gu, (character) =>
    /["'$`\\!%]/u.test(character)
      ? '.'
      : /[.*+?^{}()|[\]-]/u.test(character)
        ? `\\${character}`
        : character,
  );
}

export function singleTestCommand(
  context: PhaseContext,
  file: string,
  name: string | null,
  project?: string,
): string {
  const entry = testPhases[context.phase];
  if (!entry) throw new Error(`Phase ${context.phase} does not run a test runner.`);
  const script = context.mode === 'full' ? `${entry.script}:full` : entry.script;
  const parts = [`npm run ${script} -- ${file}`];
  if (project) parts.push(`--project=${project}`);
  if (name) parts.push(`${entry.kind === 'vitest' ? '-t' : '-g'} "${namePattern(name)}"`);
  return parts.join(' ');
}

const slash = (value: string) => value.replaceAll('\\', '/');

function relativeFile(repositoryRoot: string, file: string): string {
  const root = `${slash(repositoryRoot).replace(/\/$/u, '')}/`;
  const normalized = slash(file);
  return normalized.startsWith(root) ? normalized.slice(root.length) : normalized;
}

type VitestResults = {
  testResults?: {
    name: string;
    status: string;
    message?: string;
    assertionResults?: { fullName: string; status: string }[];
  }[];
};

export function vitestFailures(results: unknown, context: PhaseContext): GateFailure[] {
  const failures: GateFailure[] = [];
  for (const file of (results as VitestResults).testResults ?? []) {
    const name = relativeFile(context.repositoryRoot, file.name);
    const failed = (file.assertionResults ?? []).filter((test) => test.status === 'failed');
    for (const test of failed) {
      failures.push({
        phase: context.phase,
        file: name,
        name: test.fullName,
        command: singleTestCommand(context, name, test.fullName),
      });
    }
    // A file that cannot load has no failed test, but the run still failed.
    if (file.status === 'failed' && failed.length === 0) {
      failures.push({
        phase: context.phase,
        file: name,
        name: '(the test file failed to run)',
        command: singleTestCommand(context, name, null),
      });
    }
  }
  return failures;
}

type PlaywrightSuite = {
  title: string;
  file?: string;
  suites?: PlaywrightSuite[];
  specs?: {
    title: string;
    file: string;
    tests: { projectName: string; status: string; results: { status: string }[] }[];
  }[];
};

export type PlaywrightSummary = Readonly<{
  failures: GateFailure[];
  executed: number;
  errors: string[];
}>;

export function playwrightFailures(results: unknown, context: PhaseContext): PlaywrightSummary {
  const report = results as { suites?: PlaywrightSuite[]; errors?: { message?: string }[] };
  const failures: GateFailure[] = [];
  let executed = 0;
  const visit = (suite: PlaywrightSuite, titles: readonly string[], isFile: boolean) => {
    // The top suite of a file is titled with the file name, so it adds no title.
    const path = isFile ? titles : [...titles, suite.title];
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        if (test.status === 'skipped') continue;
        executed += 1;
        if (test.status === 'expected') continue;
        // Playwright gives the file relative to its test directory.
        const relative = relativeFile(context.repositoryRoot, spec.file);
        const file = relative.startsWith('e2e/') ? relative : `e2e/${relative}`;
        const name = [...path, spec.title].join(' ');
        failures.push({
          phase: context.phase,
          file,
          name,
          command: singleTestCommand(context, file, name, test.projectName),
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, path, false);
  };
  for (const suite of report.suites ?? []) visit(suite, [], true);
  return {
    failures,
    executed,
    errors: (report.errors ?? []).map((error) => error.message ?? '').filter(Boolean),
  };
}

export function formatSummary(report: GateReport): string {
  const lines = [`\nQuality gate (${report.mode}) ${report.passed ? 'passed' : 'FAILED'}:`];
  for (const phase of report.phases) {
    lines.push(
      `  ${phase.script.padEnd(18)} ${phase.status === 'passed' ? 'passed' : `FAILED (${phase.exitCode})`}  ${phase.seconds.toFixed(1)} s`,
    );
  }
  for (const phase of report.phases.filter(({ status }) => status === 'failed')) {
    lines.push(`\nFailed phase ${phase.script}${phase.note ? `: ${phase.note}` : ''}`);
    for (const failure of phase.failures) {
      lines.push(
        `  phase: ${failure.phase}`,
        `  file:  ${failure.file}`,
        `  test:  ${failure.name}`,
        `  run:   ${failure.command}`,
        '',
      );
    }
  }
  lines.push(`Gate record: ${report.record}`);
  return lines.join('\n');
}
