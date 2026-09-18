import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import {
  interfaceLocaleAutonyms,
  interfaceLocales,
  isInterfaceLocale,
} from '../../src/localization/interface-locale';
import { formatInterfaceNumber, formatInterfacePercent } from '../../src/app/interface-format';
import { interfaceLocale } from '../../src/app/interface-localization';
import { templates } from '../../src/localization/generated/ro-RO';
import {
  parseXliff,
  placeholderIds,
  validateCatalog,
  validateInterfaceLocales,
  validateMessageText,
  validateSourceCatalog,
} from '../../tools/validate-interface-locales';
import {
  englishGameLocale,
  romanianGameLocale,
  sampleContent,
} from '../../src/game-content';
import {
  displayCharacterName,
  displaySceneName,
  romanianCharacterNames,
  romanianSceneNames,
} from '../../src/localization/romanian-display-names';
import {
  validateGameLocaleBundleText,
  validateGameLocaleBundles,
  type GameLocaleFailure,
} from '../../src/localization/game-locale-validation';
import type { GameLocaleBundle } from '../../src/localization/game-locale-schema';

const xliffText = await readFile('xliff/ro-RO.xlf', 'utf8');
const units = parseXliff(xliffText);
const generatedIds = Object.keys(templates);

describe('interface locale', () => {
  test('ships exactly the English and Romanian locale identifiers', () => {
    expect([...interfaceLocales]).toEqual(['en', 'ro-RO']);
    expect(isInterfaceLocale('ro-RO')).toBe(true);
    expect(isInterfaceLocale('ro')).toBe(false);
    expect(isInterfaceLocale(undefined)).toBe(false);
  });

  test('names each language with its own autonym and defaults to English', () => {
    expect(interfaceLocaleAutonyms['en']).toBe('English');
    expect(interfaceLocaleAutonyms['ro-RO']).toBe('Română');
    expect(interfaceLocale()).toBe('en');
  });
});

describe('Romanian display names', () => {
  test('covers every discovered character and scene without changing English names', () => {
    expect(Object.keys(romanianCharacterNames).sort()).toEqual(
      sampleContent.characters.map(({ id }) => id).sort(),
    );
    expect(Object.keys(romanianSceneNames).sort()).toEqual(
      sampleContent.scenes.map(({ id }) => id).sort(),
    );
    for (const character of sampleContent.characters) {
      const english = englishGameLocale.messages[character.nameKey]!;
      expect(displayCharacterName(character.id, english, 'en')).toBe(english);
      const romanian = displayCharacterName(character.id, english, 'ro-RO');
      expect(romanian).toBe(romanianCharacterNames[character.id]);
      expect(romanian).not.toBe(english);
      expect(romanian).toBe(romanian.normalize('NFC'));
    }
    for (const scene of sampleContent.scenes) {
      const english = englishGameLocale.messages[scene.nameKey]!;
      expect(displaySceneName(scene.id, english, 'en')).toBe(english);
      const romanian = displaySceneName(scene.id, english, 'ro-RO');
      expect(romanian).toBe(romanianSceneNames[scene.id]);
      expect(romanian).not.toBe(english);
      expect(romanian).toBe(romanian.normalize('NFC'));
    }
  });
  // The two Romanian name authorships (this interface table and the Romanian
  // game-content bundle) are pinned by `validateLocaleNameParity`, which
  // `npm run content:validate` runs.
});

