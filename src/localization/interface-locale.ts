// Interface locale identifiers. The interface locale owns every interface
// message. It is never selected from browser or operating system preferences,
// and it stays independent from the match game locale.

export type InterfaceLocale = 'en' | 'ro-RO';

export const interfaceLocales = ['en', 'ro-RO'] as const;
export const defaultInterfaceLocale: InterfaceLocale = 'en';

// Autonyms name each language in that language and are never translated.
export const interfaceLocaleAutonyms: Readonly<Record<InterfaceLocale, string>> =
  Object.freeze({
    en: 'English',
    'ro-RO': 'Română',
  });

export function isInterfaceLocale(value: unknown): value is InterfaceLocale {
  return value === 'en' || value === 'ro-RO';
}

// The document language and interface number formatting use the locale
// identifier itself, which is already a canonical BCP 47 tag.
export function documentLanguageFor(locale: InterfaceLocale): string {
  return locale;
}
