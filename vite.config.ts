import type { IncomingMessage } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, normalizePath, type Plugin } from 'vite';
import { maximumGameLogBytes, writeGameLog } from './tools/game-log-writer.ts';

export const productionContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

export default defineConfig(({ command }) => ({
  base: '/grand-transition/',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'content-data', test: /[/\\]src[/\\]content[/\\].*\.json$/u },
            { name: 'vendor', test: /[/\\]node_modules[/\\]/u },
          ],
        },
      },
    },
  },
  plugins: [
    characterPortraitFallbackPlugin(),
    ...(command === 'build'
      ? [
          {
            name: 'production-content-security-policy',
            transformIndexHtml: {
              order: 'pre',
              handler: () => [
                {
                  tag: 'meta',
                  attrs: {
                    'http-equiv': 'Content-Security-Policy',
                    content: productionContentSecurityPolicy,
                  },
                  injectTo: 'head',
                },
              ],
            },
          },
        ]
      : [developmentGameLogPlugin()]),
  ],
}));

const characterPortraitFallbackId =
  'virtual:character-portrait-fallbacks';
const resolvedCharacterPortraitFallbackId =
  `\0${characterPortraitFallbackId}`;

export function characterPortraitFallbackPlugin(): Plugin {
  let projectRoot = process.cwd();
  return {
    name: 'character-portrait-fallbacks',
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(id) {
      return id === characterPortraitFallbackId
        ? resolvedCharacterPortraitFallbackId
        : undefined;
    },
    async load(id) {
      if (id !== resolvedCharacterPortraitFallbackId) return undefined;
      const characterRoot = path.join(
        projectRoot,
        'src',
        'assets',
        'characters',
      );
      const manifest = JSON.parse(
        await readFile(
          path.join(characterRoot, 'character-manifest.json'),
          'utf8',
        ),
      ) as { assets: Array<{ source: { path: string } }> };
      const manifestedFiles = new Set(
        manifest.assets.map((asset) => asset.source.path),
      );
      const fallbackFiles = (await readdir(characterRoot, {
        withFileTypes: true,
      }))
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith('.png') &&
            !manifestedFiles.has(entry.name),
        )
        .map((entry) => entry.name)
        .toSorted((left, right) => left.localeCompare(right, 'en'));
      const imports = fallbackFiles.map((fileName, index) => {
        const absolutePath = normalizePath(path.join(characterRoot, fileName));
        return `import portrait${index} from ${JSON.stringify(`${absolutePath}?url&no-inline`)};`;
      });
      const entries = fallbackFiles.map(
        (fileName, index) =>
          `${JSON.stringify(path.parse(fileName).name)}: portrait${index}`,
      );
      return `${imports.join('\n')}\nexport default Object.freeze({${entries.join(',')}});\n`;
    },
  };
}

function developmentGameLogPlugin(): Plugin {
  return {
    name: 'development-game-log-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?', 1)[0] !== '/grand-transition/__game-log') {
          next();
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.setHeader('allow', 'POST');
          response.end('Method not allowed.');
          return;
        }
        const expectedOrigin = `http://${request.headers.host}`;
        if (request.headers.origin !== expectedOrigin) {
          response.statusCode = 403;
          response.end('Origin is not allowed.');
          return;
        }
        if (
          !request.headers['content-type']?.startsWith('application/x-ndjson')
        ) {
          response.statusCode = 415;
          response.end('Content type must be application/x-ndjson.');
          return;
        }
        try {
          const text = await readRequestText(request);
          const relativePath = await writeGameLog({
            text,
            repositoryRoot: process.cwd(),
            logDirectory: process.env.GRAND_TRANSITION_LOG_DIR,
          });
          response.statusCode = 201;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ path: relativePath }));
        } catch (error) {
          response.statusCode = 400;
          response.setHeader('content-type', 'text/plain; charset=utf-8');
          response.end(
            error instanceof Error
              ? error.message
              : 'Could not write game log.',
          );
        }
      });
    },
  };
}

async function readRequestText(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maximumGameLogBytes) {
      throw new Error(`The game log exceeds ${maximumGameLogBytes} bytes.`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}
