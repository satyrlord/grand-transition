import { configureLocalization } from '@lit/localize';
import {
  defaultInterfaceLocale,
  documentLanguageFor,
  type InterfaceLocale,
} from '../localization/interface-locale';

// Lit localization runtime configuration. The interface locale selects the Lit
// message templates; the game locale stays separate and arrives in Phase 2.
// Configuration happens once, before the application shell is imported.
const localization = configureLocalization({
  sourceLocale: defaultInterfaceLocale,
  targetLocales: ['ro-RO'],
  // A static specifier keeps the generated locale module analyzable by the
  // bundler; the target list above stays the single source of shipped locales.
  loadLocale: (locale: string) => {
    switch (locale) {
      case 'ro-RO':
        return import('../localization/generated/ro-RO.ts');
      default:
        throw new Error(`Unsupported interface locale: ${locale}`);
    }
  },
});

export function interfaceLocale(): InterfaceLocale {
  const locale = localization.getLocale();
  return locale === 'ro-RO' ? 'ro-RO' : defaultInterfaceLocale;
}

export async function setInterfaceLocale(
  locale: InterfaceLocale,
): Promise<void> {
  await localization.setLocale(locale);
}

export function interfaceLocaleIsConfigured(): boolean {
  void localization;
  return true;
}
export { documentLanguageFor };
