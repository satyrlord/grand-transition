const fnvOffsetBasis = 2_166_136_261;
const fnvPrime = 16_777_619;

/** Deterministic 32-bit FNV-1a hash of UTF-16 code units. */
export function stableHash(text: string, initialHash = fnvOffsetBasis): number {
  let hash = initialHash >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, fnvPrime) >>> 0;
  }
  return hash;
}
