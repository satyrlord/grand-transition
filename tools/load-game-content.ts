import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPhraseCardCatalog,
  type PhraseCardCatalog,
} from '../src/content/phrase-card-catalog';
import { createSampleContent } from '../src/content/sample-content';
import { createEnglishGameLocale } from '../src/localization/en-game-locale';
import {
  createRomanianGameLocale,
  mergeRomanianMessageFiles,
} from '../src/localization/ro-game-locale';
import { indexGameLocaleBundles } from '../src/localization/game-locale-bundles';

const repositoryRoot = path.resolve(
  fileURLToPath(new URL('..', import.meta.url)),
);

export function loadGameContent(rootDirectory = repositoryRoot): {
  phraseCardCatalog: PhraseCardCatalog;
  englishGameLocale: ReturnType<typeof createEnglishGameLocale>;
  gameLocaleBundles: ReturnType<typeof indexGameLocaleBundles>;
  sampleContent: ReturnType<typeof createSampleContent>;
} {
  const contentDirectory = path.join(rootDirectory, 'src', 'content');
  const characterDirectory = path.join(contentDirectory, 'characters');
  const commonSource = readJson(
    path.join(contentDirectory, 'common-phrase-cards.json'),
  );
  const characterFileNames = readdirSync(characterDirectory)
    .filter((fileName) => fileName.endsWith('-phrase-cards.json'))
    .toSorted();
  const characterSources = Object.fromEntries(
    characterFileNames.map((fileName) => [
      fileName,
      readJson(path.join(characterDirectory, fileName)),
    ]),
  );
  const phraseCardCatalog = buildPhraseCardCatalog(
    commonSource,
    characterSources,
  );
  const englishGameLocale = createEnglishGameLocale(
    phraseCardCatalog.englishMessages,
  );
  const romanianGameLocale = createRomanianGameLocale(
    readRomanianMessages(rootDirectory),
  );
  const sampleContent = createSampleContent(phraseCardCatalog, [
    englishGameLocale,
    romanianGameLocale,
  ]);
  return {
    phraseCardCatalog,
    englishGameLocale,
    gameLocaleBundles: indexGameLocaleBundles(sampleContent.locales),
    sampleContent,
  };
}

// The authored Romanian content tree is a flat locale-key map spread across
// several files, so every file is merged into one message record.
function readRomanianMessages(
  rootDirectory: string,
): Record<string, string> {
  const sources: Record<string, Record<string, string>> = {};
  for (const file of jsonFiles(
    path.join(rootDirectory, 'src', 'content', 'ro'),
  )) {
    sources[path.relative(rootDirectory, file)] = readJson(file) as Record<string, string>;
  }
  return mergeRomanianMessageFiles(sources);
}

function* jsonFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(full);
    else if (entry.name.endsWith('.json')) yield full;
  }
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}
