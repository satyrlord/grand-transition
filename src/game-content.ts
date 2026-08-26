/// <reference types="vite/client" />

import commonSource from './content/common-phrase-cards.json' with { type: 'json' };
import {
  buildPhraseCardCatalog,
  type PhraseCardCatalog,
} from './content/phrase-card-catalog';
import { createSampleContent } from './content/sample-content';
import { createEnglishGameLocale } from './localization/en-game-locale';

const characterSources = import.meta.glob(
  './content/characters/*-phrase-cards.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

const portraitSources = import.meta.glob('./assets/characters/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export const phraseCardCatalog: PhraseCardCatalog = buildPhraseCardCatalog(
  commonSource,
  characterSources,
);

export const englishGameLocale = createEnglishGameLocale(
  phraseCardCatalog.englishMessages,
);

export const sampleContent = createSampleContent(
  phraseCardCatalog,
  englishGameLocale,
);

export const characterPortraitUrls: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(portraitSources).map(([sourcePath, url]) => [
        fileStem(sourcePath),
        url,
      ]),
    ),
  );

for (const character of phraseCardCatalog.characters) {
  if (!characterPortraitUrls[character.id]) {
    throw new Error(
      `Add the character portrait "src/assets/characters/${character.id}.png".`,
    );
  }
}

function fileStem(sourcePath: string): string {
  const name = sourcePath.replaceAll('\\', '/').split('/').at(-1) ?? sourcePath;
  return name.replace(/\.[^.]+$/u, '');
}
