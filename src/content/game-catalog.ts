import type { GameLocaleBundle } from '../localization/game-locale-schema';
import { validateContentCatalog, type ContentCatalog } from './content-catalog';
import type { CatalogBuildOptions, PhraseCardCatalog } from './phrase-card-catalog';

const media = (assetId: string) => ({
  assetId,
  realLogo: false,
  copyrightedBroadcastGraphic: false,
});

const foundationSceneMusic = {
  'county-council-ballroom': 'county-council-ballroom-theme',
  'midnight-call-in-studio': 'midnight-call-in-studio-theme',
  'palace-press-hall': 'palace-press-hall-theme',
  'influencer-campaign-livestream': 'influencer-campaign-livestream-theme',
} as const;

const foundationScenePresentation = {
  'county-council-ballroom': {
    animationId: 'county-ballroom-chandelier-glint',
    effectIds: ['chandelier-glint', 'equipment-status-pulse'],
  },
  'midnight-call-in-studio': {
    animationId: 'midnight-ticker-crawl',
    effectIds: ['ticker-crawl', 'call-line-pulse'],
  },
  'palace-press-hall': {
    animationId: 'palace-press-light-sweep',
    effectIds: ['press-light-sweep', 'camera-ready-pulse'],
  },
  'influencer-campaign-livestream': {
    animationId: 'livestream-reaction-rise',
    effectIds: ['reaction-rise', 'donation-alert-pulse'],
  },
} as const;

export function createGameCatalog(
  phraseCardCatalog: PhraseCardCatalog,
  gameLocaleBundles: readonly GameLocaleBundle[],
  options: CatalogBuildOptions = {},
): ContentCatalog {
  const scenePhraseIds = (sceneId: string): readonly string[] =>
    phraseCardCatalog.phrases
      .filter((phrase) => !phrase.sceneIds || phrase.sceneIds.includes(sceneId))
      .map((phrase) => phrase.id);

  const catalog: Parameters<typeof validateContentCatalog>[0] = {
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
      {
        id: 'civic-cypher-boxing-ring',
        openingPlayerIndex: 1,
        nameKey: 'scene.civic-cypher-boxing-ring.name',
        descriptionKey: 'scene.civic-cypher-boxing-ring.description',
        backgroundLayers: [
          { media: media('civic-cypher-boxing-ring'), depth: 0 },
        ],
        animationId: 'civic-cypher-crowd-bounce',
        music: media('civic-cypher-boxing-ring-theme'),
        phrasePool: [...scenePhraseIds('civic-cypher-boxing-ring')],
        effectIds: ['crowd-bounce', 'microphone-swing'],
      },
    ],
    locales: [...gameLocaleBundles],
  };
  return options.validate === false
    ? (catalog as ContentCatalog)
    : validateContentCatalog(catalog);
}

function foundationScene(
  id: keyof typeof foundationSceneMusic,
  openingPlayerIndex: 0 | 1,
  phrasePool: readonly string[],
) {
  return {
    id,
    openingPlayerIndex,
    nameKey: `scene.${id}.name`,
    descriptionKey: `scene.${id}.description`,
    backgroundLayers: [
      { media: media(id), depth: 0 },
      { media: media(`${id}-foreground`), depth: 1 },
    ],
    animationId: foundationScenePresentation[id].animationId,
    music: media(foundationSceneMusic[id]),
    phrasePool: [...phrasePool],
    effectIds: [...foundationScenePresentation[id].effectIds],
  };
}
