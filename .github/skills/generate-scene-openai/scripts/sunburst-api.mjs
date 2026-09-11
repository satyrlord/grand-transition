// Repository-owned Sunburst transport. Never read credentials or print provider bodies here.
export const MODEL = 'gpt-image-2.5-sunburst';
const API_ROOT = 'https://api.openai.com/v1/images/';

export function validateSunburstSize(size) {
  const match = /^(\d+)x(\d+)$/u.exec(size);
  const width = Number(match?.[1]), height = Number(match?.[2]);
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || width < 1 || height < 1 ||
      width % 16 || height % 16 || Math.max(width, height) > 3840 ||
      Math.max(width, height) / Math.min(width, height) > 3 ||
      pixels < 655_360 || pixels > 8_294_400) {
    throw new Error('The requested size is outside the supported Sunburst dimensions.');
  }
  return { width, height, pixels };
}

export function buildSunburstRequest({ promptText, size, background = 'auto', referenceImages = [] }) {
  validateSunburstSize(size);
  if (!['transparent', 'opaque', 'auto'].includes(background)) throw new Error('Use transparent, opaque, or auto for the background.');
  if (typeof promptText !== 'string' || !promptText.trim()) throw new Error('The generation prompt is empty.');
  if (referenceImages.length > 16) throw new Error('Use no more than 16 reference images.');
  const fields = { model: MODEL, prompt: promptText, size, background, quality: 'high', output_format: 'png', n: 1 };
  if (referenceImages.length === 0) {
    return { endpoint: `${API_ROOT}generations`, body: JSON.stringify(fields), contentType: 'application/json' };
  }
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, String(value));
  for (const [index, image] of referenceImages.entries()) {
    if (!['png', 'jpeg', 'webp'].includes(image.format) || !Buffer.isBuffer(image.bytes) ||
        image.bytes.length === 0 || image.bytes.length >= 50_000_000) {
      throw new Error('Each reference must be a static PNG, JPEG, or WebP smaller than 50 MB.');
    }
    body.append('image[]', new Blob([image.bytes], { type: `image/${image.format}` }), `reference-${index + 1}.${image.format}`);
  }
  return { endpoint: `${API_ROOT}edits`, body };
}

export class SunburstRequestError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'SunburstRequestError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export async function sendSunburstRequest(request, key, fetcher = globalThis.fetch) {
  if (![`${API_ROOT}generations`, `${API_ROOT}edits`].includes(request.endpoint)) {
    throw new Error('Use the fixed OpenAI image endpoint.');
  }
  if (typeof key !== 'string' || !key.trim()) throw new Error('The local OPENAI_API_KEY is missing.');
  let response;
  try {
    response = await fetcher(request.endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(300_000),
      headers: { Authorization: `Bearer ${key}`, ...(request.contentType ? { 'Content-Type': request.contentType } : {}) },
      body: request.body,
    });
  } catch {
    throw new SunburstRequestError('network-outcome-unknown', 'The image request did not complete. Billing may be uncertain. No retry was made.');
  }
  if (!response.ok) {
    // The provider body can contain private data. Do not log, store, or forward it.
    await response.body?.cancel().catch(() => {});
    const status = response.status;
    const code = status === 401 || status === 403 ? 'authentication-or-access'
      : status === 429 ? 'rate-or-quota' : status >= 500 ? 'provider-failure' : 'request-rejected';
    throw new SunburstRequestError(code, `OpenAI rejected the image request (HTTP ${status}). No retry was made.`, status);
  }
  try {
    const result = await response.json();
    const image = result?.data?.[0]?.b64_json;
    if (!Array.isArray(result?.data) || result.data.length !== 1 || typeof image !== 'string' ||
        image.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(image)) throw new Error();
    return Buffer.from(image, 'base64');
  } catch {
    throw new SunburstRequestError('invalid-response', 'OpenAI returned no usable image payload. No retry was made.');
  }
}
