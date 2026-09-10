import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';
import sharp from 'sharp';
import { SCENE_MASTER_NAMES } from '../../../../tools/build-scene-assets.mjs';
import { sceneMasterSize } from '../../../../tools/scene-resolution.mjs';
import { assertColorControlledPrompt } from '../../../../tools/validate-generation-prompt.mjs';

export const MODEL = 'gpt-image-2.5-sunburst';
export const NATIVE_SIZE = Object.freeze({ width: 3840, height: 2160 });
export const INTERNAL_PIXEL_LIMIT = 1920 * 1080;
export const REVIEW_CHECKS = Object.freeze([
  'sceneIdentity', 'style', 'composition', 'layering', 'interfaceClearance', 'artifacts', 'color',
]);
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });

export function selectRoute(size = '3840x2160') {
  const match = /^(\d+)x(\d+)$/u.exec(size);
  if (!match) throw new Error('Use WIDTHxHEIGHT for the requested size.');
  const width = Number(match[1]), height = Number(match[2]);
  if (!Number.isSafeInteger(width * height) || width < 1 || height < 1) throw new Error('Use positive integer image dimensions.');
  return { width, height, pixels: width * height, route: width * height <= INTERNAL_PIXEL_LIMIT ? 'internal' : 'api' };
}

function assertApiSize(size) {
  const plan = selectRoute(size);
  if (plan.route === 'internal') throw new Error('Use the internal image generator at or below 1080p. No API request is permitted.');
  if (Math.max(plan.width, plan.height) > 3840 || plan.width % 16 || plan.height % 16 ||
      Math.max(plan.width, plan.height) / Math.min(plan.width, plan.height) > 3 || plan.pixels > 8_294_400) {
    throw new Error('The requested size is outside the supported OpenAI API dimensions.');
  }
  return plan;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export async function readApiKey(repo = REPO) {
  if (git(['ls-files', '--', '.env.local'], repo)) throw new Error('The environment file must be untracked.');
  try { git(['check-ignore', '-q', '--', '.env.local'], repo); }
  catch { throw new Error('The environment file must be ignored.'); }
  let env;
  try { env = parseEnv(await readFile(path.join(repo, '.env.local'), 'utf8')); }
  catch { throw new Error('Cannot read the local environment file.'); }
  if (!nonempty(env.OPENAI_API_KEY)) throw new Error('The local OPENAI_API_KEY is missing.');
  return env.OPENAI_API_KEY.trim();
}

// Resolve existing ancestors to prevent writes through a junction outside tmp.
async function temporaryPath(value) {
  const target = path.resolve(value);
  const root = path.join(await realpath(REPO), 'tmp');
  let ancestor = path.dirname(target);
  const suffix = [path.basename(target)];
  while (true) {
    try { ancestor = await realpath(ancestor); break; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      suffix.unshift(path.basename(ancestor));
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  const resolved = path.join(ancestor, ...suffix);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Write generated files inside the repository tmp directory.');
  }
  return resolved;
}

export async function inspectInputs(promptFile, references = []) {
  const prompt = await readFile(promptFile, 'utf8');
  if (!nonempty(prompt)) throw new Error('The generation prompt is empty.');
  assertColorControlledPrompt('Private prompt', prompt);
  if (references.length > 16) throw new Error('Use no more than 16 reference images.');
  const inputs = [];
  for (const file of references) {
    const bytes = await readFile(file);
    if (bytes.length >= 50_000_000) throw new Error('Each reference must be smaller than 50 MB.');
    const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) {
      throw new Error('Use static PNG, JPEG, or WebP references.');
    }
    await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
    inputs.push({ sha256: sha256(bytes), width: metadata.width, height: metadata.height, format: metadata.format });
  }
  return { promptSha256: sha256(prompt), references: inputs };
}

function assertBackground(background) {
  if (background !== undefined && !['transparent', 'opaque', 'auto'].includes(background)) {
    throw new Error('Use transparent, opaque, or auto for the background.');
  }
}

export function cliArguments({ cli, prompt, output, size = '3840x2160', references = [], background }) {
  assertApiSize(size);
  assertBackground(background);
  return ['run', '--no-project', '--with', 'openai', 'python', cli,
    references.length ? 'edit' : 'generate', '--model', MODEL,
    '--prompt-file', path.resolve(prompt), '--no-augment', '--size', size,
    '--quality', 'high', '--output-format', 'png', '--n', '1', '--out', output,
    ...(background === undefined ? [] : ['--background', background]),
    ...references.flatMap((file) => ['--image', path.resolve(file)])];
}

export function apiEnvironment(key, ambient = process.env) {
  const env = { ...ambient, OPENAI_API_KEY: key };
  delete env.OPENAI_BASE_URL;
  delete env.OPENAI_LOG;
  return env;
}

export async function runApiCli(options, key, runner = spawn) {
  const args = cliArguments(options); // Reject small requests before starting any process.
  const child = runner('uv', args, { env: apiEnvironment(key), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  // Provider errors can contain credentials. Do not expose child output.
  child.stdout?.resume();
  child.stderr?.resume();
  const code = await new Promise((resolve, reject) => {
    child.on('error', () => reject(new Error('Cannot start the installed OpenAI image CLI.')));
    child.on('close', resolve);
  });
  if (code !== 0) throw new Error(`The OpenAI image CLI failed with exit code ${code}. No new CLI attempt was made.`);
}

export async function inspectImage(bytes, expectedSize = NATIVE_SIZE) {
  const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
  if (metadata.format !== 'png' || (metadata.pages ?? 1) !== 1 ||
      metadata.width !== expectedSize.width || metadata.height !== expectedSize.height) {
    throw new Error(`Expected a ${expectedSize.width}x${expectedSize.height} PNG. Received ${metadata.width}x${metadata.height} ${metadata.format}.`);
  }
  await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
  return { sha256: sha256(bytes), width: metadata.width, height: metadata.height, bytes: bytes.length, format: metadata.format };
}

export function assertReview(review, facts) {
  if (review.sha256 !== facts.sha256 || !nonempty(review.reviewer) || !Array.isArray(review.issues) || review.issues.length) {
    throw new Error('Require a current image review with no unresolved issues.');
  }
  for (const name of REVIEW_CHECKS) {
    if (review.checks?.[name]?.pass !== true || !nonempty(review.checks[name].evidence)) {
      throw new Error(`The visual review must pass ${name} with observed evidence.`);
    }
  }
}

export async function prepareImage(bytes, review, scene, expectedSize = NATIVE_SIZE) {
  if (!SCENE_MASTER_NAMES.includes(`${scene}.png`)) throw new Error('The scene master ID is not declared by the scene builder.');
  const source = await inspectImage(bytes, expectedSize);
  assertReview(review, source);
  const size = sceneMasterSize(scene);
  if (source.width < size.width || source.height < size.height) throw new Error('The candidate is too small for the declared master. Do not upscale.');
  const sameSize = source.width === size.width && source.height === size.height;
  const output = sameSize ? bytes : await sharp(bytes).toColourspace('srgb').resize({
    ...size, fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3, withoutEnlargement: true,
  }).png().toBuffer();
  return { output, record: { source, scene, operation: sameSize ? 'preserve-native-pixels' : 'center-cover-lanczos3-downsample',
    output: { sha256: sha256(output), ...size, bytes: output.length } } };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const { values } = parseArgs({ args, options: {
    prompt: { type: 'string' }, reference: { type: 'string', multiple: true },
    out: { type: 'string' }, input: { type: 'string' }, review: { type: 'string' },
    scene: { type: 'string' }, size: { type: 'string' }, background: { type: 'string' }, 'dry-run': { type: 'boolean' },
  } });
  const allowed = {
    plan: ['size'], generate: ['prompt', 'reference', 'out', 'size', 'background', 'dry-run'],
    inspect: ['input', 'size'], prepare: ['input', 'review', 'scene', 'out', 'size'],
  }[command];
  if (!allowed || Object.keys(values).some((key) => !allowed.includes(key))) throw new Error('Use a documented scene helper command and its arguments.');
  const size = values.size ?? '3840x2160';
  const plan = selectRoute(size);
  if (command === 'plan') { console.log(JSON.stringify(plan)); return; }
  if (command === 'generate' && values.prompt && values.out) {
    assertBackground(values.background);
    const backgroundRecord = values.background === undefined ? {} : { background: values.background };
    if (plan.route === 'internal') {
      if (values['dry-run']) { console.log(JSON.stringify({ ...plan, networkRequest: false })); return; }
      assertApiSize(size);
    }
    assertApiSize(size);
    const out = await temporaryPath(values.out);
    const inputs = await inspectInputs(values.prompt, values.reference);
    const cli = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills', '.system', 'imagegen', 'scripts', 'image_gen.py');
    await access(cli);
    if (values['dry-run']) {
      console.log(JSON.stringify({ ...plan, model: MODEL, ...backgroundRecord, referenceCount: inputs.references.length, networkRequest: false }));
      return;
    }
    const key = await readApiKey();
    await mkdir(path.dirname(out), { recursive: true });
    await mkdir(out); // An existing run must never cause another paid request.
    const record = { model: MODEL, requestedSize: size, quality: 'high', ...backgroundRecord, createdAt: new Date().toISOString(), ...inputs };
    await writeJson(path.join(out, 'request-record.json'), record);
    const output = path.join(out, 'candidate.png');
    await runApiCli({ cli, prompt: values.prompt, output, size, references: values.reference, background: values.background }, key);
    const bytes = await readFile(output);
    await writeJson(path.join(out, 'generation.json'), { ...record, sourceSha256: sha256(bytes) });
    const facts = await inspectImage(bytes, plan);
    await writeJson(path.join(out, 'inspection.json'), facts);
    console.log(JSON.stringify({ candidate: output, ...facts, visualReview: 'required' }));
  } else if (command === 'inspect' && values.input) {
    console.log(JSON.stringify(await inspectImage(await readFile(values.input), plan)));
  } else if (command === 'prepare' && values.input && values.review && values.scene && values.out) {
    const out = await temporaryPath(values.out);
    const { output, record } = await prepareImage(await readFile(values.input), JSON.parse(await readFile(values.review, 'utf8')), values.scene, plan);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, output, { flag: 'wx' });
    await writeJson(`${out}.preparation.json`, record);
    console.log(JSON.stringify({ prepared: out, ...record.output, shippingApproval: 'requires final alpha, provenance, and runtime checks' }));
  } else throw new Error('Required arguments are missing. Read the skill API procedure.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : 'The scene helper failed.'); process.exitCode = 1; });
}
