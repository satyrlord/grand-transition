import { currentPersistence, openPersistenceSession } from '../../src/app/persistence-session.ts';
import {
  documentStoreName,
  historyStoreName,
  persistenceDatabaseName,
} from '../../src/persistence/indexeddb-storage.ts';
import { ladderProgressStorageKey } from '../../src/persistence/ladder-progress.ts';
import { matchHistoryStorageKey } from '../../src/persistence/match-history.ts';
import { settingsStorageKey } from '../../src/persistence/settings.ts';

const legacyKeys = [settingsStorageKey, ladderProgressStorageKey, matchHistoryStorageKey];

/** Deletes every stored value and opens empty durable storage. */
export async function resetStoredData(): Promise<void> {
  await currentPersistence().settled();
  currentPersistence().close();
  await request(indexedDB.deleteDatabase(persistenceDatabaseName));
  for (const key of legacyKeys) localStorage.removeItem(key);
  await openPersistenceSession();
}

/**
 * Opens durable storage again, as a page load does. A value that the test
 * wrote to Web Storage moves into the database, as an earlier release's does.
 */
export async function reloadStoredData(): Promise<void> {
  await currentPersistence().settled();
  await openPersistenceSession();
}

export async function storedDocument(key: string): Promise<string | null> {
  return withDatabase(async (database) => {
    const value = await request(
      database.transaction(documentStoreName).objectStore(documentStoreName).get(key),
    );
    return typeof value === 'string' ? value : null;
  });
}

export async function storedDocumentKeys(): Promise<readonly string[]> {
  return withDatabase(async (database) => {
    const keys = await request(
      database.transaction(documentStoreName).objectStore(documentStoreName).getAllKeys(),
    );
    return keys.map(String).sort();
  });
}

/** Stored history entry records in first-write order. */
export async function storedHistory(): Promise<readonly string[]> {
  return withDatabase(async (database) => {
    const records = (await request(
      database.transaction(historyStoreName).objectStore(historyStoreName).getAll(),
    )) as { sequence: number; value: string }[];
    return records
      .toSorted((left, right) => left.sequence - right.sequence)
      .map(({ value }) => value);
  });
}

async function withDatabase<Value>(
  read: (database: IDBDatabase) => Promise<Value>,
): Promise<Value> {
  await currentPersistence().settled();
  const database = await request(indexedDB.open(persistenceDatabaseName));
  try {
    return await read(database);
  } finally {
    database.close();
  }
}

function request<Value>(pending: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    pending.onsuccess = () => resolve(pending.result);
    pending.onerror = () => reject(pending.error);
  });
}
