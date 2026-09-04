import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredColorControls = [
  {
    label: 'neutral sRGB white balance',
    pattern: /neutral\s+sRGB\s+white[- ]balance/iu,
    polarity: 'positive',
  },
  {
    label: 'ungraded colors',
    pattern: /ungraded\s+(?:color\s+)?(?:treatment|palette|colors?)/iu,
    polarity: 'positive',
  },
  {
    label: 'local warm color scope',
    pattern: /warm\s+color\s+is\s+local\s+to/iu,
    polarity: 'positive',
  },
  {
    label: 'no whole-image color tint',
    pattern: /no\s+(?:whole[- ]image|full[- ]frame|global)\s+(?:color\s+)?(?:tint|wash|grade)/iu,
    polarity: 'negative',
  },
];

const warmLightingPattern =
  /\bwarm\s+(?:(?:frontal|cinematic|studio)\s+)*(?:key\s+light|lighting)\b/iu;
const globalWarmGradePattern =
  /\b(?:global|whole[- ]image|full[- ]frame|scene[- ]wide|image[- ]wide)\s+(?:yellow|amber|sepia|golden[- ]hour|mustard|beige|brown|warm)(?:\s+color)?\s+(?:wash(?:es)?|tint|grade|filter|cast)\b/iu;
const sectionHeadingPattern =
  /(?:^|\n)\s*(positive|negative)(?:\s+controls?)?\s*:/giu;

function globalPattern(pattern) {
  return new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g',
  );
}

function isNegativeContext(prompt, matchIndex) {
  let section = undefined;
  for (const heading of prompt.slice(0, matchIndex).matchAll(sectionHeadingPattern)) {
    section = heading[1]?.toLowerCase();
  }

  const prefix = prompt.slice(0, matchIndex);
  const clauseStart =
    Math.max(
      prefix.lastIndexOf('\n'),
      prefix.lastIndexOf('.'),
      prefix.lastIndexOf(';'),
    ) + 1;
  const localNegativeControl =
    /\b(?:avoid|no|without|exclude|reject|never)\b|\bdo\s+not\b/iu.test(
      prefix.slice(clauseStart),
    );
  if (localNegativeControl) return true;
  return section === 'negative';
}

function hasPositiveMatch(prompt, pattern) {
  for (const match of prompt.matchAll(globalPattern(pattern))) {
    if (!isNegativeContext(prompt, match.index ?? 0)) return true;
  }
  return false;
}

export function assertColorControlledPrompt(filePath, prompt) {
  const missing = requiredColorControls
    .filter(({ pattern, polarity }) =>
      polarity === 'negative'
        ? !pattern.test(prompt)
        : !hasPositiveMatch(prompt, pattern),
    )
    .map(({ label }) => label);
  const issues = [];
  if (missing.length > 0) {
    issues.push(`missing ${missing.join(', ')}`);
  }
  if (hasPositiveMatch(prompt, warmLightingPattern)) {
    issues.push(
      'contains unqualified warm studio lighting; use neutral studio lighting and keep warmth local',
    );
  }
  if (hasPositiveMatch(prompt, globalWarmGradePattern)) {
    issues.push(
      'contains a global warm color grade; put global warm grades only in negative controls',
    );
  }
  if (issues.length > 0) {
    throw new Error(
      `${filePath}: generation prompt color guard failed: ${issues.join('; ')}.`,
    );
  }
}

async function validatePrompt(promptPath) {
  const prompt = await readFile(promptPath, 'utf8');
  if (!prompt.trim()) {
    throw new Error(`${promptPath}: generation prompt is empty.`);
  }
  assertColorControlledPrompt(promptPath, prompt);
  process.stdout.write(`Generation prompt color validation passed: ${promptPath}.\n`);
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  const [promptArgument] = process.argv.slice(2);
  if (promptArgument && process.argv.length === 3) {
    validatePrompt(path.resolve(promptArgument)).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  } else {
    process.stderr.write(
      'Usage: validate-generation-prompt.mjs <prompt-file>\n',
    );
    process.exitCode = 2;
  }
}

export { requiredColorControls };
