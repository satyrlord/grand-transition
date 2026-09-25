import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

type DependencyRule = Readonly<{ kind: 'directory' | 'module'; path: string }>;
type PurePolicy = Readonly<{ root: string; allowedDependencies: readonly DependencyRule[] }>;
type MaskFrame =
  | { type: 'code' }
  | { type: 'code'; templateDepth: number }
  | { type: 'line-comment' }
  | { type: 'block-comment' }
  | { type: 'string'; quote: string }
  | { type: 'template' };
type ScannedToken = Readonly<{ kind: SyntaxKind; text: string; value: string }>;

const pureRootPolicies: readonly PurePolicy[] = [
  {
    root: path.join('src', 'localization'),
    allowedDependencies: [
      directoryDependency('src', 'localization'),
      directoryDependency('src', 'content'),
    ],
  },
  {
    root: path.join('src', 'engine'),
    allowedDependencies: [
      directoryDependency('src', 'engine'),
      directoryDependency('src', 'content'),
      directoryDependency('src', 'localization'),
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
    // Development-only replay and AI evidence sits above engine, AI, and codecs.
    root: path.join('src', 'simulation'),
    allowedDependencies: [
      directoryDependency('src', 'simulation'),
      directoryDependency('src', 'engine'),
      directoryDependency('src', 'ai'),
      directoryDependency('src', 'persistence', 'codecs'),
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

function directoryDependency(...segments: string[]): DependencyRule {
  return { kind: 'directory', path: path.join(...segments) };
}
function moduleDependency(...segments: string[]): DependencyRule {
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
  'indexedDB',
  'localStorage',
  'navigator',
  'requestAnimationFrame',
  'sessionStorage',
  'speechSynthesis',
  'window',
]);

async function pathIsDirectory(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function* walkSourceFiles(directory: string): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkSourceFiles(entryPath);
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/u.test(entry.name)) {
      yield entryPath;
    }
  }
}

function isLitSpecifier(specifier: string): boolean {
  return specifier === 'lit' || specifier.startsWith('lit/') || specifier.startsWith('@lit/');
}

function maskCommentsAndStrings(sourceText: string): string {
  let result = '';
  const stack: MaskFrame[] = [{ type: 'code' }];
  for (let index = 0; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    const nextCharacter = sourceText[index + 1];
    const frame = stack[stack.length - 1]!;
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
      } else if (character === (frame as { quote: string }).quote) {
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

function staticModuleSpecifiers(sourceText: string) {
  const scanner = createScanner(true, undefined, sourceText);
  const tokens: ScannedToken[] = [];
  const templateBraceDepths: number[] = [];
  const expressionStarts = new Set([
    '(',
    '[',
    '{',
    '=',
    ':',
    ',',
    ';',
    '=>',
    'return',
    'throw',
    'case',
    '!',
    '?',
    '&&',
    '||',
    '??',
  ]);
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    if (
      kind === SyntaxKind.SlashToken &&
      (tokens.length === 0 || expressionStarts.has(tokens.at(-1)!.text))
    ) {
      kind = scanner.reScanSlashToken();
    }
    if (scanner.getTokenEnd() <= scanner.getTokenStart()) {
      throw new Error(`Cannot scan source token at offset ${scanner.getTokenStart()}.`);
    }
    if (kind === SyntaxKind.TemplateHead) {
      templateBraceDepths.push(0);
    } else if (templateBraceDepths.length > 0) {
      const index = templateBraceDepths.length - 1;
      if (kind === SyntaxKind.OpenBraceToken) {
        templateBraceDepths[index] += 1;
      } else if (kind === SyntaxKind.CloseBraceToken) {
        if (templateBraceDepths[index] > 0) {
          templateBraceDepths[index] -= 1;
        } else {
          kind = scanner.reScanTemplateToken(false);
          if (kind === SyntaxKind.TemplateTail) templateBraceDepths.pop();
        }
      }
    }
    tokens.push({
      kind,
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
    });
  }
  const specifiers: string[] = [];
  const violations: string[] = [];
  const addStringToken = (token: ScannedToken | undefined) => {
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
    const token = tokens[index]!;
    const next = tokens[index + 1];
    const propertyOffset = next?.text === '?.' ? 2 : 1;
    const previousText = tokens[index - 1]?.text;
    const isMemberAccess = previousText === '.' || previousText === '?.';
    if (
      !isMemberAccess &&
      token.text === 'globalThis' &&
      tokens[index + propertyOffset]?.text === '['
    ) {
      const property = tokens[index + propertyOffset + 1];
      if (
        (property?.kind !== SyntaxKind.StringLiteral &&
          property?.kind !== SyntaxKind.NoSubstitutionTemplateLiteral) ||
        tokens[index + propertyOffset + 2]?.text !== ']'
      ) {
        violations.push('nonliteral globalThis property');
      } else if (domNames.has(property.value)) {
        violations.push(`computed forbidden DOM name "${property.value}"`);
      }
    }
    if (token.kind === SyntaxKind.ImportKeyword) {
      if (addStringToken(next)) continue;
      if (next?.kind === SyntaxKind.OpenParenToken) {
        if (
          !addStringToken(tokens[index + 2]) ||
          ![SyntaxKind.CloseParenToken, SyntaxKind.CommaToken].includes(tokens[index + 3]?.kind)
        ) {
          violations.push('nonliteral dynamic import');
        }
        continue;
      }
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor]!;
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
        const candidate = tokens[cursor]!;
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
    } else if (token.text === 'require' && next?.kind === SyntaxKind.OpenParenToken) {
      if (
        !addStringToken(tokens[index + 2]) ||
        tokens[index + 3]?.kind !== SyntaxKind.CloseParenToken
      ) {
        violations.push('nonliteral require call');
      }
    }
  }
  return { specifiers, violations };
}

function inspectSource(
  sourceText: string,
  relativePath: string,
  filePath: string,
  rootDirectory: string,
  policy: PurePolicy,
): string[] {
  const failures: string[] = [];
  if (/^\s*\/\/\/\s*<reference\s+lib=["']dom["']/mu.test(sourceText)) {
    failures.push(`${relativePath}: DOM library reference`);
  }

  const references = staticModuleSpecifiers(sourceText);
  failures.push(...references.violations.map((message) => `${relativePath}: ${message}`));
  for (const specifier of references.specifiers) {
    if (isLitSpecifier(specifier)) {
      failures.push(`${relativePath}: forbidden Lit import "${specifier}"`);
    }
    if (
      specifier.startsWith('.') &&
      isGeneratedLocalizationFile(path.resolve(path.dirname(filePath), specifier), rootDirectory)
    ) {
      failures.push(
        `${relativePath}: forbidden generated interface localization dependency "${specifier}"`,
      );
      continue;
    }
    if (
      specifier.startsWith('.') &&
      !dependencyIsAllowed(specifier, filePath, rootDirectory, policy)
    ) {
      failures.push(`${relativePath}: forbidden dependency "${specifier}" from "${policy.root}"`);
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

function dependencyIsAllowed(
  specifier: string,
  filePath: string,
  rootDirectory: string,
  policy: PurePolicy,
): boolean {
  // A module rule names the module without its source-file extension.
  const dependencyPath = path
    .resolve(path.dirname(filePath), specifier)
    .replace(/\.[cm]?[jt]sx?$/u, '');
  return policy.allowedDependencies.some((allowed) => {
    const allowedPath = path.resolve(rootDirectory, allowed.path);
    if (allowed.kind === 'module') return dependencyPath === allowedPath;
    return pathIsInside(dependencyPath, allowedPath);
  });
}

function pathIsInside(candidatePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

// This directory holds lit-localize output for the interface catalog. Generated
// files are validated by `npm run localization:validate` and are not scanned as
// pure-module sources. Checked pure sources still cannot depend on them.
const generatedLocalizationDirectories = [path.join('src', 'localization', 'generated')];

function isGeneratedLocalizationFile(filePath: string, rootDirectory: string): boolean {
  return generatedLocalizationDirectories.some((directory) =>
    pathIsInside(filePath, path.resolve(rootDirectory, directory)),
  );
}

export async function checkPureBoundaries(rootDirectory = process.cwd()) {
  const failures: string[] = [];
  let checkedFiles = 0;

  for (const policy of pureRootPolicies) {
    const absoluteRoot = path.resolve(rootDirectory, policy.root);
    if (!(await pathIsDirectory(absoluteRoot))) {
      continue;
    }
    for await (const filePath of walkSourceFiles(absoluteRoot)) {
      if (isGeneratedLocalizationFile(filePath, rootDirectory)) continue;
      checkedFiles += 1;
      const sourceText = await readFile(filePath, 'utf8');
      const relativePath = path.relative(rootDirectory, filePath);
      failures.push(...inspectSource(sourceText, relativePath, filePath, rootDirectory, policy));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Pure-module boundary check failed:\n${failures.join('\n')}`);
  }

  return { checkedFiles };
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const rootIndex = process.argv.indexOf('--root');
  const rootDirectory = rootIndex === -1 ? process.cwd() : process.argv[rootIndex + 1];
  if (!rootDirectory) {
    throw new Error('Usage: node tools/check-pure-boundaries.ts [--root <path>]');
  }
  checkPureBoundaries(rootDirectory)
    .then(({ checkedFiles }) => {
      console.log(`Pure-module boundary check passed: checked ${checkedFiles} file(s).`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
