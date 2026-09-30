import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUNTIME_WINDOW } from './character-runtime-window.ts';

export const CHARACTER_STATES = Object.freeze([
  'selection',
  'thinking',
  'delivery',
  'light-hit',
  'heavy-hit',
  'weakness',
]);
const REFERENCE_ROLES = ['style', 'identity', 'locked-selection'] as const;
const HANDS = ['canvas-left', 'canvas-right', 'both'] as const;
const CANVAS_PIXELS = 2048;
const LIMB_WORD = /\b(?:hand(?!\s+(?:lines|articulation|detail))|arm|fist|palm|thumb)\b/iu;
const SIDED_LIMB =
  /\bcanvas[- ](?:left|right)\s+(?:hand|arm|fist|palm|thumb)\b|\bboth\s+(?:hands|arms|fists)\b/iu;

type Range = [number, number];
interface PropBrief {
  id: string;
  pattern: string;
  count: number;
  hand: (typeof HANDS)[number];
  zone: { x: Range; y: Range };
  signature?: boolean;
  runtimeVisibilityWaiver?: string;
}
export interface CharacterBrief {
  schemaVersion: 1;
  ownerId: string;
  skinId: string;
  state: string;
  facing: 'right';
  promptFile: string;
  studyFile: string;
  action: string;
  stateText: string[];
  figure: { heightPercent: Range; headHeightPercent: Range; marginPx: number };
  references: { role: (typeof REFERENCE_ROLES)[number]; sha256: string }[];
  props: PropBrief[];
}

const squash = (text: string) => text.replace(/\s+/gu, ' ').trim();
const flat = (text: string) => squash(text.replace(/[-–]/gu, ' ')).toLowerCase();
const sentencesOf = (text: string) =>
  text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
const isRange = (value: unknown): value is Range =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item)) &&
  (value as number[])[0]! < (value as number[])[1]!;
const rangeText = ([low, high]: Range) => `${low} to ${high} percent`;

export function parseBrief(source: unknown): CharacterBrief {
  const brief = source as Partial<CharacterBrief> | undefined;
  const problems: string[] = [];
  const text = (key: string, value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) problems.push(`${key} must be text`);
  };
  if (!brief || typeof brief !== 'object') throw new Error('The brief must be a JSON object.');
  if (brief.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  for (const key of ['ownerId', 'skinId', 'promptFile', 'studyFile', 'action'] as const)
    text(key, brief[key]);
  if (!CHARACTER_STATES.includes(String(brief.state)))
    problems.push(`state must be one of ${CHARACTER_STATES.join(', ')}`);
  if (brief.facing !== 'right') problems.push('facing must be right (the sources face right)');
  if (
    !Array.isArray(brief.stateText) ||
    !brief.stateText.length ||
    brief.stateText.some((item) => typeof item !== 'string' || !item.trim())
  )
    problems.push('stateText must list the state-specific text snippets');
  const figure = brief.figure;
  if (
    !figure ||
    !isRange(figure.heightPercent) ||
    !isRange(figure.headHeightPercent) ||
    typeof figure.marginPx !== 'number' ||
    figure.marginPx < 0
  )
    problems.push('figure needs heightPercent, headHeightPercent, and marginPx');
  if (
    !Array.isArray(brief.references) ||
    brief.references.some(
      (reference) =>
        !REFERENCE_ROLES.includes(reference?.role) || !/^[0-9a-f]{64}$/u.test(reference?.sha256),
    )
  )
    problems.push(`references need a role (${REFERENCE_ROLES.join(', ')}) and a SHA-256 value`);
  if (!Array.isArray(brief.props) || !brief.props.length)
    problems.push(
      'props must list every prop, or a prop with count 0 for an explicit no-prop rule',
    );
  for (const prop of brief.props ?? []) {
    if (typeof prop?.id !== 'string' || typeof prop.pattern !== 'string')
      problems.push('each prop needs an id and a pattern');
    else {
      try {
        new RegExp(prop.pattern, 'iu');
      } catch {
        problems.push(`prop ${prop.id} has an invalid pattern`);
      }
    }
    if (!Number.isInteger(prop?.count) || prop.count < 0)
      problems.push(`prop ${prop?.id} needs an integer count`);
    if (!HANDS.includes(prop?.hand))
      problems.push(`prop ${prop?.id} hand must be ${HANDS.join(', ')}`);
    if (!isRange(prop?.zone?.x) || !isRange(prop?.zone?.y))
      problems.push(`prop ${prop?.id} needs a zone with x and y ranges in canvas percent`);
  }
  if (problems.length) throw new Error(`The character brief is not valid: ${problems.join('; ')}.`);
  return brief as CharacterBrief;
}

export interface BriefContext {
  prompt: string;
  study?: string;
  referenceHashes?: string[];
}

