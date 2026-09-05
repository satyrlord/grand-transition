import { defineConfig } from 'vitest/config';
import { characterPortraitFallbackPlugin } from './vite.config.ts';

export default defineConfig({
  plugins: [characterPortraitFallbackPlugin()],
  test: {
    environment: 'node',
    maxWorkers: 2,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/browser/**'],
  },
});
