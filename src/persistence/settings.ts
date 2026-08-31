import {
  decodeSettings,
  defaultSettings,
  encodeSettings,
  type SettingsDocument,
} from './codecs/settings-codec';
import { createMemoryStorage, type StoragePort } from './storage-port';

export const settingsStorageKey = 'grand-transition.settings.v1';
export const settingsPersistenceNotice =
  'Settings storage is unavailable. Changes will not persist after this page closes.';

export type SettingsFailureCode =
  | 'invalid-data'
  | 'unsupported-version'
  | 'storage-quota'
  | 'storage-security'
  | 'storage-unavailable';

export type SettingsSnapshot = Readonly<{
  settings: SettingsDocument;
  persistenceFailure: SettingsFailureCode | null;
  usingMemoryFallback: boolean;
}>;

export class SettingsRepository {
  private settings: SettingsDocument = defaultSettings;
  private persistenceFailure: SettingsFailureCode | null = null;
  private usingMemoryFallback = false;
  private canReplaceInvalidStoredValue = false;

  constructor(
    private readonly browserStorage: StoragePort,
    private readonly memoryStorage: StoragePort = createMemoryStorage(),
  ) {
    const stored = browserStorage.read(settingsStorageKey);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      return;
    }
    if (stored.value === null) return;
    const decoded = decodeSettings(stored.value);
    if (!decoded.ok) {
      this.persistenceFailure = decoded.code;
      this.usingMemoryFallback = true;
      this.canReplaceInvalidStoredValue = true;
      this.writeMemorySettings();
      return;
    }
    this.settings = decoded.value;
  }

  snapshot(): SettingsSnapshot {
    return Object.freeze({
      settings: this.settings,
      persistenceFailure: this.persistenceFailure,
      usingMemoryFallback: this.usingMemoryFallback,
    });
  }

  replace(settings: SettingsDocument): SettingsSnapshot {
    const serialized = encodeSettings(settings);
    const normalized = decodeSettings(serialized);
    if (!normalized.ok) {
      throw new Error(`Normalized settings failed at ${normalized.path}.`);
    }
    this.settings = normalized.value;

    if (this.usingMemoryFallback) {
      this.memoryStorage.write(settingsStorageKey, serialized);
      if (this.canReplaceInvalidStoredValue) {
        this.canReplaceInvalidStoredValue = false;
        const replaced = this.browserStorage.write(
          settingsStorageKey,
          serialized,
        );
        if (!replaced.ok) {
          this.persistenceFailure = storageFailure(replaced.code);
        } else {
          this.persistenceFailure = null;
          this.usingMemoryFallback = false;
        }
      }
      return this.snapshot();
    }

    const stored = this.browserStorage.write(settingsStorageKey, serialized);
    if (!stored.ok) {
      this.activateStorageFallback(stored.code);
      this.memoryStorage.write(settingsStorageKey, serialized);
    }
    return this.snapshot();
  }

  private activateStorageFallback(code: string): void {
    this.persistenceFailure = storageFailure(code);
    this.usingMemoryFallback = true;
    this.canReplaceInvalidStoredValue = false;
    this.writeMemorySettings();
  }

  private writeMemorySettings(): void {
    this.memoryStorage.write(settingsStorageKey, encodeSettings(this.settings));
  }
}

function storageFailure(code: string): SettingsFailureCode {
  return code === 'storage-quota' ||
    code === 'storage-security' ||
    code === 'storage-unavailable'
    ? code
    : 'storage-unavailable';
}
