import { defineConfig, devices, type Project } from '@playwright/test';
import path from 'node:path';
import { fullQualityGateRequested } from './tools/quality-gate-mode.ts';
import { productionBaseURL, productionTestPort } from './e2e/helpers/production-preview.ts';

const developmentGameLogDirectory = path.resolve(process.cwd(), 'logs', 'test');
// The quality gate sets this marker after its validate phase has checked every
// asset that `npm run build` checks. A direct run keeps the validating build.
const build =
  process.env.GRAND_TRANSITION_ASSETS_VALIDATED === '1' ? 'npm run build:bundle' : 'npm run build';

const projects: Project[] = [
  {
    name: 'chromium',
    testIgnore: '**/release-performance.spec.ts',
    use: { browserName: 'chromium', channel: 'chrome' },
  },
  {
    name: 'mobile-chromium',
    testMatch: ['**/release-compatibility.spec.ts', '**/mobile-layout.spec.ts'],
    use: { ...devices['Pixel 7 landscape'], channel: 'chrome' },
  },
];
if (fullQualityGateRequested()) {
  projects.push({
    name: 'release-performance',
    testMatch: '**/release-performance.spec.ts',
    workers: 1,
    retries: 0,
    // The benchmark owns native CDP traces; avoid UI snapshots and duplicate recording.
    use: { trace: 'off' },
    dependencies: projects.map(({ name }) => name!),
  });
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // The gate never retries a failed test. See Milestone 033.
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: 'line',
  projects,
  use: {
    baseURL: productionBaseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `${build} && npm run preview -- --host 127.0.0.1 --port ${productionTestPort} --strictPort`,
      url: productionBaseURL,
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174/grand-transition/',
      env: {
        GRAND_TRANSITION_LOG_DIR: developmentGameLogDirectory,
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
