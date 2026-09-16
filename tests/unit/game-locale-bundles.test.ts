import { describe, expect, test } from 'vitest';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema';
import {
  gameLocaleBundle,
  gameLocaleBundles,
  sampleContent,
} from '../../src/game-content';
import {
  indexGameLocaleBundles,
  selectGameLocaleBundle,
  shippedGameLocales,
} from '../../src/localization/game-locale-bundles';

const englishBundle: GameLocaleBundle = Object.freeze({
  locale: 'en',
  title: {
    name: 'Grand Transition: A Verbal Republic',
    fictionalCompositeSatireDisclaimer:
      'All characters and events are fictional composites created for satire.',
  },
  messages: Object.freeze({ 'phrase.national-consensus': 'your disagreement' }),
});

const romanianBundle: GameLocaleBundle = Object.freeze({
  locale: 'ro-RO',
  title: {
    name: 'Grand Transition: A Verbal Republic',
    fictionalCompositeSatireDisclaimer:
      'Toate personajele și evenimentele sunt compoziții fictive create pentru satiră.',
  },
  messages: Object.freeze({ 'phrase.national-consensus': 'dezacordul vostru' }),
});

describe('game-locale bundles', () => {
  test('indexes each bundle by the locale it renders', () => {
    const bundles = indexGameLocaleBundles([englishBundle, romanianBundle]);
    expect(Object.keys(bundles).toSorted()).toEqual(['en', 'ro-RO']);
    expect(bundles['ro-RO']).toBe(romanianBundle);
    expect(shippedGameLocales(bundles)).toEqual(['en', 'ro-RO']);
    expect(Object.isFrozen(bundles)).toBe(true);
  });

  test('refuses to ship the same locale twice or an unshipped locale tag', () => {
    expect(() =>
      indexGameLocaleBundles([englishBundle, englishBundle]),
    ).toThrow(/"en" is duplicated/u);
    expect(() =>
      indexGameLocaleBundles([
        { ...englishBundle, locale: 'ro' },
      ]),
    ).toThrow(/"ro" is not a shipped game locale/u);
  });

  test('selects a bundle by locale and names the shipped locales on a miss', () => {
    const bundles = indexGameLocaleBundles([englishBundle]);
    expect(selectGameLocaleBundle(bundles, 'en')).toBe(englishBundle);
    expect(() => selectGameLocaleBundle(bundles, 'ro-RO')).toThrow(
      /Game locale "ro-RO" has no bundle\. Shipped: en\./u,
    );
    expect(() => selectGameLocaleBundle(indexGameLocaleBundles([]), 'en')).toThrow(
      /has no bundle\. Shipped: \.$/u,
    );
  });

  test('ships one bundle per locale and never borrows another language', () => {
    expect(shippedGameLocales(gameLocaleBundles)).toEqual(['en']);
    expect(Object.keys(gameLocaleBundles)).toEqual(
      sampleContent.locales.map((bundle) => bundle.locale),
    );
    expect(gameLocaleBundle('en')).toBe(sampleContent.locales[0]);
    // Phase 2 content adds the Romanian bundle; until then the lookup fails
    // instead of rendering English prose as Romanian.
    expect(() => gameLocaleBundle('ro-RO')).toThrow(
      /Game locale "ro-RO" has no bundle\. Shipped: en\./u,
    );
  });
});