describe('Romanian interface catalog', () => {
  test('translates every extracted Lit message exactly once', async () => {
    expect(units.length).toBeGreaterThan(250);
    expect(generatedIds.length).toBe(units.length);
    await expect(validateInterfaceLocales(process.cwd())).resolves.toEqual([]);
  }, 20_000);

  test('keeps the source placeholder references in every target', () => {
    for (const unit of units) {
      expect(unit.target, unit.source).not.toBeNull();
      expect(placeholderIds(unit.target!), unit.source).toEqual(
        placeholderIds(unit.source),
      );
    }
  });

  test('keeps the product name and the autonyms out of the catalog', () => {
    const bySource = new Map(units.map((unit) => [unit.source, unit.target]));
    expect(bySource.get('Grand')).toBe('Grand');
    expect(bySource.get('Transition')).toBe('Transition');
    expect(bySource.get('Grand Transition: A Verbal Republic')).toBe(
      'Grand Transition: O republică verbală',
    );
    expect(bySource.has('English')).toBe(false);
    expect(bySource.has('Română')).toBe(false);
  });

  test('checks the Romanian disclaimer meaning without English words', () => {
    const disclaimer =
      'All characters and events are fictional composites created for satire.';
    const translated = units.find((unit) => unit.source === disclaimer)?.target;
    expect(translated).toBe(
      'Toate personajele și evenimentele sunt compozite fictive create pentru satiră.',
    );
    expect(translated).toContain('fictive');
    expect(translated).toContain('satiră');
    expect(translated!.toLowerCase()).not.toContain('fictional');
    expect(translated!.toLowerCase()).not.toContain('satire');
    expect(englishGameLocale.title.fictionalCompositeSatireDisclaimer).toBe(
      disclaimer,
    );
  });

  test('keeps the persisted fallback notice translated', () => {
    const notice =
      'Settings storage is unavailable. Changes will not persist after this page closes.';
    expect(units.find((unit) => unit.source === notice)?.target).toBe(
      'Setările nu pot fi salvate. Modificările nu vor persista după închiderea acestei pagini.',
    );
  });

  test('uses the reviewed Romanian controls and consistent binary answers', () => {
    const bySource = new Map(units.map((unit) => [unit.source, unit.target]));
    expect(bySource.get('Confirm selection')).toBe('Confirmă alegerea');
    expect(bySource.get('Change selection')).toBe('Schimbă alegerea');
    expect(bySource.get('Selection confirmed')).toBe('Alegere confirmată');
    expect(bySource.get('On')).toBe('Da');
    expect(bySource.get('Off')).toBe('Nu');
    expect(bySource.get('Phrase color coding')).toBe('Colorarea expresiilor');
    expect(bySource.get('Paused')).toBe('Pauză');
    expect(bySource.get('End')).toBe('Gata');
    expect(bySource.get('Local Radio Caller')).toBe('Ascultător la telefon');
    expect(bySource.get('Seed')).toBe('Cod inițial');
  });
});

