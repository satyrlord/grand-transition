import type { GameLocale } from './game-locale';

// Romanian display names keyed by the same stable identifiers the English
// content bundle uses. Phase 1 rendered these as interface display names;
// Phase 2 owns them with the game locale, so a Romanian game language shows
// Romanian names whichever interface language is selected.
export const romanianCharacterNames: Readonly<Record<string, string>> = Object.freeze({
  'algorithmic-prophet': 'Profetul algoritmic',
  'apartment-block-geopolitician': 'Geopoliticianul de bloc',
  'black-sea-captain': 'Căpitanul vesel',
  'coalition-acrobat': 'Acrobatul coaliției',
  'county-baron': 'Baronul local',
  'diaspora-oracle': 'Oracolul diasporei',
  'eu-funds-alchemist': 'Magicianul fondurilor europene',
  'football-tycoon': 'Magnatul fotbalului',
  'government-ai': 'Robotul Guvernului',
  'luxury-minister': 'Ministrul luxului',
  'marble-diplomat': 'Ficusul',
  'midnight-sensationalist': 'Senzaționalistul',
  'oat-milk-reformist': 'Reformistul de cafenea',
  'red-folded-chairman': 'Președintele poporului',
  'reluctant-theorem': 'Profesorul reticent',
  'retiring-cassandra': 'Vizionarul pensionat',
  'spreadsheet-technocrat': 'Tehnocratul formularelor',
  'thunder-tribune': 'Tribunul',
  'velvet-mogul': 'Mogulul de catifea',
});

export const romanianSceneNames: Readonly<Record<string, string>> = Object.freeze({
  'transition-era-television-studio': 'Studioul televiziunii naționale',
  'modern-debate-studio': 'Studioul modern de dezbateri',
  'county-council-ballroom': 'Sala de festivități a Consiliului Județean',
  'midnight-call-in-studio': 'Studioul din sufragerie',
  'palace-press-hall': 'Sala de presă a Palatului',
  'influencer-campaign-livestream': 'Live pe stream',
});

export function displayCharacterName(
  characterId: string,
  englishName: string,
  locale: GameLocale,
): string {
  return locale === 'ro-RO' ? romanianCharacterNames[characterId] ?? englishName : englishName;
}

export function displaySceneName(
  sceneId: string,
  englishName: string,
  locale: GameLocale,
): string {
  return locale === 'ro-RO' ? romanianSceneNames[sceneId] ?? englishName : englishName;
}
