// Game locale identifiers. The game locale owns every piece of game prose:
// character and scene names and descriptions, phrase content, grammar,
// constructed sentences, endings, comebacks, and speech. A displayed character,
// scene, or weakness name is interface copy and belongs to the interface locale
// instead. The game locale is independent from the interface locale and is never
// selected from browser or operating system preferences.

export type GameLocale = 'en' | 'ro-RO';

export const gameLocales = ['en', 'ro-RO'] as const;

// Romanian is the default game language while English stays the default
// interface language. A new installation, a rejected settings document, and a
// headless caller that selects no locale all render game prose in Romanian.
export const defaultGameLocale: GameLocale = 'ro-RO';

// The game locale that owns the authored key set. Game content is authored in
// English and translated outward, so locale parity is always measured against
// English rather than against the default game language.
export const referenceGameLocale: GameLocale = 'en';

// Autonyms name each language in that language and are never translated.
export const gameLocaleAutonyms: Readonly<Record<GameLocale, string>> = Object.freeze({
  en: 'English',
  'ro-RO': 'Română',
});

export function isGameLocale(value: unknown): value is GameLocale {
  return value === 'en' || value === 'ro-RO';
}

// A game-locale bundle carries a canonical BCP 47 tag. Narrow it to a shipped
// game locale so recorded state, replays, and history always name a locale the
// application can render.
export function shippedGameLocale(locale: { readonly locale: string }): GameLocale {
  if (!isGameLocale(locale.locale)) {
    throw new Error(`Game-locale bundle "${locale.locale}" is not a shipped game locale.`);
  }
  return locale.locale;
}

// Recorded game sentences carry their match language so assistive technology
// keeps the original language. The locale identifier is already a canonical
// BCP 47 tag.
export function gameLocaleLanguageTag(locale: GameLocale): string {
  return locale;
}
