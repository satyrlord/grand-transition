import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pureRoots = [
  path.join('src', 'engine'),
  path.join('src', 'ai'),
  path.join('src', 'content'),
  path.join('src', 'persistence', 'codecs'),
];

const domNames = new Set([
  'CustomEvent',
  'Document',
  'Element',
  'Event',
  'EventSource',
  'HTMLElement',
  'IntersectionObserver',
  'MutationObserver',
  'ResizeObserver',
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

function stripComments(sourceText) {
  let result = '';
  let state = 'code';
  let quote = '';
  for (let index = 0; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    const nextCharacter = sourceText[index + 1];

    if (state === 'code' && character === '/' && nextCharacter === '/') {
      state = 'line-comment';
      result += '  ';
      index += 1;
    } else if (state === 'code' && character === '/' && nextCharacter === '*') {
      state = 'block-comment';
      result += '  ';
      index += 1;
    } else if (state === 'code' && ['"', "'", '`'].includes(character)) {
      state = 'string';
      quote = character;
      result += character;
    } else if (state === 'line-comment' && character === '\n') {
      state = 'code';
      result += '\n';
    } else if (
      state === 'block-comment' &&
      character === '*' &&
      nextCharacter === '/'
    ) {
      state = 'code';
      result += '  ';
      index += 1;
    } else if (state === 'string' && character === '\\') {
      result += character + nextCharacter;
      index += 1;
    } else if (state === 'string' && character === quote) {
      state = 'code';
      result += character;
    } else {
      result +=
        state === 'line-comment' || state === 'block-comment' ? ' ' : character;
    }
  }
  return result;
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

function inspectSource(sourceText, relativePath) {
  const failures = [];
  if (/^\s*\/\/\/\s*<reference\s+lib=["']dom["']/mu.test(sourceText)) {
    failures.push(`${relativePath}: DOM library reference`);
  }

  const modulePattern =
    /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["']([^"']+)["']/gu;
  for (const match of stripComments(sourceText).matchAll(modulePattern)) {
    const specifier = match[1];
    if (isLitSpecifier(specifier)) {
      failures.push(`${relativePath}: forbidden Lit import "${specifier}"`);
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

export async function checkPureBoundaries(rootDirectory = process.cwd()) {
  const failures = [];
  let checkedFiles = 0;

  for (const relativeRoot of pureRoots) {
    const absoluteRoot = path.resolve(rootDirectory, relativeRoot);
    if (!(await pathIsDirectory(absoluteRoot))) {
      continue;
    }
    for await (const filePath of walkSourceFiles(absoluteRoot)) {
      checkedFiles += 1;
      const sourceText = await readFile(filePath, 'utf8');
      const relativePath = path.relative(rootDirectory, filePath);
      failures.push(...inspectSource(sourceText, relativePath));
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
