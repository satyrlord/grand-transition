/** Lowercase hexadecimal SHA-256 digest of the bytes. */
export async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Throws unless the bytes have the recorded size and SHA-256 digest. */
export async function assertIntegrity(
  bytes: ArrayBuffer | Uint8Array<ArrayBuffer>,
  record: Readonly<{ bytes: number; sha256: string }>,
  label: string,
): Promise<void> {
  if (bytes.byteLength !== record.bytes || (await sha256Hex(bytes)) !== record.sha256) {
    throw new Error(`${label} integrity failed.`);
  }
}

/**
 * Reads a response body of an exact recorded size into one buffer and reports
 * the loaded byte count after each chunk.
 */
export async function readExactBody(
  body: ReadableStream<Uint8Array>,
  expectedBytes: number,
  label: string,
  onProgress: (loaded: number) => void,
): Promise<ArrayBuffer> {
  const data = new Uint8Array(expectedBytes);
  const reader = body.getReader();
  let loaded = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (loaded + value.length > data.length) throw new Error(`${label} size mismatch.`);
    data.set(value, loaded);
    loaded += value.length;
    onProgress(loaded);
  }
  if (loaded !== data.length) throw new Error(`${label} is incomplete.`);
  return data.buffer;
}
