import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

const pureRootPolicies = [
  {
    root: path.join('src', 'engine'),
    allowedDependencies: [
      directoryDependency('src', 'engine'),
      directoryDependency('src', 'content'),
      directoryDependency('src', 'localization'),
    ],
    moduleOverrides: [
      {
        source: path.join('src', 'engine', 'simulation.ts'),
        allowedDependencies: [
          moduleDependency('src', 'ai', 'easy-ai'),
          directoryDependency('src', 'persistence', 'codecs'),
        ],
      },
    ],
  },
  {
    root: path.join('src', 'ai'),
    allowedDependencies: [
      directoryDependency('src', 'ai'),
      directoryDependency('src', 'engine'),
      directoryDependency('src', 'content'),
      directoryDependency('src', 'localization'),
    ],
  },
  {
    root: path.join('src', 'content'),
    allowedDependencies: [
      directoryDependency('src', 'content'),
      directoryDependency('src', 'localization'),
    ],
  },
  {
    root: path.join('src', 'persistence', 'codecs'),
    allowedDependencies: [
      directoryDependency('src', 'persistence', 'codecs'),
      moduleDependency('src', 'persistence', 'storage-port'),
      directoryDependency('src', 'engine'),
      directoryDependency('src', 'content'),
      directoryDependency('src', 'localization'),
    ],
  },
];

function directoryDependency(...segments) {
  return { kind: 'directory', path: path.join(...segments) };
}

function moduleDependency(...segments) {
  return { kind: 'module', path: path.join(...segments) };
}

const domNames = new Set([
  'CanvasGradient',
  'CanvasPattern',
  'CanvasRenderingContext2D',
  'CustomEvent',
  'Document',
  'Element',
  'Event',
  'EventSource',
  'HTMLCanvasElement',
  'HTMLElement',
  'ImageBitmapRenderingContext',
  'IntersectionObserver',
  'MutationObserver',
  'OffscreenCanvas',
  'OffscreenCanvasRenderingContext2D',
  'Path2D',
  'ResizeObserver',
  'WebGL2RenderingContext',
  'WebGLRenderingContext',
  'WebSocket',
  'XMLHttpRequest',
  'cancelAnimationFrame',
  'customElements',
  'document',
  'fetch',
  'localStorage',
  'navigator',
  'requestAnimationFrame',
  'sessionStorage',
  'speechSynthesis',
  'window',
]);

async function pathIsDirectory(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function* walkSourceFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkSourceFiles(entryPath);
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/u.test(entry.name)) {
      yield entryPath;
    }
  }
}

function isLitSpecifier(specifier) {
  return (
    specifier === 'lit' ||
    specifier.startsWith('lit/') ||
    specifier.startsWith('@lit/')
  );
}

function maskCommentsAndStrings(sourceText) {
  let result = '';
  const stack = [{ type: 'code' }];
  for (let index = 0; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    const nextCharacter = sourceText[index + 1];
    const frame = stack[stack.length - 1];
    const state = frame.type;

    if (state === 'code') {
      if (character === '/' && nextCharacter === '/') {
        stack.push({ type: 'line-comment' });
        result += '  ';
        index += 1;
      } else if (character === '/' && nextCharacter === '*') {
        stack.push({ type: 'block-comment' });
        result += '  ';
        index += 1;
      } else if (character === '"' || character === "'") {
        stack.push({ type: 'string', quote: character });
        result += ' ';
      } else if (character === '`') {
        stack.push({ type: 'template' });
        result += ' ';
      } else if (character === '{' && 'templateDepth' in frame) {
        frame.templateDepth += 1;
        result += character;
      } else if (character === '}' && 'templateDepth' in frame) {
        frame.templateDepth -= 1;
        result += ' ';
        if (frame.templateDepth === 0) {
          stack.pop();
        }
      } else {
        result += character;
      }
    } else if (state === 'line-comment') {
      if (character === '\n') {
        stack.pop();
        result += '\n';
      } else {
        result += ' ';
      }
    } else if (state === 'block-comment') {
      if (character === '*' && nextCharacter === '/') {
        stack.pop();
        result += '  ';
        index += 1;
      } else if (character === '\n') {
        result += '\n';
      } else {
        result += ' ';
      }
    } else if (state === 'string') {
      if (character === '\\') {
        result += '  ';
        index += 1;
      } else if (character === frame.quote) {
        stack.pop();
        result += ' ';
      } else if (character === '\n') {
        result += '\n';
      } else {
        result += ' ';
      }
    } else {
      // template literal
      if (character === '\\') {
        result += '  ';
        index += 1;
      } else if (character === '$' && nextCharacter === '{') {
        stack.push({ type: 'code', templateDepth: 1 });
        result += '  ';
        index += 1;
      } else if (character === '`') {
        stack.pop();
        result += ' ';
      } else if (character === '\n') {
        result += '\n';
      } else {
        result += ' ';
      }
    }
  }
  return result;
}

