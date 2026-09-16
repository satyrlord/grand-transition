import { describe, expect, test, vi } from 'vitest';
import {
  decodeSettings,
  defaultSettings,
  encodeSettings,
  SettingsValidationError,
  settingsSchemaVersion,
  type SettingsDocument,
} from '../../src/persistence/codecs/settings-codec';
import {
  SettingsRepository,
  settingsStorageKey,
} from '../../src/persistence/settings';
import {
  createMemoryStorage,
  type StoragePort,
  type StorageResult,
} from '../../src/persistence/storage-port';

describe('settings codec', () => {
  test('loads the current settings document and keeps every stored preference', () => {
    const stored = settings({
      masterVolume: 0.55, musicVolume: 0.45, autoComplete: false,
      speechEnabled: false, gpuVoices: false, speechVoiceUri: 'retired:voice', speechRate: 1.2,
      turnTimerSeconds: null, basePointsMultiplier: 5, tutorialMode: true,
    });
    const serialized = JSON.stringify(stored);
    const storage = createMemoryStorage({ [settingsStorageKey]: serialized });
    const repository = new SettingsRepository(storage);
    expect(repository.snapshot()).toEqual({
      settings: stored, persistenceFailure: null, usingMemoryFallback: false,
    });
    expect(storage.read(settingsStorageKey)).toEqual({ ok: true, value: serialized });
    repository.replace({ ...stored, basePointsMultiplier: 3 });
    expect(new SettingsRepository(storage).snapshot().settings).toEqual({
      ...stored, basePointsMultiplier: 3,
    });
  });

  test('rejects every other settings document version as unsupported', () => {
    expect(settingsSchemaVersion).toBe(3);
    for (const schemaVersion of [1, 2, 4, 5, 6]) {
      expect(decodeSettings(JSON.stringify({ ...defaultSettings, schemaVersion }))).toEqual({
        ok: false, code: 'unsupported-version', path: 'schemaVersion',
      });
    }
  });

  test('defaults the interface locale to English and round-trips both shipped locales', () => {
    expect(defaultSettings.interfaceLocale).toBe('en');
    for (const interfaceLocale of ['en', 'ro-RO'] as const) {
      const document = settings({ interfaceLocale });
      expect(decodeSettings(encodeSettings(document))).toEqual({
        ok: true,
        value: document,
      });
    }
  });

  test('defaults the game locale to English and keeps it independent of the interface locale', () => {
    expect(defaultSettings.gameLocale).toBe('en');
    for (const interfaceLocale of ['en', 'ro-RO'] as const) {
      for (const gameLocale of ['en', 'ro-RO'] as const) {
        const document = settings({ interfaceLocale, gameLocale });
        expect(decodeSettings(encodeSettings(document))).toEqual({
          ok: true,
          value: document,
        });
      }
    }
  });

  test('rejects an unknown game locale at its field path', () => {
    for (const gameLocale of ['ro', 'en-US', 'ro-RO ', '', 1, null]) {
      expect(
        decodeSettings(JSON.stringify({ ...defaultSettings, gameLocale })),
      ).toEqual({
        ok: false,
        code: 'invalid-data',
        path: 'gameLocale',
      });
    }
  });

  test('rejects a document stored before the game locale existed and preserves the interface locale', () => {
    const { gameLocale: _, ...previousShape } = defaultSettings;
    expect(
      decodeSettings(JSON.stringify({ ...previousShape, schemaVersion: 2 })),
    ).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });
    const stored = settings({ interfaceLocale: 'ro-RO', gameLocale: 'ro-RO' });
    expect(
      new SettingsRepository(
        createMemoryStorage({ [settingsStorageKey]: JSON.stringify(stored) }),
      ).snapshot().settings,
    ).toEqual(stored);
  });

  test('rejects an unknown interface locale at its field path', () => {
    for (const interfaceLocale of ['ro', 'en-US', 'ro-RO ', '', 1, null]) {
      expect(
        decodeSettings(JSON.stringify({ ...defaultSettings, interfaceLocale })),
      ).toEqual({
        ok: false,
        code: 'invalid-data',
        path: 'interfaceLocale',
      });
    }
  });

  test('rejects a document stored before the interface locale existed and preserves every other value', () => {
    const { interfaceLocale: _, ...previousShape } = defaultSettings;
    expect(
      decodeSettings(JSON.stringify({ ...previousShape, schemaVersion: 1 })),
    ).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });

    const stored = settings({
      interfaceLocale: 'ro-RO',
      basePointsMultiplier: 5,
      tutorialMode: true,
      speechVoiceUri: 'urn:grand-transition:saved-voice',
      gpuVoices: false,
    });
    const storage = createMemoryStorage({
      [settingsStorageKey]: encodeSettings(stored),
    });
    const repository = new SettingsRepository(storage);
    expect(repository.snapshot().settings).toEqual(stored);
    expect(repository.snapshot().settings.basePointsMultiplier).toBe(5);
    expect(repository.snapshot().settings.tutorialMode).toBe(true);
    expect(repository.snapshot().settings.gpuVoices).toBe(false);
    expect(repository.snapshot().settings.speechVoiceUri).toBe(
      'urn:grand-transition:saved-voice',
    );
    repository.replace({ ...stored, interfaceLocale: 'en' });
    expect(new SettingsRepository(storage).snapshot().settings).toEqual({
      ...stored,
      interfaceLocale: 'en',
    });
  });

  test.each([false, true])('round-trips tutorial mode %s', (tutorialMode) => {
    const document = settings({ tutorialMode });
    expect(decodeSettings(encodeSettings(document))).toEqual({ ok: true, value: document });
  });

  test('defaults tutorial off and requires the field', () => {
    expect(defaultSettings.tutorialMode).toBe(false);
    const { tutorialMode: _, ...source } = defaultSettings;
    expect(decodeSettings(JSON.stringify(source))).toEqual({
      ok: false, code: 'invalid-data', path: 'tutorialMode',
    });
  });

  test.each([1, 2, 3, 4, 5] as const)('persists base multiplier %s', (basePointsMultiplier) => {
    const document = settings({ basePointsMultiplier });
    expect(decodeSettings(encodeSettings(document))).toEqual({ ok: true, value: document });
  });

  test('requires the multiplier', () => {
    const { basePointsMultiplier: _, ...source } = defaultSettings;
    expect(decodeSettings(JSON.stringify(source))).toEqual({
      ok: false, code: 'invalid-data', path: 'basePointsMultiplier',
    });
  });

  test('preserves an explicit GPU opt-out', () => {
    const stored = settings({ gpuVoices: false });
    expect(decodeSettings(JSON.stringify(stored))).toEqual({ ok: true, value: stored });
  });

  test('preserves an explicit speech opt-out', () => {
    const stored = settings({ speechEnabled: false });
    expect(decodeSettings(JSON.stringify(stored))).toEqual({ ok: true, value: stored });
  });

  test('keeps an explicitly saved speech rate across a reload', () => {
    const stored = settings({
      speechRate: 1.2, speechEnabled: true, speechVoiceUri: 'retired:voice',
    });
    const storage = createMemoryStorage({ [settingsStorageKey]: JSON.stringify(stored) });
    const repository = new SettingsRepository(storage);
    expect(repository.snapshot().settings.speechRate).toBe(1.2);
    repository.replace({ ...repository.snapshot().settings, speechRate: 1.4 });
    expect(new SettingsRepository(storage).snapshot().settings.speechRate).toBe(1.4);
    expect(decodeSettings(JSON.stringify({ ...stored, speechRate: 1.15 })))
      .toMatchObject({ ok: false, code: 'invalid-data' });
  });
  test('new settings use 10 percent music and 1.00 speech defaults while existing saved rates remain intact', () => {
    expect(defaultSettings.musicVolume).toBe(0.1);
    expect(defaultSettings.speechRate).toBe(1);
    for (const speechRate of [0.5, 1, 1.4, 2]) {
      const saved = { ...defaultSettings, speechRate };
      expect(decodeSettings(JSON.stringify(saved))).toEqual({ ok: true, value: saved });
    }
  });

  test('rejects a saved document that misses a current field', () => {
    expect(defaultSettings.gpuVoices).toBe(true);
    expect(defaultSettings.speechEnabled).toBe(true);
    expect(defaultSettings.schemaVersion).toBe(settingsSchemaVersion);
    const { gpuVoices: _, ...withoutGpuVoices } = defaultSettings;
    expect(decodeSettings(JSON.stringify(withoutGpuVoices))).toEqual({
      ok: false, code: 'invalid-data', path: 'gpuVoices',
    });
    const { interfaceLocale: __, ...withoutInterfaceLocale } = defaultSettings;
    expect(decodeSettings(JSON.stringify(withoutInterfaceLocale))).toEqual({
      ok: false, code: 'invalid-data', path: 'interfaceLocale',
    });
    const { gameLocale: ___, ...withoutGameLocale } = defaultSettings;
    expect(decodeSettings(JSON.stringify(withoutGameLocale))).toEqual({
      ok: false, code: 'invalid-data', path: 'gameLocale',
    });
  });

  test('round-trips defaults with normalized bytes', () => {
    const serialized = encodeSettings(defaultSettings);

    expect(serialized).toBe(`${JSON.stringify(defaultSettings, null, 2)}\n`);
    expect(decodeSettings(serialized)).toEqual({
      ok: true,
      value: defaultSettings,
    });
    expect(Object.isFrozen(defaultSettings)).toBe(true);
  });

  test('round-trips minimum, maximum, and step-aligned values', () => {
    const document = settings({
      masterVolume: 0,
      musicVolume: 1,
      effectsVolume: 0.05,
      speechVolume: 0.95,
      speechEnabled: true,
      gpuVoices: true,
      speechVoiceUri: 'urn:grand-transition:test-voice',
      speechRate: 1.9,
      turnTimerSeconds: null,
      autoComplete: false,
    });

    expect(decodeSettings(encodeSettings(document))).toEqual({
      ok: true,
      value: document,
    });
  });

  test.each([
    ['masterVolume', -0.05],
    ['musicVolume', 1.05],
    ['effectsVolume', 0.12],
    ['speechVolume', '0.8'],
    ['speechEnabled', 1],
    ['gpuVoices', 'true'],
    ['speechVoiceUri', 4],
    ['speechRate', 0.4],
    ['speechRate', 1.15],
    ['turnTimerSeconds', 20],
    ['autoComplete', 'true'],
    ['tutorialMode', 'true'],
    ['tutorialMode', 1],
    ['tutorialMode', null],
    ['basePointsMultiplier', 0],
    ['basePointsMultiplier', 6],
    ['basePointsMultiplier', 1.5],
    ['basePointsMultiplier', '3'],
    ['basePointsMultiplier', null],
  ] as const)('rejects invalid %s at its field path', (field, value) => {
    const candidate = { ...defaultSettings, [field]: value };

    expect(decodeSettings(JSON.stringify(candidate))).toEqual({
      ok: false,
      code: 'invalid-data',
      path: field,
    });
  });

  test('rejects missing and unknown fields at their paths', () => {
    const { musicVolume: _, ...missing } = defaultSettings;
    const unknown = { ...defaultSettings, tutorialComplete: true };

    expect(decodeSettings(JSON.stringify(missing))).toEqual({
      ok: false,
      code: 'invalid-data',
      path: 'musicVolume',
    });
    expect(decodeSettings(JSON.stringify(unknown))).toEqual({
      ok: false,
      code: 'invalid-data',
      path: 'tutorialComplete',
    });
  });

  test('reports malformed data and unknown schema versions', () => {
    expect(decodeSettings('{not json')).toEqual({
      ok: false,
      code: 'invalid-data',
      path: '$',
    });
    expect(
      decodeSettings(JSON.stringify({ ...defaultSettings, schemaVersion: settingsSchemaVersion + 1 })),
    ).toEqual({
      ok: false,
      code: 'unsupported-version',
      path: 'schemaVersion',
    });
  });

  test('rejects invalid documents during encoding without logging values', () => {
    const consoleSpies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ];

    expect(() =>
      encodeSettings(settings({ masterVolume: 0.12 })),
    ).toThrowError(SettingsValidationError);
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });
});

