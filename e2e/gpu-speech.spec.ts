import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import manifest from '../src/audio/kokoro-gpu-manifest.json' with {type:'json'};

test('development serves the pinned GPU runtime without JavaScript transforms', async ({request}) => {
  const response = await request.get('http://127.0.0.1:5174/grand-transition/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs');
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.length).toBe(manifest.runtimeModule.bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtimeModule.sha256);
});

test('the development GPU worker boots without importing public assets as JavaScript', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/grand-transition/');
  const result = await page.evaluate(() => new Promise<string>((resolve) => {
    const worker = new Worker('/grand-transition/src/audio/kokoro-gpu-worker.ts', {type:'module'});
    const finish = (value: string) => {clearTimeout(timeout);worker.terminate();resolve(value);};
    const timeout = setTimeout(() => finish('timeout'), 15_000);
    worker.onerror = () => finish('error');
    worker.onmessage = ({data}: MessageEvent<{type:string}>) => finish(data.type);
  }));
  expect(result).toBe('booted');
});
