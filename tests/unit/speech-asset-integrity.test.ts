import { describe, expect, test, vi } from 'vitest';
import {
  assertIntegrity,
  readExactBody,
  sha256Hex,
} from '../../src/audio/asset-integrity';

const bytes = new TextEncoder().encode('abc');
// SHA-256("abc") from FIPS 180-2.
const abcDigest =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function stream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

describe('speech asset integrity', () => {
  test('hashes bytes as lowercase hexadecimal SHA-256', async () => {
    expect(await sha256Hex(bytes)).toBe(abcDigest);
  });

  test('accepts only the recorded size and digest', async () => {
    await expect(assertIntegrity(bytes, { bytes: 3, sha256: abcDigest }, 'Asset')).resolves.toBeUndefined();
    await expect(assertIntegrity(bytes, { bytes: 4, sha256: abcDigest }, 'Asset'))
      .rejects.toThrow('Asset integrity failed.');
    await expect(assertIntegrity(bytes, { bytes: 3, sha256: '0'.repeat(64) }, 'Asset'))
      .rejects.toThrow('Asset integrity failed.');
  });

  test('reads an exact body and reports cumulative progress', async () => {
    const progress = vi.fn();
    const body = await readExactBody(stream('ab', 'c'), 3, 'Asset', progress);
    expect(new TextDecoder().decode(body)).toBe('abc');
    expect(progress.mock.calls).toEqual([[2], [3]]);
  });

  test('rejects a body that is longer or shorter than its record', async () => {
    await expect(readExactBody(stream('abcd'), 3, 'Asset', () => {}))
      .rejects.toThrow('Asset size mismatch.');
    await expect(readExactBody(stream('ab'), 3, 'Asset', () => {}))
      .rejects.toThrow('Asset is incomplete.');
  });
});
