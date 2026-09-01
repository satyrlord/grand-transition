import { expect, test, type Page } from '@playwright/test';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const repositoryRoot = path.resolve(
  fileURLToPath(new URL('..', import.meta.url)),
);
const temporaryCharacterId = 'temporary-content-lifecycle-delegate';
const temporaryCharacterName = 'Temporary Content Lifecycle Delegate';
const basePath = '/grand-transition/';

test.describe('production character content lifecycle', () => {
  test('adds and removes a convention-based character without registry edits', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const temporaryRoot = path.join(repositoryRoot, 'tmp');
    mkdirSync(temporaryRoot, { recursive: true });
    const fixtureRoot = mkdtempSync(
      path.join(temporaryRoot, 'content-lifecycle-'),
    );
    let activeServer: StaticBuildServer | undefined;

    try {
      createIsolatedApplication(fixtureRoot);
      addTemporaryCharacter(fixtureRoot);

      await buildIsolatedApplication(fixtureRoot);
      expect(findBuiltFiles(fixtureRoot, temporaryCharacterId)).not.toEqual([]);
      activeServer = await serveBuild(fixtureRoot);
      await assertTemporaryCharacterIsPlayable(page, activeServer.origin);

      await page.goto('about:blank');
      await activeServer.close();
      activeServer = undefined;
      removeTemporaryCharacter(fixtureRoot);

      await buildIsolatedApplication(fixtureRoot);
      expect(findBuiltFiles(fixtureRoot, temporaryCharacterId)).toEqual([]);
      expect(findBuiltText(fixtureRoot)).not.toContain(temporaryCharacterId);
      activeServer = await serveBuild(fixtureRoot);
      await assertTemporaryCharacterIsAbsent(page, activeServer.origin);
    } finally {
      await page.goto('about:blank').catch(() => undefined);
      try {
        await activeServer?.close();
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    }
  });
});

type CharacterSource = {
  id: string;
  rosterOrder: number;
  name: string;
  description: string;
  assets: {
    portrait: { assetId: string };
    token: { assetId: string };
  };
  animationSet: {
    idle: string;
    speak: string;
    react: string;
  };
  editorialReview: { notes: string };
  phrases: Array<
    {
      id: string;
      role: string;
    } & Record<string, unknown>
  >;
};

type StaticBuildServer = Readonly<{
  origin: string;
  close: () => Promise<void>;
}>;

function createIsolatedApplication(fixtureRoot: string): void {
  copyFileSync(
    path.join(repositoryRoot, 'index.html'),
    path.join(fixtureRoot, 'index.html'),
  );
  cpSync(path.join(repositoryRoot, 'src'), path.join(fixtureRoot, 'src'), {
    recursive: true,
  });
}

function addTemporaryCharacter(fixtureRoot: string): void {
  const characterDirectory = path.join(
    fixtureRoot,
    'src',
    'content',
    'characters',
  );
  const sourcePath = path.join(
    characterDirectory,
    'red-folded-chairman-phrase-cards.json',
  );
  const source = JSON.parse(
    readFileSync(sourcePath, 'utf8'),
  ) as CharacterSource;
  const phraseIdReplacements = new Map(
    source.phrases.map(({ id }) => [id, `${temporaryCharacterId}-${id}`]),
  );
  const fixture = replaceExactStrings(
    structuredClone(source),
    phraseIdReplacements,
  ) as CharacterSource;
  const rosterOrders = readdirSync(characterDirectory)
    .filter((fileName) => fileName.endsWith('-phrase-cards.json'))
    .map(
      (fileName) =>
        JSON.parse(
          readFileSync(path.join(characterDirectory, fileName), 'utf8'),
        ) as CharacterSource,
    )
    .map((character) => character.rosterOrder);

  fixture.id = temporaryCharacterId;
  fixture.rosterOrder = Math.max(...rosterOrders) + 1;
  fixture.name = temporaryCharacterName;
  fixture.description =
    'An original fictional delegate used only by the isolated lifecycle test.';
  fixture.assets.portrait.assetId = `${temporaryCharacterId}-portrait`;
  fixture.assets.token.assetId = `${temporaryCharacterId}-token`;
  fixture.animationSet = {
    idle: `${temporaryCharacterId}-idle`,
    speak: `${temporaryCharacterId}-speak`,
    react: `${temporaryCharacterId}-react`,
  };
  fixture.editorialReview.notes =
    'Original fictional composite used only by the isolated lifecycle test.';
  makeTemporaryPhraseTextUnique(fixture);

  writeFileSync(
    characterJsonPath(fixtureRoot),
    JSON.stringify(fixture, null, 2),
  );

  for (const [sourceName, destinationPath, marker] of [
    [
      'red-folded-chairman.png',
      characterPortraitPath(fixtureRoot),
      'default',
    ],
    [
      'red-folded-chairman--alternate.png',
      characterAlternatePortraitPath(fixtureRoot),
      'alternate',
    ],
  ] as const) {
    const portrait = readFileSync(
      path.join(fixtureRoot, 'src', 'assets', 'characters', sourceName),
    );
    writeFileSync(
      destinationPath,
      Buffer.concat([
        portrait,
        Buffer.from(`\ncontent-lifecycle-${marker}-fixture\n`),
      ]),
    );
  }
}