export function checkBrief(brief: CharacterBrief, context: BriefContext): string[] {
  const issues: string[] = [];
  const prompt = context.prompt;
  const normalized = squash(prompt);
  const lowered = flat(prompt);
  const sentences = sentencesOf(prompt);

  if (!normalized.includes(squash(brief.action)))
    issues.push('The prompt does not contain the brief action text word for word.');
  for (const snippet of brief.stateText)
    if (!normalized.includes(squash(snippet)))
      issues.push(`The prompt does not contain the state text "${snippet.slice(0, 40)}...".`);
  if (!/\bfacing canvas right\b|\bfacing toward canvas right\b/iu.test(prompt))
    issues.push('The prompt does not say "facing canvas right".');

  const [heightLow, heightHigh] = brief.figure.heightPercent;
  const heightMatch = new RegExp(
    `${heightLow} to ${heightHigh} percent of the (?:2048-square )?canvas height`,
    'iu',
  );
  if (!heightMatch.test(prompt))
    issues.push(
      `The prompt figure height must say "${rangeText(brief.figure.heightPercent)} of the ... canvas height".`,
    );
  const [headLow, headHigh] = brief.figure.headHeightPercent;
  if (
    !new RegExp(`${headLow} to ${headHigh} percent of the visible figure height`, 'iu').test(prompt)
  )
    issues.push(
      `The prompt head size must say "${rangeText(brief.figure.headHeightPercent)} of the visible figure height".`,
    );
  if (!/\boversized\b/iu.test(prompt))
    issues.push('The prompt does not require an oversized head.');
  const margins = [...prompt.matchAll(/at least (\d+) pixels/giu)].map((match) => Number(match[1]));
  if (!margins.some((value) => value >= brief.figure.marginPx))
    issues.push(
      `The prompt must ask for at least ${brief.figure.marginPx} pixels of clear margin.`,
    );
  if (!/zero alpha/iu.test(prompt) || !/\bno\b[^.]*\b(?:glow|backlight|halo)/iu.test(prompt))
    issues.push(
      'The prompt does not have the clean-cutout controls (zero alpha, no glow or halo).',
    );

  for (const sentence of sentences)
    if (
      LIMB_WORD.test(sentence) &&
      !SIDED_LIMB.test(sentence) &&
      !/\bno\b|\bnot\b/iu.test(sentence)
    )
      issues.push(
        `Name the canvas side of each hand or arm. Ambiguous sentence: "${sentence.slice(0, 90)}".`,
      );

  const marginPercent = (brief.figure.marginPx / CANVAS_PIXELS) * 100;
  for (const prop of brief.props) {
    const pattern = new RegExp(prop.pattern, 'iu');
    if (!pattern.test(lowered)) {
      if (prop.count > 0) issues.push(`The prompt does not mention the prop "${prop.id}".`);
      continue;
    }
    if (prop.count === 0) {
      issues.push(`The brief forbids "${prop.id}" but the prompt mentions it.`);
      continue;
    }
    const countWord = prop.count === 1 ? 'one' : String(prop.count);
    if (!new RegExp(`exactly ${countWord}\\b[^.]*(?:${prop.pattern})`, 'iu').test(lowered))
      issues.push(`The prompt must say "exactly ${countWord}" for the prop "${prop.id}".`);
    const handPhrase =
      prop.hand === 'both' ? /both hands/iu : new RegExp(`${prop.hand} hand`, 'iu');
    if (!handPhrase.test(prompt))
      issues.push(`The prompt does not name the ${prop.hand} hand that holds "${prop.id}".`);
    const [x0, x1] = prop.zone.x;
    const [y0, y1] = prop.zone.y;
    if (x0 < marginPercent || x1 > 100 - marginPercent || y0 < 0 || y1 > 100)
      issues.push(`The zone of "${prop.id}" is inside the ${brief.figure.marginPx} pixel margin.`);
    if (prop.signature && !prop.runtimeVisibilityWaiver) {
      if (x0 < RUNTIME_WINDOW.innerXMinPercent || y1 > RUNTIME_WINDOW.yMaxPercent)
        issues.push(
          `The zone of the signature prop "${prop.id}" leaves the runtime window ` +
            `(x from ${RUNTIME_WINDOW.innerXMinPercent} percent, y to ${RUNTIME_WINDOW.yMaxPercent} percent). ` +
            'The match screen clips the outer side and the desk hides the lower body. Move the prop to the inner-side hand at chest height or higher.',
        );
    }
  }
  const signatures = brief.props.filter((prop) => prop.signature);
  if (!signatures.length && !brief.props.every((prop) => prop.count === 0))
    issues.push('Mark one prop as signature.');

  const hashes = context.referenceHashes;
  if (hashes) {
    const declared = brief.references.map((reference) => reference.sha256);
    if (hashes.length !== declared.length || hashes.some((hash, index) => hash !== declared[index]))
      issues.push('The reference files do not match the brief references (order and SHA-256).');
  }
  const roles = brief.references.map((reference) => reference.role);
  if (brief.state === 'selection') {
    if (roles[0] !== 'style' || roles.includes('locked-selection'))
      issues.push('A selection request needs the style reference first and no locked selection.');
    if (roles.length > 1 && !/reference 2/iu.test(prompt))
      issues.push('The prompt does not describe "Reference 2".');
  } else if (roles.length !== 1 || roles[0] !== 'locked-selection') {
    issues.push('A pose request needs the locked selection as the only reference.');
  }

  if (context.study !== undefined) {
    const bullet = context.study
      .split('\n')
      .find((line) => line.trimStart().startsWith(`- \`${brief.state}\``));
    if (brief.state !== 'selection' && !bullet)
      issues.push(`The study has no "- \`${brief.state}\`" line.`);
    for (const prop of signatures) {
      const pattern = new RegExp(prop.pattern, 'iu');
      if (!pattern.test(flat(context.study))) issues.push(`The study does not name "${prop.id}".`);
      else if (bullet && !pattern.test(flat(bullet)))
        issues.push(`The study line for "${brief.state}" does not use "${prop.id}".`);
    }
  }
  return issues;
}

