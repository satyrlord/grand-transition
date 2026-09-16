import { defineConfig } from '@playwright/test';
import path from 'node:path';

const developmentGameLogDirectory = path.resolve(process.cwd(), 'logs', 'test');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Measured on a 16-logical-processor machine: the suite has no long pole (its
  // slowest test is under a minute) but saturates near three concurrent browser
  // workers. Four workers gained only 13 percent and introduced a brittle
  // geometry failure; six workers ran slower than two and failed five tests.
  // Keep the local count at two and continuous integration at one.
  workers: process.env.CI ? 1 : 2,
  reporter: 'line',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox-audio', testMatch: '**/audio-speech.spec.ts', use: { browserName: 'firefox' } },
    { name: 'webkit-audio', testMatch: '**/audio-speech.spec.ts', use: { browserName: 'webkit' } },
  ],
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
      timeout: 300_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174/grand-transition/',
      env: {
        GRAND_TRANSITION_LOG_DIR: developmentGameLogDirectory,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
