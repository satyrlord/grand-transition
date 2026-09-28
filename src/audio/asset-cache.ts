/**
 * Keeps verified speech package files between visits. The HTTP cache drops
 * single entries as large as the speech models, so each worker stores its
 * hash-pinned files in Cache Storage, in one cache for each package version.
 */
export type AssetCache = Readonly<{
  /**
   * Returns the cached bytes when `verify` accepts them. Otherwise it returns
   * the downloaded bytes that `verify` accepts, and it stores them.
   */
  read(
    url: URL,
    download: () => Promise<Response>,
    verify: (response: Response) => Promise<ArrayBuffer>,
  ): Promise<ArrayBuffer>;
}>;

/** `prefix` names the package; caches of its other versions are deleted. */
export function assetCache(prefix: string, version: string): AssetCache {
  const name = prefix + version;
  let opened: Promise<Cache | null> | undefined;
  const open = () =>
    (opened ??= (async () => {
      if (typeof caches === 'undefined') return null;
      try {
        for (const key of await caches.keys())
          if (key.startsWith(prefix) && key !== name) await caches.delete(key);
        return await caches.open(name);
      } catch {
        return null;
      }
    })());
  return Object.freeze({
    async read(
      url: URL,
      download: () => Promise<Response>,
      verify: (response: Response) => Promise<ArrayBuffer>,
    ) {
      const cache = await open();
      const cached = await cache?.match(url).catch(() => undefined);
      if (cached) {
        try {
          return await verify(cached);
        } catch {
          await cache!.delete(url).catch(() => false);
        }
      }
      const bytes = await verify(await download());
      // Storage that is full or unavailable only costs the next visit a download.
      if (cache) await cache.put(url, new Response(bytes)).catch(() => {});
      return bytes;
    },
  });
}
