import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildCharacterPackage } from '../../tools/build-character-package.ts';

describe('targeted character package builder', () => {
  test('requires a staged root and a valid skin ID', async () => {
    await expect(
      buildCharacterPackage({
        characterRoot: path.resolve('src/assets/characters'),
        skinId: 'valid-skin',
      }),
    ).rejects.toThrow(/staged tree/u);
    await expect(
      buildCharacterPackage({
        characterRoot: path.resolve('tmp/fixture'),
        skinId: '../outside',
      }),
    ).rejects.toThrow(/valid skin ID/u);
  });
});
