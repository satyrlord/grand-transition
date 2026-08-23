import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  parseSimulationArguments,
  runSimulationCommand,
} from '../../tools/simulate';

describe('simulation command', () => {
  test.each([0, 0xffff_ffff])('accepts boundary seed %s', (seed) => {
    expect(
      parseSimulationArguments(['--seed', String(seed), '--matches', '1']),
    ).toEqual({ ok: true, value: { seed, matches: 1 } });
  });

  test.each([
    [['--seed', '-1', '--matches', '1'], '--seed'],
    [['--seed', '4294967296', '--matches', '1'], '--seed'],
    [['--seed', '0', '--matches', '0'], '--matches'],
    [['--seed', '0', '--matches', '1.5'], '--matches'],
    [['--seed', '0'], '--matches'],
    [['--matches', '1'], '--seed'],
    [['--seed'], '--seed'],
    [['--unknown', '1'], '--unknown'],
    [['--seed', '0', '--seed', '1', '--matches', '1'], '--seed'],
  ] as const)(
    'rejects invalid arguments and names %s',
    (arguments_, option) => {
      expect(parseSimulationArguments(arguments_)).toEqual(
        expect.objectContaining({ ok: false, option }),
      );
    },
  );

  test('repeats concise output and normalized output-file bytes', async () => {
    const firstMessages: string[] = [];
    const secondMessages: string[] = [];
    expect(
      await runSimulationCommand(['--seed', '0', '--matches', '1'], (message) =>
        firstMessages.push(message),
      ),
    ).toBe(0);
    expect(
      await runSimulationCommand(['--seed', '0', '--matches', '1'], (message) =>
        secondMessages.push(message),
      ),
    ).toBe(0);
    expect(secondMessages).toEqual(firstMessages);
    expect(firstMessages[0]).toMatch(/seed 0/);

    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'grand-transition-simulation-'),
    );
    try {
      const firstPath = path.join(directory, 'first.json');
      const secondPath = path.join(directory, 'second.json');
      await runSimulationCommand([
        '--seed',
        '4294967295',
        '--matches',
        '2',
        '--output',
        firstPath,
      ]);
      await runSimulationCommand([
        '--seed',
        '4294967295',
        '--matches',
        '2',
        '--output',
        secondPath,
      ]);
      expect(await readFile(secondPath, 'utf8')).toBe(
        await readFile(firstPath, 'utf8'),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('returns nonzero output that names the invalid option', async () => {
    const messages: string[] = [];
    expect(
      await runSimulationCommand(
        ['--seed', 'bad', '--matches', '1'],
        (message) => messages.push(message),
      ),
    ).toBe(1);
    expect(messages).toEqual([
      'Invalid --seed: Use an unsigned 32-bit integer.',
    ]);
  });
});
