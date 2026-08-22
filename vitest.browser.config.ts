import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/browser/**/*.browser.test.ts',
      'tests/unit/content-schemas.test.ts',
      'tests/unit/board-generation.test.ts',
      'tests/unit/english-grammar-core.test.ts',
      'tests/unit/extended-grammar.test.ts',
    ],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          headless: true,
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/vite-env.d.ts'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
