import { expect, test } from 'vitest';
import { omitFallbackSpeechWasmPlugin } from '../../vite.config';

test('leaves only the verified tts WASM in the production bundle', () => {
  const plugin = omitFallbackSpeechWasmPlugin();
  const asset = (fileName: string) => ({ type: 'asset' as const, fileName });
  const bundle: Record<string, { type: 'asset' | 'chunk'; fileName: string }> = {
    'assets/ort-wasm-simd-threaded-DDx2apAW.wasm': asset('assets/ort-wasm-simd-threaded-DDx2apAW.wasm'),
    'assets/ort-wasm-simd-threaded.asyncify-CsxMlmQ8.wasm': asset('assets/ort-wasm-simd-threaded.asyncify-CsxMlmQ8.wasm'),
    'assets/espeak-ng-BDmL_gwI.wasm': asset('assets/espeak-ng-BDmL_gwI.wasm'),
    'assets/app-shell-_ey1yhv-.js': { type: 'chunk', fileName: 'assets/app-shell-_ey1yhv-.js' },
    'assets/other-module-A1b2C3d4.wasm': asset('assets/other-module-A1b2C3d4.wasm'),
    'tts/piper/ort-wasm-simd-threaded.wasm': asset('tts/piper/ort-wasm-simd-threaded.wasm'),
  };

  expect(plugin.apply).toBe('build');
  const generateBundle = plugin.generateBundle as (options: unknown, output: typeof bundle) => void;
  generateBundle.call({}, {}, bundle);

  expect(Object.keys(bundle).toSorted()).toEqual([
    'assets/app-shell-_ey1yhv-.js',
    'assets/other-module-A1b2C3d4.wasm',
    'tts/piper/ort-wasm-simd-threaded.wasm',
  ]);
});
