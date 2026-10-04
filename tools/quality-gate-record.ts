import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// The gate record says that `quality:quick` or `quality:full` passed for one
// Git tree. The pre-push check compares it with the tree of the pushed commit.
export type GateRecord = Readonly<{
  mode: 'quick' | 'full';
  tree: string;
  node: string;
  npm: string;
  recordedAt: string;
}>;

export const skipVariable = 'GRAND_TRANSITION_SKIP_GATE_CHECK';
const protectedRef = 'refs/heads/main';

export function gateRecordPath(directory = process.cwd()): string {
  return path.join(directory, 'tmp', 'quality-gate', 'last-pass.json');
}

function git(args: readonly string[], directory: string): string | null {
  const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** The tree SHA of a commit, or null outside a repository. */
export function treeOf(commit: string, directory = process.cwd()): string | null {
  return git(['rev-parse', `${commit}^{tree}`], directory);
}

/** True only when Git reports no changed and no untracked file that it does not ignore. */
export function workingTreeIsClean(directory = process.cwd()): boolean {
  return git(['status', '--porcelain'], directory) === '';
}

function npmVersion(): string {
  return /^npm\/(\S+)/u.exec(process.env.npm_config_user_agent ?? '')?.[1] ?? 'unknown';
}

/**
 * Writes the record for `HEAD`. It returns why it wrote nothing: the working
 * tree has changes, because then the tested files and the commit differ.
 */
export function writeGateRecord(
  mode: 'quick' | 'full',
  options: Readonly<{ cleanBefore: boolean; directory?: string }>,
): { written: true } | { written: false; reason: string } {
  const directory = options.directory ?? process.cwd();
  if (!options.cleanBefore || !workingTreeIsClean(directory)) {
    return { written: false, reason: 'the working tree has changes' };
  }
  const tree = treeOf('HEAD', directory);
  if (tree === null) return { written: false, reason: 'there is no Git commit' };
  const record: GateRecord = {
    mode,
    tree,
    node: process.version,
    npm: npmVersion(),
    recordedAt: new Date().toISOString(),
  };
  const file = gateRecordPath(directory);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return { written: true };
}

export function readGateRecord(directory = process.cwd()): GateRecord | null {
  try {
    const value = JSON.parse(readFileSync(gateRecordPath(directory), 'utf8')) as GateRecord;
    return typeof value.tree === 'string' ? value : null;
  } catch {
    return null;
  }
}

/**
 * The pre-push check. Git gives one line for each pushed ref:
 * `<local ref> <local sha> <remote ref> <remote sha>`. Only a push that
 * updates `refs/heads/main` needs a record for the tree of the pushed commit.
 */
export function checkPush(
  input: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  directory = process.cwd(),
): { ok: true } | { ok: false; message: string } {
  if (environment[skipVariable] === '1') return { ok: true };
  for (const line of input.split(/\r?\n/u)) {
    const [, localSha, remoteRef] = line.trim().split(/\s+/u);
    // An all-zero SHA deletes the remote ref, and no commit is pushed.
    if (remoteRef !== protectedRef || !localSha || /^0+$/u.test(localSha)) continue;
    const tree = treeOf(localSha, directory);
    if (tree === null) continue;
    if (readGateRecord(directory)?.tree !== tree) {
      return {
        ok: false,
        message: [
          `Push stopped: the quality gate has no record for tree ${tree} of ${localSha.slice(0, 12)}.`,
          'Commit your changes, then run the gate on the clean tree:',
          '  npm run quality:quick',
          `To push without this check, for example a documentation-only commit, set ${skipVariable}=1.`,
        ].join('\n'),
      };
    }
  }
  return { ok: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (process.argv[2] !== 'check-push') throw new Error('Use quality-gate-record.ts check-push.');
  const outcome = checkPush(readFileSync(0, 'utf8'));
  if (!outcome.ok) {
    process.stderr.write(`${outcome.message}\n`);
    process.exitCode = 1;
  }
}
