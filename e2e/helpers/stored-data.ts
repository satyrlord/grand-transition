import type { Page } from '@playwright/test';

export const settingsStorageKey = 'grand-transition.settings.v1';
export const ladderProgressStorageKey = 'grand-transition.ladder-progress.v1';
export const matchHistoryStorageKey = 'grand-transition.match-history.v1';

type StorageOperation =
  | Readonly<{ type: 'read-document'; key: string }>
  | Readonly<{ type: 'write-document'; key: string; value: string }>
  | Readonly<{ type: 'remove-document'; key: string }>
  | Readonly<{ type: 'read-history' }>
  | Readonly<{ type: 'replace-history'; values: readonly string[] }>;

/**
 * Runs one operation on the application database inside the page. The
 * application keeps the values that it loaded, so a test reloads the page
 * after a write to make the application read it.
 */
async function runStorageOperation(page: Page, operation: StorageOperation): Promise<unknown> {
  return page.evaluate(async (current) => {
    const request = <Value>(pending: IDBRequest<Value>) =>
      new Promise<Value>((resolve, reject) => {
        pending.onsuccess = () => resolve(pending.result);
        pending.onerror = () => reject(pending.error);
      });
    const opening = indexedDB.open('grand-transition', 1);
    opening.onupgradeneeded = () => {
      opening.result.createObjectStore('documents');
      opening.result.createObjectStore('match-history', { keyPath: 'id' });
    };
    const database = await request(opening);
    try {
      const storeName = current.type.endsWith('history') ? 'match-history' : 'documents';
      const writes = current.type !== 'read-document' && current.type !== 'read-history';
      const transaction = database.transaction(storeName, writes ? 'readwrite' : 'readonly');
      const done = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
      });
      const store = transaction.objectStore(storeName);
      let result: unknown = null;
      if (current.type === 'read-document') {
        const value = await request(store.get(current.key));
        result = typeof value === 'string' ? value : null;
      } else if (current.type === 'write-document') {
        store.put(current.value, current.key);
      } else if (current.type === 'remove-document') {
        store.delete(current.key);
      } else if (current.type === 'read-history') {
        const records = (await request(store.getAll())) as { sequence: number; value: string }[];
        result = records
          .toSorted((left, right) => left.sequence - right.sequence)
          .map(({ value }) => value);
      } else {
        store.clear();
        current.values.forEach((value, index) => {
          store.put({ id: (JSON.parse(value) as { id: string }).id, sequence: index + 1, value });
        });
      }
      await done;
      return result;
    } finally {
      database.close();
    }
  }, operation);
}

export async function storedDocument(page: Page, key: string): Promise<string | null> {
  return runStorageOperation(page, { type: 'read-document', key }) as Promise<string | null>;
}

export async function storedJson<Value = Record<string, unknown>>(
  page: Page,
  key: string,
): Promise<Value | null> {
  const value = await storedDocument(page, key);
  return value === null ? null : (JSON.parse(value) as Value);
}

export async function storeDocument(page: Page, key: string, value: string): Promise<void> {
  await runStorageOperation(page, { type: 'write-document', key, value });
}

export async function removeStoredDocument(page: Page, key: string): Promise<void> {
  await runStorageOperation(page, { type: 'remove-document', key });
}

/** Stored history entry records, oldest first. */
export async function storedHistory(page: Page): Promise<readonly string[]> {
  return runStorageOperation(page, { type: 'read-history' }) as Promise<readonly string[]>;
}

/** Replaces every stored history entry record, oldest first. */
export async function replaceStoredHistory(page: Page, values: readonly string[]): Promise<void> {
  await runStorageOperation(page, { type: 'replace-history', values });
}

export async function clearStoredHistory(page: Page): Promise<void> {
  await replaceStoredHistory(page, []);
  await removeStoredDocument(page, matchHistoryStorageKey);
}
