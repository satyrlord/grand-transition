import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** The Milestone 031 Pages subpath. A rename or a root site changes it with Vite and the workflow. */
export const publishedBasePath = '/grand-transition/';

export type PublishedSmokeOptions = Readonly<{
  baseUrl: string;
  artifactDirectory: string | null;
}>;

const usage = 'Use npm run test:published -- --base-url <url> [--artifact-dir <directory>].';

export function parsePublishedSmokeArguments(argv: readonly string[]): PublishedSmokeOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    const match = /^--(base-url|artifact-dir)(?:=(.*))?$/u.exec(argument);
    if (!match) throw new Error(`Unknown argument ${argument}. ${usage}`);
    const value = match[2] ?? argv[(index += 1)];
    if (!value) throw new Error(`--${match[1]} needs a value. ${usage}`);
    if (values.has(match[1]!)) throw new Error(`--${match[1]} is given more than once.`);
    values.set(match[1]!, value);
  }
  const base = values.get('base-url');
  if (!base) throw new Error(`--base-url is necessary. ${usage}`);
  return {
    baseUrl: normalizePublishedBaseUrl(base),
    artifactDirectory: values.get('artifact-dir') ?? null,
  };
}

export function normalizePublishedBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`The base URL ${value} is not a valid URL.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The base URL must use http or https.');
  }
  if (url.search || url.hash || url.username || url.password) {
    throw new Error('The base URL must not contain a query, a fragment, or credentials.');
  }
  if (url.pathname === publishedBasePath.slice(0, -1)) url.pathname = publishedBasePath;
  if (url.pathname !== publishedBasePath) {
    throw new Error(`The base URL must end with the ${publishedBasePath} subpath.`);
  }
  return url.href;
}

type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'arrayBuffer'>>;

/**
 * Compare each file of the uploaded Pages artifact with the bytes that the
 * base URL serves. The check reads only, so it does not change the release.
 */
export async function findPublishedArtifactDifferences(
  baseUrl: string,
  artifactDirectory: string,
  fetchFile: Fetch = fetch,
  concurrency = 8,
): Promise<{ files: number; differences: string[] }> {
  const entries = await readdir(artifactDirectory, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(artifactDirectory, path.join(entry.parentPath, entry.name)).split(path.sep),
    )
    .map((parts) => parts.join('/'))
    .sort();
  if (!files.includes('index.html')) {
    throw new Error(`${artifactDirectory} is not a Pages artifact: index.html is missing.`);
  }
  const differences: string[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < files.length) {
      const file = files[next++]!;
      const expected = sha256(await readFile(path.join(artifactDirectory, file)));
      const url = new URL(file.split('/').map(encodeURIComponent).join('/'), baseUrl).href;
      const response = await fetchFile(url);
      if (!response.ok) {
        differences.push(`${file}: HTTP ${response.status}`);
        continue;
      }
      const actual = sha256(new Uint8Array(await response.arrayBuffer()));
      if (actual !== expected) differences.push(`${file}: served bytes differ from the artifact`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  return { files: files.length, differences: differences.sort() };
}

type ReportSpec = Readonly<{
  title: string;
  tests: readonly Readonly<{
    projectName: string;
    results: readonly Readonly<{
      status: string;
      attachments?: readonly Readonly<{ name: string; body?: string }>[];
    }>[];
  }>[];
}>;
type ReportSuite = Readonly<{ specs?: readonly ReportSpec[]; suites?: readonly ReportSuite[] }>;

export type PublishedSmokeResult = Readonly<{
  project: string;
  test: string;
  status: string;
  browser: string | null;
}>;

/** Flatten the Playwright JSON report into one result for each test and project. */
export function summarizePublishedReport(report: {
  suites: readonly ReportSuite[];
}): PublishedSmokeResult[] {
  const results: PublishedSmokeResult[] = [];
  const visit = (suite: ReportSuite): void => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const last = test.results.at(-1);
        const environment = last?.attachments?.find(
          (attachment) => attachment.name === 'published-environment',
        );
        const browser = environment?.body
          ? (
              JSON.parse(Buffer.from(environment.body, 'base64').toString('utf8')) as {
                browser: string;
              }
            ).browser
          : null;
        results.push({
          project: test.projectName,
          test: spec.title,
          status: last?.status ?? 'not run',
          browser,
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites) visit(suite);
  return results;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
