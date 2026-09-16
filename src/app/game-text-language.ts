import { interfaceLocale } from './interface-localization';

// Annotates game text that stays in English while the interface language is
// Romanian. The document language already describes English otherwise.
export function gameTextLanguage(): 'en' | undefined {
  return interfaceLocale() === 'en' ? undefined : 'en';
}
