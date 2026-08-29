import type { StoragePort, StorageResult } from './storage-port';

export function createBrowserStorage(
  suppliedStorage?: Storage,
): StoragePort {
  let storage: Storage;
  try {
    storage = suppliedStorage ?? globalThis.localStorage;
  } catch (error) {
    const code = storageFailureCode(error);
    return unavailableStorage(code);
  }
  return {
    read(key) {
      return storageCall(() => storage.getItem(key));
    },
    write(key, value) {
      return storageCall(() => {
        storage.setItem(key, value);
        return undefined;
      });
    },
    remove(key) {
      return storageCall(() => {
        storage.removeItem(key);
        return undefined;
      });
    },
  };
}

function unavailableStorage(code: string): StoragePort {
  return {
    read: () => ({ ok: false, code }),
    write: () => ({ ok: false, code }),
    remove: () => ({ ok: false, code }),
  };
}

function storageCall<Value>(operation: () => Value): StorageResult<Value> {
  try {
    return { ok: true, value: operation() };
  } catch (error) {
    return { ok: false, code: storageFailureCode(error) };
  }
}

function storageFailureCode(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      return 'storage-quota';
    }
    if (error.name === 'SecurityError') return 'storage-security';
  }
  return 'storage-unavailable';
}
