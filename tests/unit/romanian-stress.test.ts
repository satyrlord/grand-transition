import path from 'node:path';
import { getPhonemes, initialize, setVoice } from 'espeak-phonemizer';
import { beforeAll, expect, test } from 'vitest';
import { piperClauses } from '../../src/audio/piper-text.ts';
import { romanianStress } from '../../src/audio/romanian-stress.ts';

// The shipped pronunciation data, so a dictionary change that moves a stress fails here.
const phones = (text: string) => romanianStress(piperClauses(getPhonemes(text)));

beforeAll(async () => {
  await initialize(path.resolve('public/tts/ro/pronounce'));
  await setVoice('ro');
});

test.each([
  ['democrația', 'dˌemokɾatsˈiʲa'],
  ['democrație', 'dˌemokɾatsˈiʲe'],
  ['birocrația voastră.', 'bˌiɾokɾatsˈiʲa vˈɔastɾə.'],
  ['o garanție, o profeție', 'o ɡaɾantsˈiʲe, o pɾofetsˈiʲe'],
])('stresses the suffix of "%s"', (text, spoken) => {
  expect(phones(text)).toBe(spoken);
});

test.each([
  ['coaliției', 'kˌɔalˈitsjeɪ'],
  ['educației', 'ˌedukˈatsjeɪ'],
  ['recepției', 'retʃˈeptsjeɪ'],
  ['declarațiile', 'dˌeklaɾˈatsiɪle'],
  ['coalițiilor', 'kˌɔalˈitsiɪlor'],
  ['funcțiilor', 'fˈunktsiɪlor'],
  ['inspecției', 'inspˈektsjeɪ'],
])('stresses the syllable before the suffix of "%s"', (text, spoken) => {
  expect(phones(text)).toBe(spoken);
});

test.each([
  ['informație', 'ˌinformˈatsje'],
  ['revoluția', 'revolˈutsja'],
  ['democrației', 'dˌemokɾatsˈiʲeɪ'],
  ['garanției', 'ɡˌaɾantsˈiʲeɪ'],
  ['vinovăției', 'vˌinovətsˈiʲeɪ'],
  ['bogăția', 'bˌoɡətsˈiʲa'],
  ['sănătății', 'sˌənətˈətsiɪ'],
])('keeps the stress of "%s", which the converter already places correctly', (text, spoken) => {
  expect(phones(text)).toBe(spoken);
});
