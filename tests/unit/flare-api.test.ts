import { expect, test, vi } from 'vitest';
import {
  buildFlareRequest,
  sendFlareRequest,
  validateFlareSize,
  type AssetRole,
  type FlareRequest,
} from '../../.github/skills/generate-scene-openai/scripts/openai-api.ts';

const options = {
  promptText: 'Private synthetic prompt',
  assetRole: 'scene-background' as const,
  size: '3840x2160',
  background: 'opaque',
};

test('Flare permits only the approved landscape 4K scene size', () => {
  expect(validateFlareSize('3840x2160')).toEqual({ width: 3840, height: 2160, pixels: 8_294_400 });
  for (const size of ['auto', '1024x1024', '2048x2048', '2160x3840', '4096x2048', '3840x3840']) {
    expect(() => validateFlareSize(size)).toThrow('only for 3840x2160 scene backgrounds');
  }
});

test.each(['character', 'desk', 'prop', 'foreground', 'other', undefined] as const)(
  'request construction rejects the %s role before a request can be sent',
  (assetRole) => {
    expect(() => buildFlareRequest({ ...options, assetRole })).toThrow('explicit opaque');
  },
);

test.each(['transparent', 'auto', undefined])(
  'scene background construction rejects %s without explicit opaque output',
  (background) => {
    expect(() => buildFlareRequest({ ...options, background })).toThrow('explicit opaque');
  },
);

test('text requests preserve model, prompt and the opaque 4K scene size', () => {
  const request = buildFlareRequest(options);
  expect(request.endpoint).toBe('https://api.openai.com/v1/images/generations');
  expect(JSON.parse(request.body as string)).toEqual({
    model: 'gpt-image-2.5-flare',
    prompt: options.promptText,
    size: options.size,
    background: 'opaque',
    quality: 'high',
    output_format: 'png',
    n: 1,
  });
});

test('reference requests use multipart image arrays with exact input bytes', async () => {
  const bytes = Buffer.from('synthetic image bytes');
  const request = buildFlareRequest({
    ...options,
    referenceImages: [
      { bytes, format: 'png' },
      { bytes, format: 'webp' },
    ],
  });
  expect(request.endpoint).toBe('https://api.openai.com/v1/images/edits');
  expect(request.contentType).toBeUndefined();
  const body = request.body as FormData;
  expect(body.get('model')).toBe('gpt-image-2.5-flare');
  expect(body.get('size')).toBe('3840x2160');
  expect(body.get('background')).toBe('opaque');
  const images = body.getAll('image[]') as File[];
  expect(images).toHaveLength(2);
  expect(Buffer.from(await images[0]!.arrayBuffer())).toEqual(bytes);
  expect(images[0]!.name).toBe('reference-1.png');
  expect(images[1]!.type).toBe('image/webp');
});

test('transport uses one fixed-origin request and returns image bytes without changing them', async () => {
  const bytes = Buffer.from('synthetic result');
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: bytes.toString('base64') }] })),
    );
  expect(await sendFlareRequest(buildFlareRequest(options), 'synthetic-key', fetcher)).toEqual(
    bytes,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe('https://api.openai.com/v1/images/generations');
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    method: 'POST',
    redirect: 'error',
    headers: { Authorization: 'Bearer synthetic-key' },
  });
});

test.each([400, 401, 403, 429, 500])(
  'HTTP %s errors do not expose provider bodies or repeat requests',
  async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('private prompt and synthetic-key', { status }));
    let caught: unknown;
    try {
      await sendFlareRequest(buildFlareRequest(options), 'synthetic-key', fetcher);
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).toContain(`HTTP ${status}`);
    expect(String(caught)).not.toContain('synthetic-key');
    expect(String(caught)).not.toContain('private prompt');
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

test('uncertain network failure and invalid image responses are not retried', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('synthetic-key included in upstream error'));
  await expect(
    sendFlareRequest(buildFlareRequest(options), 'synthetic-key', fetcher),
  ).rejects.toThrow('The billing result is unknown');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const invalid = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ url: 'https://invalid.example/image' }] })),
    );
  await expect(
    sendFlareRequest(buildFlareRequest(options), 'synthetic-key', invalid),
  ).rejects.toThrow('no usable image payload');
  expect(invalid).toHaveBeenCalledTimes(1);
});

test('credentials cannot be redirected through a substituted endpoint', async () => {
  const fetcher = vi.fn();
  await expect(
    sendFlareRequest(
      { ...buildFlareRequest(options), endpoint: 'https://invalid.example' },
      'synthetic-key',
      fetcher,
    ),
  ).rejects.toThrow('fixed OpenAI');
  expect(fetcher).not.toHaveBeenCalled();
});

test.each(['character', 'desk', 'prop', 'foreground', 'other', undefined] as (
  AssetRole | undefined
)[])(
  'direct transport rejects the %s role before credentials or network access',
  async (assetRole) => {
    const fetcher = vi.fn();
    const request = { ...buildFlareRequest(options), assetRole } as FlareRequest;
    await expect(sendFlareRequest(request, '', fetcher)).rejects.toThrow('explicit opaque');
    expect(fetcher).not.toHaveBeenCalled();
  },
);

test.each([{ size: '2048x2048' }, { background: 'transparent' }, { background: 'auto' }])(
  'direct transport rejects altered JSON request constraints: %j',
  async (override) => {
    const request = buildFlareRequest(options);
    request.body = JSON.stringify({ ...JSON.parse(request.body as string), ...override });
    const fetcher = vi.fn();
    await expect(sendFlareRequest(request, '', fetcher)).rejects.toThrow('Flare is permitted only');
    expect(fetcher).not.toHaveBeenCalled();
  },
);

test('direct transport rejects changed or duplicate multipart constraints', async () => {
  const request = buildFlareRequest({
    ...options,
    referenceImages: [{ bytes: Buffer.from('synthetic image'), format: 'png' }],
  });
  const body = request.body as FormData;
  const fetcher = vi.fn();
  body.set('background', 'transparent');
  await expect(sendFlareRequest(request, '', fetcher)).rejects.toThrow('explicit opaque');
  body.set('background', 'opaque');
  body.append('size', '2048x2048');
  await expect(sendFlareRequest(request, '', fetcher)).rejects.toThrow('one size');
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([{ n: 2 }, { model: 'another-paid-model' }])(
  'direct transport keeps one Flare image per request: %j',
  async (override) => {
    const request = buildFlareRequest(options);
    request.body = JSON.stringify({ ...JSON.parse(request.body as string), ...override });
    const fetcher = vi.fn();
    await expect(sendFlareRequest(request, '', fetcher)).rejects.toThrow('one Flare image');
    expect(fetcher).not.toHaveBeenCalled();
  },
);
