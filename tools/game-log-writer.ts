import { validateDevelopmentLog } from './development-log-schema.ts';
import {
  mkdir,
  readdir,
  realpath,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

export const maximumGameLogBytes = 2 * 1024 * 1024;
export const maximumStoredGameLogs = 50;
const gameLogFilename = /^match-\d{4}-\d{2}-\d{2}-seed-\d+(?:-\d+)?\.log$/u;

export type GameLogWriteRequest = Readonly<{
  text: string;
  repositoryRoot?: string;
  logDirectory?: string;
  now?: Date;
}>;

export async function writeGameLog(
  request: GameLogWriteRequest,
): Promise<string> {
  const repositoryRoot = path.resolve(request.repositoryRoot ?? process.cwd());
  const logDirectory = path.resolve(
    request.logDirectory ?? path.join(repositoryRoot, 'logs'),
  );
  requireInsideRepository(repositoryRoot, logDirectory);
  const bytes = Buffer.byteLength(request.text, 'utf8');
  if (bytes === 0) throw new Error('The game log is empty.');
  if (bytes > maximumGameLogBytes) {
    throw new Error(`The game log exceeds ${maximumGameLogBytes} bytes.`);
  }
  const header = validateDevelopmentLog(request.text);

  await requireExistingAncestorInsideRepository(repositoryRoot, logDirectory);
  await mkdir(logDirectory, { recursive: true });
  await requireResolvedInsideRepository(repositoryRoot, logDirectory);
  const date = fileDate(request.now ?? new Date());
  const baseName = `match-${date}-seed-${header.seed}`;
  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const filename = `${baseName}${suffix === 1 ? '' : `-${suffix}`}.log`;
    const filePath = path.join(logDirectory, filename);
    try {
      await writeFile(filePath, request.text, { encoding: 'utf8', flag: 'wx' });
      await pruneOldGameLogs(logDirectory, filePath);
      return path.relative(repositoryRoot, filePath).replaceAll('\\', '/');
    } catch (error) {
      if (isFileExistsError(error)) continue;
      throw error;
    }
  }
  throw new Error('The game log filename collision limit was reached.');
}

async function pruneOldGameLogs(
  logDirectory: string,
  currentFile: string,
): Promise<void> {
  const candidates = (
    await Promise.all(
      (await readdir(logDirectory, { withFileTypes: true }))
        .filter(
          (entry) =>
            entry.isFile() &&
            gameLogFilename.test(entry.name) &&
            path.join(logDirectory, entry.name) !== currentFile,
        )
        .map(async (entry) => {
          const filePath = path.join(logDirectory, entry.name);
          return { filePath, modified: (await stat(filePath)).mtimeMs };
        }),
    )
  ).sort(
    (first, second) =>
      first.modified - second.modified ||
      first.filePath.localeCompare(second.filePath),
  );
  const removeCount = Math.max(
    0,
    candidates.length + 1 - maximumStoredGameLogs,
  );
  await Promise.all(
    candidates.slice(0, removeCount).map(({ filePath }) => unlink(filePath)),
  );
}

function fileDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function requireResolvedInsideRepository(
  repositoryRoot: string,
  target: string,
): Promise<void> {
  const [resolvedRepositoryRoot, resolvedTarget] = await Promise.all([
    realpath(repositoryRoot),
    realpath(target),
  ]);
  requireInsideRepository(resolvedRepositoryRoot, resolvedTarget);
}

async function requireExistingAncestorInsideRepository(
  repositoryRoot: string,
  target: string,
): Promise<void> {
  const resolvedRoot = await realpath(repositoryRoot);
  let ancestor = target;
  for (;;) {
    let resolvedAncestor: string;
    try {
      resolvedAncestor = await realpath(ancestor);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) ||
          error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
      continue;
    }
    requireInsideRepository(
      resolvedRoot,
      path.resolve(resolvedAncestor, path.relative(ancestor, target)),
    );
    return;
  }
}

function requireInsideRepository(repositoryRoot: string, target: string): void {
  const relative = path.relative(repositoryRoot, target);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('The game log directory must be inside the repository.');
  }
}

function isFileExistsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}