function staticModuleSpecifiers(sourceText) {
  const scanner = createScanner(true, undefined, sourceText);
  const tokens = [];
  for (
    let kind = scanner.scan();
    kind !== SyntaxKind.EndOfFile;
    kind = scanner.scan()
  ) {
    tokens.push({
      kind,
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
    });
  }
  const specifiers = [];
  const addStringToken = (token) => {
    if (
      token?.kind === SyntaxKind.StringLiteral ||
      token?.kind === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      specifiers.push(token.value);
      return true;
    }
    return false;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (token.kind === SyntaxKind.ImportKeyword) {
      if (addStringToken(next)) continue;
      if (next?.kind === SyntaxKind.OpenParenToken) {
        addStringToken(tokens[index + 2]);
        continue;
      }
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (
          candidate.kind === SyntaxKind.EqualsToken ||
          candidate.kind === SyntaxKind.SemicolonToken
        ) {
          break;
        }
        if (candidate.kind === SyntaxKind.FromKeyword) {
          addStringToken(tokens[cursor + 1]);
          break;
        }
      }
    } else if (token.kind === SyntaxKind.ExportKeyword) {
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (
          candidate.kind === SyntaxKind.EqualsToken ||
          candidate.kind === SyntaxKind.SemicolonToken
        ) {
          break;
        }
        if (candidate.kind === SyntaxKind.FromKeyword) {
          addStringToken(tokens[cursor + 1]);
          break;
        }
      }
    } else if (
      token.text === 'require' &&
      next?.kind === SyntaxKind.OpenParenToken
    ) {
      addStringToken(tokens[index + 2]);
    }
  }
  return specifiers;
}

function inspectSource(
  sourceText,
  relativePath,
  filePath,
  rootDirectory,
  policy,
) {
  const failures = [];
  if (/^\s*\/\/\/\s*<reference\s+lib=["']dom["']/mu.test(sourceText)) {
    failures.push(`${relativePath}: DOM library reference`);
  }

  for (const specifier of staticModuleSpecifiers(sourceText)) {
    if (isLitSpecifier(specifier)) {
      failures.push(`${relativePath}: forbidden Lit import "${specifier}"`);
    }
    if (
      specifier.startsWith('.') &&
      !dependencyIsAllowed(specifier, filePath, rootDirectory, policy)
    ) {
      failures.push(
        `${relativePath}: forbidden dependency "${specifier}" from "${policy.root}"`,
      );
    }
  }

  const maskedSource = maskCommentsAndStrings(sourceText);
  for (const name of domNames) {
    const namePattern = new RegExp(`\\b${name}\\b`, 'gu');
    for (const match of maskedSource.matchAll(namePattern)) {
      const line = maskedSource.slice(0, match.index).split('\n').length;
      failures.push(`${relativePath}:${line}: forbidden DOM name "${name}"`);
    }
  }

  return failures;
}

function dependencyIsAllowed(specifier, filePath, rootDirectory, policy) {
  const dependencyPath = path.resolve(path.dirname(filePath), specifier);
  const relativeFilePath = path.relative(rootDirectory, filePath);
  const moduleOverride = policy.moduleOverrides?.find(
    (override) => override.source === relativeFilePath,
  );
  const allowedDependencies = [
    ...policy.allowedDependencies,
    ...(moduleOverride?.allowedDependencies ?? []),
  ];
  return allowedDependencies.some((allowed) => {
    const allowedPath = path.resolve(rootDirectory, allowed.path);
    if (allowed.kind === 'module') return dependencyPath === allowedPath;
    return pathIsInside(dependencyPath, allowedPath);
  });
}

function pathIsInside(candidatePath, directoryPath) {
  const relativePath = path.relative(directoryPath, candidatePath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

export async function checkPureBoundaries(rootDirectory = process.cwd()) {
  const failures = [];
  let checkedFiles = 0;

  for (const policy of pureRootPolicies) {
    const absoluteRoot = path.resolve(rootDirectory, policy.root);
    if (!(await pathIsDirectory(absoluteRoot))) {
      continue;
    }
    for await (const filePath of walkSourceFiles(absoluteRoot)) {
      checkedFiles += 1;
      const sourceText = await readFile(filePath, 'utf8');
      const relativePath = path.relative(rootDirectory, filePath);
      failures.push(
        ...inspectSource(
          sourceText,
          relativePath,
          filePath,
          rootDirectory,
          policy,
        ),
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Pure-module boundary check failed:\n${failures.join('\n')}`,
    );
  }

  return { checkedFiles };
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const rootIndex = process.argv.indexOf('--root');
  const rootDirectory =
    rootIndex === -1 ? process.cwd() : process.argv[rootIndex + 1];
  if (!rootDirectory) {
    throw new Error(
      'Usage: node tools/check-pure-boundaries.mjs [--root <path>]',
    );
  }
  checkPureBoundaries(rootDirectory)
    .then(({ checkedFiles }) => {
      console.log(
        `Pure-module boundary check passed: checked ${checkedFiles} file(s).`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
