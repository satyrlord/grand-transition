// Text rules shared by every shipped localized resource: the Lit interface
// catalogs and the game-content bundles. One owner decides what localized text
// may contain, so the two catalogs cannot drift apart.

export type LocalizedTextFailure = Readonly<{
  path: string;
  code: string;
  message: string;
}>;

const unsafePatterns: readonly RegExp[] = [
  /<[A-Za-z/!]/u,
  /javascript:/iu,
  /\bon[a-z]+\s*=/iu,
];

const legacyDiacritics = /[\u015e\u015f\u0162\u0163]/u;
const latinLetter = /\p{Script=Latin}/gu;
const romanianLetters =
  /[A-Za-z\u0102\u0103\u00c2\u00e2\u00ce\u00ee\u0218\u0219\u021a\u021b]/u;

// `locale` is the language the text is written in. Romanian text may use only
// the standard `ă â î ș ț` diacritics; English text accepts every Latin letter.
export function validateLocalizedText(
  value: string,
  locale: string,
  path: string,
): LocalizedTextFailure[] {
  const failures: LocalizedTextFailure[] = [];
  const fail = (code: string, message: string) => {
    failures.push({ path, code, message });
  };

  if (value.trim().length === 0) {
    fail('incomplete-translation', 'Message text is empty.');
    return failures;
  }
  if (value !== value.normalize('NFC')) {
    fail('not-normalized', 'Message text is not Unicode NFC.');
  }
  if (legacyDiacritics.test(value)) {
    fail('legacy-diacritic', 'Message text uses legacy cedilla diacritics.');
  }
  for (const match of value.matchAll(latinLetter)) {
    const letter = match[0];
    if (letter.toUpperCase() === letter.toLowerCase()) continue;
    if (romanianLetters.test(letter)) continue;
    if (locale === 'en') continue;
    fail(
      'non-standard-letter',
      `Message text uses a non-Romanian diacritic: ${JSON.stringify(letter)}.`,
    );
  }
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) {
      fail('unsafe-text', `Message text matches ${pattern}.`);
    }
  }
  return failures;
}
