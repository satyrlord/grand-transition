import { createBrowserStorage, storageFailureCode } from './browser-storage.ts';
import {
  createMemoryRecordStorage,
  createMemoryStorage,
  type RecordStoragePort,
  type StoragePort,
  type StorageResult,
} from './storage-port.ts';

export const persistenceDatabaseName = 'grand-transition';
export const persistenceDatabaseVersion = 1;
export const documentStoreName = 'documents';
export const historyStoreName = 'match-history';

export type PersistenceStore = 'documents' | 'history';
export type StorageFailureListener = (store: PersistenceStore, key: string, code: string) => void;

/**
 * Durable application storage. Reads come from the values that loaded when the
 * storage opened, so they stay synchronous. A write updates those values at
 * once and commits in the background. A background failure goes to the
 * failure listeners after the write call returned success.
 */
export type BrowserPersistence = Readonly<{
  documents: StoragePort;
  history: RecordStoragePort;
  onWriteFailure(listener: StorageFailureListener): () => void;
  /** Resolves when each write that started before the call has settled. */
  settled(): Promise<void>;
  close(): void;
}>;

type HistoryRecord = Readonly<{ id: string; sequence: number; value: string }>;

export type OpenBrowserPersistenceOptions = Readonly<{
  /** Web Storage keys to move into the database when it has no value for them. */
  legacyKeys: readonly string[];
  indexedDB?: IDBFactory;
  legacyStorage?: StoragePort;
}>;

export function createMemoryPersistence(): BrowserPersistence {
  return {
    documents: createMemoryStorage(),
    history: createMemoryRecordStorage(),
    onWriteFailure: () => () => {},
    settled: () => Promise.resolve(),
    close: () => {},
  };
}

export async function openBrowserPersistence(
  options: OpenBrowserPersistenceOptions,
): Promise<BrowserPersistence> {
  let database: IDBDatabase;
  try {
    database = await openDatabase(options.indexedDB ?? globalThis.indexedDB);
  } catch (error) {
    return unavailablePersistence(storageFailureCode(error));
  }

  const legacy = options.legacyStorage ?? createBrowserStorage();
  let loaded: Readonly<{
    documents: Map<string, string>;
    records: readonly HistoryRecord[];
    legacyKeys: readonly string[];
  }>;
  try {
    loaded = await loadDatabase(database, legacy, options.legacyKeys);
  } catch (error) {
    database.close();
    return unavailablePersistence(storageFailureCode(error));
  }
  // The database committed each moved value, so no Web Storage copy is needed.
  for (const key of loaded.legacyKeys) legacy.remove(key);

  return connectedPersistence(database, loaded.documents, loaded.records);
}

function openDatabase(factory: IDBFactory | undefined): Promise<IDBDatabase> {
  if (!factory) return Promise.reject(new Error('IndexedDB is unavailable.'));
  const request = factory.open(persistenceDatabaseName, persistenceDatabaseVersion);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(documentStoreName)) {
      database.createObjectStore(documentStoreName);
    }
    if (!database.objectStoreNames.contains(historyStoreName)) {
      database.createObjectStore(historyStoreName, { keyPath: 'id' });
    }
  };
  return requestResult(request);
}

async function loadDatabase(
  database: IDBDatabase,
  legacy: StoragePort,
  legacyKeys: readonly string[],
) {
  const legacyValues = new Map<string, string>();
  for (const key of legacyKeys) {
    const value = legacy.read(key);
    if (value.ok && value.value !== null) legacyValues.set(key, value.value);
  }

  const transaction = database.transaction([documentStoreName, historyStoreName], 'readwrite');
  const documentStore = transaction.objectStore(documentStoreName);
  const keysRequest = documentStore.getAllKeys();
  const valuesRequest = documentStore.getAll();
  const documents = new Map<string, string>();
  // A value in the database is newer than any Web Storage copy, so only a key
  // that the database does not have moves in. The put must start inside this
  // success event, while the transaction is still active.
  valuesRequest.addEventListener('success', () => {
    keysRequest.result.forEach((key, index) => {
      const value = valuesRequest.result[index];
      if (typeof key === 'string' && typeof value === 'string') documents.set(key, value);
    });
    for (const [key, value] of legacyValues) {
      if (documents.has(key)) continue;
      documentStore.put(value, key);
      documents.set(key, value);
    }
  });
  const [, , storedRecords] = await Promise.all([
    requestResult(keysRequest),
    requestResult(valuesRequest),
    requestResult(transaction.objectStore(historyStoreName).getAll()),
    transactionDone(transaction),
  ]);

  const historyRecords = storedRecords
    .filter(isHistoryRecord)
    .toSorted((left, right) => left.sequence - right.sequence);
  return { documents, records: historyRecords, legacyKeys: [...legacyValues.keys()] };
}

