import {
  createMemoryPersistence,
  openBrowserPersistence,
  type BrowserPersistence,
} from '../persistence/indexeddb-storage.ts';
import { ladderProgressStorageKey } from '../persistence/ladder-progress.ts';
import { matchHistoryStorageKey } from '../persistence/match-history.ts';
import { settingsStorageKey } from '../persistence/settings.ts';

let session: BrowserPersistence | null = null;

/**
 * Opens durable storage for the page. The entry point waits for it before the
 * application shell loads, so each repository reads its values synchronously.
 */
export async function openPersistenceSession(): Promise<BrowserPersistence> {
  session?.close();
  session = await openBrowserPersistence({
    legacyKeys: [settingsStorageKey, ladderProgressStorageKey, matchHistoryStorageKey],
  });
  return session;
}

/** The open storage, or storage in memory when nothing opened durable storage. */
export function currentPersistence(): BrowserPersistence {
  return (session ??= createMemoryPersistence());
}
