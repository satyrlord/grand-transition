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
      {
        id: 'modern-debate-studio',
        openingPlayerIndex: 0,
        nameKey: 'scene.modern-debate-studio.name',
        descriptionKey: 'scene.modern-debate-studio.description',
        backgroundLayers: [
          { media: media('modern-debate-studio'), depth: 0 },
          { media: media('modern-debate-studio-desks'), depth: 1 },
        ],
        animationId: 'modern-debate-light-lines',
        music: media('modern-debate-studio-theme'),
        ambience: media('modern-debate-studio-room-tone'),
        phrasePool: [...scenePhraseIds('modern-debate-studio')],
        effectIds: ['led-light-sweep', 'floor-reflection-pulse'],
      },
      foundationScene(
        'county-council-ballroom',
        1,
        scenePhraseIds('county-council-ballroom'),
      ),
      foundationScene(
        'midnight-call-in-studio',
        0,
        scenePhraseIds('midnight-call-in-studio'),
      ),
      foundationScene(
        'palace-press-hall',
        1,
        scenePhraseIds('palace-press-hall'),
      ),
      foundationScene(
        'influencer-campaign-livestream',
        0,
        scenePhraseIds('influencer-campaign-livestream'),
      ),
    ],
    locales: [englishGameLocale],
  });
}

function foundationScene(
  id: string,
  openingPlayerIndex: 0 | 1,
  phrasePool: readonly string[],
) {
  return {
    id,
    openingPlayerIndex,
    nameKey: `scene.${id}.name`,
    descriptionKey: `scene.${id}.description`,
    backgroundLayers: [
      { media: media('catalog-foundation-neutral-scene'), depth: 0 },
    ],
    animationId: 'catalog-foundation-neutral-lights',
    music: media('catalog-foundation-neutral-theme'),
    ambience: media('catalog-foundation-neutral-room-tone'),
    phrasePool: [...phrasePool],
    effectIds: ['catalog-foundation-neutral-light'],
  };
}