function connectedPersistence(
  database: IDBDatabase,
  documents: Map<string, string>,
  storedRecords: readonly HistoryRecord[],
): BrowserPersistence {
  const records = new Map(storedRecords.map((record) => [record.id, record]));
  let nextSequence = Math.max(0, ...storedRecords.map(({ sequence }) => sequence)) + 1;
  let closedCode: string | null = null;
  const listeners = new Set<StorageFailureListener>();
  const pending = new Set<Promise<void>>();

  database.onclose = () => {
    closedCode = 'storage-unavailable';
  };
  database.onversionchange = () => {
    database.close();
    closedCode = 'storage-unavailable';
  };

  const write = (
    store: PersistenceStore,
    key: string,
    operation: (objectStore: IDBObjectStore) => void,
  ): StorageResult<undefined> => {
    if (closedCode !== null) return { ok: false, code: closedCode };
    const storeName = store === 'documents' ? documentStoreName : historyStoreName;
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(storeName, 'readwrite');
      operation(transaction.objectStore(storeName));
    } catch (error) {
      return { ok: false, code: storageFailureCode(error) };
    }
    const settled = transactionDone(transaction).catch((error: unknown) => {
      const code = storageFailureCode(error);
      for (const listener of listeners) listener(store, key, code);
    });
    pending.add(settled);
    void settled.finally(() => pending.delete(settled));
    return { ok: true, value: undefined };
  };

  const readable = <Value>(value: Value): StorageResult<Value> =>
    closedCode === null ? { ok: true, value } : { ok: false, code: closedCode };

  return {
    documents: {
      read: (key) => readable(documents.get(key) ?? null),
      write(key, value) {
        const result = write('documents', key, (store) => store.put(value, key));
        if (result.ok) documents.set(key, value);
        return result;
      },
      remove(key) {
        const result = write('documents', key, (store) => store.delete(key));
        if (result.ok) documents.delete(key);
        return result;
      },
    },
    history: {
      readAll: () => readable([...records.values()].map(({ value }) => value)),
      put(id, value) {
        const record = { id, sequence: records.get(id)?.sequence ?? nextSequence, value };
        const result = write('history', id, (store) => store.put(record));
        if (result.ok) {
          records.set(id, record);
          if (record.sequence === nextSequence) nextSequence += 1;
        }
        return result;
      },
      remove(id) {
        const result = write('history', id, (store) => store.delete(id));
        if (result.ok) records.delete(id);
        return result;
      },
    },
    onWriteFailure(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async settled() {
      await Promise.all(pending);
    },
    close() {
      closedCode ??= 'storage-unavailable';
      database.close();
    },
  };
}

function unavailablePersistence(code: string): BrowserPersistence {
  const failure = { ok: false, code } as const;
  return {
    documents: { read: () => failure, write: () => failure, remove: () => failure },
    history: { readAll: () => failure, put: () => failure, remove: () => failure },
    onWriteFailure: () => () => {},
    settled: () => Promise.resolve(),
    close: () => {},
  };
}

function isHistoryRecord(value: unknown): value is HistoryRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    Number.isSafeInteger(record.sequence) &&
    typeof record.value === 'string'
  );
}

function requestResult<Value>(request: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new DOMException('The transaction was aborted.', 'AbortError'));
  });
}