describe('settings repository', () => {
  test('uses defaults and restores every valid stored setting', () => {
    const storage = createMemoryStorage();
    const repository = new SettingsRepository(storage);
    const changed = settings({
      masterVolume: 0.55,
      musicVolume: 0.45,
      effectsVolume: 0.35,
      speechVolume: 0.25,
      speechEnabled: true,
      gpuVoices: true,
      speechVoiceUri: 'voice:test',
      speechRate: 1.4,
      turnTimerSeconds: 15,
      autoComplete: false,
      basePointsMultiplier: 5,
      tutorialMode: true,
    });

    expect(repository.snapshot()).toEqual({
      settings: defaultSettings,
      persistenceFailure: null,
      usingMemoryFallback: false,
    });
    repository.replace(changed);

    expect(new SettingsRepository(storage).snapshot()).toEqual({
      settings: changed,
      persistenceFailure: null,
      usingMemoryFallback: false,
    });
  });

  test.each([
    ['invalid-data', '{broken'],
    [
      'unsupported-version',
      JSON.stringify({ ...defaultSettings, schemaVersion: settingsSchemaVersion + 1 }),
    ],
  ] as const)(
    'keeps %s bytes until the user changes a setting',
    (failure, badBytes) => {
      const storage = createMemoryStorage({ [settingsStorageKey]: badBytes });
      const repository = new SettingsRepository(storage);

      expect(repository.snapshot()).toEqual({
        settings: defaultSettings,
        persistenceFailure: failure,
        usingMemoryFallback: true,
      });
      expect(storage.read(settingsStorageKey)).toEqual({
        ok: true,
        value: badBytes,
      });

      repository.replace(settings({ masterVolume: 0.5 }));
      expect(storage.read(settingsStorageKey)).toEqual({
        ok: true,
        value: encodeSettings(settings({ masterVolume: 0.5 })),
      });
      expect(repository.snapshot().persistenceFailure).toBeNull();
      expect(repository.snapshot().usingMemoryFallback).toBe(false);

      repository.replace(
        settings({ masterVolume: 0.5, autoComplete: false }),
      );
      expect(new SettingsRepository(storage).snapshot()).toEqual({
        settings: settings({ masterVolume: 0.5, autoComplete: false }),
        persistenceFailure: null,
        usingMemoryFallback: false,
      });
    },
  );

  test.each([
    'storage-quota',
    'storage-security',
    'storage-unavailable',
  ] as const)(
    'activates memory fallback for a %s read failure',
    (failureCode) => {
      const browser = failingStorage(failureCode, 'read');
      const repository = new SettingsRepository(browser.port);
      const changed = settings({ autoComplete: false });

      expect(repository.snapshot()).toEqual({
        settings: defaultSettings,
        persistenceFailure: failureCode,
        usingMemoryFallback: true,
      });
      expect(repository.replace(changed)).toEqual({
        settings: changed,
        persistenceFailure: failureCode,
        usingMemoryFallback: true,
      });
      expect(browser.write).not.toHaveBeenCalled();
    },
  );

  test.each([
    'storage-quota',
    'storage-security',
    'storage-unavailable',
  ] as const)(
    'activates memory fallback for a %s write failure and stays there',
    (failureCode) => {
      const browser = failingStorage(failureCode, 'write');
      const repository = new SettingsRepository(browser.port);

      repository.replace(settings({ masterVolume: 0.5 }));
      repository.replace(settings({ masterVolume: 0.45 }));

      expect(repository.snapshot()).toEqual({
        settings: settings({ masterVolume: 0.45 }),
        persistenceFailure: failureCode,
        usingMemoryFallback: true,
      });
      expect(browser.write).toHaveBeenCalledTimes(1);
    },
  );

  test('keeps fallback active when corrupt-data replacement cannot persist', () => {
    const write = vi.fn<StoragePort['write']>(() => ({
      ok: false,
      code: 'storage-quota',
    }));
    const repository = new SettingsRepository({
      read: () => ({ ok: true, value: '{broken' }),
      write,
      remove: () => ({ ok: true, value: undefined }),
    });

    expect(repository.replace(settings({ masterVolume: 0.5 }))).toEqual({
      settings: settings({ masterVolume: 0.5 }),
      persistenceFailure: 'storage-quota',
      usingMemoryFallback: true,
    });
    repository.replace(settings({ masterVolume: 0.45 }));
    expect(write).toHaveBeenCalledTimes(1);
  });
});

