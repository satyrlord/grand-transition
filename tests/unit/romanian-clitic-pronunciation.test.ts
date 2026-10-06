import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPhonemes, initialize, setVoice } from 'espeak-phonemizer';
import { beforeAll, expect, test } from 'vitest';
import { piperClauses } from '../../src/audio/piper-text.ts';
import { romanianStress } from '../../src/audio/romanian-stress.ts';

// The shipped pronunciation data and the shipped voice alphabets, not a mock.
const phones = (text: string) => romanianStress(piperClauses(getPhonemes(text)));

beforeAll(async () => {
  await initialize(path.resolve('public/tts/ro/pronounce'));
  await setVoice('ro');
});

test.each([
  ['s-a predat', 'sa pɾedˈat'],
  ['n-au fost oferite', 'naʊ fost ˌofeɾˈite'],
  ['v-ar pătrunde', 'var pətɾˈunde'],
  ['L-a corectat', 'la kˌoɾektˈat'],
  ['pe care nu-l va folosi', 'pe kˌaɾe nul va fˌolosˈi'],
  ['într-o oglindă', 'ˈɨntɾo oɡlˈində'],
])('speaks the hyphenated clitic in "%s" as one word, not as a spelled letter', (text, spoken) => {
  expect(phones(text)).toBe(spoken);
});

test('keeps clause punctuation with a space before the next clause', () => {
  expect(phones('A sunat vara. Vestea bună: iarna nu e o scuză.')).toBe(
    'a sunˈat vˈaɾa. vˈestea bˈunə: jˈarna nu je o skˈuzə.',
  );
  expect(phones('puterea de a spune „pentru că putem”')).not.toMatch(/["„”()-]/u);
});

test('both Romanian voices know every phoneme of a hyphenated phrase', async () => {
  const spoken = phones('Ne-am împărțit munca; luați-le înapoi, s-au rătăcit!');
  for (const voice of ['mihai', 'liana']) {
    const config = JSON.parse(await readFile(`public/tts/ro/${voice}/config.json`, 'utf8')) as {
      phoneme_id_map: Record<string, number[]>;
    };
    expect(Array.from(spoken).filter((phone) => !config.phoneme_id_map[phone])).toEqual([]);
  }
});
