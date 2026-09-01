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

export type CharacterSkin = Readonly<{
  id: string;
  portraitUrl: string;
}>;

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

const portraitUrlByStem = new Map(
  Object.entries(portraitSources).map(([sourcePath, url]) => [
    fileStem(sourcePath),
    url,
  ]),
);

export const characterSkins: Readonly<
  Record<string, readonly CharacterSkin[]>
> = Object.freeze(
  Object.fromEntries(
    phraseCardCatalog.characters.map((character) => {
      const defaultPortraitUrl = portraitUrlByStem.get(character.id);
      if (!defaultPortraitUrl) {
        throw new Error(
          `Add the default skin "src/assets/characters/${character.id}.png".`,
        );
      }
      const alternatePrefix = `${character.id}--`;
      const alternates = [...portraitUrlByStem.entries()]
        .filter(([stem]) => stem.startsWith(alternatePrefix))
        .map(([stem, portraitUrl]) =>
          Object.freeze({
            id: stem.slice(alternatePrefix.length),
            portraitUrl,
          }),
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      return [
        character.id,
        Object.freeze([
          Object.freeze({ id: 'default', portraitUrl: defaultPortraitUrl }),
          ...alternates,
        ]),
      ];
    }),
  ),
);

export const characterPortraitUrls: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      phraseCardCatalog.characters.map((character) => [
        character.id,
        characterSkins[character.id]?.[0]?.portraitUrl,
      ]),
    ),
  );

function fileStem(sourcePath: string): string {
  const name = sourcePath.replaceAll('\\', '/').split('/').at(-1) ?? sourcePath;
  return name.replace(/\.[^.]+$/u, '');
}