export function assertCharacterBrief(
  briefLabel: string,
  brief: CharacterBrief,
  context: BriefContext,
): void {
  const issues = checkBrief(brief, context);
  if (issues.length)
    throw new Error(
      `${briefLabel}: character prompt check failed. Send no request.\n- ${issues.join('\n- ')}`,
    );
}

const shingles = (text: string) => {
  const tokens = flat(text).split(/\W+/u).filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index + 2 < tokens.length; index++)
    result.add(tokens.slice(index, index + 3).join(' '));
  return result;
};
// Word triples measure real duplication. Shared words such as "canvas" or "picture" do not count.
const overlap = (a: string, b: string) => {
  const left = shingles(a);
  const right = shingles(b);
  const shared = [...left].filter((item) => right.has(item)).length;
  return shared / Math.max(1, left.size + right.size - shared);
};

export interface SetEntry {
  brief: CharacterBrief;
  prompt: string;
}

export function checkSet(entries: SetEntry[]): string[] {
  const issues: string[] = [];
  const first = entries[0];
  if (!first) return ['Give at least one brief.'];
  const common = (entry: SetEntry) => {
    let text = entry.prompt;
    for (const snippet of entry.brief.stateText) text = text.replace(snippet, '');
    return squash(text.replace(entry.brief.action, ''));
  };
  const seen = new Set<string>();
  for (const entry of entries) {
    const { brief } = entry;
    const label = brief.state;
    if (seen.has(label)) issues.push(`The set repeats the state "${label}".`);
    seen.add(label);
    if (brief.ownerId !== first.brief.ownerId || brief.skinId !== first.brief.skinId)
      issues.push(`The state "${label}" belongs to a different owner or skin.`);
    if (JSON.stringify(brief.figure) !== JSON.stringify(first.brief.figure))
      issues.push(`The state "${label}" has different figure controls.`);
    const propKey = (item: CharacterBrief) =>
      JSON.stringify(item.props.map(({ id, pattern, count }) => [id, pattern, count]));
    if (propKey(brief) !== propKey(first.brief))
      issues.push(`The state "${label}" has a different prop list (ids, patterns, counts).`);
    if (brief.state !== 'selection' && first.brief.state !== 'selection') {
      const locked = brief.references[0]?.sha256;
      if (locked !== first.brief.references[0]?.sha256)
        issues.push(`The state "${label}" uses a different locked selection.`);
    }
  }
  const poses = entries.filter(({ brief }) => brief.state !== 'selection');
  const firstPose = poses[0];
  if (firstPose)
    for (const entry of poses.slice(1))
      if (common(entry) !== common(firstPose))
        issues.push(
          `The shared text of "${entry.brief.state}" differs from "${firstPose.brief.state}". Move state text into stateText, or make the identity, style, cutout, and control text identical.`,
        );
  for (const [index, left] of entries.entries())
    for (const right of entries.slice(index + 1))
      if (overlap(left.brief.action, right.brief.action) > 0.4)
        issues.push(
          `The actions of "${left.brief.state}" and "${right.brief.state}" are too similar.`,
        );
  return issues;
}

async function load(briefPath: string): Promise<SetEntry & { study: string }> {
  const brief = parseBrief(JSON.parse(await readFile(briefPath, 'utf8')));
  const base = path.dirname(briefPath);
  const prompt = await readFile(path.resolve(base, brief.promptFile), 'utf8');
  const study = await readFile(path.resolve(brief.studyFile), 'utf8');
  return { brief, prompt, study };
}

async function main(args: string[]): Promise<void> {
  if (!args.length) throw new Error('Usage: validate-character-prompt.ts <brief.json>...');
  const entries = await Promise.all(args.map((item) => load(path.resolve(item))));
  const failures: string[] = [];
  for (const [index, entry] of entries.entries()) {
    for (const issue of checkBrief(entry.brief, { prompt: entry.prompt, study: entry.study }))
      failures.push(`${args[index]}: ${issue}`);
  }
  for (const issue of checkSet(entries)) failures.push(`set: ${issue}`);
  if (failures.length)
    throw new Error(`Character prompt check failed. Send no request.\n- ${failures.join('\n- ')}`);
  process.stdout.write(`Character prompt check passed for ${entries.length} brief(s).\n`);
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
