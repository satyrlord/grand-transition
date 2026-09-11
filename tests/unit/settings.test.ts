import { describe, expect, test, vi } from 'vitest';
import {
  decodeSettings,
  defaultSettings,
  encodeSettings,
  SettingsValidationError,
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
  test('migrates a literal shipped version 3 document and writes version 4 on the next change', () => {
    const source = {
      schemaVersion: 3, masterVolume: 0.55, musicVolume: 0.45,
      effectsVolume: 0.35, speechVolume: 0.25, speechEnabled: false,
      gpuVoices: false, speechVoiceUri: 'retired:voice', speechRate: 1.2,
      turnTimerSeconds: null, autoComplete: false,
    };
    const serialized = JSON.stringify(source);
    const storage = createMemoryStorage({ [settingsStorageKey]: serialized });
    const repository = new SettingsRepository(storage);
    expect(repository.snapshot().settings).toEqual({
      ...source, schemaVersion: 4, basePointsMultiplier: 3,
    });
    expect(storage.read(settingsStorageKey)).toEqual({ ok: true, value: serialized });
    repository.replace({ ...repository.snapshot().settings, basePointsMultiplier: 5 });
    expect(new SettingsRepository(storage).snapshot().settings).toEqual({
      ...source, schemaVersion: 4, basePointsMultiplier: 5,
    });
  });

  test.each([1, 2, 3])('rejects fields absent from historical version %s', (version) => {
    const source = historicalSettings(version);
    for (const field of ['basePointsMultiplier', 'tutorialComplete']) {
      expect(decodeSettings(JSON.stringify({ ...source, [field]: 3 }))).toEqual({
        ok: false, code: 'invalid-data', path: field,
      });
    }
  });

  test.each([1, 2, 3, 4, 5] as const)('persists base multiplier %s', (basePointsMultiplier) => {
    const document = settings({ basePointsMultiplier });
    expect(decodeSettings(encodeSettings(document))).toEqual({ ok: true, value: document });
  });

  test('requires the multiplier in version 4', () => {
    const { basePointsMultiplier: _, ...source } = defaultSettings;
    expect(decodeSettings(JSON.stringify(source))).toEqual({
      ok: false, code: 'invalid-data', path: 'basePointsMultiplier',
    });
  });

  test.each([2,3,4])('preserves an explicit GPU opt-out in version %s', (schemaVersion) => {
    const stored=historicalSettings(schemaVersion, {gpuVoices:false});
    expect(decodeSettings(JSON.stringify(stored))).toEqual({ok:true,value:{...stored,schemaVersion:4,basePointsMultiplier:3}});
  });
  test.each([1,2,3,4])('preserves an explicit speech opt-out in version %s', (schemaVersion) => {
    const stored=historicalSettings(schemaVersion, {speechEnabled:false});
    expect(decodeSettings(JSON.stringify(stored))).toMatchObject({ok:true,value:{speechEnabled:false}});
  });
  test.each([1, 2])('restores the previous default rate once when migrating version %s', (version) => {
    const source = historicalSettings(version, {
      speechRate: 1.2, speechEnabled: true, speechVoiceUri: 'retired:voice' });
    const migrated = decodeSettings(JSON.stringify(source));
    expect(migrated).toEqual({ok:true,value:{...source,schemaVersion:4,speechRate:1,gpuVoices:true,basePointsMultiplier:3}});
    if (!migrated.ok) throw new Error('Migration failed.');
    const storage = createMemoryStorage({[settingsStorageKey]:JSON.stringify(source)});
    const repository = new SettingsRepository(storage);
    expect(repository.snapshot().settings.speechRate).toBe(1);
    repository.replace({...repository.snapshot().settings,speechRate:1.2});
    expect(new SettingsRepository(storage).snapshot().settings.speechRate).toBe(1.2);
    expect(decodeSettings(JSON.stringify({...source,speechRate:1.4}))).toMatchObject({ok:true,value:{speechRate:1.4}});
    expect(decodeSettings(JSON.stringify({...source,speechRate:1.15}))).toMatchObject({ok:false,code:'invalid-data'});
  });
  test('new settings use 10 percent music and 1.00 speech defaults while existing saved rates remain intact', () => {
    expect(defaultSettings.musicVolume).toBe(0.1);
    expect(defaultSettings.speechRate).toBe(1);
    for (const speechRate of [0.5, 1, 1.4, 2]) {
      const saved = { ...defaultSettings, speechRate };
      expect(decodeSettings(JSON.stringify(saved))).toEqual({ ok: true, value: saved });
    }
  });

  test('migrates a shipped v1 fixture without changing existing preferences', () => {
    const source = {
      schemaVersion: 1, masterVolume: 0.55, musicVolume: 0.45,
      effectsVolume: 0.35, speechVolume: 0.25, speechEnabled: true,
      speechVoiceUri: 'retired:voice', speechRate: 1.4,
      turnTimerSeconds: 15, autoComplete: false,
    };
    const storage = createMemoryStorage({ [settingsStorageKey]: JSON.stringify(source) });
    const repository = new SettingsRepository(storage);
    const migrated = { ...source, schemaVersion: 4, gpuVoices: true, basePointsMultiplier: 3 };
    expect(repository.snapshot().settings).toEqual(migrated);
    expect(storage.read(settingsStorageKey)).toEqual({ ok: true, value: JSON.stringify(source) });
    repository.replace({ ...repository.snapshot().settings, gpuVoices: true });
    expect(new SettingsRepository(storage).snapshot().settings).toEqual({ ...migrated, gpuVoices: true });
    expect(defaultSettings.gpuVoices).toBe(true);
    expect(defaultSettings.speechEnabled).toBe(true);
    expect(decodeSettings(JSON.stringify({ ...source, gpuVoices: true }))).toEqual({
      ok: false, code: 'invalid-data', path: 'gpuVoices',
    });
    expect(decodeSettings(JSON.stringify({ ...source, musicVolume: 0.12 }))).toEqual({
      ok: false, code: 'invalid-data', path: 'musicVolume',
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
      decodeSettings(JSON.stringify({ ...defaultSettings, schemaVersion: 5 })),
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
      JSON.stringify({ ...defaultSettings, schemaVersion: 5 }),
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

function historicalSettings(
  schemaVersion: number,
  changes: Partial<SettingsDocument> = {},
): Record<string, unknown> {
  const source: Record<string, unknown> = { ...defaultSettings, ...changes, schemaVersion };
  if (schemaVersion < 4) delete source.basePointsMultiplier;
  if (schemaVersion === 1) delete source.gpuVoices;
  return source;
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
