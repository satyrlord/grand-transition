import { vi } from 'vitest';

/** An in-memory Cache Storage keyed by cache name, then by request URL. */
export function stubCacheStorage(options: { failWrites?: boolean } = {}) {
  const stores = new Map<string, Map<string, Uint8Array>>();
  const store = (name: string) => stores.get(name) ?? stores.set(name, new Map()).get(name)!;
  vi.stubGlobal('caches', {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => ({
      match: async (url: URL) => {
        const bytes = store(name).get(url.href);
        return bytes ? new Response(new Uint8Array(bytes)) : undefined;
      },
      put: async (url: URL, response: Response) => {
        if (options.failWrites) throw new DOMException('Full.', 'QuotaExceededError');
        store(name).set(url.href, new Uint8Array(await response.arrayBuffer()));
      },
      delete: async (url: URL) => store(name).delete(url.href),
    }),
  });
  return { stores, store };
}