describe('localization validation failures', () => {
  const unit = (source: string, target: string | null, id = 's0000000000000001') => ({
    id,
    source,
    target,
  });

  test('fails a missing translation at its field path', () => {
    expect(validateCatalog([unit('Settings', null)], ['s0000000000000001'])).toEqual([
      {
        path: 'xliff/ro-RO.xlf[s0000000000000001]',
        code: 'missing-translation',
        message: 'No ro-RO translation. Source: Settings',
      },
    ]);
  });

  test('fails a placeholder mismatch and a missing generated template', () => {
    const failures = validateCatalog(
      [
        unit(
          '<x id="0" equiv-text="${seconds}"/> seconds',
          'secunde',
        ),
      ],
      [],
    );
    expect(failures.map(({ path, code }) => ({ path, code }))).toEqual([
      { path: 'xliff/ro-RO.xlf[s0000000000000001]', code: 'placeholder-mismatch' },
      {
        path: 'src/localization/generated/ro-RO.ts[s0000000000000001]',
        code: 'missing-generated-template',
      },
    ]);
  });

  test('rejects a target placeholder that changes its source expression', () => {
    const failures = validateCatalog(
      [unit('<x id="0" equiv-text="${seconds}"/> seconds',
        '<x id="0" equiv-text="${differentValue}"/> secunde')],
      ['s0000000000000001'],
    );
    expect(failures).toContainEqual(expect.objectContaining({
      path: 'xliff/ro-RO.xlf[s0000000000000001]',
      code: 'placeholder-mismatch',
    }));
  });

  test('fails a duplicate message id and an unused generated template', () => {
    const failures = validateCatalog(
      [unit('Settings', 'Setări', 's1'), unit('Close', 'Închide', 's1')],
      ['s1', 's2'],
    );
    expect(failures.map(({ code }) => code)).toEqual([
      'duplicate-message',
      'unused-generated-template',
    ]);
  });

  test('rejects source changes, missing source keys, and stale catalog keys', () => {
    const failures = validateSourceCatalog(
      [
        unit('Old source', 'Traducere', 's1'),
        unit('Removed source', 'Traducere', 's2'),
      ],
      [
        { name: 's1', contents: ['New source'] },
        { name: 's3', contents: ['New message'] },
      ],
    );
    expect(failures.map(({ path, code }) => ({ path, code }))).toEqual([
      { path: 'xliff/ro-RO.xlf[s1].source', code: 'source-message-mismatch' },
      { path: 'xliff/ro-RO.xlf[s3]', code: 'missing-source-message' },
      { path: 'xliff/ro-RO.xlf[s2]', code: 'unused-source-message' },
    ]);
  });

  test('fails incomplete, unsafe, legacy-cedilla, and non-standard text', () => {
    expect(validateMessageText('   ', 'ro-RO', 'ro-RO[empty]')).toMatchObject([
      { code: 'incomplete-translation' },
    ]);
    expect(
      validateMessageText('<script>alert(1)</script>', 'ro-RO', 'ro-RO[unsafe]'),
    ).toMatchObject([{ code: 'unsafe-text' }]);
    expect(validateMessageText('Setări \u015fi joc', 'ro-RO', 'ro-RO[legacy]')).toContainEqual(
      expect.objectContaining({ code: 'legacy-diacritic' }),
    );
    expect(
      validateMessageText('Setări électronice', 'ro-RO', 'ro-RO[accent]'),
    ).toContainEqual(expect.objectContaining({ code: 'non-standard-letter' }));
    expect(
      validateMessageText('Set\u0061\u0306ri', 'ro-RO', 'ro-RO[unnormalized]'),
    ).toMatchObject([{ code: 'not-normalized' }]);
  });

  test('rejects unsafe text hidden behind XML entities', () => {
    const failures = validateCatalog(
      [unit('Settings', '&lt;script&gt;alert(1)&lt;/script&gt;')],
      ['s0000000000000001'],
    );
    expect(failures).toContainEqual(expect.objectContaining({
      path: 'xliff/ro-RO.xlf[s0000000000000001]',
      code: 'unsafe-text',
    }));
  });
});

describe('interface number formatting', () => {
  test('formats interface numbers with the interface locale', () => {
    expect(formatInterfaceNumber(1.5)).toBe('1.5');
    expect(formatInterfacePercent(0.8)).toBe('80%');
  });
});

