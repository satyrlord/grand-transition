import { defineConfig } from 'vitest/config';
import { characterPortraitFallbackPlugin } from './vite.config.ts';

export default defineConfig({
  plugins: [characterPortraitFallbackPlugin()],
  test: {
    environment: 'node',
    // The catalog shards and the asset builders are central processing unit
    // (CPU) bound. This machine runs six workers well; continuous integration
    // keeps the smaller proven count instead of oversubscribing a small runner.
    maxWorkers: process.env.CI ? 2 : 6,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/browser/**'],
  },
});
