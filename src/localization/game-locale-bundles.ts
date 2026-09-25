import { isGameLocale, type GameLocale } from './game-locale.ts';
import type { GameLocaleBundle } from './game-locale-schema.ts';

// Game-locale bundles indexed by the locale they render, so no caller depends
// on the order of the shipped bundle list. A locale without a bundle fails
// loudly instead of borrowing another language, because presenting English
// prose as a translation is worse than presenting nothing.
export type GameLocaleBundles = Readonly<Partial<Record<GameLocale, GameLocaleBundle>>>;

export function indexGameLocaleBundles(bundles: readonly GameLocaleBundle[]): GameLocaleBundles {
  const indexed: Partial<Record<GameLocale, GameLocaleBundle>> = {};
  for (const bundle of bundles) {
    if (!isGameLocale(bundle.locale)) {
      throw new Error(`Game-locale bundle "${bundle.locale}" is not a shipped game locale.`);
    }
    if (indexed[bundle.locale]) {
      throw new Error(`Ship one game-locale bundle per locale; "${bundle.locale}" is duplicated.`);
    }
    indexed[bundle.locale] = bundle;
  }
  return Object.freeze(indexed);
}

export function selectGameLocaleBundle(
  bundles: GameLocaleBundles,
  locale: GameLocale,
): GameLocaleBundle {
  const bundle = bundles[locale];
  if (!bundle) {
    throw new Error(
      `Game locale "${locale}" has no bundle. Shipped: ${shippedGameLocales(bundles).join(', ')}.`,
    );
  }
  return bundle;
}

export function shippedGameLocales(bundles: GameLocaleBundles): readonly GameLocale[] {
  return Object.freeze((Object.keys(bundles) as GameLocale[]).toSorted());
}
