import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { basicScoringBalance } from '../src/content/basic-scoring-balance';
import { loadGameContent } from './load-game-content';
import { contentFingerprint, reviewContentPreflight } from './content-review';
import { createPendingEditorialEvidence, loadEditorialInventory, validateEditorialEvidence } from './editorial-review';

type ReviewArguments = { phase: 'prepare' | 'validate'; output: string };

export function executionSourceFingerprint(rootDirectory = fileURLToPath(new URL('..', import.meta.url))): string {
  const files: string[] = ['package.json', 'package-lock.json'];
  const visit = (relativeDirectory: string) => {
    for (const entry of readdirSync(path.join(rootDirectory, relativeDirectory), { withFileTypes: true })) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) visit(relativePath);
      else if (entry.isFile() && /\.(?:ts|mjs|json)$/u.test(entry.name)) files.push(relativePath);
    }
  };
  visit('src');
  visit('tools');
  const hash = createHash('sha256');
  for (const file of files.toSorted()) {
    const bytes = readFileSync(path.join(rootDirectory, file));
    hash.update(`${file}\0${bytes.length}\0`).update(bytes);
  }
  return hash.digest('hex');
}

export function parseReviewArguments(args: readonly string[]): ReviewArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]!;
    if (!['--phase', '--output'].includes(key)) throw new Error(`Invalid ${key}: Unknown option.`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Invalid ${key}: A value is required.`);
    if (values.has(key)) throw new Error(`Invalid ${key}: Do not repeat the option.`);
    values.set(key, value);
  }
  const phase = values.get('--phase');
  if (phase !== 'prepare' && phase !== 'validate') throw new Error('Invalid --phase: Use prepare or validate.');
  const output = values.get('--output');
  if (!output?.trim()) throw new Error('Invalid --output: A local directory is required.');
  return { phase, output: path.resolve(output) };
}

export async function runReleaseReview(args: readonly string[], output: (text: string) => void = console.log): Promise<number> {
  const options = parseReviewArguments(args);
  const { sampleContent: catalog, englishGameLocale: locale } = loadGameContent();
  const context = { catalog, locale, balance: basicScoringBalance };
  const preflight = reviewContentPreflight(catalog);
  const environment = { os: `${os.type()} ${os.release()}`, architecture: os.arch(), node: process.version, cpu: os.cpus()[0]?.model ?? 'unknown' };
  const identity = { commit: git('rev-parse', 'HEAD').trim(), trackedDiffSha256: digest(git('diff', 'HEAD')), executionSourceSha256: executionSourceFingerprint(), contentSha256: contentFingerprint(context) };
  const metadata = { milestone: '027', environment, identity, command: ['npm run review:release --', ...args].join(' '), productionBuildCommand: 'npm run build' };
  await mkdir(options.output, { recursive: true });

  if (options.phase === 'prepare') {
    const inventory = loadEditorialInventory();
    await writeJson(options.output, 'preflight.json', { ...metadata, status: preflight.length ? 'blocked' : 'ready-for-review', volumeIssues: preflight,
      remainingEvidence: ['Current content and shipped asset checks', 'Complete editorial review', 'Full quality gate and affected production UI audit and critique'] });
    await writeJson(options.output, 'inventory.json', inventory);
    await writeJson(options.output, 'editorial-evidence.json', createPendingEditorialEvidence(inventory));
    output(`Prepared pending review records in ${options.output}. ${preflight.length} content-volume failures. Editorial decisions remain pending.`);
    return 2;
  }

  const inventory = loadEditorialInventory();
  const editorial = validateEditorialEvidence(inventory, await readJson(options.output, 'editorial-evidence.json'));
  await writeValidation(options.output, { ...metadata, volumeIssues: preflight, editorial });
  const passed = preflight.length === 0 && editorial.passed;
  output(`Review evidence ${passed ? 'passes its recorded checks' : 'is blocked'}. This does not replace the required CI and content checks.`);
  return passed ? 0 : 2;
}

function digest(text: string): string { return createHash('sha256').update(text).digest('hex'); }
function git(...args: string[]): string { return execFileSync('git', ['-c', 'core.safecrlf=false', ...args], { encoding: 'utf8', windowsHide: true }); }
async function writeJson(directory: string, name: string, value: unknown): Promise<void> {
  await writeFile(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}
async function writeValidation(directory: string, value: unknown): Promise<void> {
  for (let index = 1; ; index += 1) {
    try {
      await writeJson(directory, index === 1 ? 'validation.json' : `validation-${index}.json`, value);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
}
async function readJson(directory: string, name: string): Promise<unknown> {
  try { return JSON.parse(await readFile(path.join(directory, name), 'utf8')) as unknown; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runReleaseReview(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
