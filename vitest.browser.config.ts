import { playwright } from '@vitest/browser-playwright';
import { existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const pureFileThresholds = Object.fromEntries(
  ['src/engine', 'src/ai', 'src/persistence/codecs']
    .flatMap((root) => listTypeScriptFiles(root))
    .map((file) => [
      file,
      { statements: 90, branches: 85, functions: 90, lines: 90 },
    ]),
);
const browserApiPort = await findAvailableLoopbackPort();

export default defineConfig({
  test: {
    include: [
      'tests/browser/**/*.browser.test.ts',
      'tests/unit/content-schemas.test.ts',
      'tests/unit/basic-scoring.test.ts',
      'tests/unit/board-generation.test.ts',
      'tests/unit/combo-finisher-scoring.test.ts',
      'tests/unit/continuation-comeback-resolution.test.ts',
      'tests/unit/draft-actions.test.ts',
      'tests/unit/easy-ai.test.ts',
      'tests/unit/english-grammar-core.test.ts',
      'tests/unit/extended-grammar.test.ts',
      'tests/unit/match-lifecycle.test.ts',
      'tests/unit/match-screen-snapshot.test.ts',
      'tests/unit/replay-and-simulation.test.ts',
      'tests/unit/settings.test.ts',
      'tests/unit/viewport-support.test.ts',
    ],
    browser: {
      enabled: true,
      headless: true,
      api: {
        host: '127.0.0.1',
        port: browserApiPort,
      },
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
        ...pureFileThresholds,
      },
    },
  },
});

function listTypeScriptFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.posix.join(root, entry.name);
    return entry.isDirectory()
      ? listTypeScriptFiles(file)
      : entry.isFile() && entry.name.endsWith('.ts')
        ? [file]
        : [];
  });
}

function findAvailableLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Vitest could not reserve a local browser API port.'));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}
