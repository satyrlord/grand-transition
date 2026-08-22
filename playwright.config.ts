import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/grand-transition/',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'npm run build && npm run preview -- --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:4173/grand-transition/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174/grand-transition/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
