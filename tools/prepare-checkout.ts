import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
if (process.argv.length !== 3 || (mode !== 'code' && mode !== 'assets')) {
  console.error('Use npm run checkout:code or npm run checkout:assets.');
  process.exit(1);
}

function git(args: string[], quiet = false): void {
  const result = spawnSync('git', args, {
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    if (quiet) {
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    process.exit(result.status ?? 1);
  }
}

// Keep the setting local. Cached objects can restore pointer files without a
// network request, also in linked worktrees that share the Git object store.
git(['lfs', 'install', '--local', '--skip-smudge']);
git(['lfs', 'checkout'], true);

if (mode === 'assets') {
  git(['lfs', 'pull']);
  git(['lfs', 'fsck', '--objects', 'HEAD']);
  console.log('Assets downloaded and validated. Automatic LFS downloads stay disabled.');
} else {
  console.log('Source checkout prepared without downloads. Missing assets stay as pointers.');
  console.log('Before an asset-consuming check, run npm run checkout:assets.');
}
