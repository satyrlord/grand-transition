import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

// Milestone 033: only the shared Vitest setup and the shared Playwright
// fixture store the default settings to make a returning player.
const owners = new Set([
  'tests/browser/setup-stored-profile.ts',
  'e2e/helpers/stored-data.ts',
  'e2e/helpers/fixtures.ts',
]);
const returningPlayerWrite = /encodeSettings\(\s*defaultSettings\s*\)|ReturningPlayerSettings/u;

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__screenshots__' ? [] : sources(file);
    return file.endsWith('.ts') ? [file] : [];
  });
}

test('no test file other than the shared setup and fixture makes a returning player', () => {
  const offenders = ['tests/browser', 'e2e']
    .flatMap(sources)
    .filter((file) => !owners.has(file))
    .filter((file) => returningPlayerWrite.test(readFileSync(file, 'utf8')));
  expect(offenders).toEqual([]);
});