function makeTemporaryPhraseTextUnique(fixture: CharacterSource): void {
  const textFields = [
    'text',
    'singularText',
    'pluralText',
    'personalSingularText',
    'secondPersonText',
  ] as const;
  fixture.phrases.forEach((phrase, index) => {
    for (const field of textFields) {
      const value = phrase[field];
      if (typeof value !== 'string') continue;
      const marker = ` temporary fixture ${String(index + 1)}`;
      phrase[field] = value.endsWith('.')
        ? `${value.slice(0, -1)}${marker}.`
        : `${value}${marker}`;
    }
  });
}

function removeTemporaryCharacter(fixtureRoot: string): void {
  rmSync(characterJsonPath(fixtureRoot));
  rmSync(characterPortraitPath(fixtureRoot));
  rmSync(characterAlternatePortraitPath(fixtureRoot));
}

function characterJsonPath(fixtureRoot: string): string {
  return path.join(
    fixtureRoot,
    'src',
    'content',
    'characters',
    `${temporaryCharacterId}-phrase-cards.json`,
  );
}

function characterPortraitPath(fixtureRoot: string): string {
  return path.join(
    fixtureRoot,
    'src',
    'assets',
    'characters',
    `${temporaryCharacterId}.png`,
  );
}

function characterAlternatePortraitPath(fixtureRoot: string): string {
  return path.join(
    fixtureRoot,
    'src',
    'assets',
    'characters',
    `${temporaryCharacterId}--alternate.png`,
  );
}

function replaceExactStrings(
  value: unknown,
  replacements: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === 'string') return replacements.get(value) ?? value;
  if (Array.isArray(value)) {
    return value.map((item) => replaceExactStrings(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceExactStrings(item, replacements),
      ]),
    );
  }
  return value;
}

async function buildIsolatedApplication(fixtureRoot: string): Promise<void> {
  await build({
    root: fixtureRoot,
    configFile: path.join(repositoryRoot, 'vite.config.ts'),
    logLevel: 'error',
    build: {
      emptyOutDir: true,
      outDir: path.join(fixtureRoot, 'dist'),
    },
  });
}

async function assertTemporaryCharacterIsPlayable(
  page: Page,
  origin: string,
): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${origin}${basePath}`);
  await page.getByRole('button', { name: 'Set up match' }).click();

  await page.locator('#playerTwoCharacterId').click();
  const temporaryOption = page.locator(
    `.roster-choice[data-character-id="${temporaryCharacterId}"]`,
  );
  await expect(temporaryOption).toHaveCount(1);
  await expect(temporaryOption).toHaveAccessibleName(
    new RegExp(`^${temporaryCharacterName}\\. Weaknesses:`, 'u'),
  );
  await temporaryOption.click();
  await page
    .getByRole('button', { name: 'Next skin for Player two' })
    .click();
  await page.getByRole('button', { name: 'Start match' }).click();

  await expect(
    page.getByRole('heading', { name: temporaryCharacterName }),
  ).toBeVisible();
  const portrait = page.locator(
    `img.character-portrait[src*="${temporaryCharacterId}--alternate"]`,
  );
  await expect(portrait).toBeVisible();
  await expect
    .poll(() =>
      portrait.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

async function assertTemporaryCharacterIsAbsent(
  page: Page,
  origin: string,
): Promise<void> {
  await page.goto(`${origin}${basePath}`);
  await page.getByRole('button', { name: 'Set up match' }).click();
  await expect(
    page.locator(`.roster-choice[data-character-id="${temporaryCharacterId}"]`),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.character-portrait')).toHaveCount(2);
  await expect(
    page.locator(`img.character-portrait[src*="${temporaryCharacterId}"]`),
  ).toHaveCount(0);
  await expect(
    page.getByText(temporaryCharacterName, { exact: true }),
  ).toHaveCount(0);
}

function findBuiltFiles(fixtureRoot: string, name: string): string[] {
  return walkFiles(path.join(fixtureRoot, 'dist')).filter((filePath) =>
    path.basename(filePath).includes(name),
  );
}

function findBuiltText(fixtureRoot: string): string {
  return walkFiles(path.join(fixtureRoot, 'dist'))
    .filter((filePath) =>
      ['.css', '.html', '.js'].includes(path.extname(filePath)),
    )
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    return statSync(filePath).isDirectory() ? walkFiles(filePath) : [filePath];
  });
}

async function serveBuild(fixtureRoot: string): Promise<StaticBuildServer> {
  const outputDirectory = path.resolve(fixtureRoot, 'dist');
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (!requestUrl.pathname.startsWith(basePath)) {
      response.writeHead(404).end();
      return;
    }

    const relativePath =
      requestUrl.pathname === basePath
        ? 'index.html'
        : decodeURIComponent(requestUrl.pathname.slice(basePath.length));
    const filePath = path.resolve(outputDirectory, relativePath);
    const pathFromOutput = path.relative(outputDirectory, filePath);
    if (
      pathFromOutput.startsWith('..') ||
      path.isAbsolute(pathFromOutput) ||
      !existsSync(filePath) ||
      statSync(filePath).isDirectory()
    ) {
      response.writeHead(404).end();
      return;
    }

    const content = readFileSync(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': content.byteLength,
      'Content-Type': contentType(filePath),
    });
    response.end(content);
  });

  await listen(server);
  const address = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server),
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function contentType(filePath: string): string {
  return (
    {
      '.avif': 'image/avif',
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] ?? 'application/octet-stream'
  );
}
