import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const domainDefinitions = {
  assets: {
    relativePath: path.join('src', 'assets'),
    allowedExtensions: new Set([
      '.avif',
      '.jpeg',
      '.jpg',
      '.json',
      '.mp3',
      '.png',
      '.svg',
      '.wav',
      '.webp',
      '.woff2',
    ]),
  },
  content: {
    relativePath: path.join('src', 'content'),
    allowedExtensions: new Set(['.json', '.ts']),
  },
  localization: {
    relativePath: path.join('src', 'localization'),
    allowedExtensions: new Set(['.json', '.ts']),
  },
};

async function* walkFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(entryPath);
    } else if (entry.isFile() && entry.name !== '.gitkeep') {
      yield entryPath;
    }
  }
}

export async function validateDomain(domain, rootDirectory = process.cwd()) {
  const definition = domainDefinitions[domain];
  if (!definition) {
    throw new Error(
      `Unknown scaffold domain "${domain}". Expected assets, content, or localization.`,
    );
  }

  const directory = path.resolve(rootDirectory, definition.relativePath);
  try {
    const directoryStats = await stat(directory);
    if (!directoryStats.isDirectory()) {
      throw new Error(`Scaffold path is not a directory: ${directory}`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Required scaffold directory is missing: ${directory}`, {
        cause: error,
      });
    }
    throw error;
  }

  const files = [];
  for await (const file of walkFiles(directory)) {
    files.push(file);
    const extension = path.extname(file).toLowerCase();
    if (!definition.allowedExtensions.has(extension)) {
      throw new Error(
        `${domain} validation rejected ${path.relative(rootDirectory, file)}: ` +
          `extension "${extension || '[none]'}" is not allowed.`,
      );
    }
  }

  return { directory, files };
}

function parseArguments(argumentsList) {
  const domainIndex = argumentsList.indexOf('--domain');
  const modeIndex = argumentsList.indexOf('--mode');
  const rootIndex = argumentsList.indexOf('--root');
  const domain =
    domainIndex === -1 ? undefined : argumentsList[domainIndex + 1];
  const mode = modeIndex === -1 ? 'validate' : argumentsList[modeIndex + 1];
  const rootDirectory =
    rootIndex === -1 ? process.cwd() : argumentsList[rootIndex + 1];

  if (!domain || !['validate', 'build'].includes(mode) || !rootDirectory) {
    throw new Error(
      'Usage: node tools/validate-scaffold.mjs --domain <assets|content|localization> [--mode validate|build] [--root <path>]',
    );
  }
  if (mode === 'build' && domain !== 'assets') {
    throw new Error('Only the assets domain supports build mode.');
  }

  return { domain, mode, rootDirectory };
}

async function main() {
  const { domain, mode, rootDirectory } = parseArguments(process.argv.slice(2));
  const result = await validateDomain(domain, rootDirectory);
  const relativeDirectory = path.relative(rootDirectory, result.directory);
  if (result.files.length === 0) {
    console.log(
      `${domain} ${mode} passed: ${relativeDirectory} is empty; no ${domain} contract exists in this milestone.`,
    );
    return;
  }
  console.log(
    `${domain} ${mode} passed: checked ${result.files.length} file(s).`,
  );
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