test('the memory adapter has the complete storage contract', () => {
  const storage = createMemoryStorage({ existing: 'value' });

  expect(storage.read('existing')).toEqual({ ok: true, value: 'value' });
  expect(storage.write('new', 'data')).toEqual({
    ok: true,
    value: undefined,
  });
  expect(storage.read('new')).toEqual({ ok: true, value: 'data' });
  expect(storage.remove('new')).toEqual({ ok: true, value: undefined });
  expect(storage.read('new')).toEqual({ ok: true, value: null });
});

function settings(
  changes: Partial<SettingsDocument> = {},
): SettingsDocument {
  return Object.freeze({ ...defaultSettings, ...changes });
}

function failingStorage(
  code: string,
  operation: 'read' | 'write',
): Readonly<{
  port: StoragePort;
  write: ReturnType<typeof vi.fn<StoragePort['write']>>;
}> {
  const failure = <Value>(): StorageResult<Value> => ({ ok: false, code });
  const write = vi.fn<StoragePort['write']>((_key, _value) =>
    operation === 'write'
      ? failure<undefined>()
      : { ok: true, value: undefined },
  );
  return {
    port: {
      read: () =>
        operation === 'read'
          ? failure<string | null>()
          : { ok: true, value: null },
      write,
      remove: () => ({ ok: true, value: undefined }),
    },
    write,
  };
}
