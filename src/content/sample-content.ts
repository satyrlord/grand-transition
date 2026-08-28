import type { GameLocaleBundle } from '../localization/game-locale-schema';
import { validateContentCatalog, type ContentCatalog } from './content-catalog';
import type { PhraseCardCatalog } from './phrase-card-catalog';

const media = (assetId: string) => ({
  assetId,
  realLogo: false,
  copyrightedBroadcastGraphic: false,
});

export function createSampleContent(
  phraseCardCatalog: PhraseCardCatalog,
  englishGameLocale: GameLocaleBundle,
): ContentCatalog {
  const scenePhraseIds = (sceneId: string): readonly string[] =>
    phraseCardCatalog.phrases
      .filter((phrase) => !phrase.sceneIds || phrase.sceneIds.includes(sceneId))
      .map((phrase) => phrase.id);

  return validateContentCatalog({
    phrases: [...phraseCardCatalog.phrases],
    characters: [...phraseCardCatalog.characters],
    scenes: [
      {
        id: 'transition-era-television-studio',
        openingPlayerIndex: 0,
        nameKey: 'scene.transition-era-television-studio.name',
        descriptionKey: 'scene.transition-era-television-studio.description',
        backgroundLayers: [
          { media: media('transition-era-television-studio'), depth: 0 },
          { media: media('transition-era-television-studio-desks'), depth: 1 },
        ],
        animationId: 'transition-era-studio-lights',
        music: media('transition-era-television-studio-theme'),
        ambience: media('transition-era-television-studio-room-tone'),
        phrasePool: [...scenePhraseIds('transition-era-television-studio')],
        effectIds: ['studio-light-flicker', 'crt-roll'],
      },
    ],
    locales: [englishGameLocale],
  });
}
