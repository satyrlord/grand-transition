import { defineConfig, devices } from '@playwright/test';

// `npm run test:published -- --base-url <url>` sets this value. The published
// smoke never starts a server: it examines the release that the URL serves.
const baseURL = process.env.GRAND_TRANSITION_PUBLISHED_URL;
if (!baseURL) {
  throw new Error('Run the published smoke through npm run test:published -- --base-url <url>.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.smoke.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 240_000,
  outputDir: 'tmp/published-smoke/results',
  reporter: [['line'], ['json', { outputFile: 'tmp/published-smoke/report.json' }]],
  // The Milestone 030 browser matrix: stable desktop Chrome and mobile Chrome.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7 landscape'], channel: 'chrome' } },
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
});
