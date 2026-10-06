// eSpeak NG's Romanian rules stress an -ție noun before its suffix and the
// -ției, -țiile and -țiilor forms on the suffix. Each choice is right for one
// class of noun only, so the other class is corrected in the phonemes.

// Nouns that stress the suffix: democrație, birocrație, garanție, profeție.
const suffixStressed = /(?:kɾats|ɡaɾants|pɾofets|diplomats|akɾobats)$/u;
const nominative = /tsj([ae])$/u;
// The last vowel before the suffix. A stem in -ăție keeps its suffix stress.
const inflected = /^(.*)([aeiouɨɔ])([^aeiouəɨɔɪʊˈˌ]*ts)ˈi(ʲeɪ|ɪle|ɪlor)$/u;
const endings: Readonly<Record<string, string>> = { ʲeɪ: 'jeɪ', ɪle: 'iɪle', ɪlor: 'iɪlor' };

function wordStress(word: string): string {
  const plain = word.replaceAll(/[ˈˌ]/gu, '');
  if (suffixStressed.test(plain.replace(nominative, 'ts')) && nominative.test(plain))
    return word.replace('ˈ', '').replace(nominative, 'tsˈiʲ$1');
  const match = inflected.exec(word);
  if (match && !suffixStressed.test((match[1]! + match[2]! + match[3]!).replaceAll(/[ˈˌ]/gu, '')))
    return `${match[1]!.replace(/ˌ$/u, '')}ˈ${match[2]!}${match[3]!}${endings[match[4]!]!}`;
  // A consonant cluster before the suffix must not give the ending its own stress.
  return word.replace(/tsiʲˌe(ɪ?)$/u, 'tsje$1');
}

/** Corrects the lexical stress of Romanian -ție nouns in eSpeak NG phonemes. */
export function romanianStress(phones: string): string {
  return phones.replaceAll(/[^\s.,;:!?]+/gu, wordStress);
}
