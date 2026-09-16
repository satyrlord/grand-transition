// Game locale identifiers. The game locale owns every piece of game prose:
// character and scene names and descriptions, weakness names, phrase content,
// grammar, constructed sentences, endings, comebacks, and speech. It is
// independent from the interface locale and is never selected from browser or
// operating system preferences.

export type GameLocale = 'en' | 'ro-RO';

export const gameLocales = ['en', 'ro-RO'] as const;
export const defaultGameLocale: GameLocale = 'en';

// Autonyms name each language in that language and are never translated.
export const gameLocaleAutonyms: Readonly<Record<GameLocale, string>> =
  Object.freeze({
    en: 'English',
    'ro-RO': 'Română',
  });

export function isGameLocale(value: unknown): value is GameLocale {
  return value === 'en' || value === 'ro-RO';
}

// Recorded game sentences carry their match language so assistive technology
// keeps the original language. The locale identifier is already a canonical
// BCP 47 tag.
export function gameLocaleLanguageTag(locale: GameLocale): string {
  return locale;
}
