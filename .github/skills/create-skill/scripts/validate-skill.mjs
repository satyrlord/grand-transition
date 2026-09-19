// Run the skill-creator validator for repository skill packages.
// The validator needs PyYAML, so the runner prefers an isolated uv environment.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const validatorName = 'quick_validate.py';
const pythonArguments = ['run', '--no-project', '--with', 'pyyaml', '--python-preference', 'only-system', 'python'];

function findExecutable(name) {
  const extensions = process.platform === 'win32' ? ['.exe', ''] : [''];
  for (const folder of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!folder) continue;
    for (const extension of extensions) {
      const candidate = path.join(folder, `${name}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function findValidator() {
  const codexHome = process.env.CODEX_HOME ?? path.join(homedir(), '.codex');
  const candidates = [
    path.join(codexHome, 'skills', '.system', 'skill-creator', 'scripts', validatorName),
    path.join(homedir(), '.claude', 'skills', 'skill-creator', 'scripts', validatorName),
    path.join(homedir(), '.agents', 'skills', 'skill-creator', 'scripts', validatorName),
    path.join(skillsRoot, 'skill-creator', 'scripts', validatorName),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function findInterpreter() {
  const uv = findExecutable('uv');
  if (uv && spawnSync(uv, [...pythonArguments, '-c', 'import yaml'], { stdio: 'ignore' }).status === 0) {
    return { command: uv, args: pythonArguments };
  }
  for (const name of ['python3', 'python', 'py']) {
    const command = findExecutable(name);
    if (!command) continue;
    const args = name === 'py' ? ['-3'] : [];
    if (spawnSync(command, [...args, '-c', 'import yaml'], { stdio: 'ignore' }).status === 0) {
      return { command, args };
    }
  }
  return undefined;
}

function skillFolders(args) {
  if (args.length > 0) {
    return args.map((argument) => (existsSync(argument) ? path.resolve(argument) : path.join(skillsRoot, argument)));
  }
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
    .map((entry) => path.join(skillsRoot, entry.name))
    .sort();
}

function reportBlocked(reason) {
  process.stderr.write(`BLOCKED: ${reason}\n`);
  process.exit(2);
}

const validator = findValidator();
if (!validator) {
  reportBlocked('the skill-creator package is not installed. Install it or set CODEX_HOME to its parent folder.');
}
const interpreter = findInterpreter();
if (!interpreter) {
  reportBlocked('no Python environment with PyYAML is available. Install uv or add PyYAML to Python.');
}

const failures = [];
const folders = skillFolders(process.argv.slice(2));
for (const folder of folders) {
  const name = path.relative(skillsRoot, folder) || folder;
  const result = spawnSync(interpreter.command, [...interpreter.args, validator, folder], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.status === 0) {
    process.stdout.write(`PASS ${name}: ${output}\n`);
  } else {
    failures.push(name);
    process.stdout.write(`FAIL ${name}: ${output}\n`);
  }
}

process.stdout.write(`Validated ${folders.length} skill package(s): ${failures.length} failed.\n`);
if (failures.length > 0) process.exit(1);
