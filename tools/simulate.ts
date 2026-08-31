import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { basicScoringBalance } from '../src/content/basic-scoring-balance';
import {
  createSimulationSetup,
  encodeSimulationReport,
  listLocalRadioCallerSimulationOptions,
  simulateMatches,
  summarizeSimulation,
} from '../src/engine/simulation';
import { loadGameContent } from './load-game-content';

export type SimulationArguments = Readonly<{
  seed: number;
  matches: number;
  output?: string;
}>;

export type SimulationArgumentResult =
  | Readonly<{ ok: true; value: SimulationArguments }>
  | Readonly<{ ok: false; option: string; message: string }>;

export function parseSimulationArguments(
  arguments_: readonly string[],
): SimulationArgumentResult {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index]!;
    if (!['--seed', '--matches', '--output'].includes(option)) {
      return invalid(option, 'Unknown option.');
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith('--')) {
      return invalid(option, 'A value is required.');
    }
    if (values.has(option)) return invalid(option, 'Do not repeat the option.');
    values.set(option, value);
  }

  const seedValue = values.get('--seed');
  if (!seedValue) return invalid('--seed', 'The option is required.');
  if (!/^\d+$/u.test(seedValue)) {
    return invalid('--seed', 'Use an unsigned 32-bit integer.');
  }
  const seed = Number(seedValue);
  if (!Number.isInteger(seed) || seed > 0xffff_ffff) {
    return invalid('--seed', 'Use an unsigned 32-bit integer.');
  }

  const matchesValue = values.get('--matches');
  if (!matchesValue) return invalid('--matches', 'The option is required.');
  if (!/^[1-9]\d*$/u.test(matchesValue)) {
    return invalid('--matches', 'Use a positive integer.');
  }
  const matches = Number(matchesValue);
  if (!Number.isSafeInteger(matches)) {
    return invalid('--matches', 'Use a positive safe integer.');
  }

  const output = values.get('--output');
  return {
    ok: true,
    value: { seed, matches, ...(output ? { output } : {}) },
  };
}

export async function runSimulationCommand(
  arguments_: readonly string[],
  output: (message: string) => void = console.log,
): Promise<number> {
  const parsed = parseSimulationArguments(arguments_);
  if (!parsed.ok) {
    output(`Invalid ${parsed.option}: ${parsed.message}`);
    return 1;
  }
  const { sampleContent, englishGameLocale } = loadGameContent();
  const context = {
    catalog: sampleContent,
    locale: englishGameLocale,
    balance: basicScoringBalance,
  };
  const report = simulateMatches(
    parsed.value.seed,
    parsed.value.matches,
    createSimulationSetup(sampleContent, {
      aiDifficulty: 'local-radio-caller',
    }),
    context,
    listLocalRadioCallerSimulationOptions,
  );
  if (parsed.value.output) {
    await writeFile(
      parsed.value.output,
      encodeSimulationReport(report),
      'utf8',
    );
    output(
      `Wrote ${report.completedMatches} match(es) to ${parsed.value.output}.`,
    );
  } else {
    output(summarizeSimulation(report));
  }
  return 0;
}

function invalid(option: string, message: string): SimulationArgumentResult {
  return { ok: false, option, message };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  runSimulationCommand(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
