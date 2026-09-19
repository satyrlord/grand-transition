import { describe, expect, test } from 'vitest';
import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import sidekickLayout from '../../src/assets/sidekicks/layout.json';
import {
  comebackSidekickBottomInset,
  comebackSidekickIds,
  resolveComebackSidekick,
} from '../../src/app/sidekick-assets';

describe('comeback sidekick assets', () => {
  test('discovers only the nineteen manually approved assets by character ID', () => {
    expect(comebackSidekickIds).toEqual([
      'algorithmic-prophet',
      'apartment-block-geopolitician',
      'black-sea-captain',
      'coalition-acrobat',
      'county-baron',
      'diaspora-oracle',
      'eu-funds-alchemist',
      'football-tycoon',
      'government-ai',
      'luxury-minister',
      'marble-diplomat',
      'midnight-sensationalist',
      'oat-milk-reformist',
      'red-folded-chairman',
      'reluctant-theorem',
      'retiring-cassandra',
      'spreadsheet-technocrat',
      'thunder-tribune',
      'velvet-mogul',
    ]);
    for (const characterId of comebackSidekickIds) {
      expect(resolveComebackSidekick(characterId)).toMatch(/\.png(?:\?|$)/u);
    }
  });

  test('returns null for unknown character IDs', () => {
    expect(resolveComebackSidekick('unknown-character')).toBeNull();
    expect(comebackSidekickBottomInset('unknown-character')).toBe(0);
  });

  test('anchors every source at its measured last nontransparent row', async () => {
    const root = 'src/assets/sidekicks';
    expect(Object.keys(sidekickLayout).sort()).toEqual(
      (await readdir(root)).filter((name) => name.endsWith('.png')).sort(),
    );
    for (const [filename, layout] of Object.entries(sidekickLayout)) {
      const { data, info } = await sharp(`${root}/${filename}`).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      let bottom = info.height;
      while (bottom > 0 && !data.subarray((bottom - 1) * info.width * 4, bottom * info.width * 4)
        .some((value, index) => index % 4 === 3 && value > 0)) bottom -= 1;
      expect(layout, filename).toEqual({ height: info.height, bottom });
      expect(comebackSidekickBottomInset(filename.replace(/\.png$/u, '')))
        .toBe((info.height - bottom) / info.height);
    }
  });
});
