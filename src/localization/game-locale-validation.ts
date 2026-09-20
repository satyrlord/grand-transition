import type { GameLocale } from './game-locale';
import type { GameLocaleBundle } from './game-locale-schema';
import {
  validateLocalizedText,
  type LocalizedTextFailure,
} from './localized-text-rules';

// Validation for the shipped game-content bundles. The content catalog already
// proves key references and locale parity; this check proves that every locale
// ships usable prose: complete, normalized, safe, free of another language's
// diacritics, and unique inside each visible-text group. A missing or unusable
// string fails at its own field path instead of silently rendering English.
export type GameLocaleFailure = LocalizedTextFailure;

// Keys that must read differently from every other key in the same group,
// mirroring the owners that already enforce this for English in
// `phrase-card-catalog.ts` and `content-catalog.ts`.
const duplicateTextGroups = [
  'phrase-text',
  'character-name',
  'scene-name',
  'comeback',
] as const;
type DuplicateTextGroup = (typeof duplicateTextGroups)[number];

export function validateGameLocaleBundles(
  bundles: readonly GameLocaleBundle[],
  referenceLocale: GameLocale,
): readonly GameLocaleFailure[] {
  const reference = bundles.find((bundle) => bundle.locale === referenceLocale);
  if (!reference) {
    return Object.freeze([
      {
        path: 'locales',
        code: 'missing-reference-locale',
        message: `Ship the reference game locale "${referenceLocale}".`,
      },
    ]);
  }
  return Object.freeze([
    ...bundles.flatMap((bundle) =>
      validateGameLocaleBundleText(bundle, bundle.locale),
    ),
    ...referenceLocaleTextParity(bundles, reference),
  ]);
}

// Envelope and text rules for one bundle, independent of any other locale.
export function validateGameLocaleBundleText(
  bundle: GameLocaleBundle,
  locale: string,
): readonly GameLocaleFailure[] {
  const failures: GameLocaleFailure[] = [
    ...validateLocalizedText(bundle.title.name, locale, 'title.name'),
    ...validateLocalizedText(
      bundle.title.fictionalCompositeSatireDisclaimer,
      locale,
      'title.fictionalCompositeSatireDisclaimer',
    ),
  ];
  const visibleTextOwner = new Map<string, string>();
  for (const [key, text] of Object.entries(bundle.messages)) {
    const path = `messages.${key}`;
    failures.push(...validateLocalizedText(text, locale, path));

    const group = duplicateTextGroup(key);
    if (!group) continue;
    const normalized = normalizeVisibleText(text, locale);
    if (normalized.length === 0) continue;
    const owner = visibleTextOwner.get(`${group}\u0000${normalized}`);
    if (owner) {
      failures.push({
        path,
        code: 'duplicate-visible-text',
        message: `Use unique visible game text; "${key}" repeats "${owner}".`,
      });
    } else {
      visibleTextOwner.set(`${group}\u0000${normalized}`, key);
    }
  }
  return Object.freeze(failures);
}

// A bundle must carry every reference key and no others, so a translation can
// never be missing at runtime.
export function referenceLocaleTextParity(
  bundles: readonly GameLocaleBundle[],
  reference: GameLocaleBundle,
): readonly GameLocaleFailure[] {
  const referenceKeys = new Set(Object.keys(reference.messages));
  const failures: GameLocaleFailure[] = [];
  for (const bundle of bundles) {
    if (bundle === reference) continue;
    const keys = new Set(Object.keys(bundle.messages));
    for (const key of referenceKeys) {
      if (keys.has(key)) continue;
      failures.push({
        path: `messages.${key}`,
        code: 'missing-translation',
        message: `Add the ${bundle.locale} game text for "${key}".`,
      });
    }
    for (const key of keys) {
      if (referenceKeys.has(key)) continue;
      // Romanian relation cards need number and person inflections even when
      // English shares a single form. The source phrase key still has to exist
      // in the reference bundle.
      if (
        bundle.locale === 'ro-RO' &&
        (key.endsWith('.second-person') || key.endsWith('.plural')) &&
        referenceKeys.has(key.slice(0, key.lastIndexOf('.')))
      ) {
        continue;
      }
      failures.push({
        path: `messages.${key}`,
        code: 'unexpected-message',
        message: `Remove the ${bundle.locale} game text "${key}" or add it to every locale.`,
      });
    }
  }
  return Object.freeze(failures);
}

// Compare base phrase text only. Agreement forms are excluded, so identical
// singular and plural text stays legal while two phrase cards may not read the same.
function duplicateTextGroup(key: string): DuplicateTextGroup | null {
  const segments = key.split('.');
  const [namespace, , field] = segments;
  if (segments.length === 2 && namespace === 'phrase') return 'phrase-text';
  if (field === 'name' && namespace === 'character') return 'character-name';
  if (field === 'name' && namespace === 'scene') return 'scene-name';
  if (segments.length === 3 && namespace === 'comeback') return 'comeback';
  return null;
}

function normalizeVisibleText(text: string, locale: string): string {
  const normalized = text.trim().replaceAll(/\s+/gu, ' ');
  try {
    return normalized.toLocaleLowerCase(locale);
  } catch (error) {
    if (error instanceof RangeError) return normalized.toLowerCase();
    throw error;
  }
}

const possessiveArticles = new Set(['a', 'al', 'ai', 'ale']);

// A verb or predicate card is placed immediately in front of the object noun
// card, which carries no genitive form. A possessive article would force one,
// so such a card must never end with it.
export function validateSentenceTails(
  messages: Readonly<Record<string, string>>,
  relationKeys: ReadonlySet<string>,
): readonly GameLocaleFailure[] {
  const failures: GameLocaleFailure[] = [];
  for (const key of relationKeys) {
    const text = messages[key];
    if (text === undefined) continue;
    const lastWord = text.trim().split(/\s+/u).at(-1) ?? '';
    if (!possessiveArticles.has(lastWord.toLocaleLowerCase('ro-RO'))) continue;
    failures.push({
      path: `messages.${key}`,
      code: 'case-governing-tail',
      message: `End this sentence part so the next noun card stays an unmarked object; "${lastWord}" would force a genitive.`,
    });
  }
  return Object.freeze(failures);
}

// A displayed character or scene name is interface copy, so the interface name
// tables own it. The Romanian game-content bundle still names the same
// characters and scenes for game prose, and both Romanian sources must agree,
// or a character is named one way in an interface sentence and another way
// inside its own content.
export function validateLocaleNameParity(
  messages: Readonly<Record<string, string>>,
  displayedNames: Readonly<Record<string, Readonly<Record<string, string>>>>,
): readonly GameLocaleFailure[] {
  const failures: GameLocaleFailure[] = [];
  for (const [group, names] of Object.entries(displayedNames)) {
    for (const [id, name] of Object.entries(names)) {
      const key = `${group}.${id}.name`;
      const actual = messages[key];
      if (actual === undefined || actual === name) continue;
      failures.push({
        path: `messages.${key}`,
        code: 'name-mismatch',
        message: `Use "${name}" so this name matches the displayed-name table.`,
      });
    }
  }
  return Object.freeze(failures);
}
