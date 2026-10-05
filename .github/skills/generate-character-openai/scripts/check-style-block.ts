import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const styleBlockPath = path.resolve(scriptDirectory, '../assets/style-block.txt');
const photographPattern = /\b(?:photo|photograph)s?\b/iu;

const squash = (text: string) => text.replace(/\s+/gu, ' ').trim();

export function checkStyleBlock(prompt: string, styleBlock: string): string[] {
  const issues: string[] = [];
  const normalized = squash(prompt);
  if (!normalized.includes(squash(styleBlock)))
    issues.push(
      'The style block is missing or changed. Copy assets/style-block.txt word for word.',
    );
  if (photographPattern.test(normalized))
    issues.push('The prompt refers to a photograph. Send a written identity brief only.');
  return issues;
}

async function main(promptPaths: string[]): Promise<void> {
  if (!promptPaths.length) throw new Error('Usage: check-style-block.ts <prompt-file>...');
  const styleBlock = await readFile(styleBlockPath, 'utf8');
  const failures: string[] = [];
  for (const promptPath of promptPaths) {
    const prompt = await readFile(path.resolve(promptPath), 'utf8');
    for (const issue of checkStyleBlock(prompt, styleBlock))
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
