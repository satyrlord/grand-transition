import { expect, test, vi } from 'vitest';
// @ts-expect-error The workflow transport is a native ECMAScript module.
import { buildSunburstRequest, sendSunburstRequest, validateSunburstSize } from '../../.github/skills/generate-scene-openai/scripts/sunburst-api.mjs';

const options = { promptText: 'Private synthetic prompt', size: '2048x2048', background: 'transparent' };

test('Sunburst accepts supported custom dimensions and rejects invalid API sizes', () => {
  for (const size of ['1024x1024', '2048x2048', '3840x2160', '2160x3840']) expect(validateSunburstSize(size).pixels).toBeGreaterThanOrEqual(655_360);
  for (const size of ['auto', '256x256', '2049x2048', '4096x2048', '3840x3840', '3840x512']) {
    expect(() => validateSunburstSize(size)).toThrow('supported Sunburst dimensions');
  }
});

test('text requests preserve model, prompt, exact size and native transparency', () => {
  const request = buildSunburstRequest(options);
  expect(request.endpoint).toBe('https://api.openai.com/v1/images/generations');
  expect(JSON.parse(request.body)).toEqual({ model: 'gpt-image-2.5-sunburst', prompt: options.promptText,
    size: options.size, background: 'transparent', quality: 'high', output_format: 'png', n: 1 });
});

test('reference requests use multipart image arrays with exact input bytes', async () => {
  const bytes = Buffer.from('synthetic image bytes');
  const request = buildSunburstRequest({ ...options, referenceImages: [{ bytes, format: 'png' }, { bytes, format: 'webp' }] });
  expect(request.endpoint).toBe('https://api.openai.com/v1/images/edits');
  expect(request.contentType).toBeUndefined();
  expect(request.body.get('model')).toBe('gpt-image-2.5-sunburst');
  expect(request.body.get('size')).toBe('2048x2048');
  expect(request.body.get('background')).toBe('transparent');
  const images: File[] = request.body.getAll('image[]');
  expect(images).toHaveLength(2);
  expect(Buffer.from(await images[0]!.arrayBuffer())).toEqual(bytes);
  expect(images[0]!.name).toBe('reference-1.png');
  expect(images[1]!.type).toBe('image/webp');
});

test('transport uses one fixed-origin request and returns image bytes without changing them', async () => {
  const bytes = Buffer.from('synthetic result');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: bytes.toString('base64') }] })));
  expect(await sendSunburstRequest(buildSunburstRequest(options), 'synthetic-key', fetcher)).toEqual(bytes);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe('https://api.openai.com/v1/images/generations');
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer synthetic-key' } });
});

test.each([400, 401, 403, 429, 500])('HTTP %s errors do not expose provider bodies or repeat requests', async (status) => {
  const fetcher = vi.fn().mockResolvedValue(new Response('private prompt and synthetic-key', { status }));
  let caught: unknown;
  try { await sendSunburstRequest(buildSunburstRequest(options), 'synthetic-key', fetcher); }
  catch (error) { caught = error; }
  expect(String(caught)).toContain(`HTTP ${status}`);
  expect(String(caught)).not.toContain('synthetic-key');
  expect(String(caught)).not.toContain('private prompt');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('uncertain network failure and invalid image responses are not retried', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('synthetic-key included in upstream error'));
  await expect(sendSunburstRequest(buildSunburstRequest(options), 'synthetic-key', fetcher))
    .rejects.toThrow('Billing may be uncertain');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const invalid = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ url: 'https://invalid.example/image' }] })));
  await expect(sendSunburstRequest(buildSunburstRequest(options), 'synthetic-key', invalid)).rejects.toThrow('no usable image payload');
  expect(invalid).toHaveBeenCalledTimes(1);
});

test('credentials cannot be redirected through a substituted endpoint', async () => {
  const fetcher = vi.fn();
  await expect(sendSunburstRequest({ ...buildSunburstRequest(options), endpoint: 'https://invalid.example' }, 'synthetic-key', fetcher)).rejects.toThrow('fixed OpenAI');
  expect(fetcher).not.toHaveBeenCalled();
});
