import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const appRoot = path.resolve(process.cwd(), 'src', 'app');

describe('presentation boundaries', () => {
  test('keeps match projection outside the Lit screen module', async () => {
    const [appShell, matchScreen, snapshotOwner] = await Promise.all([
      readFile(path.join(appRoot, 'app-shell.ts'), 'utf8'),
      readFile(path.join(appRoot, 'screens', 'match-screen.ts'), 'utf8'),
      readFile(path.join(appRoot, 'match-screen-snapshot.ts'), 'utf8'),
    ]);

    expect(appShell).toContain("from './match-screen-snapshot'");
    expect(matchScreen).not.toContain('createMatchScreenSnapshot');
    expect(snapshotOwner).toContain(
      'export function createMatchScreenSnapshot',
    );
    expect(snapshotOwner).not.toMatch(/from ['"]lit(?:\/[^'"]*)?['"]/u);
    expect(snapshotOwner).not.toContain("from './screens/");
  });
});
