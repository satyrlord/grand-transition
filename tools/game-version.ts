import { execFileSync } from 'node:child_process';
import packageJson from '../package.json' with { type: 'json' };

export type GameVersionMode = 'production' | 'development';

type GitRunner = (args: readonly string[]) => string;

const runGit: GitRunner = (args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/**
 * Returns `v<major>.<commit count>` for the built commit. The major number is
 * the major part of the package version. A production build needs the complete
 * history, so a missing or shallow history stops it. Development uses
 * `v<major>.dev` instead.
 */
export function readGameVersion(
  mode: GameVersionMode,
  git: GitRunner = runGit,
  packageVersion: string = packageJson.version,
): string {
  const major = /^(\d+)\./u.exec(packageVersion)?.[1];
  if (!major) throw new Error(`Package version "${packageVersion}" has no major number.`);
  let count: string | undefined;
  let problem = 'Git is not available';
  try {
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
      problem = 'The Git history is shallow';
    } else {
      count = git(['rev-list', '--count', 'HEAD']);
      if (!/^[1-9]\d*$/u.test(count)) {
        problem = `Git gave the commit count "${count}"`;
        count = undefined;
      }
    }
  } catch {
    count = undefined;
  }
  if (count) return `v${major}.${count}`;
  if (mode === 'development') return `v${major}.dev`;
  throw new Error(
    `${problem}, so the build cannot count commits for the game version. ` +
      'Build from a clone with the complete history, for example with `fetch-depth: 0`.',
  );
}
