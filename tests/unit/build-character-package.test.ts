import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildCharacterPackage, changedVariantCount } from '../../tools/build-character-package.ts';

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

  test('counts only changed variants after a one-pose edit', () => {
    const selection = [
      {
        variants: Array.from({ length: 10 }, (_, index) => ({
          path: `selection-${index}.avif`,
          sha256: `selection-${index}`,
        })),
      },
    ];
    const states = ['thinking', 'delivery', 'light-hit', 'heavy-hit', 'weakness'].map((state) => ({
      variants: Array.from({ length: 6 }, (_, index) => ({
        path: `${state}-${index}.avif`,
        sha256: `${state}-${index}`,
      })),
    }));
    const updatedStates = states.map(({ variants }) => ({
      variants: variants.map((variant) => ({
        ...variant,
        sha256: variant.path.startsWith('delivery-') ? `${variant.sha256}-new` : variant.sha256,
      })),
    }));

    expect(changedVariantCount(selection, selection)).toBe(0);
    expect(changedVariantCount(states, updatedStates)).toBe(6);
    expect(changedVariantCount(states, states)).toBe(0);
  });
});
