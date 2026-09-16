import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPhraseCardCatalog,
  type PhraseCardCatalog,
} from '../src/content/phrase-card-catalog';
import { createSampleContent } from '../src/content/sample-content';
import { createEnglishGameLocale } from '../src/localization/en-game-locale';
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
  const sampleContent = createSampleContent(phraseCardCatalog, [
    englishGameLocale,
  ]);
  return {
    phraseCardCatalog,
    englishGameLocale,
    gameLocaleBundles: indexGameLocaleBundles(sampleContent.locales),
    sampleContent,
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
}
