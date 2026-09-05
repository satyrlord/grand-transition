import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const checkerPath = path.resolve(
  process.cwd(),
  'tools',
  'check-pure-boundaries.mjs',
);
const packagePath = path.resolve(process.cwd(), 'package.json');

type CommandError = Error & { stderr?: string; stdout?: string };

const ownedBrowserApiNames = [
  'window',
  'document',
  'customElements',
  'localStorage',
  'sessionStorage',
  'speechSynthesis',
  'OffscreenCanvas',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
] as const;

describe('pure-module boundaries', () => {
  test.each([
    'export const value = window.location.href;',
    "export { value } from '../app/browser-value';",
  ])('rejects impure localization reached from engine: %s', async (source) => {
    const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'grand-transition-boundaries-'));
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      const localeRoot = path.join(fixtureRoot, 'src', 'localization');
      await mkdir(engineRoot, { recursive: true });
      await mkdir(localeRoot, { recursive: true });
      await writeFile(path.join(engineRoot, 'valid.ts'), "export { value } from '../localization/value';");
      await writeFile(path.join(localeRoot, 'value.ts'), source);
      await expect(execFileAsync(process.execPath, [checkerPath, '--root', fixtureRoot]))
        .rejects.toThrow(/localization[\\/]value.ts/u);
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('runs the boundary check during validation', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['boundaries:check']).toBe(
      'node tools/check-pure-boundaries.mjs',
    );
    expect(packageJson.scripts.validate).toContain('npm run boundaries:check');
  });

  test('accepts the current pure modules', async () => {
    const result = await execFileAsync(process.execPath, [checkerPath]);

    expect(result.stdout).toMatch(/passed: checked [1-9]\d* file/u);
  });

  test('rejects Lit and every owned browser API class in a pure module', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'invalid.ts'),
        [
          "import { html } from 'lit';",
          `export const invalid = [html, ${ownedBrowserApiNames.join(', ')}];`,
        ].join('\n') + '\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toMatch(
        /forbidden Lit import[\s\S]*forbidden DOM name/u,
      );
      const output = `${failure?.stdout ?? ''}${failure?.stderr ?? ''}`;
      for (const name of ownedBrowserApiNames) {
        expect(output).toContain(`invalid.ts:2: forbidden DOM name "${name}"`);
      }
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('accepts DOM words inside strings and comments', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'valid.ts'),
        [
          "export const note = 'window document fetch stay inside strings';",
          'export const moduleNote = \'from "../app/view-state"\';',
          '// localStorage and navigator in comments are fine too',
          'export const value = 1;',
        ].join('\n') + '\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeUndefined();
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('rejects dependencies from pure modules into application code', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'invalid.ts'),
        "import type { ViewState } from '../app/view-state';\nexport type Invalid = ViewState;\n",
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toContain(
        'forbidden dependency "../app/view-state"',
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('rejects a template-literal dependency into application code', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const engineRoot = path.join(fixtureRoot, 'src', 'engine');
      await mkdir(engineRoot, { recursive: true });
      await writeFile(
        path.join(engineRoot, 'invalid.ts'),
        'export const loadView = () => import(`../app/view-state`);\n',
        'utf8',
      );

      let failure: CommandError | undefined;
      try {
        await execFileAsync(process.execPath, [
          checkerPath,
          '--root',
          fixtureRoot,
        ]);
      } catch (error) {
        failure = error as CommandError;
      }

      expect(failure).toBeDefined();
      expect(`${failure?.stdout ?? ''}${failure?.stderr ?? ''}`).toContain(
        'forbidden dependency "../app/view-state"',
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });

  test('accepts the approved pure dependency directions', async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-boundaries-'),
    );
    try {
      const files = new Map([
        [
          path.join('src', 'engine', 'valid.ts'),
          "import type { Content } from '../content/valid';\nexport type EngineValue = Content;\n",
        ],
        [
          path.join('src', 'ai', 'valid.ts'),
          "import type { EngineValue } from '../engine/valid';\nexport type AiValue = EngineValue;\n",
        ],
        [
          path.join('src', 'content', 'valid.ts'),
          "import type { LocaleValue } from '../localization/valid';\nexport type Content = LocaleValue;\n",
        ],
        [
          path.join('src', 'localization', 'valid.ts'),
          "import { value } from '../content/value';\nexport type LocaleValue = typeof value;\n",
        ],
        [path.join('src', 'content', 'value.ts'), 'export const value = 1;\n'],
        [
          path.join('src', 'persistence', 'storage-port.ts'),
          'export interface StoragePort {}\n',
        ],
        [
          path.join('src', 'persistence', 'codecs', 'valid.ts'),
          "import type { StoragePort } from '../storage-port';\nexport type CodecPort = StoragePort;\n",
        ],
      ]);
      for (const [relativePath, source] of files) {
        const filePath = path.join(fixtureRoot, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source, 'utf8');
      }

      const result = await execFileAsync(process.execPath, [
        checkerPath,
        '--root',
        fixtureRoot,
      ]);

      expect(result.stdout).toContain(
        'Pure-module boundary check passed: checked 6 file(s).',
      );
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true });
    }
  });
});


test.each([
  'export const run = () => globalThis["fetch"]("https://invalid.example");',
  String.raw`export const run = () => globalThis["\u0066etch"]("https://invalid.example");`,
  'export const run = (part: string) => import(part + "../app/private");',
  'export const run = (part: string) => import("./" + part);',
  'export const run = (part: string) => require(part);',
  'export const run = () => globalThis["fe" + "tch"]("url");',
  'export const run = (key: string) => globalThis[key];',
  'export const label = `value ${1}`; export const run = () => globalThis["fetch"]("url");',
  'export const label = `value ${1}`; export const run = (part: string) => import(part);',
  'export const label = `outer ${`inner ${({ value: 1 }).value}`} tail ${2}`; export const run = () => import("../app/private");',
  'export const label = `value ${globalThis["fetch"]("url")}`;',
])('rejects computed pure-boundary access: %s', async (source) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-computed-boundary-'));
  try {
    await mkdir(path.join(root, 'src', 'engine'), { recursive: true });
    await writeFile(path.join(root, 'src', 'engine', 'sample.ts'), source);
    await expect(execFileAsync(process.execPath, [checkerPath, '--root', root])).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('permits member access through a property named globalThis', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-member-globalthis-'));
  try {
    await mkdir(path.join(root, 'src', 'engine'), { recursive: true });
    await writeFile(
      path.join(root, 'src', 'engine', 'sample.ts'),
      "export const run = (target: { globalThis?: Record<string, unknown> }) => target.globalThis?.['fetch'];\n",
    );
    const result = await execFileAsync(process.execPath, [
      checkerPath,
      '--root',
      root,
    ]);
    expect(result.stdout).toContain(
      'Pure-module boundary check passed: checked 1 file(s).',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('permits template text, nested expressions, regular expressions, and division', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gt-template-boundary-'));
  try {
    await mkdir(path.join(root, 'src', 'engine'), { recursive: true });
    await writeFile(path.join(root, 'src', 'engine', 'sample.ts'), [
      'export const label = `fetch ${`nested ${({ value: 2 }).value}`} document ${1}`;',
      'export const pattern = /^#[0-9a-f]{6}$/u;',
      'export const ratio = (6 + 2) / 4;',
    ].join('\n'));
    await expect(execFileAsync(process.execPath, [checkerPath, '--root', root]))
      .resolves.toHaveProperty('stdout', expect.stringContaining('checked 1 file(s)'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