describe('Romanian game content', () => {
  const shipped = [englishGameLocale, romanianGameLocale];
  const romanianKeys = Object.keys(romanianGameLocale.messages);

  /** Replace one Romanian message and report only that field path's failures. */
  const troublesAt = (
    key: string,
    text: string,
  ): readonly GameLocaleFailure[] =>
    validateGameLocaleBundleText(
      {
        ...romanianGameLocale,
        messages: { ...romanianGameLocale.messages, [key]: text },
      },
      'ro-RO',
    ).filter((failure) => failure.path === `messages.${key}`);

  const withoutKey = (key: string): GameLocaleBundle => {
    const messages = { ...romanianGameLocale.messages };
    delete messages[key];
    return { ...romanianGameLocale, messages };
  };

  test('ships both complete, safe, unique game-content bundles', () => {
    expect(validateGameLocaleBundles(shipped, 'en')).toEqual([]);
    expect(romanianKeys.length).toBeGreaterThan(3_000);
  });

  test('carries every English key plus only required Romanian agreement forms', () => {
    const englishKeys = new Set(Object.keys(englishGameLocale.messages));
    const expectedRomanianForms = sampleContent.phrases
      .filter((phrase) => phrase.role === 'verb' || phrase.role === 'predicate')
      .flatMap((phrase) => [
        ...(!phrase.numberForms ? [`${phrase.textKey}.plural`] : []),
        ...(!phrase.numberForms?.secondPersonKey
          ? [`${phrase.textKey}.second-person`]
          : []),
      ]);
    expect(new Set(romanianKeys)).toEqual(
      new Set([...englishKeys, ...expectedRomanianForms]),
    );
    const withRomanianDiacritics = Object.values(
      romanianGameLocale.messages,
    ).filter((text) => /[ăâîșț]/u.test(text));
    expect(withRomanianDiacritics.length).toBeGreaterThan(2_000);
  });

  test('states the Romanian title and disclaimer in Romanian', () => {
    expect(romanianGameLocale.locale).toBe('ro-RO');
    expect(romanianGameLocale.title.name).toBe(
      'Grand Transition: A Verbal Republic',
    );
    expect(romanianGameLocale.title.fictionalCompositeSatireDisclaimer).toBe(
      'Toate personajele și evenimentele sunt compozite fictive create pentru satiră.',
    );
  });

  test('fails a missing Romanian key at its field path', () => {
    const key = romanianKeys.find((candidate) =>
      candidate.startsWith('phrase.'),
    )!;
    expect(
      validateGameLocaleBundles([englishGameLocale, withoutKey(key)], 'en'),
    ).toContainEqual({
      path: `messages.${key}`,
      code: 'missing-translation',
      message: `Add the ro-RO game text for "${key}".`,
    });
  });

  test('fails an extra Romanian key at its field path', () => {
    const bundle: GameLocaleBundle = {
      ...romanianGameLocale,
      messages: {
        ...romanianGameLocale.messages,
        'phrase.invented-romanian-card': 'un card inventat',
      },
    };
    expect(
      validateGameLocaleBundles([englishGameLocale, bundle], 'en'),
    ).toContainEqual({
      path: 'messages.phrase.invented-romanian-card',
      code: 'unexpected-message',
      message:
        'Remove the ro-RO game text "phrase.invented-romanian-card" or add it to every locale.',
    });
  });

  test('fails incomplete, unsafe, and legacy-cedilla Romanian text at its path', () => {
    const key = romanianKeys.find((candidate) =>
      candidate.startsWith('phrase.'),
    )!;
    expect(troublesAt(key, '   ')).toEqual([
      {
        path: `messages.${key}`,
        code: 'incomplete-translation',
        message: 'Message text is empty.',
      },
    ]);
    expect(troublesAt(key, '<script>alert(1)</script>')).toContainEqual(
      expect.objectContaining({ code: 'unsafe-text' }),
    );
    expect(troublesAt(key, 'Şef de trib')).toContainEqual(
      expect.objectContaining({ code: 'legacy-diacritic' }),
    );
    expect(
      validateGameLocaleBundleText(
        {
          ...romanianGameLocale,
          title: { ...romanianGameLocale.title, name: '' },
        },
        'ro-RO',
      ),
    ).toEqual([
      {
        path: 'title.name',
        code: 'incomplete-translation',
        message: 'Message text is empty.',
      },
    ]);
  });

  test('fails a duplicate Romanian character name at its field path', () => {
    const nameKeys = romanianKeys.filter(
      (key) => key.startsWith('character.') && key.endsWith('.name'),
    );
    const [first, second] = nameKeys;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(
      troublesAt(second!, romanianGameLocale.messages[first!]!),
    ).toContainEqual(
      expect.objectContaining({ code: 'duplicate-visible-text' }),
    );
  });
});
