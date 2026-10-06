import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
// A human prompt uses the first block. A robot prompt uses the second block.
const styleBlockPaths = ['style-block.txt', 'style-block-robot.txt'].map((name) =>
  path.resolve(scriptDirectory, '../assets', name),
);

const squash = (text: string) => text.replace(/\s+/gu, ' ').trim();

export function checkStyleBlock(prompt: string, styleBlocks: string[]): string[] {
  const issues: string[] = [];
  const normalized = squash(prompt);
  if (styleBlocks.filter((block) => normalized.includes(squash(block))).length !== 1)
    issues.push(
      'The style block is missing or changed. Copy assets/style-block.txt for a human, or assets/style-block-robot.txt for a robot, word for word.',
    );
  return issues;
}

async function main(promptPaths: string[]): Promise<void> {
  if (!promptPaths.length) throw new Error('Usage: check-style-block.ts <prompt-file>...');
  const styleBlocks = await Promise.all(styleBlockPaths.map((file) => readFile(file, 'utf8')));
  const failures: string[] = [];
  for (const promptPath of promptPaths) {
    const prompt = await readFile(path.resolve(promptPath), 'utf8');
    for (const issue of checkStyleBlock(prompt, styleBlocks))
      failures.push(`${promptPath}: ${issue}`);
  }
  if (failures.length)
    throw new Error(`Style block check failed. Send no request.\n- ${failures.join('\n- ')}`);
  process.stdout.write(`Style block check passed for ${promptPaths.length} prompt(s).\n`);
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
