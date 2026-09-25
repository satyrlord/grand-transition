import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  openBrowserPersistence,
  type BrowserPersistence,
} from '../../src/persistence/indexeddb-storage.ts';
import { createMemoryStorage } from '../../src/persistence/storage-port.ts';
import { resetStoredData } from './persistence-test-helpers.ts';

const opened: BrowserPersistence[] = [];

async function open(
  options: Partial<Parameters<typeof openBrowserPersistence>[0]> = {},
): Promise<BrowserPersistence> {
  const persistence = await openBrowserPersistence({
    legacyKeys: [],
    legacyStorage: createMemoryStorage(),
    ...options,
  });
  opened.push(persistence);
  return persistence;
}

beforeEach(async () => {
  await resetStoredData();
});

afterEach(async () => {
  vi.restoreAllMocks();
  for (const persistence of opened.splice(0)) {
    await persistence.settled();
    persistence.close();
  }
});

test('keeps documents and history records across a reopen in first-write order', async () => {
  const first = await open();
  expect(first.documents.write('settings', 'one')).toEqual({ ok: true, value: undefined });
  expect(first.documents.read('settings')).toEqual({ ok: true, value: 'one' });
  first.documents.write('ladder', 'rung');
  first.documents.remove('ladder');
  first.history.put('match-b', 'b');
  first.history.put('match-a', 'a');
  first.history.put('match-b', 'b2');
  first.history.put('match-c', 'c');
  first.history.remove('match-c');
  await first.settled();

  const second = await open();
  expect(second.documents.read('settings')).toEqual({ ok: true, value: 'one' });
  expect(second.documents.read('ladder')).toEqual({ ok: true, value: null });
  expect(second.history.readAll()).toEqual({ ok: true, value: ['b2', 'a'] });
  second.history.put('match-d', 'd');
  await second.settled();
  expect((await open()).history.readAll()).toEqual({ ok: true, value: ['b2', 'a', 'd'] });
});

test('moves present Web Storage values into the database and removes them', async () => {
  const legacyStorage = createMemoryStorage({
    settings: 'legacy-settings',
    history: 'legacy-history',
  });
  const persistence = await open({ legacyKeys: ['settings', 'ladder', 'history'], legacyStorage });

  expect(persistence.documents.read('settings')).toEqual({ ok: true, value: 'legacy-settings' });
  expect(persistence.documents.read('history')).toEqual({ ok: true, value: 'legacy-history' });
  expect(legacyStorage.read('settings')).toEqual({ ok: true, value: null });
  expect(legacyStorage.read('history')).toEqual({ ok: true, value: null });
  expect((await open()).documents.read('settings')).toEqual({ ok: true, value: 'legacy-settings' });
});

test('keeps a database value over a later Web Storage copy and removes the copy', async () => {
  const first = await open();
  first.documents.write('settings', 'database');
  await first.settled();
  const legacyStorage = createMemoryStorage({ settings: 'stale', ladder: 'legacy-ladder' });

  const persistence = await open({ legacyKeys: ['settings', 'ladder'], legacyStorage });

  expect(persistence.documents.read('settings')).toEqual({ ok: true, value: 'database' });
  expect(persistence.documents.read('ladder')).toEqual({ ok: true, value: 'legacy-ladder' });
  expect(legacyStorage.read('settings')).toEqual({ ok: true, value: null });
  expect(legacyStorage.read('ladder')).toEqual({ ok: true, value: null });
});

test.each([
  ['storage-security', new DOMException('Blocked.', 'SecurityError')],
  ['storage-unavailable', new Error('No database.')],
] as const)('reports %s for every call when the database cannot open', async (code, error) => {
  const factory = {
    open: () => {
      throw error;
    },
  } as unknown as IDBFactory;
  const legacyStorage = createMemoryStorage({ settings: 'kept' });
  const persistence = await open({ indexedDB: factory, legacyKeys: ['settings'], legacyStorage });

  expect(persistence.documents.read('settings')).toEqual({ ok: false, code });
  expect(persistence.documents.write('settings', 'value')).toEqual({ ok: false, code });
  expect(persistence.history.readAll()).toEqual({ ok: false, code });
  expect(persistence.history.put('match', 'value')).toEqual({ ok: false, code });
  // Nothing moved, so the earlier copy stays.
  expect(legacyStorage.read('settings')).toEqual({ ok: true, value: 'kept' });
});

test('returns a synchronous write failure without changing the loaded value', async () => {
  const persistence = await open();
  persistence.documents.write('settings', 'saved');
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('Full.', 'QuotaExceededError');
  });

  expect(persistence.documents.write('settings', 'lost')).toEqual({
    ok: false,
    code: 'storage-quota',
  });
  expect(persistence.history.put('match', 'lost')).toEqual({ ok: false, code: 'storage-quota' });
  expect(persistence.documents.read('settings')).toEqual({ ok: true, value: 'saved' });
  expect(persistence.history.readAll()).toEqual({ ok: true, value: [] });
});

test('reports a background write failure to each listener after the call returns', async () => {
  const persistence = await open();
  const failures = vi.fn();
  const stopped = vi.fn();
  persistence.onWriteFailure(failures);
  persistence.onWriteFailure(stopped)();
  const put = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'put')!
    .value as IDBObjectStore['put'];
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args
  ) {
    const request = put.apply(this, args);
    this.transaction.abort();
    return request;
  });

  expect(persistence.history.put('match', 'value')).toEqual({ ok: true, value: undefined });
  await persistence.settled();

  expect(failures).toHaveBeenCalledExactlyOnceWith('history', 'match', 'storage-unavailable');
  expect(stopped).not.toHaveBeenCalled();
});
