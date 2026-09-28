import { afterEach, expect, test, vi } from 'vitest';
import { assetCache } from '../../src/audio/asset-cache.ts';
import { stubCacheStorage } from './helpers/fake-cache-storage.ts';

const url = new URL('http://127.0.0.1:4173/grand-transition/tts/piper/model.onnx');
const pinned = [1, 2, 3];

afterEach(() => {
  vi.unstubAllGlobals();
});

function harness(served = pinned) {
  const download = vi.fn(async () => new Response(new Uint8Array(served)));
  // Accept only the pinned bytes, as a hash check does.
  const verify = async (response: Response) => {
    const bytes = await response.arrayBuffer();
    if (String([...new Uint8Array(bytes)]) !== String(pinned)) throw new Error('Integrity.');
    return bytes;
  };
  return { download, read: () => assetCache('speech-', 'v2').read(url, download, verify) };
}

test('stores verified bytes, reuses them without a download, and deletes earlier package versions', async () => {
  const storage = stubCacheStorage();
  storage.store('speech-v1').set(url.href, new Uint8Array([7]));
  storage.store('other-application').set(url.href, new Uint8Array([7]));
  const first = harness();
  expect([...new Uint8Array(await first.read())]).toEqual(pinned);
  expect(first.download).toHaveBeenCalledTimes(1);
  expect([...storage.stores.keys()]).toEqual(['other-application', 'speech-v2']);
  const next = harness();
  expect([...new Uint8Array(await next.read())]).toEqual(pinned);
  expect(next.download).not.toHaveBeenCalled();
});

test('replaces a cached copy that fails verification with a verified download', async () => {
  const storage = stubCacheStorage();
  storage.store('speech-v2').set(url.href, new Uint8Array([9, 9, 9]));
  const h = harness();
  expect([...new Uint8Array(await h.read())]).toEqual(pinned);
  expect(h.download).toHaveBeenCalledTimes(1);
  expect([...storage.store('speech-v2').get(url.href)!]).toEqual(pinned);
});

test('never stores a download that fails verification', async () => {
  const storage = stubCacheStorage();
  await expect(harness([9, 9, 9]).read()).rejects.toThrow('Integrity.');
  expect(storage.store('speech-v2').size).toBe(0);
});

test.each(['full', 'unavailable'] as const)(
  'downloads the package when Cache Storage is %s',
  async (mode) => {
    if (mode === 'full') stubCacheStorage({ failWrites: true });
    else vi.stubGlobal('caches', undefined);
    const h = harness();
    expect([...new Uint8Array(await h.read())]).toEqual(pinned);
    expect(h.download).toHaveBeenCalledTimes(1);
  },
);
