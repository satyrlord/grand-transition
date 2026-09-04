/// <reference types="vite/client" />

import commonSource from './content/common-phrase-cards.json' with { type: 'json' };
import portraitSources from 'virtual:character-portrait-fallbacks';
import {
  buildPhraseCardCatalog,
  type PhraseCardCatalog,
} from './content/phrase-card-catalog';
import { createSampleContent } from './content/sample-content';
import { createEnglishGameLocale } from './localization/en-game-locale';
import {
  characterAssetManifest,
  characterImageSizes,
  type CharacterAssetSource,
} from './app/character-assets';

const characterSources = import.meta.glob(
  './content/characters/*-phrase-cards.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export type CharacterSkin = Readonly<{
  id: string;
  portraitUrl: string;
  width: 2048;
  height: 2048;
  sizes: string;
  avif: CharacterAssetSource | null;
  webp: CharacterAssetSource | null;
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
  Object.entries(portraitSources),
);

export const characterSkins: Readonly<
  Record<string, readonly CharacterSkin[]>
> = Object.freeze(
  Object.fromEntries(
    phraseCardCatalog.characters.map((character) => {
      const assets = characterAssetManifest.filter(
        (asset) => asset.ownerId === character.id,
      );
      const skinFromAsset = (asset: (typeof assets)[number]) =>
        Object.freeze({
          id: asset.skinId,
          portraitUrl: asset.url,
          width: asset.width,
          height: asset.height,
          sizes: asset.sizes,
          avif: asset.avif,
          webp: asset.webp,
        });
      const manifestSkins = assets.map(skinFromAsset);
      const manifestIds = new Set(assets.map((asset) => asset.id));
      const alternatePrefix = `${character.id}--`;
      const rawSkins = [...portraitUrlByStem.entries()]
        .filter(
          ([stem]) =>
            (stem === character.id || stem.startsWith(alternatePrefix)) &&
            !manifestIds.has(stem),
        )
        .map(([stem, portraitUrl]) =>
          Object.freeze({
            id:
              stem === character.id
                ? 'default'
                : stem.slice(alternatePrefix.length),
            portraitUrl,
            width: 2048 as const,
            height: 2048 as const,
            sizes: characterImageSizes,
            avif: null,
            webp: null,
          }),
        );
      const discoveredSkins = [...manifestSkins, ...rawSkins];
      const defaultSkin = discoveredSkins.find((skin) => skin.id === 'default');
      if (!defaultSkin) {
        throw new Error(
          `Add the default skin "src/assets/characters/${character.id}.png".`,
        );
      }
      const alternates = discoveredSkins
        .filter((skin) => skin.id !== 'default')
        .toSorted((left, right) => left.id.localeCompare(right.id));
      return [
        character.id,
        Object.freeze([
          defaultSkin,
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
