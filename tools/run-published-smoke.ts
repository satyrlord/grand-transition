import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  findPublishedArtifactDifferences,
  parsePublishedSmokeArguments,
  summarizePublishedReport,
} from './published-smoke.ts';

const evidenceDirectory = 'tmp/published-smoke';
const options = parsePublishedSmokeArguments(process.argv.slice(2));
await rm(evidenceDirectory, { force: true, recursive: true });
await mkdir(evidenceDirectory, { recursive: true });

let artifact: Awaited<ReturnType<typeof findPublishedArtifactDifferences>> | null = null;
if (options.artifactDirectory) {
  artifact = await findPublishedArtifactDifferences(options.baseUrl, options.artifactDirectory);
  console.log(
    `Published artifact: ${artifact.files} files, ${artifact.differences.length} differ.`,
  );
  for (const difference of artifact.differences) console.error(`  ${difference}`);
}

const playwright = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
);
const run = spawnSync(
  process.execPath,
  [playwright, 'test', '--config', 'playwright.published.config.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, GRAND_TRANSITION_PUBLISHED_URL: options.baseUrl },
  },
);
if (run.error) throw run.error;

const results = await readFile(`${evidenceDirectory}/report.json`, 'utf8')
  .then((text) =>
    summarizePublishedReport(JSON.parse(text) as Parameters<typeof summarizePublishedReport>[0]),
  )
  .catch(() => []);
const passed =
  run.status === 0 &&
  results.length > 0 &&
  results.every((result) => result.status === 'passed') &&
  (artifact?.differences.length ?? 0) === 0;
await writeFile(
  `${evidenceDirectory}/summary.json`,
  `${JSON.stringify(
    {
      baseUrl: options.baseUrl,
      checkedAt: new Date().toISOString(),
      passed,
      artifact: artifact && {
        directory: options.artifactDirectory,
        files: artifact.files,
        differences: artifact.differences,
      },
      results,
    },
    null,
    2,
  )}\n`,
);
for (const result of results) {
  console.log(`${result.status.padEnd(8)} ${result.project} (${result.browser}) ${result.test}`);
}
process.exitCode = passed ? 0 : 1;
