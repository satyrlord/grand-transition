import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  findPublishedArtifactDifferences,
  parsePublishedSmokeArguments,
  summarizePublishedReport,
} from '../../tools/published-smoke.ts';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function artifact(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'published-artifact-'));
  temporaryDirectories.push(directory);
  for (const [file, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), text);
  }
  return directory;
}

function server(files: Record<string, string>) {
  const requested: string[] = [];
  const fetchFile = async (url: string) => {
    requested.push(url);
    const file = decodeURIComponent(new URL(url).pathname.replace('/grand-transition/', ''));
    const text = files[file];
    return {
      ok: text !== undefined,
      status: text === undefined ? 404 : 200,
      arrayBuffer: async () => new TextEncoder().encode(text ?? '').buffer as ArrayBuffer,
    };
  };
  return { fetchFile, requested };
}

describe('published smoke arguments', () => {
  test('accept the Pages subpath in both argument forms', () => {
    expect(
      parsePublishedSmokeArguments(['--base-url', 'https://satyrlord.github.io/grand-transition/']),
    ).toEqual({
      baseUrl: 'https://satyrlord.github.io/grand-transition/',
      artifactDirectory: null,
    });
    expect(
      parsePublishedSmokeArguments([
        '--base-url=http://127.0.0.1:4173/grand-transition',
        '--artifact-dir=dist',
      ]),
    ).toEqual({ baseUrl: 'http://127.0.0.1:4173/grand-transition/', artifactDirectory: 'dist' });
  });

  test.each([
    [[]],
    [['--base-url']],
    [['--base-url', 'https://satyrlord.github.io/']],
    [['--base-url', 'https://satyrlord.github.io/other/']],
    [['--base-url', 'https://satyrlord.github.io/grand-transition/?cache=1']],
    [['--base-url', 'ftp://satyrlord.github.io/grand-transition/']],
    [['--base-url', 'not a url']],
    [['--url', 'https://satyrlord.github.io/grand-transition/']],
    [
      [
        '--base-url',
        'https://satyrlord.github.io/grand-transition/',
        '--base-url',
        'https://example.com/grand-transition/',
      ],
    ],
  ])('reject %j', (argv) => {
    expect(() => parsePublishedSmokeArguments(argv)).toThrow();
  });
});

describe('published artifact comparison', () => {
  const base = 'https://satyrlord.github.io/grand-transition/';

  test('passes when every artifact file is served with the same bytes', async () => {
    const files = { 'index.html': '<!doctype html>', 'assets/app one.js': 'export {};' };
    const { fetchFile, requested } = server(files);

    expect(await findPublishedArtifactDifferences(base, await artifact(files), fetchFile)).toEqual({
      files: 2,
      differences: [],
    });
    expect(requested.sort()).toEqual([
      'https://satyrlord.github.io/grand-transition/assets/app%20one.js',
      'https://satyrlord.github.io/grand-transition/index.html',
    ]);
  });

  test('reports changed and missing files', async () => {
    const directory = await artifact({
      'index.html': '<!doctype html>',
      'assets/app.js': 'export {};',
      'tts/model.onnx': 'model',
    });
    const { fetchFile } = server({ 'index.html': '<!doctype html>', 'assets/app.js': 'changed' });

    expect(await findPublishedArtifactDifferences(base, directory, fetchFile)).toEqual({
      files: 3,
      differences: [
        'assets/app.js: served bytes differ from the artifact',
        'tts/model.onnx: HTTP 404',
      ],
    });
  });

  test('refuses a directory that is not a Pages artifact', async () => {
    const directory = await artifact({ 'assets/app.js': 'export {};' });

    await expect(
      findPublishedArtifactDifferences(base, directory, server({}).fetchFile),
    ).rejects.toThrow('index.html is missing');
  });
});

test('the report summary keeps each project result and browser version', () => {
  const environment = Buffer.from(JSON.stringify({ browser: '154.0.1' })).toString('base64');

  expect(
    summarizePublishedReport({
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: 'fixed match',
                  tests: [
                    {
                      projectName: 'chromium',
                      results: [
                        {
                          status: 'passed',
                          attachments: [{ name: 'published-environment', body: environment }],
                        },
                      ],
                    },
                    { projectName: 'mobile-chromium', results: [{ status: 'failed' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  ).toEqual([
    { project: 'chromium', test: 'fixed match', status: 'passed', browser: '154.0.1' },
    { project: 'mobile-chromium', test: 'fixed match', status: 'failed', browser: null },
  ]);
});
