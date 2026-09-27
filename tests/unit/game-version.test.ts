import { describe, expect, test } from 'vitest';
import { readGameVersion } from '../../tools/game-version.ts';

function fakeGit(answers: Readonly<Record<string, string>>) {
  return (args: readonly string[]) => {
    const answer = answers[args.join(' ')];
    if (answer === undefined) throw new Error(`Unexpected git ${args.join(' ')}`);
    return answer;
  };
}

const completeHistory = fakeGit({
  'rev-parse --is-shallow-repository': 'false',
  'rev-list --count HEAD': '177',
});

describe('game version', () => {
  test('joins the package major number and the commit count', () => {
    expect(readGameVersion('production', completeHistory, '1.0.0')).toBe('v1.177');
    expect(readGameVersion('development', completeHistory, '2.4.1')).toBe('v2.177');
  });

  test('stops a production build that has a shallow history', () => {
    const shallow = fakeGit({ 'rev-parse --is-shallow-repository': 'true' });
    expect(() => readGameVersion('production', shallow, '1.0.0')).toThrow(
      /Git history is shallow.*fetch-depth: 0/u,
    );
    expect(readGameVersion('development', shallow, '1.0.0')).toBe('v1.dev');
  });

  test('stops a production build that has no Git', () => {
    const missing = () => {
      throw new Error('spawn git ENOENT');
    };
    expect(() => readGameVersion('production', missing, '1.0.0')).toThrow(/Git is not available/u);
    expect(readGameVersion('development', missing, '1.0.0')).toBe('v1.dev');
  });

  test('rejects a commit count that is not a positive number', () => {
    const empty = fakeGit({
      'rev-parse --is-shallow-repository': 'false',
      'rev-list --count HEAD': '0',
    });
    expect(() => readGameVersion('production', empty, '1.0.0')).toThrow(/commit count "0"/u);
  });

  test('rejects a package version with no major number', () => {
    expect(() => readGameVersion('development', completeHistory, 'next')).toThrow(
      /no major number/u,
    );
  });

  test('counts the commits of this checkout', () => {
    expect(readGameVersion('development')).toMatch(/^v1\.(?:[1-9]\d*|dev)$/u);
  });
});
